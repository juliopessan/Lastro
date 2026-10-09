import Link from "next/link";
import { Metadata } from "next";
import { listarCatalogo } from "@/lib/store";
import { Eyebrow } from "@/components/Ledger";
import { CatalogoEditor } from "@/components/CatalogoEditor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Catálogo de serviços" };

export default async function CatalogoPage() {
  return (
    <main className="wrap section" style={{ paddingTop: 56 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
        <div>
          <Eyebrow>Lastro · catálogo</Eyebrow>
          <h1 style={{ fontSize: "clamp(26px, 3.2vw, 34px)" }}>Catálogo de serviços</h1>
          <p style={{ color: "var(--ink-soft)", maxWidth: "62ch", marginTop: 12 }}>
            O que você vende com frequência, com descrição e valor de referência. No briefing, o
            seletor &quot;+ Do catálogo&quot; insere o item com um clique, e você ajusta o valor
            para cada cliente. O seletor só mostra itens da mesma moeda da proposta.
          </p>
        </div>
        <Link href="/admin" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
          ← Todas as propostas
        </Link>
      </header>
      <CatalogoEditor inicial={await listarCatalogo()} />
    </main>
  );
}
