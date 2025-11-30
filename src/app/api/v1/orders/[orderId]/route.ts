// /src/app/api/v1/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, doc, getDoc, updateDoc, serverTimestamp } from "@/config/firebase/api";
import { fetchPixelPaymentStatus } from "@/lib/status"; // asegúrate que el path coincida

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Currency = "HNL" | "USD" | "NIO";
const toCurrency = (v: unknown): Currency => {
	const s = String(v ?? "").toUpperCase();
	return s === "HNL" || s === "USD" || s === "NIO" ? (s as Currency) : "HNL";
};

type Params = { orderId: string };
function isPromise<T>(v: unknown): v is Promise<T> {
	return typeof (v as { then?: unknown })?.then === "function";
}

type FireCustomer = { name?: unknown; email?: unknown };
type FireBilling = { address?: unknown; country?: unknown; state?: unknown; city?: unknown; phone?: unknown };
type FireOrderDoc = {
	order_id?: unknown;
	amount?: unknown;
	currency?: unknown;
	description?: unknown;
	customer?: FireCustomer;
	billing?: FireBilling;
	status?: unknown;
	mode?: unknown;
	payment_uuid?: unknown;   // 👈 agregado
	pixel_status?: unknown;   // opcional
};

export async function GET(
	_req: NextRequest,
	ctx: { params: Params } | { params: Promise<Params> }
) {
	try {
		const p = isPromise<Params>((ctx as { params: unknown }).params)
			? await (ctx as { params: Promise<Params> }).params
			: (ctx as { params: Params }).params;

		const id = String(p?.orderId ?? "").trim();
		if (!id) {
			return NextResponse.json(
				{ success: false, message: "orderId requerido" },
				{ status: 400, headers: { "cache-control": "no-store" } }
			);
		}

		const db = getDb();
		const ref = doc(db, "bmt_orders", id);
		const snap = await getDoc(ref);

		// Compatibilidad Lite (prop boolean) y Full (método):
		function snapshotExists(s: unknown): boolean {
			if (typeof s === "object" && s !== null && "exists" in s) {
				const ex = (s as { exists: unknown }).exists;
				if (typeof ex === "boolean") return ex;                     // Lite
				if (typeof ex === "function") return (ex as () => boolean)(); // Full
			}
			return false;
		}

		if (!snapshotExists(snap)) {
			return NextResponse.json(
				{ success: false, message: "not found" },
				{ status: 404, headers: { "cache-control": "no-store" } }
			);
		}

		// data() existe en ambos SDK
		const data = (snap.data() ?? {}) as Partial<FireOrderDoc>;

		// Leer uuid (si existe)
		const paymentUuidRaw = data.payment_uuid;
		const paymentUuid =
			typeof paymentUuidRaw === "string" && paymentUuidRaw.trim() !== ""
				? paymentUuidRaw.trim()
				: "";

		// Leer status actual
		let currentStatus = String(data.status ?? "CREATED").toUpperCase();

		// 👇 SEGURIDAD EXTRA: si aún está CREATED/PENDING pero tenemos payment_uuid,
		// consultamos estado remoto en PixelPay
		if ((currentStatus === "CREATED" || currentStatus === "PENDING") && paymentUuid) {
			try {
				console.log("[pixelpay-check] Checking remote status for order", id, "uuid:", paymentUuid);
				const remote = await fetchPixelPaymentStatus(paymentUuid);

				if (remote && remote.status) {
					const normalized = remote.status.toLowerCase();
					console.log("[pixelpay-check] Remote status for", id, "=", normalized);

					if (normalized === "paid") {
						await updateDoc(ref, {
							status: "PAID",
							pixel_status: "APPROVED",
							status_checked_at: serverTimestamp(),
						});
						console.log("[pixelpay-check] Updating order to PAID from remote status:", {
							orderId: id,
							paymentUuid,
							remoteStatus: normalized,
						});
						currentStatus = "PAID";
					} else if (normalized === "declined" || normalized === "void" || normalized === "error") {
						await updateDoc(ref, {
							status: "DECLINED",
							pixel_status: remote.status.toUpperCase(),
							status_checked_at: serverTimestamp(),
						});
						console.log("[pixelpay-check] Updating order to DECLINED from remote status:", {
							orderId: id,
							paymentUuid,
							remoteStatus: normalized,
						});
						currentStatus = "DECLINED";
					} else {
						// otros estados intermedios: sólo guardamos el último que responde Pixel
						await updateDoc(ref, {
							pixel_status: remote.status.toUpperCase(),
							status_checked_at: serverTimestamp(),
						});
					}
				}
			} catch (e) {
				const msg = e instanceof Error ? e.message : String(e);
				console.error("[pixelpay-check] Error while checking PixelPay status:", msg);
			}
		}

		const amountRaw =
			typeof data.amount === "number" ? data.amount : Number.parseFloat(String(data.amount ?? "0"));
		const amount = Number.isFinite(amountRaw) ? amountRaw : 0;

		const order = {
			order_id: String(data.order_id ?? id),
			amount,
			currency: toCurrency(data.currency),
			description: String(data.description ?? "Recarga"),
			customer: {
				name: String(data?.customer?.name ?? ""),
				email: String(data?.customer?.email ?? ""),
			},
			billing: {
				address: String(data?.billing?.address ?? ""),
				country: String(data?.billing?.country ?? "HN"),
				state: String(data?.billing?.state ?? ""),
				city: String(data?.billing?.city ?? ""),
				phone: String(data?.billing?.phone ?? ""),
			},
			status: currentStatus,             // 👈 aquí usamos el status ya actualizado
			mode: String(data.mode ?? "sale"),
		};

		return NextResponse.json(
			{ success: true, order },
			{ status: 200, headers: { "cache-control": "no-store" } }
		);
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		return NextResponse.json(
			{ success: false, message: msg },
			{ status: 500, headers: { "cache-control": "no-store" } }
		);
	}
}
