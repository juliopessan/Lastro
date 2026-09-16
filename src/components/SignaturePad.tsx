"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function SignaturePad({ propostaId }: { propostaId: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function coordenadas(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function iniciar(e: React.PointerEvent<HTMLCanvasElement>) {
    desenhando.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = coordenadas(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function desenhar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = coordenadas(e);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#11110f";
    ctx.lineTo(x, y);
    ctx.stroke();
    temTraco.current = true;
  }

  function soltar() {
    desenhando.current = false;
  }

  function limpar() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    temTraco.current = false;
  }

  async function enviar() {
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe seu nome completo.");
      return;
    }
    if (!temTraco.current) {
      setErro("Desenhe sua assinatura no quadro acima.");
      return;
    }
    setEnviando(true);
    try {
      const imagemPng = canvasRef.current!.toDataURL("image/png");
      const res = await fetch(`/api/proposals/${propostaId}/assinar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, cargo, imagemPng }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.erro || "Erro ao assinar.");
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label>Nome completo</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
        </div>
        <div className="field" style={{ flex: 1, minWidth: 160 }}>
          <label>Cargo (opcional)</label>
          <input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Sócio-diretor" />
        </div>
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.13em",
            textTransform: "uppercase",
            color: "var(--ink-faint)",
            marginBottom: 7,
          }}
        >
          Assinatura
        </label>
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          style={{
            width: "100%",
            height: 160,
            background: "var(--paper-deep)",
            border: "1px solid var(--rule)",
            touchAction: "none",
            cursor: "crosshair",
          }}
          onPointerDown={iniciar}
          onPointerMove={desenhar}
          onPointerUp={soltar}
          onPointerLeave={soltar}
        />
        <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={limpar}>
          Limpar
        </button>
      </div>

      {erro && (
        <div className="flag">
          <span className="flag-k">Erro</span>
          <p>{erro}</p>
        </div>
      )}

      <button type="button" className="btn" onClick={enviar} disabled={enviando} style={{ alignSelf: "flex-start" }}>
        {enviando ? "Registrando…" : "Aceitar e assinar proposta"}
      </button>
    </div>
  );
}
