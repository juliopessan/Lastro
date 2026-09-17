"use client";

import { useState } from "react";
import Link from "next/link";
import { STATUS_LABEL, STATUS_ORDEM, contatoAtrasado } from "@/lib/crm";
import { StatusProposta, NotaCrm } from "@/lib/types";
import { formatBrl } from "@/lib/pricing";

export type CrmCard = {
  id: string;
  titulo: string;
  cliente: string;
  criadoEm: string;
  valor: number;
  status: StatusProposta;
  proximoContato: string | null;
  notas: NotaCrm[];
  assinada: boolean;
};

async function patchCrm(id: string, body: object) {
  const res = await fetch(`/api/proposals/${id}/crm`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Falha ao atualizar.");
  return res.json();
}

function Card({
  card,
  onChange,
}: {
  card: CrmCard;
  onChange: (id: string, patch: Partial<CrmCard>) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState(false);
  const atrasado = contatoAtrasado(card);

  async function mudarStatus(status: StatusProposta) {
    onChange(card.id, { status });
    try {
      await patchCrm(card.id, { status });
    } catch {
      alert("Não foi possível mudar o status.");
    }
  }

  async function mudarContato(data: string) {
    const valor = data || null;
    onChange(card.id, { proximoContato: valor });
    try {
      await patchCrm(card.id, { proximoContato: valor });
    } catch {
      alert("Não foi possível salvar a data de contato.");
    }
  }

  async function enviarNota() {
    if (!nota.trim()) return;
    setEnviando(true);
    try {
      const atualizada = await patchCrm(card.id, { nota });
      onChange(card.id, { notas: atualizada.notas || [] });
      setNota("");
    } catch {
      alert("Não foi possível salvar a nota.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      style={{
        background: "var(--paper)",
        border: "1px solid var(--rule)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <Link href={`/propostas/${card.id}`}>
        <p style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.3 }}>{card.titulo}</p>
        <p style={{ color: "var(--ink-faint)", fontSize: 12, marginTop: 4 }}>{card.cliente}</p>
      </Link>

      <p style={{ fontFamily: "var(--mono)", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
        {formatBrl(card.valor)}
      </p>

      <select
        value={card.status}
        onChange={(e) => mudarStatus(e.target.value as StatusProposta)}
        style={{
          background: "var(--paper-deep)",
          border: "1px solid var(--rule)",
          padding: "5px 6px",
          fontSize: 11.5,
          color: "var(--ink-soft)",
        }}
      >
        {STATUS_ORDEM.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <div>
        <label
          style={{
            display: "block",
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: atrasado ? "var(--clay-deep)" : "var(--ink-faint)",
            marginBottom: 4,
          }}
        >
          {atrasado ? "Contato atrasado" : "Próximo contato"}
        </label>
        <input
          type="date"
          value={card.proximoContato ? card.proximoContato.slice(0, 10) : ""}
          onChange={(e) => mudarContato(e.target.value)}
          style={{
            width: "100%",
            background: "var(--paper-deep)",
            border: `1px solid ${atrasado ? "var(--clay)" : "var(--rule)"}`,
            padding: "5px 6px",
            fontSize: 11.5,
            fontFamily: "var(--mono)",
            color: "var(--ink-soft)",
          }}
        />
      </div>

      <button
        type="button"
        onClick={() => setAberta((v) => !v)}
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          color: "var(--ink-faint)",
          textAlign: "left",
          textDecoration: "underline",
        }}
      >
        {aberta ? "ocultar notas" : `notas (${card.notas.length})`}
      </button>

      {aberta && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {card.notas.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 140, overflowY: "auto" }}>
              {[...card.notas].reverse().map((n, i) => (
                <div key={i} style={{ borderTop: "1px solid var(--rule)", paddingTop: 6 }}>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)" }}>{n.texto}</p>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--ink-faint)", marginTop: 2 }}>
                    {new Date(n.criadoEm).toLocaleString("pt-BR")}
                  </p>
                </div>
              ))}
            </div>
          )}
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ex: liguei dia 20, aguardando aprovação interna"
            style={{
              background: "var(--paper-deep)",
              border: "1px solid var(--rule)",
              padding: "6px 8px",
              fontSize: 12,
              minHeight: 50,
              resize: "vertical",
            }}
          />
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 10, padding: "6px 10px", alignSelf: "flex-start" }}
            onClick={enviarNota}
            disabled={enviando}
          >
            {enviando ? "salvando…" : "+ nota"}
          </button>
        </div>
      )}
    </div>
  );
}

export function CrmBoard({ cards: cardsIniciais }: { cards: CrmCard[] }) {
  const [cards, setCards] = useState(cardsIniciais);

  function onChange(id: string, patch: Partial<CrmCard>) {
    setCards((atual) => atual.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  return (
    <div
      className="tbl-wrap"
      style={{ display: "flex", gap: 16, alignItems: "flex-start", paddingBottom: 8 }}
    >
      {STATUS_ORDEM.map((status) => {
        const doStatus = cards.filter((c) => c.status === status);
        return (
          <div key={status} style={{ flex: "0 0 240px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <h3
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink-faint)",
                }}
              >
                {STATUS_LABEL[status]}
              </h3>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>
                {String(doStatus.length).padStart(2, "0")}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {doStatus.length === 0 && (
                <p style={{ color: "var(--ink-faint)", fontSize: 12 }}>—</p>
              )}
              {doStatus.map((card) => (
                <Card key={card.id} card={card} onChange={onChange} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
