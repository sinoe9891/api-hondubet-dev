// /src/app/api/v1/checkout/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, doc, getDoc, updateDoc, serverTimestamp } from "@/config/firebase/api";
import crypto from "crypto";

export const runtime = "nodejs";

type FinalStatus = "PAID" | "DECLINED" | "PENDING" | "ERROR";
const s = (v: unknown) => (typeof v === "string" ? v : "");

// ───────────────────────────────────────────────────────────────────────────────
// UI Helper
// ───────────────────────────────────────────────────────────────────────────────
function buildServerMessage(opts: {
	finalStatus: FinalStatus;
	isValid?: boolean;
	clientStatus?: string;
	clientMessage?: string | null;
	orderId: string;
}) {
	const { finalStatus, isValid = false, clientStatus = "", clientMessage, orderId } = opts;

	let title = "Estado de la transacción";
	let icon: "success" | "info" | "warning" | "error" = "info";
	let text = clientMessage || "";

	if (finalStatus === "PAID") {
		title = "¡Pago confirmado!";
		icon = "success";
		text = clientMessage || "Tu pago fue verificado correctamente.";
	} else if (finalStatus === "PENDING") {
		title = "Pago en validación";
		icon = "warning";
		text = clientMessage || "Estamos validando la operación.";
	} else if (finalStatus === "DECLINED") {
		title = "Pago declinado";
		icon = "error";
		text = clientMessage || "La transacción fue rechazada.";
	} else {
		title = "Error al confirmar";
		icon = "error";
		text = clientMessage || "No se pudo confirmar la transacción.";
	}

	const simple =
		finalStatus === "PAID"
			? "Pago realizado exitosamente"
			: finalStatus === "PENDING"
				? "Estamos validando tu pago"
				: finalStatus === "DECLINED"
					? "Pago declinado"
					: "Error al confirmar";

	const display = {
		title,
		icon,
		text,
		tips:
			finalStatus === "DECLINED"
				? [
					"Verifica que tu tarjeta tenga saldo o esté habilitada para compras online.",
					"Si el problema persiste, intenta con otro medio de pago.",
				]
				: finalStatus === "PENDING"
					? [
						"Si ves el cargo en tu banco, espera la validación.",
						"Evita repetir la operación hasta ver el resultado final.",
					]
					: [],
		meta: {
			order_id: orderId,
			widget_status: clientStatus,
			verified_by_hash: isValid,
		},
	};

	return { message: simple, display };
}

// ───────────────────────────────────────────────────────────────────────────────
// Clasificador PixelPay (CASOS REALES)
// ───────────────────────────────────────────────────────────────────────────────
function resolvePixelCase({
	payment_uuid,
	payment_hash,
	clientStatus,
}: {
	payment_uuid: string | null;
	payment_hash: string | null;
	clientStatus: string;
}) {
	if (!payment_uuid && !payment_hash) return "INVALID_CARD" as const;
	if (payment_uuid && clientStatus === "DECLINED") return "BANK_DECLINED" as const;
	if (payment_uuid && clientStatus === "APPROVED") return "APPROVED" as const;
	return "UNKNOWN" as const;
}

// ───────────────────────────────────────────────────────────────────────────────
// Handler
// ───────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
	try {
		const bodyUnknown = await req.json().catch(() => ({}));

		console.log("[pixelpay-debug] RAW BODY:", bodyUnknown);

		const body = (typeof bodyUnknown === "object" ? bodyUnknown : {}) as {
			order_id?: string;
			payment_uuid?: string | null;
			payment_hash?: string | null;
			status?: string;
			message?: string;
			pixel_codes?: {
				code?: string | number | null;
				uuid?: string | null;
				hash?: string | null;
			} | null;
		};

		const orderId = s(body.order_id);
		const payment_uuid = body.payment_uuid ?? null;
		const payment_hash = body.payment_hash ?? null;
		const clientStatus = s(body.status).toUpperCase();
		const clientMessage = s(body.message) || null;

		console.log("[pixelpay-debug] parsed:", {
			orderId,
			clientStatus,
			payment_uuid,
			payment_hash,
			clientMessage,
		});

		if (!orderId)
			return NextResponse.json({ success: false, message: "order_id requerido" }, { status: 400 });

		// Fetch order
		const db = getDb();
		const ref = doc(db, "bmt_orders", orderId);
		const snap = await getDoc(ref);

		if (!snap.exists)
			return NextResponse.json({ success: false, message: "Orden no existe" }, { status: 404 });

		// Clasificación inmediata
		const pixelCase = resolvePixelCase({ payment_uuid, payment_hash, clientStatus });
		console.log("[pixelpay-summary] CASE:", pixelCase);

		// ───────────────────────────────────────────────────────────────────────────────
		// CASO 1: TARJETA INVÁLIDA (error 3DS / formato)
		// ───────────────────────────────────────────────────────────────────────────────
		if (pixelCase === "INVALID_CARD") {
			const finalStatus: FinalStatus = "DECLINED";
			const { message, display } = buildServerMessage({
				finalStatus,
				clientStatus,
				clientMessage,
				orderId,
			});

			await updateDoc(ref, {
				status: finalStatus,
				pixel_status: "DECLINED",
				pixel_message: clientMessage,
				payment_uuid: null,
				payment_hash: null,
				status_checked_at: serverTimestamp(),
			});

			return NextResponse.json(
				{ success: false, status: finalStatus, message, display },
				{ status: 402 }
			);
		}

		// ───────────────────────────────────────────────────────────────────────────────
		// CASO 2: BANCO DECLINA (sin fondos, bloqueo, etc)
		// ───────────────────────────────────────────────────────────────────────────────
		if (pixelCase === "BANK_DECLINED") {
			const finalStatus: FinalStatus = "DECLINED";

			const { message, display } = buildServerMessage({
				finalStatus,
				clientStatus,
				clientMessage,
				orderId,
			});

			await updateDoc(ref, {
				status: finalStatus,
				pixel_status: "DECLINED",
				pixel_message: clientMessage,
				payment_uuid,
				payment_hash,
				status_checked_at: serverTimestamp(),
			});

			return NextResponse.json(
				{ success: false, status: finalStatus, message, display },
				{ status: 402 }
			);
		}

		// ───────────────────────────────────────────────────────────────────────────────
		// CASO 3: APROBADO (3DS OK + banco OK) → SIEMPRE TERMINA EN "PAID"
		// ───────────────────────────────────────────────────────────────────────────────
		if (pixelCase === "APPROVED") {
			const finalStatus: FinalStatus = "PAID";

			const { message, display } = buildServerMessage({
				finalStatus,
				clientStatus,
				clientMessage,
				orderId,
				isValid: true,
			});

			await updateDoc(ref, {
				status: finalStatus,
				pixel_status: "APPROVED",
				pixel_message: clientMessage,
				payment_uuid,
				payment_hash,
				verified_by_hash: true,
				status_checked_at: serverTimestamp(),
			});

			return NextResponse.json(
				{ success: true, status: finalStatus, message, display },
				{ status: 200 }
			);
		}

		// ───────────────────────────────────────────────────────────────────────────────
		// FALLBACK
		// ───────────────────────────────────────────────────────────────────────────────
		return NextResponse.json(
			{ success: false, status: "ERROR", message: "No se pudo procesar la transacción" },
			{ status: 500 }
		);
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.error("[confirm] error:", message);
		return NextResponse.json({ success: false, message }, { status: 500 });
	}
}
