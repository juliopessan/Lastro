import { z } from "zod";

// Validação de runtime dos payloads que chegam nas rotas de proposta.
// Fica aqui, e não dentro de um route.ts, porque mais de uma rota valida o
// mesmo briefing (editar e regenerar narrativa).

const itemEscopoSchema = z.object({ descricao: z.string() });
const frenteSchema = z.object({ titulo: z.string(), itens: z.array(itemEscopoSchema) });
const itemInvestimentoSchema = z.object({
  modulo: z.string(),
  descricao: z.string(),
  valor: z.number(),
  categoriaMercado: z.string().optional(),
});
const itemRecorrenciaSchema = z.object({
  servico: z.string(),
  descricao: z.string(),
  valorMensal: z.number(),
  categoriaMercado: z.string().optional(),
});
const faseCronogramaSchema = z.object({
  fase: z.string(),
  periodo: z.string(),
  entregas: z.string(),
});

export const briefingSchema = z.object({
  cliente: z.string(),
  projetos: z.string(),
  contexto: z.string(),
  frentes: z.array(frenteSchema),
  itensInvestimento: z.array(itemInvestimentoSchema),
  condicoesPagamento: z.string(),
  recorrencia: z.array(itemRecorrenciaSchema),
  cronograma: z.array(faseCronogramaSchema),
  validadeDias: z.number(),
});

export const geradoSchema = z.object({
  tituloProposta: z.string(),
  resumoExecutivo: z.string(),
  frentesNarrativa: z.array(z.object({ titulo: z.string(), introducao: z.string() })),
  proximosPassos: z.array(z.string()),
  notaFinal: z.string(),
});

export const geracaoSchema = z.object({
  modelo: z.string(),
  tokensEntrada: z.number(),
  tokensSaida: z.number(),
  custoUsd: z.number(),
  duracaoMs: z.number(),
  briefingHash: z.string().optional(),
});
