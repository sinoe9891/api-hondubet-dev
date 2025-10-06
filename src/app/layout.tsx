// src/app/layout.tsx
import Script from "next/script";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <Script
          id="pixelpay-sdk"
          src="https://cdn.jsdelivr.net/npm/@pixelpay/sdk-core@2.4.4"
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
