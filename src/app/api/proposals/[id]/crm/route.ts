import { NextRequest, NextResponse } from "next/server";
import { atualizarCrm, buscarProposta } from "@/lib/store";
import { crmPatchSchema } from "@/lib/schemas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }
  const dados = crmPatchSchema.safeParse(body);
  if (!dados.success) {
    return NextResponse.json({ erro: dados.error.issues[0].message }, { status: 400 });
  }

  const atualizada = await atualizarCrm(id, dados.data);
  return NextResponse.json(atualizada);
}
