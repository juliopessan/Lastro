import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { atualizarProposta, buscarProposta, excluirProposta } from "@/lib/store";

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
const briefingSchema = z.object({
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
const geradoSchema = z.object({
  tituloProposta: z.string(),
  resumoExecutivo: z.string(),
  frentesNarrativa: z.array(z.object({ titulo: z.string(), introducao: z.string() })),
  proximosPassos: z.array(z.string()),
  notaFinal: z.string(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }
  return NextResponse.json(proposta);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existente = await buscarProposta(id);
  if (!existente) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { briefing: briefingBruto, gerado: geradoBruto } = body as {
    briefing?: unknown;
    gerado?: unknown;
  };

  if (!briefingBruto && !geradoBruto) {
    return NextResponse.json({ erro: "Nada para atualizar." }, { status: 400 });
  }

  const briefing = briefingBruto ? briefingSchema.safeParse(briefingBruto) : undefined;
  if (briefing && !briefing.success) {
    return NextResponse.json({ erro: "Briefing inválido." }, { status: 400 });
  }
  const gerado = geradoBruto ? geradoSchema.safeParse(geradoBruto) : undefined;
  if (gerado && !gerado.success) {
    return NextResponse.json({ erro: "Conteúdo gerado inválido." }, { status: 400 });
  }

  const atualizada = await atualizarProposta(id, {
    briefing: briefing?.data,
    gerado: gerado?.data,
  });

  return NextResponse.json(atualizada);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await excluirProposta(id);
  return NextResponse.json({ ok: true });
}
