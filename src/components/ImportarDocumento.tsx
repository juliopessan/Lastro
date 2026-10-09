"use client";

import { useRef, useState } from "react";
import { BriefingInput } from "@/lib/types";

export type ResultadoImportacao = {
  briefing: BriefingInput;
  moeda: string;
  custoUsd: number;
  origem: string;
};

// Painel no topo da nova proposta: o admin cola os requisitos ou envia o
// arquivo, e a IA devolve o briefing para preencher o formulário. Nada é
// gerado nem gravado aqui — só preenche, para conferir antes.
export function ImportarDocumento({
  temConteudo,
  onPreencher,
}: {
  temConteudo: boolean;
  onPreencher: (r: ResultadoImportacao) => void;
}) {
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement | null>(null);

  async function preencher() {
    setErro(null);
    if (!texto.trim() && !arquivo) {
      setErro("Cole o texto dos requisitos ou escolha um arquivo.");
      return;
    }
    if (
      temConteudo &&
      !confirm("O formulário já tem dados. Substituir tudo pelo que a IA ler do documento?")
    ) {
      return;
    }

    const form = new FormData();
    if (texto.trim()) form.append("texto", texto);
    if (arquivo) form.append("arquivo", arquivo);

    setLendo(true);
    try {
      const res = await fetch("/api/proposals/extrair", { method: "POST", body: form });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro || "Não foi possível ler o documento.");
      onPreencher({
        briefing: json.briefing,
        moeda: json.moeda,
        custoUsd: json.custoUsd,
        origem: [arquivo?.name, texto.trim() && "texto colado"].filter(Boolean).join(" + "),
      });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido.");
    } finally {
      setLendo(false);
    }
  }

  return (
    <section
      className="no-print"
      style={{ border: "1px solid var(--rule)", padding: "20px 22px", marginBottom: 36 }}
    >
      <h3 style={{ fontSize: 15, marginBottom: 6 }}>Preencher a partir de um documento</h3>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, maxWidth: "70ch", marginBottom: 18 }}>
        Cole os requisitos ou envie o arquivo. A IA lê e preenche os campos abaixo, copiando só
        o que está no documento. Nada é gerado até você conferir e clicar em Gerar proposta.
      </p>

      <div className="field" style={{ marginBottom: 16 }}>
        <label htmlFor="importar-texto">Texto dos requisitos</label>
        <textarea
          id="importar-texto"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Cole aqui o escopo, a proposta de referência ou as anotações da reunião."
          style={{ minHeight: 140 }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div className="field" style={{ flex: 1, minWidth: 240 }}>
          <label htmlFor="importar-arquivo">Ou envie um arquivo (.txt, .md, .pdf, .docx · até 5 MB)</label>
          <input
            id="importar-arquivo"
            ref={inputArquivo}
            type="file"
            accept=".txt,.md,.markdown,.pdf,.docx"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </div>
        <div style={{ display: "flex", gap: 10, alignSelf: "flex-end" }}>
          {(texto || arquivo) && !lendo && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ border: "1px solid var(--rule)" }}
              onClick={() => {
                setTexto("");
                setArquivo(null);
                if (inputArquivo.current) inputArquivo.current.value = "";
                setErro(null);
              }}
            >
              Limpar
            </button>
          )}
          <button type="button" className="btn" onClick={preencher} disabled={lendo}>
            {lendo ? "Lendo o documento…" : "Preencher campos com IA"}
          </button>
        </div>
      </div>

      {erro && (
        <p role="alert" style={{ color: "var(--clay-deep)", fontSize: 13.5, marginTop: 14 }}>
          {erro}
        </p>
      )}
    </section>
  );
}
