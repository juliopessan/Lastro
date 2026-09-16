import Link from "next/link";
import { Eyebrow, Voice } from "@/components/Ledger";

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
          <span style={{ fontFamily: "var(--mono)", fontSize: 13, letterSpacing: "0.08em" }}>
            UKODE LABS
          </span>
          <Link href="/login" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
            Entrar
          </Link>
        </nav>
      </div>

      <section className="wrap section" style={{ paddingTop: 40 }}>
        <Eyebrow>Estúdio de produto & IA</Eyebrow>
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            lineHeight: 1.04,
            maxWidth: "16ch",
            marginBottom: 24,
          }}
        >
          Software e design pensados para o que é <Voice>medido</Voice>, não só bonito.
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 17, maxWidth: "60ch", lineHeight: 1.65 }}>
          A UKode Labs desenha e constrói produtos digitais — sites, sistemas internos,
          integrações com IA — com um princípio simples: todo dado que aparece na tela precisa
          deixar claro de onde veio. Nada de número bonito que ninguém consegue explicar depois.
        </p>
      </section>

      <section className="section">
        <div className="wrap">
          <Eyebrow>01 · O que fazemos</Eyebrow>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 32,
            }}
          >
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 10 }}>Produtos sob medida</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
                Sites institucionais, catálogos, dashboards e sistemas internos — construídos
                para o fluxo real do seu negócio, não para um template genérico.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 10 }}>IA aplicada com critério</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
                Automação de propostas, atendimento e conteúdo — sempre deixando explícito o que
                foi gerado e o que foi medido, para você defender cada entrega.
              </p>
            </div>
            <div>
              <h3 style={{ fontSize: 18, marginBottom: 10 }}>Design system Ledger</h3>
              <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
                A mesma linguagem visual que usamos aqui: dado medido e conteúdo gerado nunca se
                parecem, em nenhuma interface que entregamos.
              </p>
            </div>
          </div>
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
