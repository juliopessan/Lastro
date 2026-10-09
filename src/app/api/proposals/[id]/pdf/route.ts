import { NextRequest, NextResponse } from "next/server";
import { buscarProposta } from "@/lib/store";
import { gerarPdfProposta } from "@/lib/pdf";
import { nomeArquivoPdf } from "@/lib/email";
import { urlInterna } from "@/lib/url";

// Só admin (o proxy protege /api/proposals). Devolve o PDF exatamente como
// ele vai anexado no e-mail: mesma função, mesmo endereço interno.
//
// É também o que o teste de fumaça da imagem Docker chama, para provar que o
// Chrome do contêiner imprime a proposta pelo caminho real de produção — e
// não por uma cópia do código dentro do teste.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  try {
    const pdf = await gerarPdfProposta(`${urlInterna(req)}/propostas/${id}`);
    const nome = nomeArquivoPdf(proposta.gerado.tituloProposta);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nome)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Falha ao gerar PDF:", err);
    return NextResponse.json({ erro: "Não foi possível gerar o PDF." }, { status: 502 });
  }
}
