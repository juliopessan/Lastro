"use client";

import { useState } from "react";

// Manda o resumo do dia por e-mail agora, para testar a entrega sem esperar
// as 8h do dia seguinte.
export function EnviarResumoButton() {
  const [estado, setEstado] = useState<"parado" | "enviando" | string>("parado");

  async function enviar() {
    setEstado("enviando");
    try {
      const res = await fetch("/api/admin/resumo", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      setEstado(res.ok ? `Enviado para ${json.para}.` : json.erro || "Falha ao enviar.");
    } catch {
      setEstado("Falha ao enviar.");
    }
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ border: "1px solid var(--rule)", padding: "6px 10px", fontSize: 10.5 }}
        onClick={enviar}
        disabled={estado === "enviando"}
      >
        {estado === "enviando" ? "enviando…" : "enviar resumo por e-mail agora"}
      </button>
      {estado !== "parado" && estado !== "enviando" && (
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>{estado}</span>
      )}
    </span>
  );
}
