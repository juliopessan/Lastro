import Link from "next/link";
import { Metadata } from "next";
import { listarPropostas } from "@/lib/store";
import { Eyebrow, LedgerPanel, Fig, Voice } from "@/components/Ledger";
import { LogoutButton } from "@/components/LogoutButton";
import { PropostasList, PropostaResumo } from "@/components/PropostasList";
import { formatBrl, formatUsd } from "@/lib/pricing";
import { statusEfetivo } from "@/lib/crm";

export const metadata: Metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

function totalInvestimento(p: Awaited<ReturnType<typeof listarPropostas>>[number]) {
  return p.briefing.itensInvestimento.reduce((s, i) => s + i.valor, 0);
}

export default async function AdminPage() {
  const propostas = await listarPropostas();
  const custoTotal = propostas.reduce((s, p) => s + p.geracao.custoUsd, 0);
  const valorTotalGerado = propostas.reduce((s, p) => s + totalInvestimento(p), 0);
  const assinadas = propostas.filter((p) => p.assinatura).length;

  const resumo: PropostaResumo[] = propostas.map((p) => ({
    id: p.id,
    titulo: p.gerado.tituloProposta,
    cliente: p.briefing.cliente,
    criadoEm: p.criadoEm,
    valor: totalInvestimento(p),
    custoUsd: p.geracao.custoUsd,
    status: statusEfetivo(p),
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
          marginBottom: 48,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Eyebrow>Lastro · admin</Eyebrow>
          <h1 style={{ fontSize: "clamp(28px, 3.6vw, 40px)" }}>
            Propostas geradas com <Voice>critério</Voice>
          </h1>
          <p className="body" style={{ color: "var(--ink-soft)", maxWidth: "60ch", marginTop: 12 }}>
            Os valores e prazos vêm do briefing que você preenche. A IA escreve só a narrativa —
            e cada proposta traz o custo real da geração.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/admin/crm" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
            CRM
          </Link>
          <Link href="/admin/mercado" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
            Preços de mercado
          </Link>
          <Link href="/admin/novo" className="btn">
            + Nova proposta
          </Link>
          <LogoutButton />
        </div>
      </header>

      <LedgerPanel liveLabel="Painel geral" meta={`${propostas.length} propostas geradas`}>
        <div className="figs">
          <Fig value={formatBrl(valorTotalGerado)} label="em propostas ativas" />
          <Fig value={String(propostas.length).padStart(2, "0")} label="propostas no sistema" />
          <Fig value={String(assinadas).padStart(2, "0")} label="assinadas" />
        </div>
      </LedgerPanel>

      <div style={{ marginTop: 56 }}>
        <PropostasList propostas={resumo} />
      </div>

      <footer style={{ borderTop: "1px solid var(--rule)", paddingTop: 20, marginTop: 40 }}>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
          Lastro · custo total de geração (IA): {formatUsd(custoTotal)}
        </p>
      </footer>
    </main>
  );
}
