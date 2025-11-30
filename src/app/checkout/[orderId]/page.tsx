"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useParams, useSearchParams } from "next/navigation";
import { saleWith3DS, authWith3DS, type PixelResult } from "@/lib/pixelpay-web";
import Image from "next/image"

// ===== Tipos originales =====
type PixelPayTransactionInput = Parameters<typeof saleWith3DS>[0];

type Currency = "HNL" | "USD" | "NIO";
const toCurrency = (v: unknown): Currency => {
	const s = String(v ?? "").toUpperCase();
	return s === "HNL" || s === "USD" || s === "NIO" ? (s as Currency) : "HNL";
};

const env = (process.env.NEXT_PUBLIC_PIXELPAY_ENV || "sandbox") as "sandbox" | "live";
const testCase = Number(process.env.NEXT_PUBLIC_PIXELPAY_TEST_CASE || "1"); // 1=aprobada

interface OrderBilling { address: string; country: string; state: string; city: string; phone: string; }
interface OrderCustomer { name?: string; email?: string; }
interface OrderDoc {
	order_id: string;
	amount: number | string;
	currency: Currency | string;
	description?: string;
	customer?: OrderCustomer;
	billing?: Partial<OrderBilling>;
}

type Result = PixelResult;

interface CardState { number: string; cardholder: string; expire: string; cvv2: string; }
interface BillingState { address: string; country: string; state: string; city: string; phone: string; }

