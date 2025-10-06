import { NextResponse } from "next/server";
import { capture } from "@/lib/pixelpay-server";

export const runtime = "nodejs";

interface CaptureBody {
  payment_uuid?: string | null;
  amount?: number | string | null;
}
interface CaptureResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export async function POST(req: Request) {
  try {
    const bodyUnknown = await req.json().catch(() => null) as unknown;
    const body = (typeof bodyUnknown === "object" && bodyUnknown !== null ? bodyUnknown as CaptureBody : {});

    const payment_uuid = body.payment_uuid ?? null;
    const amountInput = body.amount ?? null;

    if (!payment_uuid) {
      return NextResponse.json({ success: false, message: "payment_uuid requerido" } satisfies CaptureResult, { status: 400 });
    }
    const amtNum = typeof amountInput === "string" ? parseFloat(amountInput) : Number(amountInput);
    if (!Number.isFinite(amtNum)) {
      return NextResponse.json({ success: false, message: "amount requerido y numérico" } satisfies CaptureResult, { status: 400 });
    }

    const respUnknown: unknown = await capture(payment_uuid, amtNum);
    const resp: CaptureResult = (typeof respUnknown === "object" && respUnknown !== null)
      ? (respUnknown as CaptureResult)
      : { success: false, message: "Respuesta inválida del gateway" };

    return NextResponse.json(resp);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error interno";
    return NextResponse.json({ success: false, message } satisfies CaptureResult, { status: 500 });
  }
}
