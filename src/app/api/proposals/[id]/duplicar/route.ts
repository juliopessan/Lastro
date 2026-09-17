import { NextRequest, NextResponse } from "next/server";
import { duplicarProposta } from "@/lib/store";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const nova = await duplicarProposta(id);
  if (!nova) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }
  return NextResponse.json(nova, { status: 201 });
}
