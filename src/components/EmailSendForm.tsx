"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Contato } from "@/lib/types";

export function EmailSendForm({
  propostaId,
  contato,
}: {
  propostaId: string;
  contato?: Contato;
}) {
  const router = useRouter();
  const [nome, setNome] = useState(contato?.nome || "");
  const [email, setEmail] = useState(contato?.email || "");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<string | null>(null);

  async function enviar() {
    setErro(null);
    setEnviado(null);
    if (!email.trim()) {
      setErro("Informe o e-mail do cliente.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch(`/api/proposals/${propostaId}/enviar-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailCliente: email, nomeContato: nome, mensagem }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || "Erro ao enviar.");
      setEnviado(email);
      setMensagem("");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="no-print"
      style={{
        border: "1px solid var(--rule)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 480,
      }}
    >
      <p
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10.5,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-faint)",
        }}
      >
        Enviar por e-mail (admin)
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <div className="field" style={{ flex: 1 }}>
          <label>Nome do contato</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>E-mail do cliente</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@empresa.com"
          />
        </div>
      </div>
      <div className="field">
        <label>Mensagem (opcional)</label>
        <textarea
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Uma linha antes do link, se quiser personalizar."
          style={{ minHeight: 60 }}
        />
      </div>

      {erro && (
        <div className="flag">
          <span className="flag-k">Erro</span>
          <p>{erro}</p>
        </div>
      )}
      {enviado && (
        <p style={{ color: "var(--mint)", fontSize: 13 }}>Enviado para {enviado}.</p>
      )}

      <button type="button" className="btn" onClick={enviar} disabled={enviando} style={{ alignSelf: "flex-start" }}>
        {enviando ? "Enviando…" : "Enviar proposta em PDF"}
      </button>
    </div>
  );
}
