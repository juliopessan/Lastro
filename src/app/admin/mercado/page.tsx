import Link from "next/link";
import { Eyebrow } from "@/components/Ledger";
import { CATEGORIAS_MERCADO, FONTE_BENCHMARK } from "@/lib/market-pricing";
import { formatBrl } from "@/lib/pricing";

export default function MercadoPage() {
  const porProjeto = CATEGORIAS_MERCADO.filter((c) => c.unidade === "projeto");
  const mensais = CATEGORIAS_MERCADO.filter((c) => c.unidade === "mensal");

  return (
    <main className="wrap" style={{ paddingTop: 56, paddingBottom: 100 }}>
      <div style={{ marginBottom: 32 }}>
        <Link href="/admin" className="btn btn-ghost">
          ← Todas as propostas
        </Link>
      </div>

      <Eyebrow>UKode Labs · Referência de mercado</Eyebrow>
      <h1 style={{ fontSize: "clamp(28px, 3.6vw, 40px)", marginBottom: 12 }}>
        Preços de mercado — São Paulo / Brasil
      </h1>
      <p style={{ color: "var(--ink-soft)", maxWidth: "64ch", marginBottom: 40 }}>
        Faixas praticadas para um perfil <strong>Enterprise / Senior Tech Lead</strong>, com
        expertise em IA, arquiteturas Microsoft e governança digital. Use como referência ao
        precificar itens no briefing — não é uma pesquisa auditada, é o benchmark configurado
        pela UKode Labs.
      </p>

      <section className="section" style={{ paddingTop: 0 }}>
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Por projeto</h3>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Escopo / entregável</th>
                <th style={{ textAlign: "right" }}>Faixa de mercado</th>
                <th style={{ textAlign: "right" }}>Tarifa / hora</th>
              </tr>
            </thead>
            <tbody>
              {porProjeto.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.categoria}</td>
                  <td style={{ color: "var(--ink-soft)" }}>{c.escopo}</td>
                  <td className="num">
                    {formatBrl(c.faixaMin)} – {formatBrl(c.faixaMax)}
                  </td>
                  <td className="num">
                    {c.horaMin && c.horaMax
                      ? `${formatBrl(c.horaMin)} – ${formatBrl(c.horaMax)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h3 style={{ fontSize: 16, marginBottom: 16 }}>Recorrência mensal</h3>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Escopo / entregável</th>
                <th style={{ textAlign: "right" }}>Faixa de mercado</th>
              </tr>
            </thead>
            <tbody>
              {mensais.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.categoria}</td>
                  <td style={{ color: "var(--ink-soft)" }}>{c.escopo}</td>
                  <td className="num">
                    {formatBrl(c.faixaMin)} – {formatBrl(c.faixaMax)} /mês
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", marginTop: 8 }}>
        Fonte: {FONTE_BENCHMARK}. Editável em{" "}
        <code style={{ fontFamily: "var(--mono)" }}>src/lib/market-pricing.ts</code>.
      </p>
    </main>
  );
}
