import { NextRequest, NextResponse } from "next/server";
import { restaurarDaLixeira } from "@/lib/store";

// Só admin (proxy). Tira a proposta da lixeira: volta ao painel, ao CRM e ao
// link público do cliente.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurada = await restaurarDaLixeira(id);
  if (!restaurada) {
    return NextResponse.json({ erro: "Proposta não está na lixeira." }, { status: 404 });
  }
  return NextResponse.json(restaurada);
}
