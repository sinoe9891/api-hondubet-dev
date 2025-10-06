// /src/middleware.ts (API BMT)
import { NextRequest, NextResponse } from "next/server";

const BMT_API_KEY = process.env.BMT_API_KEY;
const INTERNAL_APP_KEY = process.env.INTERNAL_APP_KEY;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
	.split(",")
	.map(s => s.trim())
	.filter(Boolean);

// Interpretación explícita: solo "true" activa la exigencia
const REQUIRE_KEYS_FOR_WHITELIST =
	(process.env.REQUIRE_KEYS_FOR_WHITELIST || "").trim().toLowerCase() === "true";

function withCors(origin: string | null, res: NextResponse) {
	const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : "*";
	res.headers.set("Access-Control-Allow-Origin", allowOrigin);
	res.headers.set("Vary", "Origin");
	res.headers.set(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, x-app-key"
	);
	res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
	res.headers.set("Access-Control-Max-Age", "600");
	return res;
}

export function middleware(req: NextRequest) {
	const { pathname } = new URL(req.url);
	const origin = req.headers.get("origin");

	if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
		return NextResponse.next();
	}

	if (pathname.startsWith("/api/") && req.method === "OPTIONS") {
		return withCors(origin, new NextResponse(null, { status: 204 }));
	}

	if (pathname.startsWith("/api/v1/orders/") && req.method === "GET") {
		return withCors(origin, NextResponse.next());
	}

	if (pathname.startsWith("/api/")) {
		const apiKey = req.headers.get("x-api-key");
		const appKey = req.headers.get("x-app-key");
		const isOriginAllowed = origin ? ALLOWED_ORIGINS.includes(origin) : false;

		const hasValidKey =
			(apiKey && BMT_API_KEY && apiKey === BMT_API_KEY) ||
			(appKey && INTERNAL_APP_KEY && appKey === INTERNAL_APP_KEY);

		// Si el origen está en whitelist y NO exigimos llaves -> pasa
		if (isOriginAllowed && !REQUIRE_KEYS_FOR_WHITELIST) {
			console.log("[mw] PASS whitelist:", origin);
			return withCors(origin, NextResponse.next());
		}

		// Si exigimos llaves (o no está en whitelist), valida llaves
		if (hasValidKey) {
			console.log("[mw] PASS keys:", { origin, api: !!apiKey, app: !!appKey });
			return withCors(origin, NextResponse.next());
		}
		console.warn("[mw] BLOCK 401:", {
			origin,
			isOriginAllowed,
			REQUIRE_KEYS_FOR_WHITELIST,
			hasXApi: !!apiKey,
			hasXApp: !!appKey,
		});
		// 401 uniforme
		return withCors(
			origin,
			NextResponse.json(
				{ success: true, status: "ERROR", message: "Unauthorized", data: { http: 401 } },
				{ status: 401 }
			)
		);
	}

	return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
