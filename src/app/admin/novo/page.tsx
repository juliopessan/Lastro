"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/Ledger";
import { BriefingFields, briefingVazio } from "@/components/BriefingFields";
import { BriefingInput } from "@/lib/types";

const CHAVE_RASCUNHO = "lastro:rascunho-briefing";

function carregarRascunho(): BriefingInput | null {
  try {
    const bruto = window.localStorage.getItem(CHAVE_RASCUNHO);
    return bruto ? (JSON.parse(bruto) as BriefingInput) : null;
  } catch {
    return null;
  }
}

export default function NovaPropostaPage() {
  const router = useRouter();
  const [dados, setDados] = useState<BriefingInput>(briefingVazio);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false);
  const carregouRef = useRef(false);

  // Restaura um rascunho salvo (aba fechada sem enviar) só na primeira
  // renderização — depois disso, cada mudança já sobrescreve o rascunho.
  useEffect(() => {
    const salvo = carregarRascunho();
    if (salvo) {
      // Hidratação única a partir do localStorage (fonte externa, síncrona,
      // só lida no mount) — não é o caso de "derivar estado de props" que a
      // regra normalmente evita.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDados(salvo);
      setRascunhoRestaurado(true);
    }
    carregouRef.current = true;
  }, []);

  useEffect(() => {
    if (!carregouRef.current) return;
    const ehVazio =
      !dados.cliente.trim() &&
      !dados.projetos.trim() &&
      !dados.contexto.trim() &&
      dados.frentes.every((f) => !f.titulo.trim());
    try {
      if (ehVazio) {
        window.localStorage.removeItem(CHAVE_RASCUNHO);
      } else {
        window.localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(dados));
      }
    } catch {
      // localStorage indisponível (modo privado etc.) — segue sem rascunho.
    }
  }, [dados]);

  function descartarRascunho() {
    try {
      window.localStorage.removeItem(CHAVE_RASCUNHO);
    } catch {
      // ignora
    }
    setDados(briefingVazio);
    setRascunhoRestaurado(false);
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
      try {
        window.localStorage.removeItem(CHAVE_RASCUNHO);
      } catch {
        // ignora
      }
      router.push(`/propostas/${json.id}`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="wrap" style={{ paddingTop: 56, paddingBottom: 100 }}>
      <Eyebrow>Lastro · Nova proposta</Eyebrow>
      <h1 style={{ fontSize: "clamp(26px, 3.2vw, 34px)", marginBottom: 8 }}>
        Briefing da proposta
      </h1>
      <p style={{ color: "var(--ink-soft)", maxWidth: "62ch", marginBottom: 24 }}>
        Preencha os números e itens que você já decidiu. A IA escreve apenas o resumo executivo,
        as introduções de cada frente, os próximos passos e o fechamento.
      </p>

      {rascunhoRestaurado && (
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            border: "1px solid var(--rule)",
            background: "var(--paper-deep)",
            padding: "10px 14px",
            marginBottom: 24,
            fontSize: 13,
            color: "var(--ink-soft)",
          }}
        >
          <span>Rascunho salvo automaticamente no seu navegador foi restaurado.</span>
          <button
            type="button"
            onClick={descartarRascunho}
            style={{ fontFamily: "var(--mono)", fontSize: 11, textDecoration: "underline", color: "var(--clay-deep)" }}
          >
            descartar e começar do zero
          </button>
        </div>
      )}

      <BriefingFields dados={dados} onChange={setDados} />

      {erro && (
        <div className="flag" style={{ marginTop: 40 }}>
          <span className="flag-k">Erro</span>
          <p>{erro}</p>
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <button type="button" className="btn" onClick={enviar} disabled={enviando}>
          {enviando ? "Gerando com IA…" : "Gerar proposta"}
        </button>
      </div>
    </main>
  );
}
