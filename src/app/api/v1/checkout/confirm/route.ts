// /src/app/api/v1/checkout/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, doc, getDoc, updateDoc, serverTimestamp } from "@/config/firebase/api";

export const runtime = "nodejs";

type PixelCheck = {
	success?: boolean;
	message?: string;
	data?: Record<string, unknown> | null;
	[k: string]: unknown;
};

type FinalStatus = "PAID" | "DECLINED" | "PENDING" | "ERROR";

const s = (v: unknown) => (typeof v === "string" ? v : "");
const b = (v: unknown) => v === true;
const ls = (v: unknown) => s(v).toLowerCase();

function decideFromBody(obj: unknown): { approved: boolean; pending: boolean } {
	const src = (obj && typeof obj === "object") ? (obj as Record<string, unknown>) : {};
	const d = (src.data && typeof src.data === "object" && src.data !== null)
		? (src.data as Record<string, unknown>)
		: src;

	const code = s(d["response_code"]).trim();
	const state = ls(d["transaction_state"] ?? d["transaction_status"] ?? d["state"] ?? d["status"]);

	const hasId = Boolean(d["payment_uuid"] ?? d["transaction_id"]); // 👈 fuerza boolean

	const approved =
		b(d["response_approved"]) ||
		code === "00" ||
		(["approved", "paid", "success", "completed"].includes(state) && hasId); // 👈 ahora boolean

	const pending =
		b(d["response_incomplete"]) ||
		["pending", "processing", "incomplete"].includes(state);

	return { approved, pending };
}


function statusFrom(http: number, decided: { approved: boolean; pending: boolean }): FinalStatus {
	if (http === 200) return decided.approved ? "PAID" : decided.pending ? "PENDING" : "DECLINED";
	if (http === 402) return "DECLINED";
	if (http === 408) return "PENDING";
	if (http === 401 || http === 403) return "ERROR";
	if (http >= 400) return "ERROR";
	return "ERROR";
}

export async function POST(req: NextRequest) {
	try {
		const bodyUnknown = await req.json().catch(() => ({}));
		console.log("[confirm] body:", bodyUnknown);
		const body = (typeof bodyUnknown === "object" && bodyUnknown !== null ? bodyUnknown : {}) as {
			order_id?: string;
			payment_uuid?: string | null;
			payment_hash?: string | null;
			status?: string;         // <-- viene del widget (APPROVED | DECLINED)
			message?: string;        // <-- viene del widget
			pixel_codes?: { code?: string | number | null; uuid?: string | null; hash?: string | null } | null;
		};

		const orderId = s(body.order_id).trim();
		const payment_uuid = body.payment_uuid ?? null;
		const payment_hash = body.payment_hash ?? null;
		const clientStatus = s(body.status).toUpperCase();  // APPROVED | DECLINED (del widget)
		const clientMessage = s(body.message) || null;
		const pixelCodes = (body.pixel_codes && typeof body.pixel_codes === "object") ? (body.pixel_codes as Record<string, unknown>) : null;

		if (!orderId) return NextResponse.json({ success: false, message: "order_id requerido" }, { status: 400 });

		const db = getDb();
		const ref = doc(db, "bmt_orders", orderId);
		const snap = await getDoc(ref);
		if (!("exists" in snap) || (typeof (snap as { exists: boolean }).exists === "boolean" && !(snap as { exists: boolean }).exists)) {
			return NextResponse.json({ success: false, message: "Orden no existe" }, { status: 404 });
		}

		// CASO A: No hay IDs -> confiamos en el estado del widget
		if (!payment_uuid && !payment_hash) {
			const final: FinalStatus = clientStatus === "APPROVED" ? "PAID" : "DECLINED";
			await updateDoc(ref, {
				status: final,
				pixel_status: final === "PAID" ? "APPROVED" : "DECLINED",
				pixel_message: clientMessage,
				pixel_code: pixelCodes?.["code"] ?? null,
				payment_uuid: null,
				payment_hash: null,
				pixel_raw: { source: "client", status: clientStatus, message: clientMessage, codes: pixelCodes ?? null },
				status_checked_at: serverTimestamp(),
			});
			return NextResponse.json({ success: true, status: final, message: clientMessage ?? "OK" });
		}

		// CASO B: Hay al menos un ID -> consultamos al proxy PixelPay
		const base = process.env.NEXT_PUBLIC_BASE_URL || "";
		const qs = new URLSearchParams();
		if (payment_uuid) qs.set("uuid", payment_uuid);
		if (payment_hash) qs.set("hash", payment_hash);
		const url = `${base}/api/pixelpay/transaction/status?${qs.toString()}`;

		const upstream = await fetch(url, { method: "GET", headers: { "content-type": "application/json" }, cache: "no-store" });
		const http = upstream.status;
		const json = (await upstream.json().catch(() => ({}))) as PixelCheck;

		const decided = decideFromBody(json);
		const finalStatus = statusFrom(http, decided);

		await updateDoc(ref, {
			status: finalStatus,
			payment_uuid,
			payment_hash,
			pixel_status: decided.approved ? "APPROVED" : decided.pending ? "PENDING" : "DECLINED",
			pixel_message: clientMessage ?? json?.message ?? null,
			pixel_code: ((json?.data as Record<string, unknown> | undefined)?.["response_code"] as string | undefined) ?? (pixelCodes?.["code"] as string | undefined) ?? null,
			pixel_raw: json,
			status_checked_at: serverTimestamp(),
		});

		return NextResponse.json({
			success: true,
			message: json?.message ?? "OK",
			status: finalStatus,
			data: { http, order_id: orderId },
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}
