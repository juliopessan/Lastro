import { NextRequest, NextResponse } from "next/server";
import { gerarConteudoProposta } from "@/lib/ai";
import { buscarProposta } from "@/lib/store";
import { briefingSchema } from "@/lib/schemas";

// Reescreve a narrativa a partir do escopo atual, sem gravar: quem chama é a
// tela de edição, e quem grava é o "Salvar" dela. Assim dá pra ler o texto
// novo antes de substituir o que já estava na proposta.
// Protegida pelo proxy (só admin): não termina em /assinar.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existente = await buscarProposta(id);
  if (!existente) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { briefing: briefingBruto } = body as { briefing?: unknown };

  // Sem briefing no corpo, regenera a partir do que já está salvo.
  const briefing = briefingSchema.safeParse(briefingBruto ?? existente.briefing);
  if (!briefing.success) {
    return NextResponse.json({ erro: "Briefing inválido." }, { status: 400 });
  }
  if (!briefing.data.cliente.trim() || briefing.data.frentes.length === 0) {
    return NextResponse.json(
      { erro: "Informe ao menos o cliente e uma frente de escopo." },
      { status: 400 }
    );
  }

  try {
    const { conteudo, geracao } = await gerarConteudoProposta(briefing.data);
    return NextResponse.json({ gerado: conteudo, geracao });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro ao gerar narrativa.";
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
