import { NextRequest, NextResponse } from "next/server";
import { assinarProposta, buscarProposta } from "@/lib/store";
import { avisarAssinatura, enviarComprovanteAssinatura } from "@/lib/email";
import { bloqueioAssinatura, dataValidade } from "@/lib/crm";
import { assinaturaSchema, LIMITE_ASSINATURA_PNG } from "@/lib/schemas";
import { urlPublica } from "@/lib/url";
import { ipDoCliente } from "@/lib/assinatura";
import { DECLARACAO_ACEITE } from "@/lib/assinatura-texto";

// Rota pública: o cliente assina sem conta, só com o link. Por isso tudo que
// chega aqui é tratado como entrada de estranho — tamanho, formato e estado
// da proposta são conferidos antes de gravar qualquer coisa.

// Folga sobre o teto da imagem pro resto do JSON (nome, cargo, chaves).
const LIMITE_CORPO = LIMITE_ASSINATURA_PNG + 16 * 1024;

// Lê o corpo parando no limite, em vez de carregar tudo na memória e só
// depois medir. Content-Length pode faltar (envio em partes) ou mentir.
async function lerCorpoLimitado(req: NextRequest, limite: number): Promise<string | null> {
  const reader = req.body?.getReader();
  if (!reader) return "";
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await reader.cancel();
      return null;
    }
    partes.push(value);
  }
  return Buffer.concat(partes).toString("utf8");
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const declarado = Number(req.headers.get("content-length") ?? 0);
  if (declarado > LIMITE_CORPO) {
    return NextResponse.json({ erro: "Assinatura grande demais." }, { status: 413 });
  }

  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) {
    return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
  }

  const bloqueio = bloqueioAssinatura(proposta);
  if (bloqueio === "assinada") {
    return NextResponse.json({ erro: "Proposta já foi assinada." }, { status: 409 });
  }
  if (bloqueio === "vencida") {
    const venceu = dataValidade(proposta).toLocaleDateString("pt-BR");
    return NextResponse.json(
      { erro: `Esta proposta venceu em ${venceu}. Peça à UKode Labs uma versão atualizada.` },
      { status: 410 }
    );
  }
  if (bloqueio === "encerrada") {
    return NextResponse.json(
      { erro: "Esta proposta não está mais disponível para aceite." },
      { status: 410 }
    );
  }

  const corpo = await lerCorpoLimitado(req, LIMITE_CORPO);
  if (corpo === null) {
    return NextResponse.json({ erro: "Assinatura grande demais." }, { status: 413 });
  }

  let bruto: unknown;
  try {
    bruto = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const dados = assinaturaSchema.safeParse(bruto);
  if (!dados.success) {
    return NextResponse.json({ erro: dados.error.issues[0].message }, { status: 400 });
  }
  const { nome, cargo, email, imagemPng, hashVisto } = dados.data;

  // Evidências do aceite, capturadas aqui no servidor (o cliente não escolhe
  // a data, o IP nem o texto da declaração que fica registrado).
  const resultado = await assinarProposta(
    id,
    {
      nome,
      cargo: cargo || undefined,
      email: email || undefined,
      imagemPng,
      ip: ipDoCliente(req.headers),
      navegador: req.headers.get("user-agent")?.slice(0, 300) || undefined,
      declaracao: DECLARACAO_ACEITE,
    },
    hashVisto
  );

  if ("erro" in resultado) {
    if (resultado.erro === "nao-encontrada") {
      return NextResponse.json({ erro: "Proposta não encontrada." }, { status: 404 });
    }
    if (resultado.erro === "ja-assinada") {
      return NextResponse.json({ erro: "Proposta já foi assinada." }, { status: 409 });
    }
    return NextResponse.json(
      {
        erro: "Esta proposta foi atualizada depois que você abriu a página. Recarregue para ler a versão nova antes de assinar.",
      },
      { status: 409 }
    );
  }
  const atualizada = resultado.ok;

  // Best-effort: se o aviso falhar (sem ADMIN_EMAIL, Resend fora do ar etc.),
  // a assinatura já foi salva e não deve ser desfeita por causa disso.
  avisarAssinatura({
    cliente: proposta.briefing.cliente,
    tituloProposta: proposta.gerado.tituloProposta,
    nomeSignatario: nome,
    linkAdmin: `${urlPublica(req)}/propostas/${id}`,
  }).catch((err) => {
    console.error("Falha ao enviar aviso de assinatura:", err);
  });

  const assinada = atualizada.assinatura!;
  if (assinada.email && assinada.hashDocumento) {
    enviarComprovanteAssinatura({
      para: assinada.email,
      nome: assinada.nome,
      tituloProposta: (assinada.documento?.gerado ?? atualizada.gerado).tituloProposta,
      aceitoEm: assinada.aceitoEm,
      hashDocumento: assinada.hashDocumento,
      link: `${urlPublica(req)}/propostas/${id}`,
    }).catch((err) => {
      console.error("Falha ao enviar comprovante de assinatura:", err);
    });
  }

  return NextResponse.json(atualizada);
}
