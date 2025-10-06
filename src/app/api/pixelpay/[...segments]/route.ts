import { NextRequest } from "next/server";
export const runtime = "nodejs";

/** Normaliza ENDPOINT para que no termine con "/" y evitar URLs con doble slash */
const RAW_ENDPOINT = process.env.PIXELPAY_ENDPOINT || "";
const ENDPOINT = RAW_ENDPOINT.endsWith("/") ? RAW_ENDPOINT.slice(0, -1) : RAW_ENDPOINT;

const KEY_ID = process.env.PIXELPAY_KEY_ID || "";
const HASH   = process.env.PIXELPAY_HASH || "";

function sameOrigin(req: NextRequest) {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").trim();
  if (!base) return false;
  const origin  = (req.headers.get("origin")  || "").trim();
  const referer = (req.headers.get("referer") || "").trim();
  return origin.startsWith(base) || referer.startsWith(base);
}

async function forward(req: NextRequest, url: string, body?: string | null) {
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        "content-type": req.headers.get("content-type") ?? "application/json",
        "x-auth-key": KEY_ID,
        "x-auth-hash": HASH,
      },
      body: body ?? undefined,
      // Puedes configurar timeout con AbortController si lo requieres
      cache: "no-store",
    });

    const text = await upstream.text(); // devolvemos tal cual
    const contentType = upstream.headers.get("content-type") ?? "application/json";
    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    // Falla de red entre tu server y el gateway
    const msg = (e as Error)?.message || String(e);
    return new Response(JSON.stringify({ success: false, message: msg }), {
      status: 502,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }
}

/** POST: reenvía al gateway */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ segments: string[] }> }
) {
  if (!ENDPOINT || !KEY_ID || !HASH) {
    return new Response(JSON.stringify({ success:false, message:"PixelPay env misconfigured" }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  if (process.env.NODE_ENV !== "development" && !sameOrigin(req)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { segments } = await context.params;
  const path = (segments ?? []).join("/");
  const url = `${ENDPOINT}/${path}`;
  const raw = await req.text();
  return forward(req, url, raw);
}

/** GET: reenvía al gateway */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ segments: string[] }> }
) {
  if (!ENDPOINT || !KEY_ID || !HASH) {
    return new Response(JSON.stringify({ success:false, message:"PixelPay env misconfigured" }), {
      status: 500,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });
  }
  if (process.env.NODE_ENV !== "development" && !sameOrigin(req)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { segments } = await context.params;
  const path = (segments ?? []).join("/");
  const qs = req.nextUrl.search || "";
  const url = `${ENDPOINT}/${path}${qs}`;
  return forward(req, url, null);
}

/** (Opcional) OPTIONS si necesitas preflight simple */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "cache-control": "no-store",
      // agrega aquí CORS explícito si tu setup lo requiere
    },
  });
}
