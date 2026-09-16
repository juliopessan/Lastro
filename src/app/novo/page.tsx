"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/Ledger";
import {
  BriefingInput,
  Frente,
  ItemInvestimento,
  ItemRecorrencia,
  FaseCronograma,
} from "@/lib/types";
import { categoriasPorUnidade, buscarCategoriaMercado } from "@/lib/market-pricing";
import { formatBrl } from "@/lib/pricing";

const categoriasProjeto = categoriasPorUnidade("projeto");
const categoriasMensal = categoriasPorUnidade("mensal");

const vazio: BriefingInput = {
  cliente: "",
  projetos: "",
  contexto: "",
  frentes: [{ titulo: "", itens: [{ descricao: "" }] }],
  itensInvestimento: [{ modulo: "", descricao: "", valor: 0 }],
  condicoesPagamento: "",
  recorrencia: [],
  cronograma: [{ fase: "", periodo: "", entregas: "" }],
  validadeDias: 15,
};

export default function NovaPropostaPage() {
  const router = useRouter();
  const [dados, setDados] = useState<BriefingInput>(vazio);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizar<K extends keyof BriefingInput>(campo: K, valor: BriefingInput[K]) {
    setDados((d) => ({ ...d, [campo]: valor }));
  }

  // Frentes
  function addFrente() {
    atualizar("frentes", [...dados.frentes, { titulo: "", itens: [{ descricao: "" }] }]);
  }
  function updateFrente(i: number, patch: Partial<Frente>) {
    const copia = [...dados.frentes];
    copia[i] = { ...copia[i], ...patch };
    atualizar("frentes", copia);
  }
  function removeFrente(i: number) {
    atualizar("frentes", dados.frentes.filter((_, idx) => idx !== i));
  }
  function addItemFrente(fi: number) {
    const copia = [...dados.frentes];
    copia[fi] = { ...copia[fi], itens: [...copia[fi].itens, { descricao: "" }] };
    atualizar("frentes", copia);
  }
  function updateItemFrente(fi: number, ii: number, descricao: string) {
    const copia = [...dados.frentes];
    const itens = [...copia[fi].itens];
    itens[ii] = { descricao };
    copia[fi] = { ...copia[fi], itens };
    atualizar("frentes", copia);
  }
  function removeItemFrente(fi: number, ii: number) {
    const copia = [...dados.frentes];
    copia[fi] = { ...copia[fi], itens: copia[fi].itens.filter((_, idx) => idx !== ii) };
    atualizar("frentes", copia);
  }

  // Investimento
  function addInvestimento() {
    atualizar("itensInvestimento", [
      ...dados.itensInvestimento,
      { modulo: "", descricao: "", valor: 0 },
    ]);
  }
  function updateInvestimento(i: number, patch: Partial<ItemInvestimento>) {
    const copia = [...dados.itensInvestimento];
    copia[i] = { ...copia[i], ...patch };
    atualizar("itensInvestimento", copia);
  }
  function removeInvestimento(i: number) {
    atualizar("itensInvestimento", dados.itensInvestimento.filter((_, idx) => idx !== i));
  }

  // Recorrência
  function addRecorrencia() {
    atualizar("recorrencia", [
      ...dados.recorrencia,
      { servico: "", descricao: "", valorMensal: 0 },
    ]);
  }
  function updateRecorrencia(i: number, patch: Partial<ItemRecorrencia>) {
    const copia = [...dados.recorrencia];
    copia[i] = { ...copia[i], ...patch };
    atualizar("recorrencia", copia);
  }
  function removeRecorrencia(i: number) {
    atualizar("recorrencia", dados.recorrencia.filter((_, idx) => idx !== i));
  }

  // Cronograma
  function addFase() {
    atualizar("cronograma", [...dados.cronograma, { fase: "", periodo: "", entregas: "" }]);
  }
  function updateFase(i: number, patch: Partial<FaseCronograma>) {
    const copia = [...dados.cronograma];
    copia[i] = { ...copia[i], ...patch };
    atualizar("cronograma", copia);
  }
  function removeFase(i: number) {
    atualizar("cronograma", dados.cronograma.filter((_, idx) => idx !== i));
  }

  async function enviar() {
    setErro(null);
    if (!dados.cliente.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || "Erro ao gerar proposta.");
      router.push(`/propostas/${json.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="wrap" style={{ paddingTop: 56, paddingBottom: 100 }}>
      <Eyebrow>UKode Labs · Nova proposta</Eyebrow>
      <h1 style={{ fontSize: "clamp(26px, 3.2vw, 34px)", marginBottom: 8 }}>
        Briefing da proposta
      </h1>
      <p style={{ color: "var(--ink-soft)", maxWidth: "62ch", marginBottom: 40 }}>
        Preencha os números e itens que você já decidiu. A IA escreve apenas o resumo executivo,
        as introduções de cada frente, os próximos passos e o fechamento.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
        {/* Dados gerais */}
        <section style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
          <div className="field">
            <label>Cliente</label>
            <input
              value={dados.cliente}
              onChange={(e) => atualizar("cliente", e.target.value)}
              placeholder="Ex: JL Negócios (Holding)"
            />
          </div>
          <div className="field">
            <label>Projetos / marcas envolvidas</label>
            <input
              value={dados.projetos}
              onChange={(e) => atualizar("projetos", e.target.value)}
              placeholder="Ex: Perennia Consultoria | VR Motors"
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Contexto do briefing</label>
            <textarea
              value={dados.contexto}
              onChange={(e) => atualizar("contexto", e.target.value)}
              placeholder="Descreva o objetivo do cliente, histórico, restrições e o que motivou a proposta."
            />
          </div>
          <div className="field">
            <label>Validade da proposta (dias)</label>
            <input
              type="number"
              value={dados.validadeDias}
              onChange={(e) => atualizar("validadeDias", Number(e.target.value))}
            />
          </div>
        </section>

        {/* Frentes de escopo */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15 }}>Frentes de escopo</h3>
            <button type="button" className="btn btn-ghost" onClick={addFrente}>
              + Frente
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {dados.frentes.map((frente, fi) => (
              <div key={fi} style={{ border: "1px solid var(--rule)", padding: 16 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <div className="field" style={{ flex: 1 }}>
                    <label>Título da frente</label>
                    <input
                      value={frente.titulo}
                      onChange={(e) => updateFrente(fi, { titulo: e.target.value })}
                      placeholder="Ex: Website Institucional"
                    />
                  </div>
                  {dados.frentes.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ alignSelf: "flex-end" }}
                      onClick={() => removeFrente(fi)}
                    >
                      Remover
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {frente.itens.map((item, ii) => (
                    <div key={ii} style={{ display: "flex", gap: 8 }}>
                      <input
                        value={item.descricao}
                        onChange={(e) => updateItemFrente(fi, ii, e.target.value)}
                        placeholder="Item de escopo"
                        style={{
                          flex: 1,
                          background: "var(--paper-deep)",
                          border: "1px solid var(--rule)",
                          padding: "8px 10px",
                          fontSize: 13.5,
                          color: "var(--ink)",
                        }}
                      />
                      {frente.itens.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => removeItemFrente(fi, ii)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ alignSelf: "flex-start", marginTop: 4 }}
                    onClick={() => addItemFrente(fi)}
                  >
                    + item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Investimento */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15 }}>Investimento (setup)</h3>
            <button type="button" className="btn btn-ghost" onClick={addInvestimento}>
              + Item
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dados.itensInvestimento.map((item, i) => {
              const catMercado = buscarCategoriaMercado(item.categoriaMercado);
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={item.modulo}
                      onChange={(e) => updateInvestimento(i, { modulo: e.target.value })}
                      placeholder="Módulo"
                      style={{ flex: "0 0 22%", background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5 }}
                    />
                    <input
                      value={item.descricao}
                      onChange={(e) => updateInvestimento(i, { descricao: e.target.value })}
                      placeholder="Descrição resumida"
                      style={{ flex: 1, background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5 }}
                    />
                    <input
                      type="number"
                      value={item.valor}
                      onChange={(e) => updateInvestimento(i, { valor: Number(e.target.value) })}
                      placeholder="Valor (R$)"
                      style={{ flex: "0 0 140px", background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5, fontFamily: "var(--mono)" }}
                    />
                    {dados.itensInvestimento.length > 1 && (
                      <button type="button" className="btn btn-ghost" onClick={() => removeInvestimento(i)}>
                        ×
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <select
                      value={item.categoriaMercado || ""}
                      onChange={(e) =>
                        updateInvestimento(i, { categoriaMercado: e.target.value || undefined })
                      }
                      style={{
                        background: "var(--paper-deep)",
                        border: "1px solid var(--rule)",
                        padding: "6px 8px",
                        fontSize: 12,
                        color: "var(--ink-soft)",
                        maxWidth: 280,
                      }}
                    >
                      <option value="">Categoria de mercado (opcional)</option>
                      {categoriasProjeto.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.categoria}
                        </option>
                      ))}
                    </select>
                    {catMercado && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-faint)" }}>
                        mercado: {formatBrl(catMercado.faixaMin)} – {formatBrl(catMercado.faixaMax)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="field" style={{ marginTop: 16 }}>
            <label>Condições de pagamento</label>
            <textarea
              value={dados.condicoesPagamento}
              onChange={(e) => atualizar("condicoesPagamento", e.target.value)}
              placeholder="Ex: 30% no aceite, 30% na entrega do MVP, 40% no lançamento."
            />
          </div>
        </section>

        {/* Recorrência */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15 }}>Recorrência mensal (opcional)</h3>
            <button type="button" className="btn btn-ghost" onClick={addRecorrencia}>
              + Serviço
            </button>
          </div>
          {dados.recorrencia.length === 0 && (
            <p style={{ color: "var(--ink-faint)", fontSize: 13 }}>Nenhum serviço recorrente adicionado.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dados.recorrencia.map((item, i) => {
              const catMercado = buscarCategoriaMercado(item.categoriaMercado);
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={item.servico}
                      onChange={(e) => updateRecorrencia(i, { servico: e.target.value })}
                      placeholder="Serviço"
                      style={{ flex: "0 0 22%", background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5 }}
                    />
                    <input
                      value={item.descricao}
                      onChange={(e) => updateRecorrencia(i, { descricao: e.target.value })}
                      placeholder="Escopo incluído"
                      style={{ flex: 1, background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5 }}
                    />
                    <input
                      type="number"
                      value={item.valorMensal}
                      onChange={(e) => updateRecorrencia(i, { valorMensal: Number(e.target.value) })}
                      placeholder="R$/mês"
                      style={{ flex: "0 0 140px", background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5, fontFamily: "var(--mono)" }}
                    />
                    <button type="button" className="btn btn-ghost" onClick={() => removeRecorrencia(i)}>
                      ×
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <select
                      value={item.categoriaMercado || ""}
                      onChange={(e) =>
                        updateRecorrencia(i, { categoriaMercado: e.target.value || undefined })
                      }
                      style={{
                        background: "var(--paper-deep)",
                        border: "1px solid var(--rule)",
                        padding: "6px 8px",
                        fontSize: 12,
                        color: "var(--ink-soft)",
                        maxWidth: 280,
                      }}
                    >
                      <option value="">Categoria de mercado (opcional)</option>
                      {categoriasMensal.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.categoria}
                        </option>
                      ))}
                    </select>
                    {catMercado && (
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--ink-faint)" }}>
                        mercado: {formatBrl(catMercado.faixaMin)} – {formatBrl(catMercado.faixaMax)}/mês
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cronograma */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontSize: 15 }}>Cronograma</h3>
            <button type="button" className="btn btn-ghost" onClick={addFase}>
              + Fase
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dados.cronograma.map((fase, i) => (
              <div key={i} style={{ display: "flex", gap: 8 }}>
                <input
                  value={fase.fase}
                  onChange={(e) => updateFase(i, { fase: e.target.value })}
                  placeholder="Fase / mês"
                  style={{ flex: "0 0 20%", background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5 }}
                />
                <input
                  value={fase.periodo}
                  onChange={(e) => updateFase(i, { periodo: e.target.value })}
                  placeholder="Período"
                  style={{ flex: "0 0 20%", background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5 }}
                />
                <input
                  value={fase.entregas}
                  onChange={(e) => updateFase(i, { entregas: e.target.value })}
                  placeholder="Entregas da fase"
                  style={{ flex: 1, background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5 }}
                />
                {dados.cronograma.length > 1 && (
                  <button type="button" className="btn btn-ghost" onClick={() => removeFase(i)}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {erro && (
          <div className="flag">
            <span className="flag-k">Erro</span>
            <p>{erro}</p>
          </div>
        )}

        <div>
          <button type="button" className="btn" onClick={enviar} disabled={enviando}>
            {enviando ? "Gerando com IA…" : "Gerar proposta"}
          </button>
        </div>
      </div>
    </main>
  );
}
