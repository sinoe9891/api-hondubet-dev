"use client";

import { useState } from "react";
import { saleWith3DS, type PixelPayTransactionInput, type PixelPayResponse } from "@/lib/pixelpay-sdk";

type Currency = "HNL" | "USD" | "NIO";

function toCurrency(v: FormDataEntryValue | null): Currency {
	const s = String(v ?? "");
	return s === "HNL" || s === "USD" || s === "NIO" ? s : "HNL";
}

export default function CheckoutPage() {
	const [loading, setLoading] = useState(false);
	const [resp, setResp] = useState<PixelPayResponse | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [country, setCountry] = useState<"HN" | "GT" | "SV" | "NI" | "CR" | "PA" | "MX" | "US">("HN");
	const [stateCode, setStateCode] = useState("");

	const COUNTRY_OPTIONS: Array<"HN" | "GT" | "SV" | "NI" | "CR" | "PA" | "MX" | "US"> = [
		"HN", "GT", "SV", "NI", "CR", "PA", "MX", "US"
	];

	const HN_DEPTS = [
		{ code: "HN-AT", label: "Atlántida" },
		{ code: "HN-CH", label: "Choluteca" },
		{ code: "HN-CL", label: "Colón" },
		{ code: "HN-CM", label: "Comayagua" },
		{ code: "HN-CP", label: "Copán" },
		{ code: "HN-CR", label: "Cortés" },
		{ code: "HN-EP", label: "El Paraíso" },
		{ code: "HN-FM", label: "Francisco Morazán" },
		{ code: "HN-GD", label: "Gracias a Dios" },
		{ code: "HN-IN", label: "Intibucá" },
		{ code: "HN-IB", label: "Islas de la Bahía" },
		{ code: "HN-LP", label: "La Paz" },
		{ code: "HN-LE", label: "Lempira" },
		{ code: "HN-OC", label: "Ocotepeque" },
		{ code: "HN-OL", label: "Olancho" },
		{ code: "HN-SB", label: "Santa Bárbara" },
		{ code: "HN-VA", label: "Valle" },
		{ code: "HN-YO", label: "Yoro" },
	];
	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setLoading(true);
		setErr(null);
		setResp(null);

		const fd = new FormData(e.currentTarget);
		const currency = toCurrency(fd.get("currency"));
		const rawCard = String(fd.get("card") ?? "").replace(/\D/g, "");
		const cvv = String(fd.get("cvv") ?? "").trim();
		const exp = String(fd.get("exp") ?? "").trim();

		const payload: PixelPayTransactionInput = {
			amount: String(fd.get("amount") ?? ""),
			currency,
			card: { number: rawCard, holder: String(fd.get("holder") ?? "").trim(), exp, cvv },
			order: {
				id: String(fd.get("order_id") ?? ""),
				description: (fd.get("desc") as string) || undefined,
				customer_name: String(fd.get("customer_name") ?? "").trim(),
				customer_email: String(fd.get("customer_email") ?? "").trim(),
			},
			billing: {
				address: String(fd.get("billing_address") ?? ""),
				country: String(fd.get("billing_country") ?? ""),
				state: String(fd.get("billing_state") ?? ""),
				city: String(fd.get("billing_city") ?? ""),
				phone: String(fd.get("billing_phone") ?? ""),
			},
		};



		console.log("[UI] submit payload (enmascarado):", {
			...payload,
			card: { ...payload.card, number: (payload.card.number || "").replace(/.(?=.{4})/g, "•"), cvv: "***" },
		});

		try {
			const r = await saleWith3DS(payload);
			setResp(r); // ← ya es PixelPayResponse
		} catch (e: unknown) {
			setErr(e instanceof Error ? e.message : String(e));
		} finally {
			setLoading(false);
		}
	}

	const hasResp = resp !== null;

	return (
		<main className="mx-auto max-w-xl p-6">
			<h1 className="text-2xl font-semibold mb-4">Checkout (SDK + 3DS)</h1>
			<form onSubmit={onSubmit} className="space-y-4">
				{/* --- Datos de facturación (REQUERIDOS por PixelPay) --- */}
				<fieldset className="mt-6 border rounded p-4">
					<legend className="px-1 text-sm font-medium">Datos de facturación</legend>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
						<label className="flex flex-col text-sm">
							<span className="mb-1">Dirección</span>
							<input name="billing_address" required className="border rounded px-3 py-2" placeholder="Bo. Centro, 1ra Calle, Casa #123" />
						</label>

						<label className="flex flex-col text-sm">
							<span className="mb-1">Ciudad</span>
							<input name="billing_city" required className="border rounded px-3 py-2" placeholder="San Pedro Sula" />
						</label>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
						<label className="flex flex-col text-sm">
							<span className="mb-1">País (ISO-3166-1)</span>
							<select
								name="billing_country"
								required
								className="border rounded px-3 py-2"
								value={country}
								onChange={(e) => { setCountry(e.target.value as typeof country); setStateCode(""); }}
							>
								{COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
							</select>
						</label>

						<label className="flex flex-col text-sm">
							<span className="mb-1">Estado/Depto (ISO-3166-2)</span>
							{country === "HN" ? (
								<select
									name="billing_state"
									required
									className="border rounded px-3 py-2"
									value={stateCode}
									onChange={(e) => setStateCode(e.target.value)}
								>
									<option value="" disabled>Selecciona departamento…</option>
									{HN_DEPTS.map(d => <option key={d.code} value={d.code}>{d.label} ({d.code})</option>)}
								</select>
							) : (
								<input
									name="billing_state"
									required
									className="border rounded px-3 py-2"
									placeholder={`${country}-XX`}
									value={stateCode}
									onChange={(e) => setStateCode(e.target.value.toUpperCase())}
									pattern="^[A-Z]{2}-[A-Z0-9]{1,3}$"
									title="Formato ISO-3166-2, p.ej. HN-FM, US-CA, MX-CMX"
								/>
							)}
						</label>

						<label className="flex flex-col text-sm">
							<span className="mb-1">Teléfono</span>
							<input name="billing_phone" required className="border rounded px-3 py-2" placeholder="+504 9999-9999" inputMode="tel" />
						</label>
					</div>
				</fieldset>

				{/* --- Datos del pedido (Order) --- */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label className="flex flex-col text-sm">
						<span className="mb-1">Order ID</span>
						<input name="order_id" required className="border rounded px-3 py-2" placeholder="ORDEN-HB-2001" />
					</label>
					<label className="flex flex-col text-sm">
						<span className="mb-1">Descripción (opcional)</span>
						<input name="desc" className="border rounded px-3 py-2" placeholder="Prueba" />
					</label>
				</div>

				{/* --- Cliente (OBLIGATORIO para la Order) --- */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label className="flex flex-col text-sm">
						<span className="mb-1">Nombre del cliente</span>
						<input name="customer_name" required className="border rounded px-3 py-2" placeholder="Jhon Doe" />
					</label>
					<label className="flex flex-col text-sm">
						<span className="mb-1">Email del cliente</span>
						<input name="customer_email" required type="email" className="border rounded px-3 py-2" placeholder="jhondow@pixel.hn" />
					</label>
				</div>

				{/* --- Pago --- */}
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label className="flex flex-col text-sm">
						<span className="mb-1">Monto</span>
						<input name="amount" required className="border rounded px-3 py-2" placeholder="1" />
					</label>
					<label className="flex flex-col text-sm">
						<span className="mb-1">Moneda</span>
						<select name="currency" defaultValue="HNL" className="border rounded px-3 py-2">
							<option value="HNL">HNL</option>
							<option value="USD">USD</option>
							<option value="NIO">NIO</option>
						</select>
					</label>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label className="flex flex-col text-sm">
						<span className="mb-1">Tarjeta</span>
						<input name="card" inputMode="numeric" autoComplete="cc-number" required className="border rounded px-3 py-2" placeholder="4111 1111 1111 1111" />
					</label>
					<label className="flex flex-col text-sm">
						<span className="mb-1">Titular (cardholder)</span>
						<input name="holder" autoComplete="cc-name" required className="border rounded px-3 py-2" placeholder="Jhon Doe" />
					</label>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<label className="flex flex-col text-sm">
						<span className="mb-1">Exp (MM/YY o MMYY o YYMM)</span>
						<input name="exp" inputMode="numeric" autoComplete="cc-exp" required className="border rounded px-3 py-2" placeholder="12/25 o 2512" />
					</label>
					<label className="flex flex-col text-sm">
						<span className="mb-1">CVV</span>
						<input name="cvv" inputMode="numeric" autoComplete="cc-csc" required className="border rounded px-3 py-2" placeholder="300 / 999" />
					</label>
				</div>

				<button type="submit" disabled={loading} className="w-full rounded bg-black text-white py-2.5 disabled:opacity-60">
					{loading ? "Procesando…" : "Pagar"}
				</button>
			</form>


			{err && (
				<div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
					<strong>Error:</strong> {err}
				</div>
			)}

			{hasResp && (
				<div className="mt-4">
					<h2 className="font-medium mb-2">Respuesta</h2>
					<pre className="text-xs bg-neutral-900 text-neutral-100 p-3 rounded overflow-auto max-h-80">
						{JSON.stringify(resp, null, 2)}
					</pre>
				</div>
			)}
		</main>
	);
}
