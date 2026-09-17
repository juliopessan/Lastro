import { Metadata } from "next";

export const metadata: Metadata = { title: "Nova proposta" };

export default function NovaPropostaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
