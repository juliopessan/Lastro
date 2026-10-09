import { z } from "zod";
import { STATUS_ORDEM } from "./crm";
import { StatusProposta } from "./types";

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

// PATCH do CRM. Rota só do admin, mas validar barra lixo no banco: chave
// inventada dentro do contato, data em formato que o painel não entende, nota
// de megabytes.
const textoCurto = (max: number, msg: string) => z.string().trim().max(max, msg).nullable().optional();

export const crmPatchSchema = z.object({
  status: z
    .enum(STATUS_ORDEM as [StatusProposta, ...StatusProposta[]], { error: "Status inválido." })
    .optional(),
  // O input type="date" manda AAAA-MM-DD; null limpa o lembrete.
  proximoContato: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
    .nullable()
    .optional(),
  nota: z.string().trim().max(2000, "Nota muito longa.").optional(),
  contato: z
    .object({
      nome: textoCurto(120, "Nome muito longo."),
      email: z.email("E-mail inválido.").max(200).nullable().optional(),
      telefone: textoCurto(40, "Telefone muito longo."),
    })
    .optional(),
});

/**
 * Teto da imagem da assinatura. O quadro do SignaturePad tem 480x160 px: um
 * PNG desse tamanho, mesmo rabiscado de ponta a ponta, fica bem abaixo disso.
 * A rota é pública, então sem teto qualquer pessoa com o link grava o que
 * quiser no banco.
 */
export const LIMITE_ASSINATURA_PNG = 512 * 1024;

export const assinaturaSchema = z.object({
  nome: z
    .string({ error: "Informe o nome e desenhe a assinatura." })
    .trim()
    .min(1, "Informe o nome e desenhe a assinatura.")
    .max(120, "Nome muito longo."),
  cargo: z.string().trim().max(120, "Cargo muito longo.").optional(),
  // Só aceita PNG embutido em base64, que é o que o canvas gera. Barra URL
  // externa (rastreador num documento assinado) e qualquer outro formato.
  imagemPng: z
    .string({ error: "Informe o nome e desenhe a assinatura." })
    .max(LIMITE_ASSINATURA_PNG, "Assinatura grande demais.")
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/, "Assinatura em formato inválido."),
});