// ====== Config visual (solo estilos) ======
const HONDUBET_LOGO_URL = process.env.NEXT_PUBLIC_HONDUBET_LOGO_URL || "/brand/bmt-logo.png";
const BMT_LOGO_URL = process.env.NEXT_PUBLIC_BMT_LOGO_URL || "/brand/bmt-logo.png";
const CARDS_ROW_URL = process.env.NEXT_PUBLIC_CARDS_ROW_URL || "/brand/logo_cards_blanco.png";
const TRUST_SVG =
	"data:image/svg+xml;charset=UFT-8,%0A%3Csvg%20width%3D%2241%22%20height%3D%2215%22%20viewBox%3D%220%200%2041%2015%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22M38.358%205.51c0-.419.33-.771.749-.771s.75.352.75.771a.762.762%200%200%201-.75.771c-.419.023-.75-.33-.75-.77Zm.727.617a.588.588%200%200%200%20.573-.595.588.588%200%200%200-.573-.595.588.588%200%200%200-.573.595c0%20.33.264.595.573.595Zm-.088-.264h-.154v-.684h.286c.066%200%20.132%200%20.176.045a.2.2%200%200%201%20.089.176c0%20.088-.044.154-.11.176l.132.309h-.22l-.111-.265h-.11v.243h.022Zm0-.397h.088c.044%200%20.066%200%20.088-.022.022-.022.044-.044.044-.088%200-.022-.022-.066-.044-.066-.022-.022-.066-.022-.088-.022h-.088v.198ZM27.668.287%2027.47%201.63c-.441-.242-.772-.33-1.124-.33-.926%200-1.587.947-1.587%202.292%200%20.925.44%201.498%201.168%201.498.308%200%20.64-.11%201.058-.308l-.22%201.41c-.463.133-.75.177-1.102.177-1.345%200-2.183-1.014-2.183-2.645C23.48%201.52%2024.627%200%2026.302%200c.22%200%20.396.022.573.066l.529.132c.11.044.154.044.264.089Zm-4.166.925c-.044-.022-.088-.022-.132-.022-.397%200-.639.22-1.036.816l.11-.75h-1.101l-.772%204.981h1.256c.463-3.063.573-3.57%201.168-3.57h.089c.11-.595.264-1.036.485-1.455h-.067ZM16.03%206.171c-.33.11-.616.177-.903.177-.64%200-.992-.375-.992-1.102%200-.133.022-.287.044-.463l.088-.485.067-.397.55-3.394h1.235l-.154.727h.639l-.177%201.213h-.639l-.33%202.071c-.022.088-.022.155-.022.199%200%20.264.132.374.418.374.155%200%20.243-.022.331-.044l-.154%201.124Zm-4.914-3.35c0%20.64.286%201.058.947%201.389.507.242.595.33.595.55%200%20.31-.22.464-.705.464-.374%200-.705-.066-1.124-.199l-.176%201.146.066.022.22.044c.088.023.177.045.331.045.287.022.529.044.683.044%201.323%200%201.918-.53%201.918-1.653%200-.684-.243-1.08-.882-1.389-.529-.242-.573-.308-.573-.55%200-.265.198-.398.617-.398.243%200%20.573.044.904.089l.176-1.147a6.662%206.662%200%200%200-1.102-.11c-1.432-.022-1.917.728-1.895%201.653ZM37.63%206.238h-1.19l.067-.485c-.331.374-.706.55-1.147.55-.925%200-1.52-.815-1.52-2.071%200-1.653.925-3.064%202.027-3.064.485%200%20.838.22%201.19.683l.265-1.763h1.234l-.925%206.15Zm-1.85-1.169c.594%200%20.991-.683.991-1.675%200-.639-.242-.992-.661-.992-.573%200-.97.706-.97%201.676%200%20.639.22.991.64.991ZM19.998%206.127a4.186%204.186%200%200%201-1.278.199c-1.389%200-2.116-.772-2.116-2.248%200-1.72.926-2.976%202.182-2.976%201.036%200%201.675.705%201.675%201.83%200%20.352-.044.727-.154%201.234h-2.513c-.022.088-.022.11-.022.154%200%20.595.375.882%201.102.882.441%200%20.838-.11%201.3-.309l-.176%201.234Zm-.705-2.975c.022-.11.022-.199.022-.243%200-.396-.22-.639-.595-.639-.397%200-.683.309-.794.904h1.367v-.022ZM6.09%206.238H4.857l.706-4.717-1.61%204.717h-.837l-.11-4.695-.75%204.695H1.088L2.057.11h1.785l.067%203.791L5.12.111h1.94l-.97%206.127Zm3.218-2.227c-.132-.022-.198-.022-.286-.022-.705%200-1.058.265-1.058.75%200%20.308.176.507.463.507.485.022.86-.507.881-1.235Zm.904%202.227H9.176l.022-.53c-.308.42-.727.596-1.322.596-.683%200-1.146-.551-1.146-1.367%200-1.212.815-1.917%202.204-1.917.154%200%20.33.022.507.044.044-.177.044-.243.044-.33%200-.331-.22-.464-.794-.464a3.76%203.76%200%200%200-1.036.155l-.154.066-.11.044.176-1.124c.617-.199%201.036-.265%201.499-.265%201.08%200%201.631.507%201.631%201.455%200%20.242-.022.419-.11.992l-.265%201.763-.044.309-.022.264-.022.176-.022.133Zm19.616-2.227c-.132-.022-.198-.022-.286-.022-.706%200-1.08.265-1.08.75%200%20.308.176.507.463.507.506.022.881-.507.903-1.235Zm.904%202.227h-1.036l.022-.53c-.308.42-.727.596-1.322.596-.684%200-1.146-.551-1.146-1.367%200-1.212.815-1.917%202.204-1.917.132%200%20.33.022.506.044.045-.177.045-.243.045-.33%200-.332-.22-.464-.794-.464-.352%200-.75.066-1.036.155L28%202.469l-.11.044.176-1.124c.617-.199%201.036-.265%201.499-.265%201.08%200%201.63.507%201.63%201.455%200%20.242-.021.419-.11.992l-.264%201.763-.044.308-.044.243-.022.176.022.177Zm3.482-5.026c-.044-.022-.088-.022-.132-.022-.397%200-.64.22-1.036.816l.11-.75h-1.124l-.771%204.981h1.256c.463-3.063.573-3.57%201.168-3.57h.088a4.91%204.91%200%200%201%20.485-1.455h-.044Zm-5.246%209.874c0%201.124-.352%201.808-.903%201.808-.397.022-.64-.441-.64-1.103%200-.793.353-1.697.926-1.697.463-.022.617.463.617.992Zm1.235%200c0-1.256-.617-2.248-1.785-2.248-1.345%200-2.227%201.19-2.227%202.932%200%201.256.53%202.292%201.786%202.292%201.3.022%202.226-.882%202.226-2.976Z%22%20fill%3D%22%23ffffff%22%2F%3E%3Cpath%20fill-rule%3D%22evenodd%22%20clip-rule%3D%22evenodd%22%20d%3D%22m26.61%207.979-.198%201.344c-.419-.242-.706-.33-1.036-.33-.86%200-1.477.947-1.477%202.292%200%20.925.397%201.498%201.08%201.498.287%200%20.617-.11.992-.308l-.198%201.41c-.42.133-.706.177-1.036.177-1.256%200-2.05-1.014-2.05-2.645%200-2.204%201.08-3.725%202.645-3.725.198%200%20.374.022.529.066l.485.133c.11.022.154.044.264.088Zm-7.736.903c-.044-.022-.088-.022-.132-.022-.375%200-.595.22-.97.816l.11-.75h-1.058l-.705%204.982h1.168c.441-3.042.551-3.57%201.102-3.57.044%200%20.044%200%20.088.021.11-.595.243-1.036.441-1.455l-.044-.022Zm15.252%204.981h-1.102l.066-.484c-.309.374-.661.55-1.08.55-.838%200-1.41-.815-1.41-2.071%200-1.653.881-3.064%201.895-3.064.463%200%20.793.22%201.124.683l.264-1.763h1.146l-.903%206.15Zm-1.741-1.168c.55%200%20.925-.683.925-1.675%200-.639-.22-.97-.617-.97-.529%200-.903.684-.903%201.675%200%20.64.198.97.595.97ZM7.942%2013.841a3.646%203.646%200%200%201-1.19.199c-1.3%200-1.984-.772-1.984-2.248%200-1.697.86-2.976%202.028-2.976.97%200%201.565.705%201.565%201.83%200%20.352-.044.727-.155%201.234H5.892c-.022.088-.022.11-.022.154%200%20.573.353.86%201.036.86.419%200%20.793-.11%201.212-.309l-.176%201.256Zm-.661-2.953c0-.11.022-.198.022-.242%200-.397-.199-.64-.551-.64-.375%200-.64.309-.75.904h1.279v-.022Zm14.546%202.953a3.646%203.646%200%200%201-1.19.199c-1.322%200-1.983-.772-1.983-2.248%200-1.697.86-2.976%202.027-2.976.97%200%201.587.705%201.587%201.83%200%20.352-.044.727-.154%201.234h-2.336c-.022.088-.022.11-.022.154%200%20.573.352.86%201.035.86.42%200%20.794-.11%201.213-.309l-.177%201.256Zm-.66-2.953c.021-.11.021-.198.021-.242%200-.397-.198-.64-.55-.64-.376%200-.64.309-.75.904h1.278v-.022Zm16.926%202.953a3.745%203.745%200%200%201-1.19.199c-1.3%200-1.984-.772-1.984-2.248%200-1.697.882-2.976%202.05-2.976.97%200%201.565.705%201.565%201.83%200%20.352-.044.727-.154%201.234h-2.315c-.022.088-.022.11-.022.154%200%20.573.353.86%201.036.86.419%200%20.794-.11%201.212-.309l-.198%201.256Zm-.661-2.953c0-.11.022-.198.022-.242%200-.397-.199-.64-.551-.64-.375%200-.64.309-.75.904h1.279v-.022ZM4.482%209.103a1.689%201.689%200%200%200-.97-.287c-.485%200-.838.11-.838.595%200%20.882%201.72.551%201.72%202.447%200%201.719-1.125%202.182-2.16%202.182-.463%200-.992-.154-1.367-.33l.286-1.257c.243.22.706.353%201.102.353.375%200%20.948-.11.948-.75%200-1.014-1.719-.639-1.719-2.402%200-1.61%201.014-2.094%201.984-2.094.55%200%201.058.088%201.366.286l-.352%201.257Zm6.876%204.738c-.242.11-.573.199-1.036.199-1.014%200-1.653-1.014-1.653-2.27%200-1.631.926-2.91%202.27-2.91.287%200%20.75.133%201.102.331l-.264%201.19c-.265-.176-.53-.264-.794-.264-.617%200-1.08.573-1.08%201.587%200%20.595.331%201.08.838%201.08.309%200%20.529-.067.771-.22l-.154%201.277Zm4.364-1.256c-.066.419-.11.838-.154%201.278h-1.124l.088-.793h-.022c-.353.551-.705.926-1.367.926-.705%200-1.08-.75-1.08-1.697%200-.331.022-.53.089-1.036l.308-2.315h1.256l-.308%202.315a4.35%204.35%200%200%200-.088.749c0%20.287.132.595.485.573.507%200%20.815-.617.903-1.366l.353-2.293h1.212l-.55%203.66Zm23.539%201.235h-.198v-.816H38.8v-.176h.727v.176h-.265v.816Zm1.257%200h-.177v-.838l-.176.838h-.176l-.177-.838v.838h-.176v-.992h.286l.155.793h.022l.154-.793h.265v.992Z%22%20fill%3D%22%23ffffff%22%2F%3E%0A%3C%2Fsvg%3E";
