import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fontes embutidas no repositório (subconjunto latino, licença OFL) em vez de
// next/font/google. O google baixa os arquivos durante o build, e quando o
// Google Fonts oscila o build falha — aconteceu no CI. Na VPS, onde cada
// deploy compila, isso seria deploy quebrado por motivo externo. Mesmas
// famílias, pesos e variáveis CSS de antes: a página não muda.

// Arquivo variável: o mesmo serve 600 a 800, como o Google entregava.
const display = localFont({
  variable: "--font-display",
  src: [{ path: "./fonts/inter-tight-latin.woff2", weight: "600 800", style: "normal" }],
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
  display: "swap",
});

const voice = localFont({
  variable: "--font-voice",
  src: [{ path: "./fonts/instrument-serif-italic-latin.woff2", weight: "400", style: "italic" }],
  fallback: ["Georgia", "Times New Roman", "serif"],
  display: "swap",
});

const mono = localFont({
  variable: "--font-mono",
  src: [
    { path: "./fonts/ibm-plex-mono-400-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500-latin.woff2", weight: "500", style: "normal" },
  ],
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: "Lastro — propostas comerciais com IA",
    template: "%s · Lastro",
  },
  description:
    "Lastro gera propostas comerciais com IA a partir de um briefing estruturado: a IA escreve a narrativa, você controla os números. Um produto UKode Labs.",
  applicationName: "Lastro",
  openGraph: {
    title: "Lastro — propostas comerciais com IA",
    description:
      "A IA escreve a narrativa, você controla os números. Um produto UKode Labs.",
    siteName: "Lastro",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${voice.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
