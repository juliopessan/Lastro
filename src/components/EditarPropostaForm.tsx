"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eyebrow, Flag } from "@/components/Ledger";
import { BriefingFields } from "@/components/BriefingFields";
import { BriefingInput, ConteudoGerado, Proposal } from "@/lib/types";

function narrativaDe(gerado: ConteudoGerado, titulo: string): string {
  return gerado.frentesNarrativa.find((n) => n.titulo === titulo)?.introducao ?? "";
}

function setNarrativaDe(gerado: ConteudoGerado, titulo: string, introducao: string): ConteudoGerado {
  const outros = gerado.frentesNarrativa.filter((n) => n.titulo !== titulo);
  return { ...gerado, frentesNarrativa: [...outros, { titulo, introducao }] };
}

export function EditarPropostaForm({ proposta }: { proposta: Proposal }) {
  const router = useRouter();
  const [dados, setDados] = useState<BriefingInput>(proposta.briefing);
  const [gerado, setGerado] = useState<ConteudoGerado>(proposta.gerado);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function atualizarGerado<K extends keyof ConteudoGerado>(campo: K, valor: ConteudoGerado[K]) {
    setGerado((g) => ({ ...g, [campo]: valor }));
  }

  function updatePasso(i: number, valor: string) {
    const copia = [...gerado.proximosPassos];
    copia[i] = valor;
    atualizarGerado("proximosPassos", copia);
  }
  function addPasso() {
    atualizarGerado("proximosPassos", [...gerado.proximosPassos, ""]);
  }
  function removePasso(i: number) {
    atualizarGerado(
      "proximosPassos",
      gerado.proximosPassos.filter((_, idx) => idx !== i)
    );
  }

  async function salvar() {
    setErro(null);
    if (!dados.cliente.trim()) {
      setErro("Informe o nome do cliente.");
      return;
    }
    // Realinha a narrativa das frentes com os títulos atuais do briefing,
    // pra não sobrar texto órfão de uma frente removida ou renomeada.
    const frentesNarrativa = dados.frentes.map((f) => ({
      titulo: f.titulo,
      introducao: narrativaDe(gerado, f.titulo),
    }));
    const geradoFinal: ConteudoGerado = { ...gerado, frentesNarrativa };

    setSalvando(true);
    try {
      const res = await fetch(`/api/proposals/${proposta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing: dados, gerado: geradoFinal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || "Erro ao salvar.");
      router.push(`/propostas/${proposta.id}`);
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <main className="wrap" style={{ paddingTop: 56, paddingBottom: 100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <Eyebrow>Lastro · Editar proposta</Eyebrow>
          <h1 style={{ fontSize: "clamp(26px, 3.2vw, 34px)" }}>{proposta.gerado.tituloProposta}</h1>
        </div>
        <Link href={`/propostas/${proposta.id}`} className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
          ← Voltar sem salvar
        </Link>
      </div>

      {proposta.assinatura && (
        <div style={{ marginBottom: 32 }}>
          <Flag titulo="Proposta já assinada">
            {proposta.assinatura.nome} aceitou esta proposta em{" "}
            {new Date(proposta.assinatura.aceitoEm).toLocaleString("pt-BR")}. Editar agora muda o
            documento sem invalidar a assinatura anterior — avalie se não é o caso de gerar uma
            proposta nova em vez de alterar uma que já foi aceita.
          </Flag>
        </div>
      )}

      <p style={{ color: "var(--ink-soft)", maxWidth: "62ch", marginBottom: 40 }}>
        Ajuste os números do briefing ou o texto que a IA escreveu. Nada aqui chama a IA de novo —
        é edição direta, salva do jeito que você deixar.
      </p>

      <BriefingFields dados={dados} onChange={setDados} />

      {/* Narrativa gerada por IA */}
      <section style={{ marginTop: 40 }}>
        <h3 style={{ fontSize: 15, marginBottom: 16 }}>Narrativa (escrita pela IA)</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="field">
            <label>Título da proposta</label>
            <input
              value={gerado.tituloProposta}
              onChange={(e) => atualizarGerado("tituloProposta", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Resumo executivo</label>
            <textarea
              value={gerado.resumoExecutivo}
              onChange={(e) => atualizarGerado("resumoExecutivo", e.target.value)}
              style={{ minHeight: 120 }}
            />
          </div>

          {dados.frentes.map((frente, i) => (
            <div className="field" key={i}>
              <label>Introdução — {frente.titulo || `Frente ${i + 1}`}</label>
              <textarea
                value={narrativaDe(gerado, frente.titulo)}
                onChange={(e) => setGerado((g) => setNarrativaDe(g, frente.titulo, e.target.value))}
                style={{ minHeight: 80 }}
              />
            </div>
          ))}

          <div>
            <label
              style={{
                display: "block",
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: "var(--ink-faint)",
                marginBottom: 10,
              }}
            >
              Próximos passos
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {gerado.proximosPassos.map((passo, i) => (
                <div key={i} style={{ display: "flex", gap: 8 }}>
                  <input
                    value={passo}
                    onChange={(e) => updatePasso(i, e.target.value)}
                    style={{ flex: 1, background: "var(--paper-deep)", border: "1px solid var(--rule)", padding: "8px 10px", fontSize: 13.5 }}
                  />
                  {gerado.proximosPassos.length > 1 && (
                    <button type="button" className="btn btn-ghost" onClick={() => removePasso(i)}>
                      ×
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ alignSelf: "flex-start" }}
                onClick={addPasso}
              >
                + passo
              </button>
            </div>
          </div>

          <div className="field">
            <label>Nota final</label>
            <textarea
              value={gerado.notaFinal}
              onChange={(e) => atualizarGerado("notaFinal", e.target.value)}
              style={{ minHeight: 80 }}
            />
          </div>
        </div>
      </section>

      {erro && (
        <div className="flag" style={{ marginTop: 40 }}>
          <span className="flag-k">Erro</span>
          <p>{erro}</p>
        </div>
      )}

      <div style={{ marginTop: 40, display: "flex", gap: 12 }}>
        <button type="button" className="btn" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar alterações"}
        </button>
        <Link href={`/propostas/${proposta.id}`} className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
          Cancelar
        </Link>
      </div>
    </main>
  );
}
