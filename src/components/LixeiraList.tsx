"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatBrl } from "@/lib/pricing";

export type ItemLixeira = {
  id: string;
  titulo: string;
  cliente: string;
  valor: number;
  excluidoEm: string;
};

export function LixeiraList({ itens }: { itens: ItemLixeira[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function agir(id: string, acao: "restaurar" | "definitivo") {
    if (
      acao === "definitivo" &&
      !confirm("Excluir esta proposta de vez? Isso não pode ser desfeito: briefing, texto, assinatura e histórico do CRM somem do banco.")
    ) {
      return;
    }
    setOcupado(id);
    try {
      const res = await fetch(`/api/proposals/${id}/${acao}`, {
        method: acao === "restaurar" ? "POST" : "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro || "Falha na operação.");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      setOcupado(null);
    }
  }

  if (itens.length === 0) {
    return (
      <p style={{ color: "var(--ink-soft)", borderTop: "1px solid var(--rule)", paddingTop: 18 }}>
        A lixeira está vazia.
      </p>
    );
  }

  return (
    <div>
      {itens.map((p) => (
        <div
          key={p.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: "18px 4px",
            borderTop: "1px solid var(--rule)",
            flexWrap: "wrap",
          }}
        >
          {/* Sem link: na lixeira, a página pública da proposta responde 404. */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{p.titulo}</p>
            <p style={{ color: "var(--ink-faint)", fontSize: 13, marginTop: 4 }}>
              {p.cliente} · na lixeira desde {new Date(p.excluidoEm).toLocaleDateString("pt-BR")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
              {formatBrl(p.valor)}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "6px 10px", fontSize: 10.5, border: "1px solid var(--rule)" }}
              onClick={() => agir(p.id, "restaurar")}
              disabled={ocupado === p.id}
            >
              {ocupado === p.id ? "aguarde…" : "restaurar"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-danger"
              style={{ padding: "6px 10px", fontSize: 10.5 }}
              onClick={() => agir(p.id, "definitivo")}
              disabled={ocupado === p.id}
            >
              excluir de vez
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
