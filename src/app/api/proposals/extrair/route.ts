import { NextRequest, NextResponse } from "next/server";
import { extrairBriefing } from "@/lib/ai";
import { LIMITE_ARQUIVO, LIMITE_TEXTO, textoDeArquivo } from "@/lib/documento";

// Só admin (o proxy protege /api/proposals). Lê o documento de requisitos —
// texto colado, arquivo, ou os dois — e devolve um briefing para preencher o
// formulário de nova proposta. Não grava nada: quem decide é o admin, depois
// de conferir, no "Gerar proposta".
export async function POST(req: NextRequest) {
  const declarado = Number(req.headers.get("content-length") ?? 0);
  if (declarado > LIMITE_ARQUIVO + 512 * 1024) {
    return NextResponse.json({ erro: "Arquivo maior que 5 MB." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ erro: "Cole o texto dos requisitos ou envie um arquivo." }, { status: 400 });
  }

  const colado = String(form.get("texto") ?? "").trim();
  const arquivo = form.get("arquivo");

  let doArquivo = "";
  let nomeArquivo = "";
  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > LIMITE_ARQUIVO) {
      return NextResponse.json({ erro: "Arquivo maior que 5 MB." }, { status: 413 });
    }
    nomeArquivo = arquivo.name;
    try {
      doArquivo = await textoDeArquivo(arquivo.name, new Uint8Array(await arquivo.arrayBuffer()));
    } catch (err) {
      return NextResponse.json(
        { erro: err instanceof Error ? err.message : "Não foi possível ler o arquivo." },
        { status: 400 }
      );
    }
  }

  const documento = [
    doArquivo && `--- Arquivo: ${nomeArquivo} ---\n${doArquivo}`,
    colado && `--- Texto colado ---\n${colado}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!documento) {
    return NextResponse.json({ erro: "Cole o texto dos requisitos ou envie um arquivo." }, { status: 400 });
  }
  if (documento.length > LIMITE_TEXTO) {
    return NextResponse.json(
      {
        erro: `O documento tem ${documento.length.toLocaleString("pt-BR")} caracteres; o limite é ${LIMITE_TEXTO.toLocaleString("pt-BR")}. Envie só a parte de escopo, valores e prazos.`,
      },
      { status: 413 }
    );
  }

  try {
    const resultado = await extrairBriefing(documento);
    return NextResponse.json({ ...resultado, caracteres: documento.length });
  } catch (err) {
    const mensagem = err instanceof Error ? err.message : "Erro ao ler o documento.";
    return NextResponse.json({ erro: mensagem }, { status: 502 });
  }
}
