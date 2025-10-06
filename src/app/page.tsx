"use client";
import Image from "next/image";
import Link from "next/link";

// =====================
// app/page.tsx (Home)
// =====================
export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-100">
      {/* NAV */}
      <header className="w-full sticky top-0 z-30 backdrop-blur border-b border-black/5 dark:border-white/10 bg-white/60 dark:bg-neutral-950/60">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/bmt-logo.png"
              alt=""
              width={40}
              height={40}
              className="rounded-md"
              priority
            />
            <span className="font-semibold tracking-tight text-lg">BMTicket</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <a href="https://bmticket.com/#eventos" className="hover:underline underline-offset-4">Eventos</a>
            <a href="https://bmticket.com/hondubet-demo/" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">Demo API</a>
            <a href="https://bmticket.com/docs" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">Docs</a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <main className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
        <section className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              Entradas fáciles. Integración rápida.
            </h1>
            <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-prose">
              Administra y vende entradas con BMTicket. Consulta eventos, integra la API y ve el flujo de compra del demo para empezar en minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="https://bmticket.com/#eventos"
                className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium border border-black/10 dark:border-white/15 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition"
              >
                Ver eventos
              </Link>
              <a
                href="https://bmticket.com/hondubet-demo/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                Demo API
              </a>
              <a
                href="/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
              >
                Documentación
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 blur-3xl opacity-20 bg-gradient-to-tr from-blue-500 via-purple-500 to-fuchsia-500 rounded-full" />
            <div className="border border-black/10 dark:border-white/15 rounded-3xl shadow-xl overflow-hidden bg-white/70 dark:bg-neutral-900/60 backdrop-blur">
              <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 text-sm flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500" />
                <div className="size-2 rounded-full bg-amber-400" />
                <div className="size-2 rounded-full bg-red-500" />
                <span className="ml-2 text-neutral-500">Preview</span>
              </div>
              <div className="p-6 text-sm leading-relaxed">
                <p className="mb-2"><span className="font-semibold">/eventos</span> lista y enlaza a los eventos oficiales en BMTicket.</p>
                <p className="mb-2">Revisa el <span className="font-semibold">demo de compra</span> y la <span className="font-semibold">documentación</span> para integrar rápido.</p>
                <p className="text-neutral-500">El branding de Next.js se ha removido por completo.</p>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK LINKS */}
        <section className="mt-16">
          <h2 className="text-xl font-semibold mb-4">Accesos rápidos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <CardLink title="Eventos" href="/eventos" description="Explora y compra entradas." />
            <CardLink title="Demo API" href="https://bmticket.com/hondubet-demo/" external description="Flujo de compra de ejemplo." />
            <CardLink title="Documentación" href="/docs" description="Endpoints y guías de integración." />

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

// Simple card link component
function CardLink({ title, description, href, external }: { title: string; description: string; href: string; external?: boolean }) {
  const classes = "group border border-black/10 dark:border-white/15 rounded-2xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur hover:shadow-lg transition";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">{title}</h3>
          <span className="opacity-0 group-hover:opacity-100 transition">↗</span>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold">{title}</h3>
        <span className="opacity-0 group-hover:opacity-100 transition">→</span>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-300">{description}</p>
    </Link>
  );
}

// ==========================
// app/eventos/page.tsx
// ==========================
export function EventosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-neutral-950 dark:to-neutral-900 text-neutral-900 dark:text-neutral-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Image src="/brand/bmt-logo.png" alt="BMTicket" width={28} height={28} className="rounded" />
          <h1 className="text-2xl font-bold">Eventos</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-black/10 dark:border-white/15 rounded-2xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
            <h2 className="font-semibold mb-2">Eventos oficiales</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
              Abre la cartelera oficial en BMTicket para ver todos los eventos disponibles.
            </p>
            <a
              href="https://bmticket.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-black/10 dark:border-white/15 bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition"
            >
              Ir a bmticket.com ↗
            </a>
          </div>

          <div className="border border-black/10 dark:border-white/15 rounded-2xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur">
            <h2 className="font-semibold mb-2">Prueba el flujo (Demo API)</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
              Explora el flujo de compra con el entorno de demostración.
            </p>
            <a
              href="https://bmticket.com/hondubet-demo/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              Abrir demo ↗
            </a>
          </div>
        </div>

        <div className="mt-8 border border-dashed border-black/10 dark:border-white/15 rounded-2xl p-5">
          <h3 className="font-semibold mb-2">¿Integrando la API?</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
            Consulta la documentación oficial para endpoints, ejemplos y guías.
          </p>
          <a
            href="https://bmticket.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            Abrir documentación ↗
          </a>
        </div>

        <div className="mt-10">
          <Link href="/" className="text-sm hover:underline underline-offset-4">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}

// NOTE:
// - Reemplaza el contenido de `app/page.tsx` por el componente Home (el default export).
// - Crea `app/eventos/page.tsx` y exporta por default `EventosPage` si lo prefieres.
//   Si usas ese archivo, cambia la exportación a: `export default EventosPage;`
// - Asegúrate de tener el logo en `public/brand/bmt-logo.png`.
// - No hay referencias ni logos de Next.js en esta interfaz.
