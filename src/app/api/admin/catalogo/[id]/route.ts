import { NextRequest, NextResponse } from "next/server";
import { atualizarItemCatalogo, excluirItemCatalogo } from "@/lib/store";
import { itemCatalogoSchema } from "@/lib/schemas";

// Só admin (o proxy protege /api/admin).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dados = itemCatalogoSchema.safeParse(await req.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json({ erro: dados.error.issues[0].message }, { status: 400 });
  }
  const atualizado = await atualizarItemCatalogo(id, dados.data);
  if (!atualizado) return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  return NextResponse.json(atualizado);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await excluirItemCatalogo(id))) {
    return NextResponse.json({ erro: "Item não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
