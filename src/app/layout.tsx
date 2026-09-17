import type { Metadata } from "next";
import { Inter_Tight, Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const display = Inter_Tight({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const voice = Instrument_Serif({
  variable: "--font-voice",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
