import { NextRequest, NextResponse } from "next/server";
import { assinarProposta, buscarProposta } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }
  if (proposta.assinatura) {
    return NextResponse.json({ erro: "Proposta já foi assinada." }, { status: 409 });
  }

  const body = await req.json();
  const { nome, cargo, imagemPng } = body as {
    nome?: string;
    cargo?: string;
    imagemPng?: string;
  };

  if (!nome?.trim() || !imagemPng) {
    return NextResponse.json(
      { erro: "Informe o nome e desenhe a assinatura." },
      { status: 400 }
    );
  }

  const atualizada = await assinarProposta(id, {
    nome: nome.trim(),
    cargo: cargo?.trim() || undefined,
    imagemPng,
    aceitoEm: new Date().toISOString(),
  });

  return NextResponse.json(atualizada);
}
