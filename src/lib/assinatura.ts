import { createHash } from "crypto";
import { dataEmissao, dataValidade } from "./crm";
import { DocumentoAssinado, Proposal } from "./types";

// Evidências do aceite: o que exatamente foi assinado, por quem, quando e de
// onde. O conjunto (nome, e-mail, IP, navegador, data do servidor, declaração
// marcada e hash do conteúdo) é o que sustenta uma assinatura eletrônica
// simples se o aceite for contestado.

/**
 * JSON com as chaves em ordem alfabética em todos os níveis. O hash precisa
 * ser o mesmo para o mesmo conteúdo, não importa a ordem em que os campos
 * foram montados ou gravados.
 */
export function jsonCanonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(jsonCanonico).join(",")}]`;
  if (valor && typeof valor === "object") {
    const obj = valor as Record<string, unknown>;
    const chaves = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return `{${chaves.map((k) => `${JSON.stringify(k)}:${jsonCanonico(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(valor);
}

/** O conteúdo que o cliente vê e assina, congelado num objeto só. */
export function congelarDocumento(
  p: Pick<Proposal, "briefing" | "gerado" | "criadoEm" | "atualizadoEm">
): DocumentoAssinado {
  return {
    versao: 1,
    briefing: p.briefing,
    gerado: p.gerado,
    emitidaEm: dataEmissao(p).toISOString(),
    validaAte: dataValidade(p).toISOString(),
  };
}

/** SHA-256 em hexadecimal do conteúdo congelado. */
export function hashDocumento(documento: DocumentoAssinado): string {
  return createHash("sha256").update(jsonCanonico(documento), "utf8").digest("hex");
}

/** Hash do documento que está na tela agora, para o cliente assinar o que viu. */
export function hashDocumentoAtual(
  p: Pick<Proposal, "briefing" | "gerado" | "criadoEm" | "atualizadoEm">
): string {
  return hashDocumento(congelarDocumento(p));
}

const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const IPV6 = /^[0-9a-f:]+$/i;

/**
 * IP de quem fez a requisição. Em produção o Traefik grava o IP real no
 * X-Forwarded-For e descarta o que o cliente mandar nesse cabeçalho, então o
 * primeiro valor é confiável. Valor que não parece IP vira undefined.
 */
export function ipDoCliente(cabecalhos: Headers): string | undefined {
  const candidato =
    cabecalhos.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    cabecalhos.get("x-real-ip")?.trim() ||
    "";
  const limpo = candidato.replace(/^::ffff:/, "");
  if (IPV4.test(limpo) && limpo.split(".").every((n) => Number(n) <= 255)) return limpo;
  if (limpo.includes(":") && IPV6.test(limpo)) return limpo.toLowerCase();
  return undefined;
}

/**
 * IP com o final escondido, para o documento público: o link da proposta é
 * compartilhável, e o IP completo é dado pessoal (LGPD). O admin vê inteiro.
 */
export function mascararIp(ip: string | undefined): string {
  if (!ip) return "não registrado";
  const v4 = ip.match(IPV4);
  if (v4) return `${v4[1]}.${v4[2]}.•••.•••`;
  return `${ip.split(":").slice(0, 2).join(":")}:•••`;
}

/** "Chrome no macOS", "Safari no iPhone"... — o suficiente para o certificado. */
export function resumirNavegador(ua: string | undefined): string {
  if (!ua) return "não registrado";
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "navegador não identificado";
  const sistema = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  return sistema ? `${navegador} no ${sistema}` : navegador;
}

/** Data e hora no fuso de Brasília, explícito: não depende do fuso do servidor. */
export function dataHoraBrasilia(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
