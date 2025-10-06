// /public/bmt-checkout-v2.js
(function () {
  function createOverlay() {
    const ov = document.createElement("div");
    ov.id = "bmt-overlay";
    ov.style.position = "fixed";
    ov.style.inset = "0";
    ov.style.background = "rgba(0,0,0,0.55)";
    ov.style.backdropFilter = "blur(2px)";
    ov.style.zIndex = "99999";
    ov.style.display = "grid";
    ov.style.placeItems = "center";
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    return ov;
  }
  function createModal(url) {
    const modal = document.createElement("div");
    modal.style.width = "min(480px,95vw)";
    modal.style.height = "min(680px,95vh)";
    modal.style.borderRadius = "14px";
    modal.style.overflow = "hidden";
    modal.style.boxShadow = "0 10px 40px rgba(0,0,0,.35)";
    modal.style.background = "#0b1220";

    const iframe = document.createElement("iframe");
    iframe.src = url + (url.includes("?") ? "&" : "?") + "embed=1&parent=" + encodeURIComponent(window.location.origin);
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.allow = "payment *; clipboard-read; clipboard-write;";
    modal.appendChild(iframe);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    closeBtn.setAttribute("aria-label", "Cerrar");
    Object.assign(closeBtn.style, { position:"absolute", top:"8px", right:"12px", fontSize:"24px", background:"transparent", color:"#fff", border:"none", cursor:"pointer" });
    closeBtn.onclick = close;

    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.appendChild(modal); wrap.appendChild(closeBtn);
    return wrap;
  }
  let overlay = null, allowedOrigin = null, onResultCb = null;
  function close(){ if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay=null; window.removeEventListener("message", onMessage); }
  function onMessage(ev){
    try{
      if (!allowedOrigin || ev.origin !== allowedOrigin) return;
      const d = ev.data || {};
      if (d && d.type === "BMTICKET_PAYMENT_RESULT") { if (typeof onResultCb === "function") onResultCb(d); close(); }
    }catch{}
  }
  function open({ checkoutUrl, onResult }){
    if (!checkoutUrl) throw new Error("checkoutUrl requerido");
    allowedOrigin = new URL(checkoutUrl).origin;
    onResultCb = onResult || null;
    overlay = createOverlay();
    overlay.appendChild(createModal(checkoutUrl));
    document.body.appendChild(overlay);
    window.addEventListener("message", onMessage);
  }
  window.BMTCheckout = { open, close };
})();
