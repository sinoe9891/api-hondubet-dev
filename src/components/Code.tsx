"use client";

import { useState } from "react";

export default function Code({
  children,
  lang = "bash",
  label,
}: {
  children: string;
  lang?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === "string" ? children.trim() : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  return (
    <div className="relative group border border-black/10 dark:border-white/15 rounded-2xl overflow-hidden bg-white/70 dark:bg-neutral-900/60 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2 text-xs border-b border-black/5 dark:border-white/10">
        <span className="font-mono text-neutral-500">{label || lang}</span>
        <button
          onClick={copy}
          className="px-2 py-1 rounded-md border border-black/10 dark:border-white/15 text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10"
        >
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>
      <pre className="p-4 text-[12.5px] leading-relaxed overflow-auto">
        <code>{text}</code>
      </pre>
    </div>
  );
}
