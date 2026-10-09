import { describe, expect, it } from "vitest";
import { escapeHtml, nomeArquivoPdf } from "./email";

describe("escapeHtml", () => {
  it("neutraliza um nome que tenta virar link no e-mail", () => {
    expect(escapeHtml('<a href="https://phish.test">Ver contrato</a>')).toBe(
      "&lt;a href=&quot;https://phish.test&quot;&gt;Ver contrato&lt;/a&gt;"
    );
  });

  it("escapa & antes do resto, sem escapar duas vezes", () => {
    expect(escapeHtml("A & B < C")).toBe("A &amp; B &lt; C");
  });
});

describe("nomeArquivoPdf", () => {
  it.each([
    ["Perennia / VR Motors: projeto digital", "Perennia - VR Motors - projeto digital.pdf"],
    ["Loja Aurora", "Loja Aurora.pdf"],
    ["Proposta: ", "Proposta.pdf"],
    ["///", "proposta.pdf"],
  ])("%s -> %s", (titulo, esperado) => {
    expect(nomeArquivoPdf(titulo)).toBe(esperado);
  });
});
