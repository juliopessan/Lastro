import Link from "next/link";
import { listarPropostas } from "@/lib/store";
import { Eyebrow, Fig, LedgerPanel, Voice } from "@/components/Ledger";
import { formatBrl, formatUsd } from "@/lib/pricing";

export const dynamic = "force-dynamic";

function totalInvestimento(p: Awaited<ReturnType<typeof listarPropostas>>[number]) {
  return p.briefing.itensInvestimento.reduce((s, i) => s + i.valor, 0);
}

export default async function DashboardPage() {
  const propostas = await listarPropostas();
  const custoTotal = propostas.reduce((s, p) => s + p.geracao.custoUsd, 0);
  const valorTotalGerado = propostas.reduce((s, p) => s + totalInvestimento(p), 0);

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
          <Eyebrow>UKode Labs</Eyebrow>
          <h1 style={{ fontSize: "clamp(28px, 3.6vw, 40px)" }}>
            Propostas geradas com <Voice>critério</Voice>
          </h1>
          <p className="body" style={{ color: "var(--ink-soft)", maxWidth: "60ch", marginTop: 12 }}>
            Os valores e prazos vêm do briefing que você preenche. A IA escreve só a narrativa —
            e cada proposta traz o custo real da geração.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/mercado" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
            Preços de mercado
          </Link>
          <Link href="/novo" className="btn">
            + Nova proposta
          </Link>
        </div>
      </header>

      <LedgerPanel liveLabel="Painel geral" meta={`${propostas.length} propostas geradas`}>
        <div className="figs">
          <Fig value={formatBrl(valorTotalGerado)} label="em propostas ativas" />
          <Fig value={String(propostas.length).padStart(2, "0")} label="propostas no sistema" />
        </div>
      </LedgerPanel>

      <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 1 }}>
        {propostas.length === 0 && (
          <p style={{ color: "var(--ink-faint)", padding: "24px 0" }}>
            Nenhuma proposta ainda. Crie a primeira em &ldquo;Nova proposta&rdquo;.
          </p>
        )}
        {propostas.map((p) => (
          <Link
            key={p.id}
            href={`/propostas/${p.id}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "20px 4px",
              borderTop: "1px solid var(--rule)",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{p.gerado.tituloProposta}</p>
              <p style={{ color: "var(--ink-faint)", fontSize: 13, marginTop: 4 }}>
                {p.briefing.cliente} · {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div style={{ display: "flex", gap: 24, alignItems: "baseline" }}>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 13,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatBrl(totalInvestimento(p))}
              </span>
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--ink-faint)",
                }}
              >
                {formatUsd(p.geracao.custoUsd)} IA
              </span>
            </div>
          </Link>
        ))}
      </div>

      <footer style={{ borderTop: "1px solid var(--rule)", paddingTop: 20, marginTop: 40 }}>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
          UKode Labs · custo total de geração (IA): {formatUsd(custoTotal)}
        </p>
      </footer>
    </main>
  );
}
