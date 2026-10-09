import { describe, expect, it } from "vitest";
import { normalizarConteudo } from "./ai";
import { briefingFake } from "./test-fixtures";

const briefing = briefingFake({
  frentes: [
    { titulo: "Perennia", itens: [] },
    { titulo: "VR Motors", itens: [] },
  ],
});

const respostaBoa = {
  tituloProposta: "Título",
  resumoExecutivo: "Resumo",
  frentesNarrativa: [
    { titulo: "Perennia", introducao: "intro A" },
    { titulo: "VR Motors", introducao: "intro B" },
  ],
  proximosPassos: ["Passo 1"],
  notaFinal: "Nota",
};

describe("normalizarConteudo", () => {
  it("recusa resposta fora do formato em vez de gravar e quebrar a página", () => {
    expect(() => normalizarConteudo({ ...respostaBoa, proximosPassos: "não é lista" }, briefing)).toThrow(
      /fora do formato/
    );
    expect(() => normalizarConteudo(null, briefing)).toThrow(/fora do formato/);
  });

  it("descarta campos que a IA inventou", () => {
    const r = normalizarConteudo({ ...respostaBoa, extra: "lixo" }, briefing) as unknown as Record<string, unknown>;
    expect(r.extra).toBeUndefined();
  });

  it("casa a introdução pelo título sem diferença de maiúsculas", () => {
    const r = normalizarConteudo(
      { ...respostaBoa, frentesNarrativa: [{ titulo: "PERENNIA", introducao: "A" }, { titulo: "vr motors", introducao: "B" }] },
      briefing
    );
    expect(r.frentesNarrativa).toEqual([
      { titulo: "Perennia", introducao: "A" },
      { titulo: "VR Motors", introducao: "B" },
    ]);
  });

  it("se a IA reescreveu o título, usa a posição e devolve o título do briefing", () => {
    const r = normalizarConteudo(
      { ...respostaBoa, frentesNarrativa: [{ titulo: "Perennia", introducao: "A" }, { titulo: "VR Motors (Contagem)", introducao: "B" }] },
      briefing
    );
    expect(r.frentesNarrativa[1]).toEqual({ titulo: "VR Motors", introducao: "B" });
  });

  it("frente sem introdução fica com texto vazio, sem quebrar", () => {
    const r = normalizarConteudo({ ...respostaBoa, frentesNarrativa: [{ titulo: "Perennia", introducao: "A" }] }, briefing);
    expect(r.frentesNarrativa[1]).toEqual({ titulo: "VR Motors", introducao: "" });
  });

  it("tira travessão de IA, mas não mexe em faixa como 10–15", () => {
    const r = normalizarConteudo(
      {
        ...respostaBoa,
        tituloProposta: "Perennia — VR Motors",
        resumoExecutivo: "Começamos pela fundação — domínios e e-mail. Prazo de 10–15 dias.",
        notaFinal: "Fim -- obrigado.",
      },
      briefing
    );
    expect(r.tituloProposta).toBe("Perennia: VR Motors");
    expect(r.resumoExecutivo).toBe("Começamos pela fundação, domínios e e-mail. Prazo de 10–15 dias.");
    expect(r.notaFinal).toBe("Fim, obrigado.");
  });

  it("remove passos vazios", () => {
    const r = normalizarConteudo({ ...respostaBoa, proximosPassos: ["Passo", "  "] }, briefing);
    expect(r.proximosPassos).toEqual(["Passo"]);
  });
});
