import Link from "next/link";
import { Metadata } from "next";
import { listarPropostas } from "@/lib/store";
import { Eyebrow, Voice } from "@/components/Ledger";
import { CrmBoard, CrmCard } from "@/components/CrmBoard";
import { statusEfetivo } from "@/lib/crm";

export const metadata: Metadata = { title: "CRM" };
export const dynamic = "force-dynamic";

export default async function CrmPage() {
  const propostas = await listarPropostas();

  const cards: CrmCard[] = propostas.map((p) => ({
    id: p.id,
    titulo: p.gerado.tituloProposta,
    cliente: p.briefing.cliente,
    criadoEm: p.criadoEm,
    valor: p.briefing.itensInvestimento.reduce((s, i) => s + i.valor, 0),
    status: statusEfetivo(p),
    proximoContato: p.proximoContato ?? null,
    notas: p.notas ?? [],
    assinada: Boolean(p.assinatura),
    contato: p.contato,
  }));

  return (
    <main className="wrap section" style={{ paddingTop: 56 }}>
      <header
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 24,
          marginBottom: 40,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Eyebrow>Lastro · CRM</Eyebrow>
          <h1 style={{ fontSize: "clamp(26px, 3.2vw, 34px)" }}>
            Acompanhe cada proposta até <Voice>fechar</Voice>
          </h1>
          <p style={{ color: "var(--ink-soft)", maxWidth: "58ch", marginTop: 12, fontSize: 14.5 }}>
            Mude o status, marque a próxima data de contato e registre o que rolou em cada
            conversa. Propostas assinadas pelo cliente já entram como &ldquo;Aceita&rdquo;
            automaticamente.
          </p>
        </div>
        <Link href="/admin" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
          ← Painel
        </Link>
      </header>

      <CrmBoard cards={cards} />
    </main>
  );
}
