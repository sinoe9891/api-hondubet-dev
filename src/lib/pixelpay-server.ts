// src/lib/pixelpay-server.ts
import "server-only";
import * as Pixel from "@pixelpay/sdk-core";

function getEnv(): "live" | "sandbox" {
  return process.env.PIXELPAY_ENV === "sandbox" ? "sandbox" : "live";
}

function buildSettings(): InstanceType<typeof Pixel.Models.Settings> {
  const s = new Pixel.Models.Settings();

  const endpoint = process.env.PIXELPAY_ENDPOINT;
  const keyId    = process.env.PIXELPAY_KEY_ID;
  const secret   = process.env.PIXELPAY_SECRET; // en server: **PLANO**
  const env      = getEnv();

  if (!endpoint) throw new Error("PIXELPAY_ENDPOINT no definido");
  if (!keyId)    throw new Error("PIXELPAY_KEY_ID no definido");
  if (!secret)   throw new Error("PIXELPAY_SECRET no definido");

  s.setupEndpoint(endpoint);
  s.setupCredentials(keyId, secret);
  s.setupEnvironment(env);
  return s;
}

// ===== helpers de tipos sin 'any'
function setField<T extends object, K extends string, V>(
  obj: T, key: K, value: V
): asserts obj is T & Record<K, V> {
  (obj as unknown as Record<string, unknown>)[key] = value as unknown;
}

function isFetchResponse(x: unknown): x is Response {
  return typeof x === "object" && x !== null &&
         "ok" in (x as Response) && "json" in (x as Response);
}

async function toJsonObject(x: unknown): Promise<Record<string, unknown>> {
  if (isFetchResponse(x)) {
    const j = await x.json();
    return (typeof j === "object" && j !== null) ? (j as Record<string, unknown>) : { value: j as unknown };
  }
  if (typeof x === "object" && x !== null) return x as Record<string, unknown>;
  return { value: x as unknown };
}

// ===== API pública server-only
export async function verifyPaymentHash(hash: string, orderId: string): Promise<boolean> {
  const svc = new Pixel.Services.Transaction(buildSettings());
  const secret = process.env.PIXELPAY_SECRET;
  if (!secret) throw new Error("PIXELPAY_SECRET no definido");
  return svc.verifyPaymentHash(hash, orderId, secret);
}

export async function getStatusByPaymentUuid(paymentUuid: string): Promise<Record<string, unknown>> {
  const svc = new Pixel.Services.Transaction(buildSettings());
  const req = new Pixel.Requests.StatusTransaction();
  setField(req, "payment_uuid", String(paymentUuid));
  const resp = await svc.getStatus(req);
  return toJsonObject(resp);
}

export async function capture(paymentUuid: string, amount: number | string): Promise<Record<string, unknown>> {
  const svc = new Pixel.Services.Transaction(buildSettings());
  const req = new Pixel.Requests.CaptureTransaction();
  setField(req, "payment_uuid", String(paymentUuid));
  setField(req, "transaction_approved_amount", String(amount));
  const resp = await svc.doCapture(req);
  return toJsonObject(resp);
}
