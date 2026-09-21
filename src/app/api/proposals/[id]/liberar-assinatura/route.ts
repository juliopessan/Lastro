import { NextRequest, NextResponse } from "next/server";
import { liberarAssinatura } from "@/lib/store";

// Protegida pelo proxy (só admin): não termina em /assinar.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const atualizada = await liberarAssinatura(id);
  if (!atualizada) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }
  return NextResponse.json(atualizada);
}
