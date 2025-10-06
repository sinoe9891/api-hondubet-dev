// /src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

const BMT_API_KEY = process.env.BMT_API_KEY;
const INTERNAL_APP_KEY = process.env.INTERNAL_APP_KEY;

// Coma-separado: http://127.0.0.1:3000,https://hondubet.com,https://www.hondubet.com
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Si pones "false", un origen whitelisted NO necesita x-api-key/x-app-key
const REQUIRE_KEYS_FOR_WHITELIST = (process.env.REQUIRE_KEYS_FOR_WHITELIST ?? "true").toLowerCase() !== "false";

// Helpers CORS
function withCors(origin: string | null, res: NextResponse) {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  res.headers.set("Access-Control-Allow-Origin", allowOrigin);
  res.headers.set("Vary", "Origin");
  res.headers.set(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, x-app-key"
  );
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.headers.set("Access-Control-Max-Age", "600"); // 10 min
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = new URL(req.url);
  const origin = req.headers.get("origin");

  // Deja pasar estáticos
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Responder preflight CORS para /api/*
  if (pathname.startsWith("/api/") && req.method === "OPTIONS") {
    return withCors(origin, new NextResponse(null, { status: 204 }));
  }

  // GET de órdenes: libre (lo usa tu propio checkout del mismo dominio)
  if (pathname.startsWith("/api/v1/orders/") && req.method === "GET") {
    return withCors(origin, NextResponse.next());
  }

  // Otras APIs: exigir llave, salvo whitelist si así lo decides
  if (pathname.startsWith("/api/")) {
    const apiKey = req.headers.get("x-api-key");
    const appKey = req.headers.get("x-app-key");
    const isOriginAllowed = origin ? ALLOWED_ORIGINS.includes(origin) : false;

    const hasValidKey =
      (apiKey && BMT_API_KEY && apiKey === BMT_API_KEY) ||
      (appKey && INTERNAL_APP_KEY && appKey === INTERNAL_APP_KEY);

    // Si el origen está en whitelist y NO quieres exigir llaves, deja pasar
    if (isOriginAllowed && !REQUIRE_KEYS_FOR_WHITELIST) {
      return withCors(origin, NextResponse.next());
    }

    // En cualquier otro caso, requiere llaves válidas
    if (hasValidKey) {
      return withCors(origin, NextResponse.next());
    }

    return withCors(
      origin,
      NextResponse.json(
        { success: false, error: "UNAUTHORIZED", message: "Unauthorized" },
        { status: 401 }
      )
    );
  }

  // Resto
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
