"use client";

// Tipos mínimos del SDK (sin `any`)
type SDKCtor<T = unknown> = new (...args: unknown[]) => T;

export type PixelPayResponse = {
  success?: boolean;
  message?: string;
  data?: {
    response_approved?: boolean;
    response_code?: string | number;
    response_reason?: string;
    payment_uuid?: string | null;
    payment_hash?: string | null;
    [k: string]: unknown;
  } | null;
  [k: string]: unknown;
};

type PixelSDK = {
  Models: {
    Settings: SDKCtor<{
      setupEndpoint: (u: string) => void;
      setupCredentials: (k: string, h: string) => void;
      setupEnvironment: (e: "live" | "sandbox") => void;
    }>;
  };
  Requests: {
    SaleTransaction: SDKCtor<Record<string, unknown>>;
    AuthTransaction: SDKCtor<Record<string, unknown>>;
  };
  Services: {
    Transaction: SDKCtor<{
      withAuthenticationRequest: (req: unknown) => Promise<unknown>;
    }>;
  };
};

type WithPixels = Record<string, unknown> & {
  Pixel?: unknown;
  PixelPay?: unknown;
  pixelpay?: unknown;
};

export type PixelPayTransactionInput = {
  amount: number | string;
  currency: "HNL" | "USD" | "NIO" | string;
  order: {
    id: string;
    description?: string;
    customer_name?: string;
    customer_email?: string;
  };
  card: { number: string; holder: string; exp: string; cvv: string };
  billing?: { address?: string; country?: string; state?: string; city?: string; phone?: string };
  [k: string]: unknown;
};

type AnyObj = Record<string, unknown>;

// ⚠️ usa el build para navegador del SDK
const CDN_SRC = "https://cdn.jsdelivr.net/npm/@pixelpay/sdk-core@2.4.3/lib/browser/index.js";

/** Garantiza SDK en window.* (o lo carga del CDN). */
async function ensureSDK(): Promise<PixelSDK> {
  const w: WithPixels = typeof window !== "undefined" ? (window as unknown as WithPixels) : ({} as WithPixels);
  let SDK = (w.Pixel ?? w.PixelPay ?? w.pixelpay) as unknown;
  if (SDK) return SDK as PixelSDK;

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = CDN_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar @pixelpay/sdk-core por CDN"));
    document.head.appendChild(s);
  });

  SDK = (w.Pixel ?? w.PixelPay ?? w.pixelpay) as unknown;
  if (!SDK) throw new Error("PixelPay SDK no está disponible en window.*");
  return SDK as PixelSDK;
}

function getEnvClient(): "live" | "sandbox" {
  return process.env.NEXT_PUBLIC_PIXELPAY_ENV === "live" ? "live" : "sandbox";
}

function assignAll(target: AnyObj, src: AnyObj) {
  for (const [k, v] of Object.entries(src)) target[k] = v as unknown;
}

function toPixelResponse(x: unknown): PixelPayResponse {
  if (x && typeof x === "object") return x as PixelPayResponse;
  return { success: false, message: String(x), data: null };
}

async function run3DS(kind: "sale" | "auth", input: PixelPayTransactionInput): Promise<PixelPayResponse> {
  const Pixel = await ensureSDK();

  const settings = new Pixel.Models.Settings();
  settings.setupEndpoint("/api/pixelpay"); // ← tu proxy
  settings.setupCredentials("", "");       // ← nunca credenciales en el cliente
  settings.setupEnvironment(getEnvClient());

  const req = kind === "sale" ? new Pixel.Requests.SaleTransaction() : new Pixel.Requests.AuthTransaction();
  assignAll(req as AnyObj, input as AnyObj);

  const svc = new Pixel.Services.Transaction(settings);
  const resp = await svc.withAuthenticationRequest(req);
  return toPixelResponse(resp);
}

export async function saleWith3DS(input: PixelPayTransactionInput): Promise<PixelPayResponse> {
  return run3DS("sale", input);
}

export async function authWith3DS(input: PixelPayTransactionInput): Promise<PixelPayResponse> {
  return run3DS("auth", input);
}
