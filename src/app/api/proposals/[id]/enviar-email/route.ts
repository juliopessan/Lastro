import { NextRequest, NextResponse } from "next/server";
import { atualizarCrm, buscarProposta } from "@/lib/store";
import { gerarPdfProposta } from "@/lib/pdf";
import { enviarPropostaPorEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { emailCliente, mensagem, nomeContato } = body as {
    emailCliente?: string;
    mensagem?: string;
    nomeContato?: string;
  };

  if (!emailCliente?.trim()) {
    return NextResponse.json({ erro: "Informe o e-mail do cliente." }, { status: 400 });
  }

  const link = `${req.nextUrl.origin}/propostas/${id}`;
  const nome = nomeContato?.trim() || proposta.contato?.nome;

  try {
    const pdf = await gerarPdfProposta(link);
    await enviarPropostaPorEmail({
      para: emailCliente.trim(),
      cliente: nome || proposta.briefing.cliente,
      tituloProposta: proposta.gerado.tituloProposta,
      link,
      mensagem,
      pdf,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao enviar e-mail.";
    return NextResponse.json({ erro: msg }, { status: 502 });
  }

  // Registra o contato pra não precisar digitar o e-mail de novo da
  // próxima vez — é isso que faz o CRM saber quem é o cliente.
  const atualizada = await atualizarCrm(id, {
    nota: `Proposta enviada por e-mail para ${emailCliente.trim()}.`,
    contato: { email: emailCliente.trim(), ...(nome ? { nome } : {}) },
  });

  return NextResponse.json(atualizada);
}
