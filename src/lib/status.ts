// /src/lib/pixelpay/status.ts
const PIXELPAY_ENDPOINT = process.env.PIXELPAY_ENDPOINT ?? "https://pixelpay.dev";
const PIXELPAY_ENV = process.env.PIXELPAY_ENV ?? "sandbox";
const PIXELPAY_KEY_ID = process.env.PIXELPAY_KEY_ID ?? "";
const PIXELPAY_SECRET = process.env.PIXELPAY_SECRET ?? ""; // mismo valor que x-auth-hash

export type PixelStatusData = {
  status: string;
  attemps?: number;
  history?: unknown;
};

type PixelStatusResponse = {
  success?: unknown;
  data?: {
    status?: unknown;
    attemps?: unknown;
    history?: unknown;
  } | null;
};

function buildPixelHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/x-www-form-urlencoded",
    "x-key-id": PIXELPAY_KEY_ID,
    "x-auth-hash": PIXELPAY_SECRET,
  };
}

/**
 * Consulta el estado remoto de un cobro en PixelPay usando payment_uuid.
 * Devuelve null si algo sale mal.
 */
export async function fetchPixelPaymentStatus(
  paymentUuid: string
): Promise<PixelStatusData | null> {
  if (!paymentUuid) return null;

  const base = PIXELPAY_ENDPOINT.replace(/\/$/, "");
  const url = `${base}/api/v2/transaction/status`;

  const body = new URLSearchParams({
    payment_uuid: paymentUuid,
    env: PIXELPAY_ENV,
  });

  console.log("[pixelpay-check] Requesting remote status:", {
    url,
    payment_uuid: paymentUuid,
    env: PIXELPAY_ENV,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: buildPixelHeaders(),
    body,
  });

  const json: unknown = await res.json().catch(() => null);

  console.log("[pixelpay-check] Raw response from PixelPay:", json);

  if (!json || typeof json !== "object") return null;

  const parsed = json as PixelStatusResponse;

  if (!parsed.success || !parsed.data) return null;

  const statusValue = parsed.data.status;
  const attempsValue = parsed.data.attemps;

  return {
    status: String(statusValue ?? ""),
    attemps: typeof attempsValue === "number" ? attempsValue : undefined,
    history: parsed.data.history,
  };
}
