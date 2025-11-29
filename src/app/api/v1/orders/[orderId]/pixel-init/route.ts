// /src/app/api/v1/orders/[orderId]/pixel-init/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, doc, getDoc, updateDoc, serverTimestamp } from "@/config/firebase/api";

export const runtime = "nodejs";

type Params = { orderId: string };

export async function POST(
  req: NextRequest,
  { params }: { params: Params }
) {
  try {
    const orderId = String(params?.orderId ?? "").trim();
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "orderId requerido" },
        { status: 400 }
      );
    }

    const raw = (await req.json().catch(() => null)) as any;
    const payment_uuid = typeof raw?.payment_uuid === "string" ? raw.payment_uuid.trim() : "";
    const payment_hash = typeof raw?.payment_hash === "string" ? raw.payment_hash.trim() : "";

    if (!payment_uuid) {
      return NextResponse.json(
        { success: false, message: "payment_uuid requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    const ref = doc(db, "bmt_orders", orderId);
    const snap = await getDoc(ref);

    const exists =
      typeof (snap as any)?.exists === "function"
        ? (snap as any).exists()
        : !!(snap as any)?.exists;

    if (!exists) {
      return NextResponse.json(
        { success: false, message: "Orden no existe" },
        { status: 404 }
      );
    }

    const data = (snap.data() ?? {}) as { status?: unknown };

    const currentStatus = String(data.status ?? "CREATED").toUpperCase();

    // Solo permitimos setear / actualizar uuid si la orden no está en estado final.
    const finalStatuses = new Set(["PAID", "DECLINED", "ERROR"]);
    if (finalStatuses.has(currentStatus)) {
      console.log("[pixelpay-init] Order already final, skipping uuid bind:", {
        orderId,
        currentStatus,
      });
      return NextResponse.json(
        { success: true, message: "Orden ya está en estado final" },
        { status: 200 }
      );
    }

    console.log("[pixelpay-init] Binding payment_uuid to order:", {
      orderId,
      payment_uuid,
      payment_hash: payment_hash ? "***" : null,
    });

    await updateDoc(ref, {
      payment_uuid,
      // opcional: guardamos hash si lo tienes desde el SDK
      ...(payment_hash ? { payment_hash } : {}),
      status_checked_at: serverTimestamp(),
    });

    return NextResponse.json(
      { success: true, message: "payment_uuid vinculado a la orden" },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[pixelpay-init] error:", msg);
    return NextResponse.json(
      { success: false, message: msg },
      { status: 500 }
    );
  }
}