const TRUST_SVG1 =
	"data:image/svg+xml;charset=UFT-8,%0A%3Csvg%20width%3D%2234%22%20height%3D%2215%22%20viewBox%3D%220%200%2034%2015%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22m13.727%207.8-1.696%204.588-.178-.928c-.429-1.143-1.34-2.339-2.41-2.82l1.553%205.89h1.838l2.732-6.712h-1.84v-.017Zm1.446%206.73%201.089-6.73h1.731l-1.07%206.73h-1.75Zm8.05-6.569a4.145%204.145%200%200%200-1.553-.285c-1.713%200-2.927.91-2.927%202.213-.018.964.857%201.5%201.517%201.82.678.322.91.536.91.84%200%20.446-.535.66-1.035.66-.696%200-1.07-.107-1.642-.357l-.232-.107-.25%201.5c.41.178%201.16.356%201.928.356%201.82%200%203.017-.91%203.017-2.302%200-.768-.465-1.357-1.464-1.821-.607-.303-.982-.518-.982-.839%200-.286.321-.571%201-.571.57-.018.981.125%201.303.25l.16.071.25-1.428Zm4.445-.161h-1.339c-.41%200-.732.125-.91.554l-2.57%206.158h1.82s.304-.82.357-1.017h2.231c.054.232.215%201%20.215%201h1.606L27.668%207.8Zm-2.142%204.338c.143-.393.696-1.874.696-1.874-.018.018.143-.393.232-.643l.107.572s.34%201.606.41%201.945h-1.445Z%22%20fill%3D%22%23FFFFFF%22%2F%3E%3Cpath%20d%3D%22M10.442%207.8H7.64l-.018.108c2.178.57%203.623%201.945%204.213%203.552l-.607-3.088c-.107-.429-.411-.554-.786-.571Zm-8.05-1.624H1.285L0%20.411%201.232.214l.874%204.498L4.32.268h1.178L2.392%206.176ZM8.14%204.302H5.498c-.072.803.303%201.142.928%201.142.535%200%201-.196%201.5-.517v.803c-.483.303-1.054.5-1.714.5-1.143%200-1.91-.66-1.678-2.142.214-1.339%201.124-2.142%202.213-2.142%201.232%200%201.643.928%201.464%202.088-.036.107-.054.197-.071.268ZM6.587%202.66c-.41%200-.786.321-.964%201h1.642c.018-.643-.179-1-.678-1Zm3.284%201.124L9.514%206.14H8.497l.624-4.123h.875v.821c.34-.482.821-.875%201.464-.91v1.017c-.66.072-1.232.41-1.589.84Zm1.571%202.374.625-4.123h1.017l-.624%204.123h-1.018Zm1.25-4.82c-.34%200-.572-.231-.518-.57.053-.357.357-.59.714-.59.321%200%20.553.233.5.59a.693.693%200%200%201-.696.57Zm3.23-.428c-.357%200-.553.161-.625.518l-.089.607h.786v.839h-.91l-.5%203.284h-1.018l.5-3.284h-.59l.126-.84h.589l.107-.713c.143-.91.768-1.25%201.624-1.25.179%200%20.322.018.41.036v.84a2.167%202.167%200%200%200-.41-.037Zm.018%205.248.625-4.123h1.018l-.625%204.123H15.94Zm1.25-4.82c-.34%200-.571-.231-.518-.57.054-.357.357-.59.714-.59.34%200%20.572.25.518.59a.726.726%200%200%201-.714.57Zm4.373%202.964h-2.642c-.071.803.304%201.142.928%201.142.536%200%201-.196%201.5-.517v.803c-.482.303-1.053.5-1.714.5-1.142%200-1.91-.66-1.678-2.142.214-1.339%201.125-2.142%202.214-2.142%201.231%200%201.642.928%201.463%202.088-.035.107-.071.197-.071.268ZM20.01%202.66c-.41%200-.785.321-.964%201h1.642c.018-.643-.196-1-.678-1Zm4.57%203.498v-.57c-.34.356-.786.66-1.357.66-.857%200-1.446-.643-1.232-2.035.233-1.535%201.179-2.214%202.143-2.214.392%200%20.696.072.928.16l.303-1.98L26.418%200l-.946%206.158h-.892Zm.357-3.16c-.232-.124-.429-.178-.768-.178-.535%200-1%20.429-1.142%201.34-.125.802.16%201.177.607%201.177.375%200%20.696-.214%201.017-.571l.286-1.767Zm3.659%203.196c-.482%200-.875-.071-1.25-.214l.679-4.373.785-.125-.285%201.91c.232-.215.553-.41.946-.41.66%200%201.106.481.946%201.534-.179%201.143-.893%201.678-1.821%201.678Zm.571-2.535c-.25%200-.518.179-.75.411l-.214%201.41c.16.054.25.09.482.09.482%200%20.84-.304.946-1%20.09-.625-.107-.91-.464-.91Zm3.07%202.66c-.392.767-.785%201-1.392%201a.995.995%200%200%201-.285-.036V6.64c.107.018.214.054.357.054a.616.616%200%200%200%20.553-.322l.107-.214-.66-3.07.82-.107.375%202.213%201.036-2.177h.767l-1.678%203.302Z%22%20fill%3D%22%23FFFFFF%22%2F%3E%0A%3C%2Fsvg%3E";
