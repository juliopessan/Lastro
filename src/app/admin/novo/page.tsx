"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/Ledger";
import { BriefingFields, briefingVazio } from "@/components/BriefingFields";
import { BriefingInput } from "@/lib/types";

export default function NovaPropostaPage() {
  const router = useRouter();
  const [dados, setDados] = useState<BriefingInput>(briefingVazio);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
      <Eyebrow>Lastro · Nova proposta</Eyebrow>
      <h1 style={{ fontSize: "clamp(26px, 3.2vw, 34px)", marginBottom: 8 }}>
        Briefing da proposta
      </h1>
      <p style={{ color: "var(--ink-soft)", maxWidth: "62ch", marginBottom: 40 }}>
        Preencha os números e itens que você já decidiu. A IA escreve apenas o resumo executivo,
        as introduções de cada frente, os próximos passos e o fechamento.
      </p>

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
