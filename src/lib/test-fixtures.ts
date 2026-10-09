import { BriefingInput, Proposal } from "./types";

// Proposta mínima e válida para os testes. Cada teste sobrescreve só o que
// importa para ele, pra ficar claro o que está sendo exercitado.
export function briefingFake(over: Partial<BriefingInput> = {}): BriefingInput {
  return {
    cliente: "Cliente Teste",
    projetos: "Projeto X",
    contexto: "contexto",
    frentes: [{ titulo: "Frente A", itens: [{ descricao: "item 1" }] }],
    itensInvestimento: [{ modulo: "Módulo", descricao: "d", valor: 1000 }],
    condicoesPagamento: "à vista",
    recorrencia: [],
    cronograma: [{ fase: "Fase 1", periodo: "Mês 1", entregas: "entrega" }],
    validadeDias: 15,
    ...over,
  };
}

export function propostaFake(over: Partial<Proposal> = {}): Proposal {
  return {
    id: "p1",
    criadoEm: "2026-09-01T12:00:00.000Z",
    status: "enviada",
    briefing: briefingFake(),
    gerado: {
      tituloProposta: "Título",
      resumoExecutivo: "Resumo",
      frentesNarrativa: [{ titulo: "Frente A", introducao: "Intro" }],
      proximosPassos: ["Passo"],
      notaFinal: "Nota",
    },
    geracao: { modelo: "teste", tokensEntrada: 0, tokensSaida: 0, custoUsd: 0, duracaoMs: 0 },
    ...over,
  };
}

export const DIA = 86_400_000;
