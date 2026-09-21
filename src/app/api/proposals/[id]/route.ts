import { NextRequest, NextResponse } from "next/server";
import { atualizarProposta, buscarProposta, excluirProposta } from "@/lib/store";
import { briefingSchema, geracaoSchema, geradoSchema } from "@/lib/schemas";

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
  const {
    briefing: briefingBruto,
    gerado: geradoBruto,
    geracao: geracaoBruta,
  } = body as { briefing?: unknown; gerado?: unknown; geracao?: unknown };

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
  // Só chega preenchido quando a narrativa foi reescrita pela IA nesta edição.
  const geracao = geracaoBruta ? geracaoSchema.safeParse(geracaoBruta) : undefined;
  if (geracao && !geracao.success) {
    return NextResponse.json({ erro: "Dados de geração inválidos." }, { status: 400 });
  }

  const atualizada = await atualizarProposta(id, {
    briefing: briefing?.data,
    gerado: gerado?.data,
    geracao: geracao?.data,
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
