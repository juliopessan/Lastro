import { NextRequest, NextResponse } from "next/server";
import { excluirDefinitivo } from "@/lib/store";

// Só admin (proxy). Apaga de vez — e só o que já está na lixeira, para perder
// dado exigir sempre dois passos.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resultado = await excluirDefinitivo(id);
  if (resultado === "nao-encontrada") {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }
  if (resultado === "fora-da-lixeira") {
    return NextResponse.json(
      { erro: "Só dá para excluir de vez o que já está na lixeira." },
      { status: 409 }
    );
  }
  return NextResponse.json({ ok: true });
}
