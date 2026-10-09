import { describe, expect, it } from "vitest";
import { bloqueioAssinatura, dataEmissao, dataValidade, propostaVencida } from "./crm";
import { DIA, propostaFake } from "./test-fixtures";

const criada = new Date("2026-09-01T12:00:00.000Z").getTime();

describe("datas da proposta", () => {
  it("sem edição, a emissão é a criação", () => {
    expect(dataEmissao(propostaFake()).getTime()).toBe(criada);
  });

  it("editar reemite: a emissão passa a ser a última edição", () => {
    const p = propostaFake({ atualizadoEm: "2026-09-10T12:00:00.000Z" });
    expect(dataEmissao(p).toISOString()).toBe("2026-09-10T12:00:00.000Z");
  });

  it("a validade conta da emissão, não da criação", () => {
    const p = propostaFake({ atualizadoEm: "2026-09-10T12:00:00.000Z" });
    expect(dataValidade(p).toISOString()).toBe("2026-09-25T12:00:00.000Z");
  });
});

describe("propostaVencida", () => {
  it("dentro do prazo não vence", () => {
    expect(propostaVencida(propostaFake(), criada + 14 * DIA)).toBe(false);
  });

  it("depois do prazo vence", () => {
    expect(propostaVencida(propostaFake(), criada + 16 * DIA)).toBe(true);
  });

  it.each(["aceita", "recusada", "perdida"] as const)("status %s não vence mais", (status) => {
    expect(propostaVencida(propostaFake({ status }), criada + 99 * DIA)).toBe(false);
  });
});

describe("bloqueioAssinatura", () => {
  const assinatura = { nome: "X", imagemPng: "data:image/png;base64,AA==", aceitoEm: "2026-09-02" };

  it("proposta em aberto e no prazo pode assinar", () => {
    expect(bloqueioAssinatura(propostaFake(), criada + DIA)).toBeNull();
  });

  it("já assinada não assina de novo", () => {
    expect(bloqueioAssinatura(propostaFake({ assinatura }), criada + DIA)).toBe("assinada");
  });

  it("vencida não assina", () => {
    expect(bloqueioAssinatura(propostaFake(), criada + 16 * DIA)).toBe("vencida");
  });

  it.each(["recusada", "perdida"] as const)("%s não assina, nem dentro do prazo", (status) => {
    expect(bloqueioAssinatura(propostaFake({ status }), criada + DIA)).toBe("encerrada");
  });

  it("aceita no CRM ainda pode formalizar depois do prazo", () => {
    expect(bloqueioAssinatura(propostaFake({ status: "aceita" }), criada + 99 * DIA)).toBeNull();
  });

  it("reeditar uma vencida libera de novo", () => {
    const agora = criada + 30 * DIA;
    const reeditada = propostaFake({ atualizadoEm: new Date(agora - DIA).toISOString() });
    expect(bloqueioAssinatura(propostaFake(), agora)).toBe("vencida");
    expect(bloqueioAssinatura(reeditada, agora)).toBeNull();
  });
});
