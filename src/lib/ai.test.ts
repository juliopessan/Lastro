import { describe, expect, it } from "vitest";
import { normalizarBriefingExtraido, normalizarConteudo, paraNumero } from "./ai";
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

describe("paraNumero", () => {
  it.each([
    ["3.000,00", 3000],
    ["US$ 3.000", 3000],
    ["1.250,50", 1250.5],
    ["1,250.50", 1250.5],
    ["3,000", 3000],
    ["12,5", 12.5],
    ["1250.5", 1250.5],
    ["R$ 14.000", 14000],
    ["1.000.000", 1000000],
    [900, 900],
  ] as const)("%s -> %s", (entrada, esperado) => {
    expect(paraNumero(entrada)).toBe(esperado);
  });

  it("texto sem número vira NaN, que o schema troca por 0", () => {
    expect(paraNumero("a combinar")).toBeNaN();
  });
});

describe("normalizarBriefingExtraido", () => {
  const extraido = {
    moeda: "usd",
    briefing: {
      cliente: "[Nome da empresa]",
      projetos: "Loja Virtual WooCommerce",
      contexto: "Loja responsiva — WordPress e WooCommerce.",
      frentes: [
        { titulo: "Módulo 01 — Storefront", itens: [{ descricao: "Homepage" }, { descricao: "" }] },
        { titulo: "", itens: [] },
      ],
      itensInvestimento: [
        { modulo: "Discovery", descricao: "Arquitetura", valor: "US$ 300", categoriaMercado: "ecommerce-mvp" },
        { modulo: "Suporte", descricao: "x", valor: 100, categoriaMercado: "suporte-manutencao" },
        { modulo: "Inventado", descricao: "y", valor: 50, categoriaMercado: "nao-existe" },
      ],
      condicoesPagamento: "40% / 30% / 30%",
      recorrencia: "nao e lista",
      cronograma: [{ fase: "Semana 1", periodo: "5 dias", entregas: "Setup" }],
      validadeDias: "15",
    },
  };

  it("guarda a moeda do documento em ISO maiúsculo", () => {
    expect(normalizarBriefingExtraido(extraido).moeda).toBe("USD");
  });

  it("descarta texto de modelo como [Nome da empresa]", () => {
    expect(normalizarBriefingExtraido(extraido).briefing.cliente).toBe("");
  });

  it("converte valor escrito como texto e mantém o que já é número", () => {
    const itens = normalizarBriefingExtraido(extraido).briefing.itensInvestimento;
    expect(itens.map((i) => i.valor)).toEqual([300, 100, 50]);
  });

  it("só aceita categoria que existe e é da unidade certa", () => {
    const itens = normalizarBriefingExtraido(extraido).briefing.itensInvestimento;
    expect(itens[0].categoriaMercado).toBe("ecommerce-mvp");
    expect(itens[1].categoriaMercado).toBeUndefined(); // suporte é mensal, não setup
    expect(itens[2].categoriaMercado).toBeUndefined(); // não existe
  });

  it("tira travessão e descarta frente e item vazios", () => {
    const b = normalizarBriefingExtraido(extraido).briefing;
    expect(b.frentes).toEqual([{ titulo: "Módulo 01: Storefront", itens: [{ descricao: "Homepage" }] }]);
    expect(b.contexto).toBe("Loja responsiva, WordPress e WooCommerce.");
  });

  it("campo no formato errado vira vazio em vez de quebrar", () => {
    const b = normalizarBriefingExtraido(extraido).briefing;
    expect(b.recorrencia).toEqual([]);
    expect(b.validadeDias).toBe(15);
  });

  it("documento sem nada aproveitável ainda devolve um formulário completo", () => {
    const b = normalizarBriefingExtraido({ moeda: "", briefing: {} }).briefing;
    expect(b.frentes).toHaveLength(1);
    expect(b.itensInvestimento).toHaveLength(1);
    expect(b.cronograma).toHaveLength(1);
    expect(b.validadeDias).toBe(15);
  });

  it("categoria repetida em várias linhas é etapa do mesmo projeto: sai de todas", () => {
    const b = normalizarBriefingExtraido({
      moeda: "USD",
      briefing: {
        itensInvestimento: [
          { modulo: "Discovery", valor: 300, categoriaMercado: "ecommerce-mvp" },
          { modulo: "Design", valor: 900, categoriaMercado: "ecommerce-mvp" },
          { modulo: "Site institucional", valor: 9000, categoriaMercado: "website-b2b" },
        ],
      },
    }).briefing;
    expect(b.itensInvestimento.map((i) => i.categoriaMercado)).toEqual([undefined, undefined, "website-b2b"]);
  });

  it("dólar e euro viram a moeda da proposta; real fica implícito", () => {
    const com = (moeda: string) => normalizarBriefingExtraido({ moeda, briefing: {} }).briefing.moeda;
    expect(com("USD")).toBe("USD");
    expect(com("eur")).toBe("EUR");
    expect(com("BRL")).toBeUndefined();
  });

  it("moeda não suportada não vira moeda da proposta, mas é informada para o aviso", () => {
    const r = normalizarBriefingExtraido({ moeda: "GBP", briefing: {} });
    expect(r.briefing.moeda).toBeUndefined();
    expect(r.moeda).toBe("GBP");
  });

  it("recusa resposta sem o objeto briefing", () => {
    expect(() => normalizarBriefingExtraido({ moeda: "BRL" })).toThrow(/fora do formato/);
  });
});
