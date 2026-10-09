import { NextResponse } from "next/server";
import { enviarResumo } from "@/lib/agendador";

// Só admin (o proxy protege /api/admin). Manda o resumo do dia agora, mesmo
// fora das 8h e mesmo vazio, sem marcar o dia como enviado: serve para testar
// a entrega sem esperar o dia seguinte.
export async function POST() {
  if (!process.env.ADMIN_EMAIL) {
    return NextResponse.json({ erro: "ADMIN_EMAIL não está configurado no servidor." }, { status: 400 });
  }
  try {
    await enviarResumo(true);
    return NextResponse.json({ ok: true, para: process.env.ADMIN_EMAIL });
  } catch (err) {
    return NextResponse.json(
      { erro: err instanceof Error ? err.message : "Falha ao enviar o resumo." },
      { status: 502 }
    );
  }
}
