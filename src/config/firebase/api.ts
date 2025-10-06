import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import type { ServiceAccount } from "firebase-admin";
import {
  getFirestore,
  FieldValue,
  Firestore,
  DocumentReference,
  CollectionReference,
  DocumentData,
  SetOptions,
} from "firebase-admin/firestore";

/** Intenta parsear el JSON del service account desde env en varios formatos. */
function parseServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON no está definido");

  // 1) JSON directo
  try {
    const obj: unknown = JSON.parse(raw);
    return obj as ServiceAccount;
  } catch { /* fallthrough */ }

  // 2) Arreglando \n escapados / comillas envolventes
  try {
    const fixed = raw.trim()
      .replace(/^'+|'+$/g, "")
      .replace(/^"+|"+$/g, "")
      .replace(/\\n/g, "\n");
    const obj: unknown = JSON.parse(fixed);
    return obj as ServiceAccount;
  } catch { /* fallthrough */ }

  // 3) Base64
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const obj: unknown = JSON.parse(decoded);
    return obj as ServiceAccount;
  } catch { /* fallthrough */ }

  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON inválido: no se pudo parsear");
}

let app: App;
if (!getApps().length) {
  const creds = parseServiceAccount();
  app = initializeApp({ credential: cert(creds) });
} else {
  app = getApps()[0]!;
}

const db = getFirestore(app);

/** Re-export tipado del DB (admin) */
export type Db = Firestore;
export function getDb(): Db { return db; }

/** Helpers tipados para refs */
export function doc<T extends DocumentData = DocumentData>(
  dbInst: Db,
  col: string,
  id: string
): DocumentReference<T> {
  return dbInst.collection(col).doc(id) as DocumentReference<T>;
}

export function collection<T extends DocumentData = DocumentData>(
  dbInst: Db,
  col: string
): CollectionReference<T> {
  return dbInst.collection(col) as CollectionReference<T>;
}

/** Snapshot ligero compatible con tu uso actual (exists + data()) */
export interface LiteDocSnapshot<T extends DocumentData> {
  exists: boolean;
  data(): T | undefined;
}

/** getDoc tipado: devuelve exists + data() tipado */
export async function getDoc<T extends DocumentData = DocumentData>(
  ref: DocumentReference<T>
): Promise<LiteDocSnapshot<T>> {
  const snap = await ref.get();
  return {
    exists: snap.exists,
    data: () => (snap.exists ? (snap.data() as T) : undefined),
  };
}

/** setDoc tipado (con merge opcional) */
export async function setDoc<T extends DocumentData = DocumentData>(
  ref: DocumentReference<T>,
  data: T,
  opts?: SetOptions
): Promise<void> {
  if (opts) {
    await ref.set(data, opts);
  } else {
    await ref.set(data);
  }
}

/** updateDoc tipado (Partial<T>) */
export async function updateDoc<T extends DocumentData = DocumentData>(
  ref: DocumentReference<T>,
  data: Partial<T>
): Promise<void> {
  await ref.update(data as Partial<T>);
}

/** serverTimestamp (admin) */
export const serverTimestamp = (): FieldValue => FieldValue.serverTimestamp();
