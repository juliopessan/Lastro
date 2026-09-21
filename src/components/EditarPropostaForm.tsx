"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eyebrow, Flag } from "@/components/Ledger";
import { BriefingFields } from "@/components/BriefingFields";
import { hashBriefing } from "@/lib/briefing-hash";
import { BriefingInput, ConteudoGerado, Geracao, Proposal } from "@/lib/types";

function IconeRefazer() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <polyline points="21 3 21 9 15 9" />
    </svg>
  );
}

function IconeCoerente() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="4 12.5 9 17.5 20 6" />
    </svg>
  );
}

function IconeDesatualizada() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

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
  const [geracao, setGeracao] = useState<Geracao>(proposta.geracao);
  const [salvando, setSalvando] = useState(false);
  const [liberando, setLiberando] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Coerência medida, não presumida: compara o hash do escopo que está na tela
  // agora com o hash do escopo que produziu o texto. Propostas geradas antes
  // desse controle não têm hash — aí a tela não afirma nada.
  const hashAtual = useMemo(() => hashBriefing(dados), [dados]);
  const coerencia: "coerente" | "desatualizada" | "desconhecida" = !geracao.briefingHash
    ? "desconhecida"
    : geracao.briefingHash === hashAtual
      ? "coerente"
      : "desatualizada";

  async function liberarAssinatura() {
    const ok = window.confirm(
      "Remover a assinatura atual e liberar o campo para o cliente assinar de novo? A assinatura anterior fica registrada só como nota no CRM."
    );
    if (!ok) return;
    setErro(null);
    setLiberando(true);
    try {
      const res = await fetch(`/api/proposals/${proposta.id}/liberar-assinatura`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || "Erro ao liberar assinatura.");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLiberando(false);
    }
  }

  async function regenerarNarrativa() {
    const ok = window.confirm(
      "Reescrever a narrativa a partir do escopo que está na tela? O texto desta seção será substituído — inclusive o que você ajustou à mão."
    );
    if (!ok) return;
    setErro(null);
    setRegenerando(true);
    try {
      const res = await fetch(`/api/proposals/${proposta.id}/regenerar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing: dados }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || "Erro ao reescrever a narrativa.");
      // Nada foi gravado ainda: o texto novo fica no formulário até você salvar.
      setGerado(json.gerado);
      setGeracao(json.geracao);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setRegenerando(false);
    }
  }

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
        body: JSON.stringify({ briefing: dados, gerado: geradoFinal, geracao }),
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
            documento sem invalidar a assinatura anterior. Se as mudanças exigem novo aceite,
            libere o campo de assinatura para o cliente assinar de novo.
          </Flag>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ border: "1px solid var(--rule)", marginTop: 12 }}
            disabled={liberando}
            onClick={liberarAssinatura}
          >
            {liberando ? "Liberando…" : "Liberar campo de assinatura"}
          </button>
        </div>
      )}

      <p style={{ color: "var(--ink-soft)", maxWidth: "62ch", marginBottom: 40 }}>
        Ajuste os números do briefing ou o texto que a IA escreveu. A edição é direta e salva do
        jeito que você deixar — a IA só é chamada de novo se você clicar em{" "}
        <strong>Atualizar narrativa</strong>.
      </p>

      <BriefingFields dados={dados} onChange={setDados} />

      {/* Narrativa gerada por IA */}
      <section style={{ marginTop: 40 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <h3 style={{ fontSize: 15 }}>Narrativa (escrita pela IA)</h3>
          <button
            type="button"
            className="btn btn-ghost"
            style={{
              border: "1px solid var(--rule)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
            disabled={regenerando}
            onClick={regenerarNarrativa}
            title="Reescrever a narrativa a partir do escopo atual"
          >
            <IconeRefazer />
            {regenerando ? "Reescrevendo…" : "Atualizar narrativa"}
          </button>
        </div>

        <p
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            marginBottom: 18,
            color:
              coerencia === "coerente"
                ? "var(--mint)"
                : coerencia === "desatualizada"
                  ? "var(--clay-deep)"
                  : "var(--ink-faint)",
          }}
        >
          {coerencia === "coerente" && (
            <>
              <IconeCoerente /> Coerente com o escopo atual
            </>
          )}
          {coerencia === "desatualizada" && (
            <>
              <IconeDesatualizada /> Escopo mudou depois deste texto
            </>
          )}
          {coerencia === "desconhecida" && (
            <>
              <IconeDesatualizada /> Proposta antiga — não dá para verificar
            </>
          )}
        </p>

        {coerencia === "desatualizada" && (
          <div style={{ marginBottom: 20 }}>
            <Flag titulo="Narrativa desatualizada">
              O escopo, os valores ou o cronograma mudaram depois que este texto foi escrito.
              Clique em <strong>Atualizar narrativa</strong> para reescrevê-lo a partir do escopo
              atual, ou ajuste os parágrafos à mão — o selo só volta ao verde quando o texto vier
              do escopo que está na tela.
            </Flag>
          </div>
        )}

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
