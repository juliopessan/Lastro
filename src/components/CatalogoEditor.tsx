"use client";

import { useState } from "react";
import { ItemCatalogo } from "@/lib/types";
import { formatarMoeda, Moeda, MOEDAS, NOME_MOEDA } from "@/lib/moeda";
import { categoriasPorUnidade } from "@/lib/market-pricing";

type Rascunho = Omit<ItemCatalogo, "id" | "criadoEm">;

const vazio: Rascunho = { tipo: "setup", nome: "", descricao: "", valor: 0, moeda: "BRL" };

const campo = {
  background: "var(--paper-deep)",
  border: "1px solid var(--rule)",
  padding: "8px 10px",
  fontSize: 13.5,
};

export function CatalogoEditor({ inicial }: { inicial: ItemCatalogo[] }) {
  const [itens, setItens] = useState(inicial);
  const [rascunho, setRascunho] = useState<Rascunho>(vazio);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const categorias = categoriasPorUnidade(rascunho.tipo === "setup" ? "projeto" : "mensal");

  function mudar<K extends keyof Rascunho>(k: K, v: Rascunho[K]) {
    setRascunho((r) => ({ ...r, [k]: v }));
  }

  async function salvar() {
    setErro(null);
    setOcupado(true);
    try {
      const res = await fetch(editandoId ? `/api/admin/catalogo/${editandoId}` : "/api/admin/catalogo", {
        method: editandoId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rascunho),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || "Não foi possível salvar.");
      setItens((xs) => (editandoId ? xs.map((x) => (x.id === editandoId ? json : x)) : [...xs, json]));
      setRascunho(vazio);
      setEditandoId(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setOcupado(false);
    }
  }

  async function excluir(item: ItemCatalogo) {
    if (!confirm(`Excluir "${item.nome}" do catálogo? As propostas que já usam o item não mudam.`)) return;
    const res = await fetch(`/api/admin/catalogo/${item.id}`, { method: "DELETE" });
    if (res.ok) setItens((xs) => xs.filter((x) => x.id !== item.id));
    else alert("Não foi possível excluir.");
  }

  function editar(item: ItemCatalogo) {
    const { tipo, nome, descricao, valor, moeda, categoriaMercado } = item;
    setRascunho({ tipo, nome, descricao, valor, moeda, categoriaMercado });
    setEditandoId(item.id);
    setErro(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const grupo = (tipo: ItemCatalogo["tipo"], titulo: string) => {
    const lista = itens.filter((i) => i.tipo === tipo);
    return (
      <section style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 15, marginBottom: 10 }}>
          {titulo} ({lista.length})
        </h3>
        {lista.length === 0 && <p style={{ color: "var(--ink-faint)", fontSize: 13 }}>Nenhum item ainda.</p>}
        {lista.map((i) => (
          <div
            key={i.id}
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "12px 4px", borderTop: "1px solid var(--rule)", flexWrap: "wrap" }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{i.nome}</p>
              {i.descricao && <p style={{ color: "var(--ink-soft)", fontSize: 13, marginTop: 2 }}>{i.descricao}</p>}
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--mono)", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                {formatarMoeda(i.valor, i.moeda)}
                {tipo === "mensal" ? "/mês" : ""}
              </span>
              <button type="button" className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 10.5, border: "1px solid var(--rule)" }} onClick={() => editar(i)}>
                editar
              </button>
              <button type="button" className="btn btn-ghost btn-danger" style={{ padding: "6px 10px", fontSize: 10.5 }} onClick={() => excluir(i)}>
                excluir
              </button>
            </div>
          </div>
        ))}
      </section>
    );
  };

  return (
    <div>
      <section style={{ border: "1px solid var(--rule)", padding: "20px 22px" }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>{editandoId ? "Editar item" : "Novo item"}</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select aria-label="Tipo" value={rascunho.tipo} onChange={(e) => setRascunho((r) => ({ ...r, tipo: e.target.value as Rascunho["tipo"], categoriaMercado: undefined }))} style={campo}>
            <option value="setup">Setup (projeto)</option>
            <option value="mensal">Mensal (recorrência)</option>
          </select>
          <input aria-label="Nome" placeholder="Nome (ex: Site institucional)" value={rascunho.nome} onChange={(e) => mudar("nome", e.target.value)} style={{ ...campo, flex: "1 1 220px" }} />
          <input aria-label="Valor" type="number" min={0} placeholder="Valor" value={rascunho.valor || ""} onChange={(e) => mudar("valor", Number(e.target.value))} style={{ ...campo, width: 140, fontFamily: "var(--mono)" }} />
          <select aria-label="Moeda" value={rascunho.moeda} onChange={(e) => setRascunho((r) => ({ ...r, moeda: e.target.value as Moeda, categoriaMercado: undefined }))} style={campo}>
            {MOEDAS.map((m) => (
              <option key={m} value={m}>
                {NOME_MOEDA[m]}
              </option>
            ))}
          </select>
        </div>
        <input aria-label="Descrição" placeholder="Descrição resumida (vai para a proposta)" value={rascunho.descricao} onChange={(e) => mudar("descricao", e.target.value)} style={{ ...campo, width: "100%", marginTop: 8 }} />
        {rascunho.moeda === "BRL" && (
          <select aria-label="Categoria de mercado" value={rascunho.categoriaMercado ?? ""} onChange={(e) => mudar("categoriaMercado", e.target.value || undefined)} style={{ ...campo, marginTop: 8, fontSize: 12.5, color: "var(--ink-soft)" }}>
            <option value="">Categoria de mercado (opcional)</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.categoria}
              </option>
            ))}
          </select>
        )}
        {erro && <p role="alert" style={{ color: "var(--clay-deep)", fontSize: 13.5, marginTop: 10 }}>{erro}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button type="button" className="btn" onClick={salvar} disabled={ocupado}>
            {ocupado ? "Salvando…" : editandoId ? "Salvar alterações" : "Adicionar ao catálogo"}
          </button>
          {editandoId && (
            <button type="button" className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }} onClick={() => { setRascunho(vazio); setEditandoId(null); setErro(null); }}>
              Cancelar
            </button>
          )}
        </div>
      </section>

      {grupo("setup", "Setup (projeto)")}
      {grupo("mensal", "Mensal (recorrência)")}
    </div>
  );
}
