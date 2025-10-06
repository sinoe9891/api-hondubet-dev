// src/lib/store.ts

type AdminModule = typeof import("firebase-admin");
let admin: AdminModule | null = null;

async function getAdmin(): Promise<AdminModule | null> {
  if (admin) return admin;
  try {
    const mod = await import("firebase-admin");
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) {
      console.warn("[store] FIREBASE_SERVICE_ACCOUNT_JSON no definido; skip init");
      return null;
    }
    const cred = JSON.parse(raw);
    if (!mod.apps.length) {
      mod.initializeApp({ credential: mod.credential.cert(cred) });
    }
    admin = mod;
    return admin;
  } catch {
    console.warn("[store] firebase-admin no instalado/configurado");
    return null;
  }
}

export type TxKind = "sale" | "status" | "callback" | "error";

/* ---------- Redacción segura ---------- */
function isString(v: unknown): v is string { return typeof v === "string"; }
function isPlainObject(v: unknown): v is Record<string, unknown> { return typeof v === "object" && v !== null && !Array.isArray(v); }
function maskCardLike(s: string): string { return s.replace(/\d{13,19}/g, (m) => m.replace(/.(?=.{4})/g, "*")); }

function redactValue(value: unknown): unknown {
  if (isString(value)) return maskCardLike(value);
  if (Array.isArray(value)) return value.map((it) => redactValue(it));
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const key = k.toLowerCase();
      if (["card_number", "pan", "primaryaccountnumber", "card_cvv", "cvv", "cvc"].includes(key)) { out[k] = "[REDACTED]"; continue; }
      if (["card_expire", "expiry", "expire"].includes(key)) { const s = isString(v) ? v : String(v ?? ""); out[k] = s ? `**${s.slice(-2)}` : "[REDACTED]"; continue; }
      out[k] = redactValue(v);
    }
    return out;
  }
  return value;
}

function redactPayload(payload: unknown): unknown {
  try { return redactValue(JSON.parse(JSON.stringify(payload)) as unknown); }
  catch { return payload; }
}

/* ---------- Índice payment_uuid -> order_id ---------- */
export async function linkPaymentToOrder(payment_uuid: string, order_id: string): Promise<void> {
  const a = await getAdmin(); if (!a) return;
  if (!payment_uuid?.trim() || !order_id?.trim()) return;
  const db = a.firestore();
  await db.collection("hondubet_payment_index").doc(payment_uuid).set({
    order_id,
    updatedAt: a.firestore.FieldValue.serverTimestamp(),
    createdAt: a.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

export async function getOrderIdByPaymentUuid(payment_uuid: string): Promise<string | null> {
  const a = await getAdmin(); if (!a) return null;
  const db = a.firestore();
  const snap = await db.collection("hondubet_payment_index").doc(payment_uuid).get();
  return snap.exists ? (snap.data()?.order_id as string | undefined) ?? null : null;
}

/* ---------- Guardado por orden + history subcollection ---------- */
export async function saveTxByOrder(
  kind: TxKind,
  order_id: string,
  payload: unknown,
  opts?: { payment_uuid?: string }
): Promise<{ historyDocId?: string }> {
  const a = await getAdmin(); if (!a) return {};
  const db = a.firestore();

  const redacted = redactPayload(payload);
  const ref = db.collection("hondubet_orders").doc(order_id);

  await ref.set({
    order_id,
    lastEvent: kind,
    lastPayload: redacted,
    updatedAt: a.firestore.FieldValue.serverTimestamp(),
    createdAt: a.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const historyRef = await ref.collection("history").add({
    kind,
    payload: redacted,
    at: a.firestore.FieldValue.serverTimestamp(),
  });

  if (opts?.payment_uuid) {
    await linkPaymentToOrder(opts.payment_uuid, order_id);
    await ref.set({ payment_uuid: opts.payment_uuid }, { merge: true });
  }

  return { historyDocId: historyRef.id };
}

/* ---------- Helpers debug (leer doc y últimos history) ---------- */
export async function getOrderDebug(order_id: string, historyLimit = 3): Promise<Record<string, unknown> | null> {
  const a = await getAdmin(); if (!a) return null;
  const db = a.firestore();
  const ref = db.collection("hondubet_orders").doc(order_id);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const order = snap.data() ?? {};
  const historySnap = await ref.collection("history").orderBy("at", "desc").limit(historyLimit).get();
  const history = historySnap.docs.map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
  return { order, history };
}