const TRUST_SVG2 = "data:image/svg+xml;charset=UFT-8,%0A%3Csvg%20width%3D%2234%22%20height%3D%2213%22%20viewBox%3D%220%200%2034%2013%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20clip-path%3D%22url(%23a)%22%3E%3Cpath%20d%3D%22m23.05%207.383.337.102a.577.577%200%200%201-.107.238.438.438%200%200%201-.18.142.648.648%200%200%201-.276.05.813.813%200%200%201-.332-.056.515.515%200%200%201-.219-.21.701.701%200%200%201-.096-.379c0-.204.057-.362.164-.476.107-.113.264-.164.46-.164a.624.624%200%200%201%20.367.096.517.517%200%200%201%20.197.295l-.338.073a.199.199%200%200%200-.04-.084.23.23%200%200%200-.078-.068.22.22%200%200%200-.101-.023.216.216%200%200%200-.197.108.462.462%200%200%200-.051.243c0%20.136.023.232.062.283a.215.215%200%200%200%20.174.08.206.206%200%200%200%20.163-.063.387.387%200%200%200%20.09-.187Zm.472-.113c0-.204.056-.362.169-.476.112-.113.27-.17.472-.17.209%200%20.366.057.479.165.112.107.168.266.168.47a.73.73%200%200%201-.073.356.523.523%200%200%201-.214.216.7.7%200%200%201-.343.079.8.8%200%200%201-.349-.068.545.545%200%200%201-.225-.215.645.645%200%200%201-.084-.357Zm.383%200a.437.437%200%200%200%20.067.272.228.228%200%200%200%20.191.085.24.24%200%200%200%20.192-.08c.045-.056.067-.152.067-.288%200-.12-.022-.204-.073-.255a.232.232%200%200%200-.191-.08.224.224%200%200%200-.186.086c-.045.045-.067.135-.067.26Zm1.102-.623h.501l.191.759.192-.759h.5v1.246h-.315v-.951l-.242.95h-.28l-.243-.95v.95h-.315V6.648h.011Zm1.632%200h.636c.14%200%20.242.034.31.102a.377.377%200%200%201%20.1.283.39.39%200%200%201-.112.295c-.073.073-.192.107-.343.107h-.209V7.9h-.382V6.647Zm.383.532h.095a.24.24%200%200%200%20.158-.04.128.128%200%200%200%20.045-.095.14.14%200%200%200-.04-.102.197.197%200%200%200-.146-.04h-.107v.277h-.006Zm.866-.532h.382v.94h.597v.306h-.98V6.647Zm1.17%200h.382v1.246h-.382V6.647Zm1.418%201.036h-.433l-.062.204h-.389l.468-1.246h.416l.467%201.246h-.4l-.067-.204Zm-.079-.266-.135-.447-.135.447h.27Zm.663-.77h.355l.467.691v-.69h.36v1.245h-.36l-.461-.685v.685h-.36V6.647Zm1.351%200h1.165v.306h-.389v.94h-.382v-.94h-.388v-.306h-.006ZM18.447%208.544l1.109-.351-.36-.804a9.213%209.213%200%200%200-.749%201.155Zm-.377-3.675L15.9%200%200%20.906%204.405%2013l8.478-2.69c-.54-.78-.737-1.71-.112-2.162.697-.51%201.75.079%202.419.911.647-1.087%202.464-3.618%202.88-4.19Z%22%20fill%3D%22%23383838%22%2F%3E%3Cpath%20d%3D%22M15.404%203.522c.663%200%201.204-.51%201.204-1.144%200-.634-.54-1.144-1.204-1.144-.664%200-1.204.51-1.204%201.144%200%20.634.54%201.144%201.204%201.144Zm-.985.492h1.97v5.181h-1.97v-5.18Zm-.973%201.509c.017.006.028%200%20.028-.017V4.193a.057.057%200%200%200-.028-.045s-.259-.17-1.046-.216c-.04-.022-.732-.028-.918%200-2.869.233-2.976%202.322-2.976%202.412v.51c0%20.062%200%202.197%202.976%202.384.293.022.861%200%20.918%200%20.396.004.789-.067%201.158-.21a.043.043%200%200%200%20.028-.04V7.76c0-.017-.01-.023-.022-.011%200%200-.214.17-1.148.266a1.655%201.655%200%200%201-.49%200c-1.327-.227-1.389-1.2-1.389-1.2%200-.018-.005-.046-.005-.057v-.374a.177.177%200%200%201%20.005-.057s.09-1.047%201.39-1.16h.49a2.92%202.92%200%200%201%201.029.356ZM3.038%209.175a.027.027%200%200%200%20.017.027.026.026%200%200%200%20.011.002h1.918a.026.026%200%200%200%20.027-.018.027.027%200%200%200%20.002-.01V7.668a.027.027%200%200%201%20.017-.026.026.026%200%200%201%20.01-.002s3.067.22%203.067-1.846c0-1.636-1.924-1.812-2.554-1.783H3.066a.026.026%200%200%200-.026.017.027.027%200%200%200-.002.01v5.136Zm1.94-2.684V5.139h.473s.681.029.737.499a1.14%201.14%200%200%201%200%20.277c-.09.55-.68.578-.68.578h-.53Z%22%20fill%3D%22%23FFFFFF%22%2F%3E%3Cpath%20d%3D%22M15.46%2011.692c.166.01.332-.02.484-.09.697-.369%203.055-6.16%205.541-7.944a.17.17%200%200%200%20.046-.046.083.083%200%200%200%20.016-.045s0-.119-.365-.119c-2.211-.062-4.512%204.609-5.722%206.455-.017.022-.096%200-.096%200s-.81-.963-1.513-1.33a.48.48%200%200%200-.18-.03c-.056%200-.382.069-.534.227-.18.193-.175.3-.175.533a.394.394%200%200%200%20.034.136c.174.305.956%201.392%201.603%201.993.096.073.248.26.861.26Z%22%20fill%3D%22%23ffffff%22%2F%3E%3Cpath%20d%3D%22M22.138%201.908h1.84c.365%200%20.658.051.877.147.216.094.405.24.552.425.149.19.256.41.315.645.069.255.103.518.1.782%200%20.43-.05.764-.145%201.002-.09.228-.228.433-.405.6-.159.15-.35.26-.557.323a2.83%202.83%200%200%201-.737.107h-1.84V1.91Zm1.238.912v2.202h.303c.26%200%20.445-.028.552-.085a.6.6%200%200%200%20.259-.3c.062-.141.095-.38.095-.702%200-.43-.067-.719-.208-.878-.14-.158-.366-.237-.692-.237h-.31Zm2.79%201.789%201.181-.074c.029.193.08.34.158.442.13.164.31.243.546.243.174%200%20.315-.04.41-.124a.36.36%200%200%200%20.012-.572c-.09-.085-.304-.159-.636-.232-.546-.125-.928-.289-1.165-.493a.977.977%200%200%201-.349-.781%201.08%201.08%200%200%201%20.18-.589c.133-.197.321-.349.54-.436.243-.108.569-.159.985-.159.512%200%20.906.097%201.17.29.265.192.428.497.479.916l-1.17.068c-.034-.18-.096-.311-.198-.396-.1-.085-.236-.124-.41-.124-.146%200-.253.028-.326.09a.282.282%200%200%200-.107.227.228.228%200%200%200%20.09.175c.056.051.197.102.416.147.54.12.928.238%201.165.357.209.098.386.253.511.447.108.182.162.39.158.6a1.33%201.33%200%200%201-.81%201.212c-.253.113-.58.17-.968.17-.68%200-1.153-.13-1.418-.396-.264-.266-.405-.6-.444-1.008Zm3.955%200%201.182-.074c.028.193.079.34.157.442.13.164.31.243.546.243.174%200%20.315-.04.41-.124a.36.36%200%200%200%20.012-.572c-.09-.085-.304-.159-.636-.232-.546-.125-.928-.289-1.164-.493a.995.995%200%200%201-.35-.781%201.08%201.08%200%200%201%20.18-.589c.133-.197.322-.349.541-.436.242-.108.568-.159.985-.159.511%200%20.905.097%201.17.29.264.192.427.497.478.916l-1.17.068c-.034-.18-.096-.311-.197-.396-.101-.085-.236-.124-.41-.124-.147%200-.254.028-.327.09a.282.282%200%200%200-.107.227.228.228%200%200%200%20.09.175c.056.051.197.102.416.147.54.12.929.238%201.165.357.209.098.386.253.512.447.107.182.161.39.157.6a1.33%201.33%200%200%201-.81%201.212c-.253.113-.58.17-.967.17-.681%200-1.154-.13-1.418-.396a1.558%201.558%200%200%201-.445-1.008Z%22%20fill%3D%22%23ffffff%22%2F%3E%3C%2Fg%3E%3Cdefs%3E%3CclipPath%20id%3D%22a%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M0%200h33.761v13H0z%22%2F%3E%3C%2FclipPath%3E%3C%2Fdefs%3E%0A%3C%2Fsvg%3E";
// ====== util: marca de tarjeta ======
type Brand = "VISA" | "MASTERCARD" | "AMEX" | "DISCOVER" | "DINERS" | "JCB" | "UNIONPAY" | "DESCONOCIDA";
const detectBrand = (digits: string): Brand => {
	if (/^4\d{0,}$/.test(digits)) return "VISA";
	if (/^(5[1-5]\d{0,}|2(2[2-9]\d|2[1]\d|[3-6]\d{2}|7[01]\d|720)\d*)$/.test(digits)) return "MASTERCARD"; // 51-55, 2221-2720
	if (/^3[47]\d{0,}$/.test(digits)) return "AMEX";
	if (/^(6011|65|64[4-9])\d{0,}$/.test(digits)) return "DISCOVER";
	if (/^3(0[0-5]|[68])\d{0,}$/.test(digits)) return "DINERS";
	if (/^35\d{0,}$/.test(digits)) return "JCB";
	if (/^62\d{0,}$/.test(digits)) return "UNIONPAY";
	return digits.length >= 1 ? "DESCONOCIDA" : "DESCONOCIDA";
};

