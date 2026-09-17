"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EmailSendForm({ propostaId }: { propostaId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ emailCliente: email, mensagem }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || "Erro ao enviar.");
      setEnviado(email);
      setEmail("");
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

      <div className="field">
        <label>E-mail do cliente</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="cliente@empresa.com"
        />
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
