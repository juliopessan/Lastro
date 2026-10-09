import { describe, expect, it } from "vitest";
import { diaBrasilia, horaBrasilia, montarResumoDoDia } from "./lembretes";
import { propostaFake } from "./test-fixtures";

// 15:00 em Brasília de 09/10/2026.
const agora = Date.parse("2026-10-09T18:00:00.000Z");
const DIA = 86_400_000;

describe("dia e hora em Brasília", () => {
  it("vira o dia pela meia-noite de Brasília, não pela de UTC", () => {
    expect(diaBrasilia(Date.parse("2026-10-10T02:00:00.000Z"))).toBe("2026-10-09"); // 23h em Brasília
    expect(horaBrasilia(Date.parse("2026-10-10T02:00:00.000Z"))).toBe(23);
    expect(horaBrasilia(Date.parse("2026-10-09T11:00:00.000Z"))).toBe(8);
  });
});

describe("montarResumoDoDia", () => {
  it("contato de hoje e atrasado entram; futuro e de proposta fechada não", () => {
    const r = montarResumoDoDia(
      [
        propostaFake({ id: "hoje", proximoContato: "2026-10-09" }),
        propostaFake({ id: "atrasado", proximoContato: "2026-10-05" }),
        propostaFake({ id: "futuro", proximoContato: "2026-10-20" }),
        propostaFake({ id: "fechada", proximoContato: "2026-10-01", status: "perdida" }),
      ],
      agora
    );
    expect(r.contatos.map((c) => [c.id, c.atrasado])).toEqual([
      ["atrasado", true],
      ["hoje", false],
    ]);
  });

  it("proposta vencendo em até 3 dias entra; já vencida, longe ou assinada não", () => {
    const criada = (diasAtras: number) => new Date(agora - diasAtras * DIA).toISOString();
    const r = montarResumoDoDia(
      [
        propostaFake({ id: "vence-amanha", criadoEm: criada(14) }), // validade 15 dias
        propostaFake({ id: "vence-longe", criadoEm: criada(1) }),
        propostaFake({ id: "ja-vencida", criadoEm: criada(20) }),
        propostaFake({ id: "assinada", criadoEm: criada(14), assinatura: { nome: "x", imagemPng: "x", aceitoEm: criada(1) } }),
      ],
      agora
    );
    expect(r.vencendo.map((v) => [v.id, v.dias])).toEqual([["vence-amanha", 1]]);
  });

  it("aberturas das últimas 24 horas, agrupadas por proposta", () => {
    const r = montarResumoDoDia(
      [
        propostaFake({
          id: "aberta",
          visualizacoes: [
            { em: new Date(agora - 2 * DIA).toISOString() },
            { em: new Date(agora - 5 * 3_600_000).toISOString() },
            { em: new Date(agora - 3_600_000).toISOString() },
          ],
        }),
        propostaFake({ id: "antiga", visualizacoes: [{ em: new Date(agora - 3 * DIA).toISOString() }] }),
      ],
      agora
    );
    expect(r.aberturas.map((a) => [a.id, a.vezes])).toEqual([["aberta", 2]]);
  });

  it("sem nada pendente, o resumo diz que está vazio", () => {
    expect(montarResumoDoDia([propostaFake({ criadoEm: new Date(agora).toISOString() })], agora).vazio).toBe(true);
  });
});
