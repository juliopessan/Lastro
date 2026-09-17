import Link from "next/link";
import { Eyebrow, Fig, LedgerPanel, Measured, Voice } from "@/components/Ledger";

export default function LandingPage() {
  return (
    <main>
      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <nav
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}>
              Lastro
            </span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.06em" }}>
              por UKode Labs
            </span>
          </div>
          <Link href="/login" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
            Entrar
          </Link>
        </nav>
      </div>

      {/* HOOK */}
      <section className="wrap section" style={{ paddingTop: 40 }}>
        <Eyebrow>Lastro · sistema de propostas com IA</Eyebrow>
        <h1
          style={{
            fontSize: "clamp(34px, 5.6vw, 58px)",
            lineHeight: 1.05,
            maxWidth: "18ch",
            marginBottom: 24,
          }}
        >
          A proposta que hoje toma uma tarde <Voice>sai pronta</Voice> antes do café esfriar.
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 17, maxWidth: "62ch", lineHeight: 1.65 }}>
          O Lastro é onde a UKode Labs monta suas propostas comerciais. Você preenche o briefing
          uma vez — cliente, escopo, valores, prazos. A IA escreve só a narrativa. Os números que
          você digitou nunca são tocados pelo modelo. O resultado é um documento pronto, com link
          pra assinatura, sem reescrever a proposta anterior à mão.
        </p>
      </section>

      {/* RE-HOOK */}
      <section className="wrap" style={{ paddingTop: 8, paddingBottom: 48 }}>
        <p style={{ fontSize: "clamp(20px, 2.6vw, 27px)", maxWidth: "34ch", lineHeight: 1.3 }}>
          <span style={{ fontFamily: "var(--mono)", fontVariantNumeric: "tabular-nums", color: "var(--mint)" }}>
            $0,0006
          </span>{" "}
          foi o que custou, em API, escrever a narrativa da última proposta gerada aqui — menos
          que o troco do café, e o número está no rodapé da própria proposta, não numa peça de
          marketing.
        </p>
      </section>

      {/* MEAT */}
      <section className="section">
        <div className="wrap">
          <Eyebrow>01 · O que muda</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 40,
            }}
          >
            <div>
              <h3 style={{ fontSize: 15, color: "var(--ink-faint)", marginBottom: 16, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Do jeito manual
              </h3>
              <ul style={{ display: "flex", flexDirection: "column", gap: 14, listStyle: "none", padding: 0 }}>
                {[
                  "Abrir a última proposta parecida e trocar nome, escopo e valores à mão",
                  "Reescrever o resumo executivo pra soar específico daquele cliente",
                  "Recalcular cada tabela de investimento e conferir se os totais batem",
                  "Torcer pra não ter esquecido de atualizar um número em algum canto",
                  "Se usou IA pra acelerar, não saber quanto daquele texto foi checado de verdade",
                ].map((linha, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, color: "var(--ink-soft)", fontSize: 14.5, borderTop: "1px solid var(--rule)", paddingTop: 14 }}>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--clay-deep)" }}>—</span>
                    {linha}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={{ fontSize: 15, color: "var(--mint)", marginBottom: 16, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Com o sistema
              </h3>
              <ul style={{ display: "flex", flexDirection: "column", gap: 14, listStyle: "none", padding: 0 }}>
                {[
                  "Preenche um briefing estruturado uma vez: cliente, escopo, investimento, prazos",
                  "A IA escreve a narrativa a partir do que você já decidiu — nunca inventa números",
                  "Toda cifra da proposta vem do seu formulário e fica marcada como medida",
                  "O cliente recebe um link, revisa e assina na hora — sem PDF, sem ida e volta",
                  "Cada proposta mostra o custo real da geração, não uma estimativa de marketing",
                ].map((linha, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, color: "var(--ink-soft)", fontSize: 14.5, borderTop: "1px solid var(--rule)", paddingTop: 14 }}>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--mint)" }}>—</span>
                    {linha}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Eyebrow>02 · Custo, não estimativa</Eyebrow>
          <p style={{ color: "var(--ink-soft)", fontSize: 15.5, maxWidth: "62ch", marginBottom: 32, lineHeight: 1.65 }}>
            Não vamos prometer uma porcentagem de economia inventada. O que o sistema mostra é o
            que ele mesmo mede: quanto custou, em dólares reais de API, escrever a narrativa de
            cada proposta que já geramos com ele.
          </p>
          <LedgerPanel liveLabel="Medido em uso real" meta="deepseek-flash · propostas de teste">
            <div className="figs">
              <Fig value="$0,0006" label="proposta simples, 1 frente de escopo" />
              <Fig value="$0,0011" label="proposta complexa, 3 frentes e 18 itens" />
              <Fig value="< 8s" label="tempo de geração da narrativa" />
            </div>
            <Measured titulo="Medido, não estimado">
              Cada número acima veio de uma chamada real à API, registrada no rodapé daquela
              proposta específica — não é uma média de marketing. Gere a sua e confira o custo da
              sua própria proposta.
            </Measured>
          </LedgerPanel>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Eyebrow>03 · Como funciona</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 32,
            }}
          >
            {[
              { n: "01", t: "Briefing", d: "Cliente, frentes de escopo, investimento, condições de pagamento e cronograma — tudo que você já decidiu." },
              { n: "02", t: "Narrativa por IA", d: "O modelo escreve resumo, introduções e próximos passos a partir do briefing, sem alterar nenhum valor." },
              { n: "03", t: "Link para o cliente", d: "A proposta fica pronta com link público. Ele revisa, compara com o mercado e assina na página." },
              { n: "04", t: "Painel de gestão", d: "Você acompanha tudo em /admin — quem assinou, quem está pendente e quanto cada geração custou." },
            ].map((step) => (
              <div key={step.n}>
                <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)", marginBottom: 8 }}>
                  {step.n}
                </p>
                <h3 style={{ fontSize: 17, marginBottom: 8 }}>{step.t}</h3>
                <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 24 }}>
          <div>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 32px)", marginBottom: 8 }}>
              A próxima proposta pode sair hoje.
            </h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5, maxWidth: "50ch" }}>
              Acesso restrito à equipe da UKode Labs.
            </p>
          </div>
          <Link href="/login" className="btn">
            Entrar no painel
          </Link>
        </div>
      </section>

      <footer className="section" style={{ paddingBottom: 56 }}>
        <div className="wrap">
          <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
            UKode Labs
          </p>
        </div>
      </footer>
    </main>
  );
}
