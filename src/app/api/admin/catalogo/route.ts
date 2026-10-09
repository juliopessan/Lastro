import { NextRequest, NextResponse } from "next/server";
import { listarCatalogo, salvarItemCatalogo } from "@/lib/store";
import { itemCatalogoSchema } from "@/lib/schemas";

// Só admin (o proxy protege /api/admin).
export async function GET() {
  return NextResponse.json(await listarCatalogo());
}

export async function POST(req: NextRequest) {
  const dados = itemCatalogoSchema.safeParse(await req.json().catch(() => null));
  if (!dados.success) {
    return NextResponse.json({ erro: dados.error.issues[0].message }, { status: 400 });
  }
  return NextResponse.json(await salvarItemCatalogo(dados.data), { status: 201 });
}
