import { NextRequest, NextResponse } from "next/server";
import { gerarConteudoProposta } from "@/lib/ai";
import { listarPropostas, salvarProposta } from "@/lib/store";
import { BriefingInput } from "@/lib/types";

export async function GET() {
  const propostas = await listarPropostas();
  return NextResponse.json(propostas);
}

export async function POST(req: NextRequest) {
  let briefing: BriefingInput;
  try {
    briefing = await req.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!briefing.cliente || briefing.frentes?.length === 0) {
    return NextResponse.json(
      { erro: "Informe ao menos o cliente e uma frente de escopo." },
      { status: 400 }
    );
  }

  try {
    const { conteudo, geracao } = await gerarConteudoProposta(briefing);
    const proposta = await salvarProposta({
      briefing,
      gerado: conteudo,
      geracao,
    });
    return NextResponse.json(proposta, { status: 201 });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro ao gerar proposta.";
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
