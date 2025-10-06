import Image from "next/image";
import Link from "next/link";
import Code from "@/components/Code";

export const metadata = {
	title: "BMT Recargas API – Documentación",
	description: "Guía de integración (Next.js + PHP) para el API de Recargas BMT.",
};

export default function DocsPage() {
	return (
		<div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-100">
			{/* NAV */}
			<header className="w-full sticky top-0 z-30 backdrop-blur border-b border-black/5 dark:border-white/10 bg-white/60 dark:bg-neutral-950/60">
				<div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<Image src="/brand/bmt-logo.png" alt="BMTicket" width={40} height={40} className="rounded-md" />
						<span className="font-semibold tracking-tight text-lg">BMTicket</span>
					</div>
					<nav className="hidden sm:flex items-center gap-6 text-sm">
						<Link href="/">Inicio</Link>
						<Link href="/eventos">Eventos</Link>
						<Link href="/docs" className="font-semibold">Docs</Link>
					</nav>
				</div>
			</header>

			{/* BODY */}
			<main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
				{/* HERO */}
				<section className="grid md:grid-cols-[1fr,320px] gap-10">
					<div className="space-y-6">
						<h1 className="text-3xl sm:text-4xl font-extrabold leading-tight">
							BMT Recargas API — Integración (Proyecto Adjuntado)
						</h1>
						<p className="text-neutral-600 dark:text-neutral-300 max-w-prose">
							Esta guía describe el flujo <b>init → widget 3DS → confirm</b> y los archivos reales incluidos en los ejemplos de <b>Next.js</b> y <b>PHP</b>.
							Todo corresponde al <b>proyecto finalizado</b> que montaste.
						</p>
						<div className="flex flex-col sm:flex-row gap-3">
							<a href="/downloads/hondubet-nextjs-example.zip"
								className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium border border-black/10 dark:border-white/15 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition">
								Descargar ejemplo Next.js
							</a>
							<a href="/downloads/hondubet-php-example.zip"
								className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition">
								Descargar ejemplo PHP
							</a>
						</div>
					</div>

					{/* TOC */}
					<aside className="hidden md:block">
						<div className="sticky top-24 space-y-2 text-sm">
							<p className="uppercase tracking-wider text-neutral-500 text-xs">Índice</p>
							{[
								["#ambientes", "Ambientes & URLs"],
								["#headers", "Cabeceras y seguridad"],
								["#init", "Crear orden (init)"],
								["#widget", "Widget & 3DS"],
								["#confirm", "Confirmar resultado"],
								["#next", "Integración Next.js"],
								["#php", "Integración PHP"],
								["#errors", "Errores & mensajes"],
								["#sandbox", "Sandbox & QA"],
								["#checklist", "Checklist"],
							].map(([href, label]) => (
								<a key={href} href={href} className="block hover:underline underline-offset-4">{label}</a>
							))}
						</div>
					</aside>
				</section>

				{/* AMBIENTES */}
				<section id="ambientes" className="mt-16 space-y-4">
					<h2 className="text-xl font-bold">Ambientes & URLs</h2>
					<div className="grid gap-4">
						<div className="border border-black/10 dark:border-white/15 rounded-2xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
							<p className="text-sm mb-3 text-neutral-600 dark:text-neutral-300">Producción (activo)</p>
							<ul className="text-sm list-disc ml-5 space-y-1">
								<li>Base: <code>https://api.bmticket.com</code></li>
								<li>Init: <code>POST /api/v1/checkout/init</code></li>
								<li>Confirm: <code>POST /api/v1/checkout/confirm</code></li>
								<li>Orders: <code>GET /api/v1/orders/:order_id</code></li>
								<li>Widget: <code>/bmt-checkout.js</code></li>
							</ul>
						</div>
						<div className="border border-dashed border-black/10 dark:border-white/15 rounded-2xl p-5">
							<p className="text-sm">
								El ambiente de desarrollo (sandbox) se habilita bajo solicitud y registra los <b>Origins</b> de dev.
							</p>
						</div>
					</div>
				</section>

				{/* HEADERS */}
				<section id="headers" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Cabeceras y seguridad</h2>
					<div className="grid md:grid-cols-2 gap-4">
						<div className="border border-black/10 dark:border-white/15 rounded-2xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
							<h3 className="font-semibold mb-2">Enviar SIEMPRE</h3>
							<ul className="text-sm list-disc ml-5 space-y-1">
								<li><code>Content-Type: application/json</code></li>
								<li><code>Accept: application/json</code></li>
								<li><code>X-API-Key: &lt;clave&gt;</code></li>
								<li><code>X-App-Key: &lt;clave&gt;</code> (si aplica)</li>
								<li><code>Origin</code> y <code>Referer</code> que <b>coincidan exacto</b> con la allowlist</li>
							</ul>
						</div>
						<div className="border border-black/10 dark:border-white/15 rounded-2xl p-5">
							<h3 className="font-semibold mb-2">Claves</h3>
							<Code lang="env" label=".env / servidor">{`
BMT_BASE_URL=https://api.bmticket.com
BMT_API_KEY=<TU_API_KEY>
BMT_APP_KEY=<OPCIONAL_OTRA_KEY>
BMT_ORIGIN=https://<tu-dominio-exacto>/
`}</Code>
						</div>
					</div>
					<p className="text-xs text-neutral-500 mt-2">Nunca expongas claves de servidor en el navegador.</p>
				</section>

				{/* INIT */}
				<section id="init" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Crear orden (init)</h2>
					<Code lang="json" label="Request">{`
{
  "amount": 25,
  "currency": "HNL",
  "description": "Recarga Hondubet",
  "customer": { "name": "Nombre", "email": "correo@ejemplo.com" },
  "billing": { "address": "Barrio", "country": "HN", "state": "CM", "city": "Siguatepeque", "phone": "+504..." }
}`}</Code>
					<Code lang="json" label="Response">{`
{
  "success": true,
  "order_id": "ORD-...",
  "checkout_url": "https://api.bmticket.com/checkout/ORD-...?mode=sale"
}`}</Code>
				</section>

				{/* WIDGET */}
				<section id="widget" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Widget & 3DS</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-300">
						Carga <code>/bmt-checkout.js</code> y abre el modal con el <code>checkout_url</code> que te devolvió <b>init</b>.
					</p>
					<Code lang="tsx" label="Abrir modal (client)">{`
if (!window.BMTCheckout) throw new Error("Widget no disponible");
window.BMTCheckout.open({
  checkoutUrl: initResp.checkout_url,
  onResult: async (result: any) => {
    // Llama confirm con order_id + datos opcionales del widget
  },
});
`}</Code>
				</section>

				{/* CONFIRM */}
				<section id="confirm" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Confirmar resultado</h2>
					<Code lang="json" label="Request mínimo">{`
{
  "order_id": "ORD-...",
  "status": "APPROVED",
  "payment_uuid": "P-...",
  "payment_hash": "...",
  "message": "opcional",
  "pixel_codes": { "code": "01", "uuid": "P-...", "hash": "..." }
}`}</Code>
					<Code lang="json" label="Response">{`
{ "success": true, "status": "PAID|DECLINED|ERROR", "message": "Texto", "data": { "http": 200|401|412|... } }
`}</Code>
				</section>

				{/* NEXT.JS */}
				<section id="next" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Integración Next.js (ejemplo adjunto)</h2>
					<ul className="text-sm list-disc ml-5 space-y-1">
						<li>Handlers: <code>app/api/bmt/init/route.ts</code> y <code>app/api/bmt/confirm/route.ts</code> con headers correctos.</li>
						<li>UI: <code>src/components/DepositDialog.tsx</code> (init → widget → confirm).</li>
						<li>Mensajes: <code>src/lib/pixel/codes.ts</code> y <code>src/lib/pixel/buildMessage.ts</code>.</li>
					</ul>
					<Code lang="ts" label="Lado servidor (init)">{`
// Headers claves:
"X-API-Key": key,
"X-App-Key": appKey,
"Origin": process.env.BMT_ORIGIN!,
"Referer": process.env.BMT_ORIGIN!,
"Accept": "application/json",
`}</Code>
				</section>

				{/* PHP */}
				<section id="php" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Integración PHP (ejemplo adjunto)</h2>
					<ul className="text-sm list-disc ml-5 space-y-1">
						<li><code>config.php</code>: endpoints, claves y helpers cURL con headers.</li>
						<li><code>crear-orden.php</code> → <code>/checkout/init</code></li>
						<li><code>confirmar-orden.php</code> → <code>/checkout/confirm</code></li>
						<li><code>codes.js</code>: mapa de errores / sandbox</li>
					</ul>
					<Code lang="bash" label="Test rápido (cURL)">{`
curl -X POST https://api.bmticket.com/api/v1/checkout/init \
 -H 'Content-Type: application/json' -H 'Accept: application/json' \
 -H 'X-API-Key: <TU_API_KEY>' -H 'X-App-Key: <TU_APP_KEY>' \
 -H 'Origin: https://<tu-dominio-exacto>/' -H 'Referer: https://<tu-dominio-exacto>/' \
 -d '{ "amount":1,"currency":"HNL","description":"Recarga Hondubet","customer":{"name":"Nombre","email":"correo@ejemplo.com"},"billing":{"address":"...","country":"HN","state":"CM","city":"Siguatepeque","phone":"+504..."}}'
`}</Code>
				</section>

				{/* ERRORES */}
				<section id="errors" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Errores & mensajes</h2>
					<div className="grid md:grid-cols-2 gap-4">
						<div className="border border-black/10 dark:border-white/15 rounded-2xl p-5">
							<h3 className="font-semibold mb-2">HTTP del API</h3>
							<ul className="text-sm list-disc ml-5 space-y-1">
								<li><b>401/403</b> No autorizado (keys/origin)</li>
								<li><b>402</b> Pago declinado</li>
								<li><b>412</b> Intentos excedidos / precondición</li>
								<li><b>422</b> Input inválido</li>
								<li><b>408</b> Timeout</li>
								<li><b>5xx</b> Falla del servicio</li>
							</ul>
						</div>
						<div className="border border-black/10 dark:border-white/15 rounded-2xl p-5">
							<h3 className="font-semibold mb-2">Códigos del proveedor</h3>
							<p className="text-sm text-neutral-600 dark:text-neutral-300">
								Ver <code>src/lib/pixel/codes.ts</code> (Next) y <code>codes.js</code> (PHP).
							</p>
							<p className="text-sm mt-2">La UI prioriza: <b>estado del API</b> &gt; <b>código proveedor</b> &gt; <b>sandbox</b>.</p>
						</div>
					</div>
				</section>

				{/* SANDBOX */}
				<section id="sandbox" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Sandbox & QA</h2>
					<p className="text-sm text-neutral-600 dark:text-neutral-300">
						Casos por monto (1..14) disponibles. En Next: <code>NEXT_PUBLIC_BMT_ENV=sandbox</code>.
					</p>
				</section>

				{/* CHECKLIST */}
				<section id="checklist" className="mt-12 space-y-4">
					<h2 className="text-xl font-bold">Checklist</h2>
					<ul className="text-sm list-disc ml-5 space-y-1">
						<li>Claves en servidor (no en cliente).</li>
						<li>Headers completos: <code>X-API-Key</code>, <code>X-App-Key</code>, <code>Origin</code>, <code>Referer</code>, <code>Accept</code>.</li>
						<li><b>Origin/Referer</b> coinciden exacto con allowlist.</li>
						<li>Mensajería de errores integrada.</li>
						<li>Sandbox activado bajo solicitud.</li>
					</ul>
				</section>

				{/* DOWNLOADS */}
				<section className="mt-16">
					<div className="grid sm:grid-cols-2 gap-4">
						<a href="/downloads/hondubet-nextjs-example.zip" className="group border border-black/10 dark:border-white/15 rounded-2xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur hover:shadow-lg transition">
							<div className="flex items-center justify-between mb-1">
								<h3 className="font-semibold">Ejemplo Next.js</h3>
								<span className="opacity-0 group-hover:opacity-100 transition">⇩</span>
							</div>
							<p className="text-sm text-neutral-600 dark:text-neutral-300">App Router, handlers, builder de mensajes.</p>
						</a>
						<a href="/downloads/hondubet-php-example.zip" className="group border border-black/10 dark:border-white/15 rounded-2xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur hover:shadow-lg transition">
							<div className="flex items-center justify-between mb-1">
								<h3 className="font-semibold">Ejemplo PHP</h3>
								<span className="opacity-0 group-hover:opacity-100 transition">⇩</span>
							</div>
							<p className="text-sm text-neutral-600 dark:text-neutral-300">cURL server-side + mapa de códigos.</p>
						</a>
					</div>
				</section>
			</main>

			{/* FOOTER */}
			<footer className="border-t border-black/5 dark:border-white/10">
				<div className="mx-auto max-w-6xl px-4 py-8 text-sm text-neutral-500 flex flex-col sm:flex-row gap-2 items-center justify-between">
					<div className="flex items-center gap-2">
						<Image src="/brand/bmt-logo.png" alt="BMTicket" width={20} height={20} className="rounded" />
						<span>© {new Date().getFullYear()} BMTicket</span>
					</div>
					<div className="flex items-center gap-4">
						<a href="/privacy" className="hover:underline">Privacidad</a>
						<a href="/terms" className="hover:underline">Términos</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
