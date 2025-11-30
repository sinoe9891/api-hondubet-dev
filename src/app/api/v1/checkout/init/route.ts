// /src/app/api/v1/checkout/init/route.ts

import { NextResponse } from "next/server";
import { getDb, doc, setDoc, serverTimestamp } from "@/config/firebase/api";

export const runtime = "nodejs";

type Currency = "HNL" | "USD" | "NIO";
type Mode = "sale" | "auth";

interface InitOrder {
	order_id?: string;
	amount?: number | string;
	currency?: Currency | string;
	description?: string;
}

interface InitBody {
	order?: InitOrder;
	amount?: number | string;             // fallback: también plano
	currency?: Currency | string;         // fallback
	description?: string;                 // fallback
	customer?: { name?: string; email?: string };
	billing?: { address?: string; country?: string; state?: string; city?: string; phone?: string };
	partner?: string;
	mode?: Mode;
}

/** ===== Helpers ===== */
function newOrderId(): string {
	const ts = new Date();
	const pad = (n: number, w: number) => n.toString().padStart(w, "0");
	return `ORD-HB-${ts.getFullYear()}${pad(ts.getMonth() + 1, 2)}${pad(ts.getDate(), 2)}-${pad(ts.getHours(), 2)}${pad(ts.getMinutes(), 2)}${pad(ts.getSeconds(), 2)}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function toNumberFlexible(n: unknown): number {
	if (typeof n === "number") return n;
	if (typeof n === "string" && n.trim() !== "") {
		// Acepta "1.234,56" o "1,234.56" o "1234,56" o "1234.56"
		let s = n.trim().replace(/[^\d,.\-]/g, "");
		if (s.includes(",") && !s.includes(".")) s = s.replace(",", "."); // coma como decimal
		const p = parseFloat(s);
		return Number.isFinite(p) ? p : NaN;
	}
	return NaN;
}

function toCurrency(v: unknown): Currency {
	const s = String(v ?? "").toUpperCase();
	return (s === "HNL" || s === "USD" || s === "NIO") ? (s as Currency) : "HNL";
}

function allowFromAppKey(req: Request): boolean {
	const expected = process.env.INTERNAL_APP_KEY?.trim();
	if (!expected) return true; // si no configuras la key, no bloquea (útil en dev)
	const got = req.headers.get("x-app-key") || req.headers.get("X-App-Key");
	return (got?.trim() === expected);
}

/** ===== Handler ===== */
export async function POST(req: Request) {
	const url = new URL(req.url);
	const debug = url.searchParams.get("debug") === "1";
	const DBG: Record<string, unknown> = {};

	try {
		// 🔐 Guard simple por llave compartida (PHP la envía como X-App-Key)
		if (!allowFromAppKey(req)) {
			const payload = { success: false, error: "UNAUTHORIZED", message: "Unauthorized" };
			return NextResponse.json(payload, { status: 401 });
		}

		const raw = (await req.json().catch(() => null)) as unknown;
		const body: InitBody = (typeof raw === "object" && raw !== null) ? (raw as InitBody) : {};

		const orderObj: InitOrder = body.order ?? {};
		// Aceptar ambos formatos: body.order.* o plano
		const amountRaw = body.amount ?? orderObj.amount;
		const currencyRaw = body.currency ?? orderObj.currency ?? "HNL";
		const descRaw = body.description ?? orderObj.description ?? "Recarga saldo Hondubet";

		let orderId = (orderObj.order_id ?? "").trim();
		if (!orderId) orderId = newOrderId();

		const amount = toNumberFlexible(amountRaw);
		const currency = toCurrency(currencyRaw); // "HNL" | "USD" | "NIO"

		if (!Number.isFinite(amount)) {
			return NextResponse.json(
				{ success: false, error: "AMOUNT_INVALID", message: "amount inválido o ausente", http: 400 as const },
				{ status: 400 }
			);
		}

		// ✅ mínimo 250 (HNL) y máximo 50000 como ejemplo
		const MIN = 100;
		const MAX = 1500;

		if (amount < MIN || amount > MAX) {
			return NextResponse.json(
				{ success: false, error: "AMOUNT_OUT_OF_RANGE", message: `Monto fuera de rango (${MIN}–${MAX} ${currency})`, http: 400 as const },
				{ status: 400 }
			);
		}

		const orderDoc = {
			order_id: orderId,
			amount,
			currency: currency,
			description: descRaw,
			customer: body.customer ?? null,
			billing: body.billing ?? null,
			partner: body.partner ?? "HONDUBET",
			mode: (body.mode === "auth" ? "auth" : "sale") as Mode,
			status: "CREATED" as const,
			created_at: serverTimestamp(),
		};

		DBG.orderDoc = orderDoc;

		// Persistir
		const db = getDb();
		await setDoc(doc(db, "bmt_orders", orderId), orderDoc);

		// Host base del checkout
		const base =
			process.env.NEXT_PUBLIC_BASE_URL ||
			process.env.NEXT_PUBLIC_CHECKOUT_ORIGIN ||
			"http://127.0.0.1:3000";

		const checkout_url = `${base.replace(/\/$/, "")}/checkout/${encodeURIComponent(orderId)}?mode=${orderDoc.mode}`;

		const res = { success: true, order_id: orderId, checkout_url };
		return debug ? NextResponse.json({ ...res, debug: DBG }) : NextResponse.json(res);

	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : "Error interno";
		return NextResponse.json({ success: false, error: "INIT_FAILED", message }, { status: 500 });
	}
}
