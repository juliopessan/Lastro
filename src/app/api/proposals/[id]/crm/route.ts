import { NextRequest, NextResponse } from "next/server";
import { atualizarCrm, buscarProposta } from "@/lib/store";
import { STATUS_ORDEM } from "@/lib/crm";
import { Contato, StatusProposta } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { status, proximoContato, nota, contato } = body as {
    status?: string;
    proximoContato?: string | null;
    nota?: string;
    contato?: Contato;
  };

  if (status && !STATUS_ORDEM.includes(status as StatusProposta)) {
    return NextResponse.json({ erro: "Status inválido." }, { status: 400 });
  }

  const atualizada = await atualizarCrm(id, {
    status: status as StatusProposta | undefined,
    proximoContato,
    nota,
    contato,
  });

  return NextResponse.json(atualizada);
}
