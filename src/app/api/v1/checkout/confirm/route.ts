// /src/app/api/v1/checkout/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, doc, getDoc, updateDoc, serverTimestamp } from "@/config/firebase/api";
import crypto from "crypto";

export const runtime = "nodejs";

type FinalStatus = "PAID" | "DECLINED" | "PENDING" | "ERROR";

const s = (v: unknown) => (typeof v === "string" ? v : "");

// ───────────────────────────────────────────────────────────────────────────────
// IMPORTANTE: Este handler AHORA valida por hash local (Hosted Payment).
// Fórmula típica sandbox: md5( KEY_ID + '|' + order_id + '|' + HASH/SECRET )
// ───────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const bodyUnknown = await req.json().catch(() => ({}));
    console.log("[confirm] body:", bodyUnknown);

    const body = (typeof bodyUnknown === "object" && bodyUnknown !== null ? bodyUnknown : {}) as {
      order_id?: string;
      payment_uuid?: string | null;
      payment_hash?: string | null;   // <- Viene del widget
      status?: string;                // <- APPROVED | DECLINED (del widget)
      message?: string;               // <- mensaje del widget
      pixel_codes?: { code?: string | number | null; uuid?: string | null; hash?: string | null } | null;
    };

    const orderId = s(body.order_id).trim();
    const payment_uuid = body.payment_uuid ?? null;
    const payment_hash = body.payment_hash ?? null;
    const clientStatus = s(body.status).toUpperCase(); // APPROVED | DECLINED
    const clientMessage = s(body.message) || null;
    const pixelCodes = (body.pixel_codes && typeof body.pixel_codes === "object")
      ? (body.pixel_codes as Record<string, unknown>)
      : null;

    if (!orderId) {
      return NextResponse.json({ success: false, message: "order_id requerido" }, { status: 400 });
    }

    // 1) Verifica que la orden exista
    const db = getDb();
    const ref = doc(db, "bmt_orders", orderId);
    const snap = await getDoc(ref);
    if (!("exists" in snap) || (typeof (snap as { exists: boolean }).exists === "boolean" && !(snap as { exists: boolean }).exists)) {
      return NextResponse.json({ success: false, message: "Orden no existe" }, { status: 404 });
    }

    // 2) CASO A: No hay IDs -> confía en el estado del widget (como ya tenías)
    if (!payment_uuid && !payment_hash) {
      const finalA: FinalStatus = clientStatus === "APPROVED" ? "PAID" : "DECLINED";
      await updateDoc(ref, {
        status: finalA,
        pixel_status: finalA === "PAID" ? "APPROVED" : "DECLINED",
        pixel_message: clientMessage,
        pixel_code: pixelCodes?.["code"] ?? null,
        payment_uuid: null,
        payment_hash: null,
        pixel_raw: { source: "client", status: clientStatus, message: clientMessage, codes: pixelCodes ?? null },
        status_checked_at: serverTimestamp(),
      });
      const httpOutA = finalA === "PAID" ? 200 : 402;
      return NextResponse.json(
        { success: finalA === "PAID", status: finalA, message: clientMessage ?? "OK" },
        { status: httpOutA }
      );
    }

    // 3) CASO B: Hay UUID/HASH -> valida con hash local (sin llamar a ninguna ruta interna)
    const keyId = process.env.PIXELPAY_KEY_ID || process.env.NEXT_PUBLIC_PIXELPAY_KEY_ID || "";
    // En sandbox, SECRET y HASH suelen ser el mismo valor (tu config ya lo tiene así):
    const secret = process.env.PIXELPAY_HASH || process.env.PIXELPAY_SECRET || "";

    if (!keyId || !secret) {
      console.error("[confirm] Falta PIXELPAY_KEY_ID o PIXELPAY_HASH/SECRET en env");
      return NextResponse.json({ success: false, message: "PixelPay KEY/HASH no configurados" }, { status: 500 });
    }

    // md5( KeyID|order_id|Secret )
    const localHash = crypto
      .createHash("md5")
      .update(`${keyId}|${orderId}|${secret}`, "utf8")
      .digest("hex");

    const isValid = !!payment_hash && payment_hash === localHash;

    // LOG para depuración (no imprime secretos)
    console.log("[confirm] hash check", {
      keyId: !!keyId,
      hasSecret: !!secret,
      orderId,
      hasUuid: !!payment_uuid,
      hasPaymentHash: !!payment_hash,
      localHash,
      isValid
    });

    // 4) Resuelve estado final
    const finalStatus: FinalStatus = isValid
      ? "PAID"
      : (clientStatus === "APPROVED" ? "PENDING" : "DECLINED");

    // 5) Persistencia
    await updateDoc(ref, {
      status: finalStatus,
      payment_uuid,
      payment_hash,
      pixel_status: isValid ? "APPROVED" : (clientStatus === "APPROVED" ? "PENDING" : "DECLINED"),
      pixel_message: clientMessage,
      pixel_code: null,
      pixel_raw: {
        source: "client",
        status: clientStatus,
        message: clientMessage,
        payment_uuid,
        payment_hash,
        localHash,
        verified: isValid
      },
      status_checked_at: serverTimestamp(),
    });

    // 6) HTTP coherente con el estado
    const httpOut =
      finalStatus === "PAID"     ? 200 :
      finalStatus === "PENDING"  ? 200 :
      finalStatus === "DECLINED" ? 402 : 502;

    return NextResponse.json({
      success: finalStatus === "PAID" || finalStatus === "PENDING",
      message: clientMessage ?? (isValid ? "OK" : "No válido"),
      status: finalStatus,
      data: { http: httpOut, order_id: orderId },
    }, { status: httpOut });

  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[confirm] error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