// ====== util: países para teléfono ======
type CountryOpt = { code: string; dial: string; flag: string; label: string };
const COUNTRIES: CountryOpt[] = [
	{ code: "HN", dial: "+504", flag: "🇭🇳", label: "Honduras" },
	{ code: "NI", dial: "+505", flag: "🇳🇮", label: "Nicaragua" },
	{ code: "US", dial: "+1", flag: "🇺🇸", label: "Estados Unidos" },
	// Agrega más si deseas
];

async function bindPixelPayment(orderId: string, sdkResult: PixelResult) {
	const r = sdkResult as PixelResult & {
		pixel_codes?: { uuid?: string | null; hash?: string | null } | null;
		data?: PixelResult["data"] & {
			pixel_codes?: { uuid?: string | null; hash?: string | null } | null;
		};
	};

	const paymentUuid =
		r.data?.payment_uuid ??
		r.pixel_codes?.uuid ??
		r.data?.pixel_codes?.uuid ??
		null;

	const paymentHash =
		r.data?.payment_hash ??
		r.pixel_codes?.hash ??
		r.data?.pixel_codes?.hash ??
		null;

	if (!paymentUuid) {
		console.warn("[pixelpay-init] No payment_uuid found in SDK result");
		return;
	}

	try {
		const res = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}/pixel-init`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				payment_uuid: paymentUuid,
				payment_hash: paymentHash ?? undefined,
			}),
		});

		const json = await res.json().catch(() => null);
		console.log("[pixelpay-init] Server response:", json);
	} catch (err) {
		console.error("[pixelpay-init] Error calling pixel-init:", err);
	}
}

export default function CheckoutPage() {
	const { orderId } = useParams<{ orderId: string }>();
	const qp = useSearchParams();
	const mode = (qp.get("mode") || "sale") as "sale" | "auth";

	const [order, setOrder] = useState<OrderDoc | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [card, setCard] = useState<CardState>({ number: "", cardholder: "", expire: "", cvv2: "" });
	const [billing, setBilling] = useState<BillingState>({ address: "", country: "HN", state: "", city: "", phone: "" });

	// errores de validación UI
	const [brand, setBrand] = useState<Brand>("DESCONOCIDA");
	const [errBrand, setErrBrand] = useState<string>("");
	const [errExpire, setErrExpire] = useState<string>("");
	const [errPhone, setErrPhone] = useState<string>("");

	// país/teléfono
	const [phoneCountry, setPhoneCountry] = useState<CountryOpt>(COUNTRIES[0]);
	const [phoneLocal, setPhoneLocal] = useState<string>("");

	// parentOrigin desde query o referrer
	const parentOrigin = useMemo(() => {
		if (typeof window === "undefined") return (process.env.NEXT_PUBLIC_HONDUBET_ORIGIN as string) || "";
		const parent = qp.get("parent");
		if (parent) return parent;
		try {
			return document.referrer ? new URL(document.referrer).origin : ((process.env.NEXT_PUBLIC_HONDUBET_ORIGIN as string) || "");
		} catch {
			return (process.env.NEXT_PUBLIC_HONDUBET_ORIGIN as string) || "";
		}
	}, [qp]);

	// símbolo de moneda
	const money = (amt: number, cur: Currency | string) => {
		const sym = String(cur).toUpperCase() === "USD" ? "$" : (String(cur).toUpperCase() === "NIO" ? "C$" : "L");
		return `${sym} ${Number.isFinite(amt) ? amt.toLocaleString("es-HN") : "0"}`;
	};

	const displayTotal = useMemo(() => {
		const raw = order?.amount ?? 0;
		const parsed = typeof raw === "string" ? parseFloat(raw) : Number(raw);
		return Number.isFinite(parsed) ? parsed : 0;
	}, [order]);

	// init
	// init
	useEffect(() => {
		(async () => {
			try {
				const r = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}`);
				const j: { success: boolean; order?: OrderDoc; message?: string } = await r.json();
				if (!j.success || !j.order) throw new Error(j.message || "Orden no encontrada");
				setOrder(j.order);

				const ob = j.order.billing || {};
				const countryCode = (ob.country as string) || (navigator?.language?.split("-")[1] ?? "HN");
				const found = COUNTRIES.find(c => c.code === countryCode.toUpperCase()) || COUNTRIES[0];
				setPhoneCountry(found);

				// ⛔️ NO prellenar el teléfono del JSON en el input
				setPhoneLocal("");  // el usuario lo digita

				setBilling(prev => ({
					address: String(ob.address ?? prev.address),
					country: String(ob.country ?? found.code),
					state: String(ob.state ?? prev.state),
					city: String(ob.city ?? prev.city),
					// Se mantiene en state solo como referencia, PERO NO se muestra en el input
					phone: String(ob.phone ?? ""),
				}));
			} catch (e: unknown) {
				setError(e instanceof Error ? e.message : "No se pudo cargar la orden");
			} finally {
				setLoading(false);
			}
		})();
	}, [orderId]);


	// ======== Handlers de validación/formateo ========

	// Número: solo dígitos + detectar marca
	const onCardNumber = (v: string) => {
		const digits = v.replace(/\D/g, "");
		setCard(c => ({ ...c, number: digits }));
		const br = detectBrand(digits);
		setBrand(br);
		if (digits.length >= 1 && br !== "VISA" && br !== "MASTERCARD") {
			setErrBrand(`No aceptamos tarjetas ${br === "DESCONOCIDA" ? "de marca desconocida" : br}.`);
		} else {
			setErrBrand("");
		}
	};

	// Titular: forzar MAYÚSCULAS y colapsar espacios
	const onCardholder = (v: string) => {
		const up = v.toUpperCase();
		setCard(c => ({ ...c, cardholder: up.replace(/\s+/g, " ").trimStart() }));
	};

	// Expira: autoinsertar "/" y validar MM/YY y que no esté vencida
	const onExpire = (v: string) => {
		// Solo dígitos y a lo sumo 4 para MMYY
		const d = v.replace(/\D/g, "").slice(0, 4);
		let formatted = d;
		if (d.length >= 3) formatted = d.slice(0, 2) + "/" + d.slice(2);
		setCard(c => ({ ...c, expire: formatted }));

		setErrExpire("");
		if (d.length >= 1 && parseInt(d.slice(0, 2) || "0", 10) > 12) {
			setErrExpire("Mes inválido (MM debe ser 01–12).");
			return;
		}
		if (d.length === 4) {
			const mm = parseInt(d.slice(0, 2), 10);
			const yy = parseInt(d.slice(2, 4), 10);
			if (mm < 1 || mm > 12) {
				setErrExpire("Mes inválido (MM debe ser 01–12).");
				return;
			}
			// considerar tarjeta válida hasta fin del mes
			const now = new Date();
			const year = 2000 + yy;
			const expEnd = new Date(year, mm, 0, 23, 59, 59); // último día de ese mes
			if (expEnd < now) setErrExpire("Tarjeta vencida.");
		}
	};

	// CVV: solo dígitos (3-4)
	const onCvv = (v: string) => {
		const digits = v.replace(/\D/g, "").slice(0, 4);
		setCard(c => ({ ...c, cvv2: digits }));
	};

	// Teléfono local: solo dígitos
	const onPhoneLocal = (v: string) => {
		const digits = v.replace(/\D/g, "");  // ← elimina espacios, guiones, paréntesis, etc.
		setPhoneLocal(digits);
		setErrPhone(digits.length < 6 ? "Número incompleto." : "");
	};

	// Cambio de país
	const onCountryChange = (code: string) => {
		const found = COUNTRIES.find(c => c.code === code) || COUNTRIES[0];
		setPhoneCountry(found);
	};

	// botón deshabilitado si hay errores
	const hasErrors =
		!!errBrand ||
		!!errExpire ||
		!!errPhone ||
		!card.number ||
		!card.cardholder ||
		card.expire.length < 5 ||
		card.cvv2.length < 3 ||
		phoneLocal.length < 6;

	async function submit(ev: React.FormEvent) {
		ev.preventDefault();
		setError(null);
		try {
			if (!order) throw new Error("Orden no disponible");
			if (hasErrors) return;

			// Ensamblar teléfono con prefijo
			const fullPhone = "+" + `${phoneCountry.dial}${phoneLocal}`.replace(/\D/g, "");
			setBilling(b => ({ ...b, phone: fullPhone }));

			// monto para gateway (sandbox usa testCase; live usa el monto real)
			const rawAmt = order.amount ?? 0;
			const parsed = typeof rawAmt === "string" ? parseFloat(rawAmt) : Number(rawAmt);
			const amountForGateway = env === "sandbox" ? testCase : (Number.isFinite(parsed) ? parsed : 0);
			if (!Number.isFinite(amountForGateway) || amountForGateway <= 0) {
				setError("El monto de la orden no es válido");
				return;
			}

			const trxInput: PixelPayTransactionInput = {
				amount: amountForGateway,
				currency: toCurrency(order.currency),
				order: {
					id: String(order.order_id),
					description: order.description || "Recarga",
					customer_name: order.customer?.name || "",
					customer_email: order.customer?.email || "",
				},
				card: {
					number: card.number,
					holder: card.cardholder,
					exp: card.expire,
					cvv: card.cvv2,
				},
				billing: {
					address: billing.address,
					country: billing.country,
					state: billing.state,
					city: billing.city,
					phone: fullPhone,      // 👈 siempre el del usuario
				},
			};

			const res: Result = mode === "auth" ? await authWith3DS(trxInput) : await saleWith3DS(trxInput);
			await bindPixelPayment(order.order_id, res);
			const approved = res?.data?.response_approved === true || res?.success === true;

			window.parent.postMessage(
				{
					type: "BMTICKET_PAYMENT_RESULT",
					order_id: order.order_id,
					status: approved ? "APPROVED" : "DECLINED",
					message: res?.message || (approved ? "Pago aprobado" : "Pago no aprobado"),
					payment_uuid: res?.data?.payment_uuid ?? null,
					payment_hash: res?.data?.payment_hash ?? null,
				},
				parentOrigin || "*"
			);
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Ocurrió un error");
		}
	}

	return (
		<main className="page">
			<Script
				src="https://cdn.jsdelivr.net/npm/@pixelpay/sdk-core@2.4.3/lib/browser/index.js"
				strategy="beforeInteractive"
			/>

			<header className="header">
				{/* <div className="brand">
					{HONDUBET_LOGO_URL ? (
						<Image src={HONDUBET_LOGO_URL} alt="Hondubet" className="brandImg"  width={70} unoptimized />
					) : (
						<strong className="brandText">HONDUBET</strong>
					)}
				</div> */}
			</header>

			<div className="form">
				{loading ? (
					<p> Cargando… </p>
				) : error ? (
					<p className="err">{error}</p>
				) : (
					<form onSubmit={submit} className="formGrid" noValidate>
						{/* Número */}
						<label className="lbl">
							<span>Información de la tarjeta</span>
							<input
								required
								placeholder="INGRESE NÚMERO DE TARJETA"
								value={card.number}
								onChange={(e) => onCardNumber(e.target.value)}
								inputMode="numeric"
								autoComplete="cc-number"
								aria-invalid={!!errBrand}
							/>
							<div className="hintRow">
								<small className="muted">
									Marca detectada: <b>{brand}</b>
								</small>
								{errBrand && <small className="err">{errBrand}</small>}
							</div>
						</label>

						{/* Titular */}
						<label className="lbl">
							<input
								required
								placeholder="TITULAR DE LA TARJETA"
								value={card.cardholder}
								onChange={(e) => onCardholder(e.target.value)}
								autoComplete="cc-name"
							/>
						</label>

						{/* Expira + CVV */}
						<div className="row2">
							<label className="lbl">
								<input
									required
									placeholder="MM/YY"
									value={card.expire}
									onChange={(e) => onExpire(e.target.value)}
									inputMode="numeric"
									autoComplete="cc-exp"
									maxLength={5}
									aria-invalid={!!errExpire}
								/>
								{errExpire && <small className="err">{errExpire}</small>}
							</label>

							<label className="lbl">
								<input
									required
									placeholder="CVV"
									value={card.cvv2}
									onChange={(e) => onCvv(e.target.value)}
									inputMode="numeric"
									autoComplete="cc-csc"
									maxLength={4}
								/>
							</label>
						</div>

						<hr className="divider" />

						{/* Teléfono con país */}
						<label className="lbl">
							<span>Teléfono</span>
							<div className="phoneRow">
								<select
									value={phoneCountry.code}
									onChange={(e) => onCountryChange(e.target.value)}
									className="phoneSelect"
									aria-label="País"
								>
									{COUNTRIES.map(c => (
										<option key={c.code} value={c.code}>
											{c.flag} {c.code} {c.dial}
										</option>
									))}
								</select>
								{/* <div className="dialBox">{phoneCountry.dial}</div> */}
								<input
									required
									placeholder="Número"
									value={phoneLocal}
									onChange={(e) => onPhoneLocal(e.target.value)}
									type="tel"                   // 👈 clave
									inputMode="tel"              // 👈 clave
									name="billing-phone"         // 👈 evita heurísticas de tarjeta
									autoComplete="tel"           // 👈 o "tel-national"
								// autoComplete="off"        // <- úsalo solo si lo anterior no basta
								/>
							</div>
							{errPhone && <small className="err">{errPhone}</small>}
						</label>

						{/* Total */}
						<hr className="divider" />
						<div className="totalRow">
							<span>Total:</span>
							<strong>{money(displayTotal, order?.currency || "HNL")}</strong>
						</div>

						<button type="submit" className="btnPrimary" disabled={hasErrors}>Pagar</button>

						{/* Trust badges */}
						<div className="trust">
							<div className="trustLeft">
								<Image src={TRUST_SVG} alt="Badge 1" height={18} unoptimized />
								<Image src={TRUST_SVG1} alt="Badge 2" height={18} unoptimized />
								<Image src={TRUST_SVG2} alt="Badge 3" height={18} unoptimized />
							</div>
							<div className="trustRight">
								<Image src={CARDS_ROW_URL} alt="Visa & Mastercard" height={18} unoptimized />
							</div>
						</div>

						{/* <div className="powered">
							<span>Powered by</span>
							<Image src={BMT_LOGO_URL} alt="BMTicket" width={60} unoptimized />
						</div> */}
					</form>
				)}
			</div>

			<style jsx>{`

			/* --- Fix de responsividad de inputs en el modal --- */
*, *::before, *::after { box-sizing: border-box; }

/* Que inputs/selects nunca desborden el contenedor */
input, select { width: 100%; max-width: 100%; }

/* Fila Expira / CVV: permite colapsar en pantallas angostas */
.row2 { grid-template-columns: 1fr 1fr; gap: 10px; }
@media (max-width: 380px) {
  .row2 { grid-template-columns: 1fr; }
}

/* Teléfono: que el select no imponga ancho rígido y el input pueda encoger */
.phoneRow { display: flex; gap: 8px; align-items: stretch; }
.phoneSelect {
  flex: 0 0 38%;      /* ocupa ~38% en pantallas normales */
  min-width: 96px;    /* más flexible que 130px */
  max-width: 160px;   /* evita crecer demasiado */
}
.phoneRow input {
  flex: 1 1 auto;     /* que se adapte al espacio restante */
  min-width: 0;       /* CLAVE para que no desborde dentro de flex */
}

/* En pantallas MUY estrechas (modales pequeños), apílalos */
@media (max-width: 330px) {
  .phoneRow { flex-direction: column; }
  .phoneSelect, .phoneRow input { max-width: 100%; }
}

/* Ajustes de paddings/gaps para modales pequeños */
@media (max-width: 360px) {
  .form { padding: 16px; }
  .formGrid { gap: 8px; }
  .divider { margin: 2px 0; }
}

/* Evitar zoom extraño en iOS manteniendo 16px mínimos en controles */
@media (max-width: 420px) {
  .form input,
  .form select,
  .btnPrimary { font-size: 16px; }
}

/* Asegurar que nada se salga del contenedor principal */
.header, .form { width: min(480px, 95vw); }
.form { overflow: hidden; }       /* por si algún hijo intenta desbordar */
.hintRow { gap: 8px; flex-wrap: wrap; } /* mensajes de ayuda se acomodan */

        /* compactar tipografías */
        .form { font-size: 14px; }
        .form .lbl span { font-size: 12px; }
        .form input { font-size: 14px; }
        .btnPrimary { font-size: 14px; padding: 10px 14px; }
        .totalRow { font-size: 13px; }
        .trust { font-size: 12px; }
        .powered { font-size: 11px; }

        .page {
          font-family: system-ui;
          color: #fff;
          background: #0b1220;
          min-height: 100vh;
          padding: 16px;
          display: grid;
          justify-items: center;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: min(480px, 95vw);
          margin-bottom: 12px;
        }
        .brandImg { height: 22px; display: block; }
        .brandText { color: #fff; font-weight: 900; letter-spacing: 0.5px; }

        .form {
          width: min(480px, 95vw);
          background: #111827;
          border-radius: 14px;
          box-shadow: 0 10px 40px rgba(0,0,0,.35);
          padding: 24px;
        }
        .formGrid { display: grid; gap: 10px; }
        .lbl { display: grid; gap: 6px; }
        .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .divider { border: 0; border-top: 1px solid #2b2f3a; margin: 4px 0; }
        input, select {
          padding: 12px;
          border-radius: 10px;
          border: 1px solid #2b2f3a;
          background: #0f1429;
          color: #fff;
          outline: none;
        }
        .btnPrimary {
          padding: 12px 16px;
          border-radius: 12px;
          background: #1ad1a5;
          color: #041421;
          border: 0;
          font-weight: 800;
          cursor: pointer;
        }
        .btnPrimary[disabled] { opacity: 0.6; cursor: default; }

        .trust { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; }
        .trustLeft { display: flex; align-items: center; gap: 8px; opacity: 0.85; }
        .trustRight img { opacity: 0.9; }
        .powered { display: flex; align-items: center; gap: 6px; margin-top: 2px; opacity: 0.9; color: #9fb0d2; }

        .totalRow {
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 12px; border-radius:10px; background:#0f1429;
          border:1px solid #2b2f3a; margin: 6px 0 10px;
        }

        .hintRow { display:flex; justify-content:space-between; align-items:center; }
        .muted { color:#9fb0d2; }
        .err { color: #ff6b6b; }

        /* Teléfono compuesto */
        .phoneRow { display:flex; gap:8px; }
        .phoneSelect { min-width: 130px; }
        .dialBox {
          display:flex; align-items:center; padding: 0 10px; border-radius: 10px;
          border: 1px solid #2b2f3a; background:#0f1429; color:#9fb0d2;
        }
      `}</style>
		</main>
	);
}
