// /src/lib/pixelpay-web.ts
"use client";

export type Currency = "HNL" | "USD" | "NIO";
export type PixelPayTransactionInput = {
	amount: number | string;
	currency: Currency | string;
	order: { id: string; description?: string; customer_name?: string; customer_email?: string };
	card: { number: string; holder: string; exp: string; cvv: string };
	billing: { address?: string; country?: string; state?: string; city?: string; phone?: string };
};

declare global {
	interface Window {
		Models?: unknown;
		Services?: unknown;
		Requests?: unknown;
	}
}

// ---- Tipos mínimos sin `any` para no romper ESLint ----
type Ctor<T = unknown> = new (...args: unknown[]) => T;

type ModelsShape = {
	Settings: Ctor<{
		setupEndpoint: (u: string) => void;
		setupEnvironment: (e: "live" | "sandbox") => void;
		setupCredentials: (key: string, hash: string) => void;
	}>;
	Card: Ctor<Record<string, unknown>>;
	Billing: Ctor<Record<string, unknown>>;
	Order: Ctor<Record<string, unknown>>;
};

type ServicesShape = {
	Transaction: Ctor<{
		doSale: (req: unknown) => Promise<unknown>;
		doAuth: (req: unknown) => Promise<unknown>;
	}>;
};

type RequestsShape = {
	SaleTransaction: Ctor<{
		setCard: (c: unknown) => void;
		setBilling: (b: unknown) => void;
		setOrder: (o: unknown) => void;
		withAuthenticationRequest: () => void;
	}>;
	AuthTransaction: Ctor<{
		setCard: (c: unknown) => void;
		setBilling: (b: unknown) => void;
		setOrder: (o: unknown) => void;
		withAuthenticationRequest: () => void;
	}>;
};
// -------------------------------------------------------

function sdk() {
	if (typeof window === "undefined") throw new Error("window no disponible");

	const w = window as Window;

	if (!w.Models || !w.Services || !w.Requests) {
		throw new Error("PixelPay SDK no está disponible en window.Models/Services/Requests");
	}

	// Refina los tipos locales SIN `any`
	const Models = w.Models as ModelsShape;
	const Services = w.Services as ServicesShape;
	const Requests = w.Requests as RequestsShape;

	return { Models, Services, Requests };
}

function buildSettings() {
	const { Models } = sdk();
	const s = new Models.Settings();

	// Env sandbox + endpoint
	s.setupEndpoint(process.env.NEXT_PUBLIC_PIXELPAY_ENDPOINT || "https://pixelpay.dev");
	s.setupEnvironment((process.env.NEXT_PUBLIC_PIXELPAY_ENV || "sandbox") === "live" ? "live" : "sandbox");

	// ✅ Credenciales de SANDBOX (desde NEXT_PUBLIC_)
	const key = process.env.NEXT_PUBLIC_PIXELPAY_KEY_ID || "";
	const hash = process.env.NEXT_PUBLIC_PIXELPAY_HASH || "";
	if (key && hash) s.setupCredentials(key, hash);

	return s;
}

function buildModels(
	w: { Models: ModelsShape },
	input: PixelPayTransactionInput
) {
	const card = new w.Models.Card();
	(card as Record<string, unknown>)["number"] = String(input.card.number).replace(/\s+/g, "");
	(card as Record<string, unknown>)["cvv2"] = String(input.card.cvv);
	const [mm, yy] = String(input.card.exp).split("/");
	(card as Record<string, unknown>)["expire_month"] = parseInt(mm || "0", 10);
	const y = parseInt(yy || "0", 10);
	(card as Record<string, unknown>)["expire_year"] = y < 100 ? 2000 + y : y;
	(card as Record<string, unknown>)["cardholder"] = input.card.holder;

	const billing = new w.Models.Billing();
	(billing as Record<string, unknown>)["address"] = input.billing.address || "";
	(billing as Record<string, unknown>)["country"] = (input.billing.country || "HN").toUpperCase();
	(billing as Record<string, unknown>)["state"] = (input.billing.state || "").toUpperCase();
	(billing as Record<string, unknown>)["city"] = input.billing.city || "";
	(billing as Record<string, unknown>)["phone"] = input.billing.phone || "";

	const order = new w.Models.Order();
	(order as Record<string, unknown>)["id"] = String(input.order.id);
	(order as Record<string, unknown>)["amount"] = Number(input.amount);
	(order as Record<string, unknown>)["currency"] = String(input.currency || "HNL").toUpperCase();
	(order as Record<string, unknown>)["note"] = input.order.description || "Recarga";
	(order as Record<string, unknown>)["customer_name"] = input.order.customer_name || "";
	(order as Record<string, unknown>)["customer_email"] = input.order.customer_email || "";

	return { card, billing, order };
}

export async function saleWith3DS(input: PixelPayTransactionInput): Promise<PixelResult> {
	const sdkRef = sdk();
	const svc = new sdkRef.Services.Transaction(buildSettings());
	const req = new (sdkRef.Requests.SaleTransaction)();

	const { card, billing, order } = buildModels({ Models: sdkRef.Models }, input);
	req.setCard(card);
	req.setBilling(billing);
	req.setOrder(order);
	req.withAuthenticationRequest(); // 3DS

	const raw = await svc.doSale(req);
	return toPixelResult(raw);
}

export async function authWith3DS(input: PixelPayTransactionInput) {
	const sdkRef = sdk();
	const svc = new sdkRef.Services.Transaction(buildSettings());
	const req = new (sdkRef.Requests.AuthTransaction)();

	const { card, billing, order } = buildModels({ Models: sdkRef.Models }, input);
	req.setCard(card);
	req.setBilling(billing);
	req.setOrder(order);
	req.withAuthenticationRequest();
	
	const raw = await svc.doAuth(req);
	return toPixelResult(raw);
}
// --- poner arriba, junto a tus tipos
export type PixelResult = {
	success: boolean;
	message?: string;
	data?: {
		response_approved?: boolean;
		payment_uuid?: string | null;
		payment_hash?: string | null;
		[k: string]: unknown;
	};
};

// Normalizador pequeño del SDK → PixelResult
function toPixelResult(resp: unknown): PixelResult {
	if (resp && typeof resp === "object") {
		const r = resp as Record<string, unknown>;
		const data = (r.data && typeof r.data === "object" ? r.data : {}) as Record<string, unknown>;
		// intenta detectar los flags más comunes
		const approved =
			(data.response_approved as boolean | undefined) ??
			(r.response_approved as boolean | undefined) ??
			false;

		return {
			success: (r.success as boolean | undefined) ?? approved ?? false,
			message:
				(r.message as string | undefined) ||
				(r.status_message as string | undefined) ||
				(r.response_message as string | undefined),
			data: {
				...data,
				response_approved: approved,
				payment_uuid: (data.payment_uuid as string | null | undefined) ?? (r.payment_uuid as string | null | undefined) ?? null,
				payment_hash: (data.payment_hash as string | null | undefined) ?? (r.payment_hash as string | null | undefined) ?? null,
			},
		};
	}
	return { success: false, message: "Respuesta desconocida del gateway" };
}
