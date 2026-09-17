"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBrl, formatUsd } from "@/lib/pricing";
import { STATUS_LABEL, STATUS_ORDEM } from "@/lib/crm";
import { StatusProposta } from "@/lib/types";

export type PropostaResumo = {
  id: string;
  titulo: string;
  cliente: string;
  criadoEm: string;
  valor: number;
  custoUsd: number;
  status: StatusProposta;
};

const CORES_STATUS: Record<StatusProposta, string> = {
  enviada: "var(--ink-faint)",
  em_negociacao: "var(--ink-soft)",
  aceita: "var(--mint)",
  recusada: "var(--clay-deep)",
  perdida: "var(--clay-deep)",
};

export function PropostasList({ propostas }: { propostas: PropostaResumo[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<"todas" | StatusProposta>("todas");
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    return propostas.filter((p) => {
      if (status !== "todas" && p.status !== status) return false;
      if (busca.trim()) {
        const alvo = `${p.cliente} ${p.titulo}`.toLowerCase();
        if (!alvo.includes(busca.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [propostas, busca, status]);

  async function excluir(id: string) {
    if (!confirm("Excluir esta proposta? Não pode ser desfeito.")) return;
    setExcluindo(id);
    try {
      const res = await fetch(`/api/proposals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao excluir.");
      router.refresh();
    } catch {
      alert("Não foi possível excluir a proposta.");
    } finally {
      setExcluindo(null);
    }
  }

  return (
    <div>
      <div className="no-print" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por cliente ou título"
          style={{
            flex: "1 1 260px",
            background: "var(--paper-deep)",
            border: "1px solid var(--rule)",
            padding: "9px 12px",
            fontSize: 13.5,
            color: "var(--ink)",
          }}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
          style={{
            background: "var(--paper-deep)",
            border: "1px solid var(--rule)",
            padding: "9px 12px",
            fontSize: 13,
            color: "var(--ink-soft)",
          }}
        >
          <option value="todas">Todas</option>
          {STATUS_ORDEM.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {filtradas.length === 0 && (
        <p style={{ color: "var(--ink-faint)", padding: "24px 0" }}>
          Nenhuma proposta encontrada.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {filtradas.map((p) => (
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
            <Link href={`/propostas/${p.id}`} style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{p.titulo}</p>
              <p style={{ color: "var(--ink-faint)", fontSize: 13, marginTop: 4 }}>
                {p.cliente} · {new Date(p.criadoEm).toLocaleDateString("pt-BR")} ·{" "}
                <span style={{ color: CORES_STATUS[p.status] }}>{STATUS_LABEL[p.status]}</span>
              </p>
            </Link>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <span
                style={{ fontFamily: "var(--mono)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}
              >
                {formatBrl(p.valor)}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
                {formatUsd(p.custoUsd)} IA
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-danger"
                style={{ padding: "6px 10px", fontSize: 10.5 }}
                onClick={() => excluir(p.id)}
                disabled={excluindo === p.id}
              >
                {excluindo === p.id ? "excluindo…" : "excluir"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
