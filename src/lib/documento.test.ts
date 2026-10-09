import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { formatoDoArquivo, textoDeArquivo, xmlDocxParaTexto } from "./documento";

// Documentos montados aqui mesmo, sem arquivo binário no repositório: um
// DOCX é um ZIP com word/document.xml, e um PDF simples cabe em poucas linhas.

function docx(corpoXml: string): Uint8Array {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${corpoXml}</w:body></w:document>`;
  return zipSync({ "word/document.xml": strToU8(xml), "[Content_Types].xml": strToU8("<Types/>") });
}

const p = (t: string) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`;
const celula = (t: string) => `<w:tc>${p(t)}</w:tc>`;

function pdf(linha: string): Uint8Array {
  const conteudo = `BT /F1 18 Tf 20 100 Td (${linha}) Tj ET`;
  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 144] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let corpo = "%PDF-1.4\n";
  const offsets: number[] = [];
  objetos.forEach((o, i) => {
    offsets.push(corpo.length);
    corpo += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = corpo.length;
  corpo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  corpo += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  corpo += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return strToU8(corpo);
}

describe("formatoDoArquivo", () => {
  it.each([
    ["requisitos.md", "texto"],
    ["notas.TXT", "texto"],
    ["proposta.pdf", "pdf"],
    ["escopo.docx", "docx"],
    ["planilha.xlsx", null],
    ["antigo.doc", null],
  ])("%s -> %s", (nome, esperado) => {
    expect(formatoDoArquivo(nome)).toBe(esperado);
  });
});

describe("xmlDocxParaTexto", () => {
  it("um parágrafo por linha e tabela como colunas separadas por |", () => {
    const xml =
      p("Proposta Comercial") +
      `<w:tbl><w:tr>${celula("Discovery")}${celula("US$ 300")}</w:tr><w:tr>${celula("Testes")}${celula("US$ 600")}</w:tr></w:tbl>` +
      p("Validade: 15 dias");
    expect(xmlDocxParaTexto(xml)).toBe("Proposta Comercial\nDiscovery | US$ 300\nTestes | US$ 600\nValidade: 15 dias");
  });

  it("decodifica entidades XML", () => {
    expect(xmlDocxParaTexto(p("P&amp;D &lt;MVP&gt; &#233; &#x2013; fim"))).toBe("P&D <MVP> é – fim");
  });
});

describe("textoDeArquivo", () => {
  it("lê .md como texto", async () => {
    expect(await textoDeArquivo("req.md", strToU8("# Escopo\nLoja virtual"))).toBe("# Escopo\nLoja virtual");
  });

  it("lê .docx de verdade", async () => {
    const texto = await textoDeArquivo("escopo.docx", docx(p("Loja WooCommerce") + p("Até 50 produtos")));
    expect(texto).toBe("Loja WooCommerce\nAté 50 produtos");
  });

  it("lê .pdf de verdade", async () => {
    const texto = await textoDeArquivo("proposta.pdf", pdf("Investimento total 3000"));
    expect(texto).toContain("Investimento total 3000");
  });

  it("recusa formato não aceito com mensagem clara", async () => {
    await expect(textoDeArquivo("planilha.xlsx", strToU8("x"))).rejects.toThrow(/\.txt, \.md, \.pdf ou \.docx/);
  });

  it("recusa DOCX corrompido sem estourar", async () => {
    await expect(textoDeArquivo("x.docx", strToU8("isto não é zip"))).rejects.toThrow(/corrompido/);
  });

  it("recusa PDF corrompido sem estourar", async () => {
    await expect(textoDeArquivo("x.pdf", strToU8("isto não é pdf"))).rejects.toThrow(/PDF/);
  });

  it("recusa arquivo vazio", async () => {
    await expect(textoDeArquivo("vazio.txt", strToU8("   "))).rejects.toThrow(/vazio/);
  });
});
