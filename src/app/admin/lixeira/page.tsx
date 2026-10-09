import Link from "next/link";
import { Metadata } from "next";
import { listarLixeira } from "@/lib/store";
import { moedaDe } from "@/lib/moeda";
import { Eyebrow } from "@/components/Ledger";
import { ItemLixeira, LixeiraList } from "@/components/LixeiraList";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Lixeira" };

export default async function LixeiraPage() {
  const itens: ItemLixeira[] = (await listarLixeira()).map((p) => ({
    id: p.id,
    titulo: p.gerado.tituloProposta,
    cliente: p.briefing.cliente,
    valor: p.briefing.itensInvestimento.reduce((s, i) => s + i.valor, 0),
    moeda: moedaDe(p.briefing),
    excluidoEm: p.excluidoEm!,
  }));

  return (
    <main className="wrap section" style={{ paddingTop: 56 }}>
      <header
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
          <Eyebrow>Lastro · lixeira</Eyebrow>
          <h1 style={{ fontSize: "clamp(26px, 3.2vw, 34px)" }}>Propostas excluídas</h1>
          <p style={{ color: "var(--ink-soft)", maxWidth: "60ch", marginTop: 12 }}>
            Proposta na lixeira não aparece no painel nem no CRM, e o link do cliente para de
            abrir. Restaurar devolve tudo como estava. Excluir de vez apaga do banco.
          </p>
        </div>
        <Link href="/admin" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
          ← Todas as propostas
        </Link>
      </header>
      <LixeiraList itens={itens} />
    </main>
  );
}
