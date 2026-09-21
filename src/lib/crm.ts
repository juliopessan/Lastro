import { Proposal, StatusProposta } from "./types";

export const STATUS_ORDEM: StatusProposta[] = [
  "enviada",
  "em_negociacao",
  "aceita",
  "recusada",
  "perdida",
];

export const STATUS_LABEL: Record<StatusProposta, string> = {
  enviada: "Enviada",
  em_negociacao: "Em negociação",
  aceita: "Aceita",
  recusada: "Recusada",
  perdida: "Perdida",
};

// Propostas antigas não têm `status` salvo — inferimos a partir da assinatura.
export function statusEfetivo(p: Pick<Proposal, "status" | "assinatura">): StatusProposta {
  if (p.status) return p.status;
  return p.assinatura ? "aceita" : "enviada";
}

export function contatoAtrasado(p: Pick<Proposal, "proximoContato" | "status" | "assinatura">): boolean {
  if (!p.proximoContato) return false;
  const status = statusEfetivo(p);
  if (status === "aceita" || status === "recusada" || status === "perdida") return false;
  return new Date(p.proximoContato).getTime() < Date.now();
}

type DatasProposta = Pick<Proposal, "criadoEm" | "atualizadoEm">;

/**
 * Data que vale como emissão do documento: a da última revisão, se houve.
 * Editar uma proposta é reemiti-la — o cliente recebe outro documento, e o
 * prazo de resposta conta dali, não da versão que ele nunca viu.
 */
export function dataEmissao(p: DatasProposta): Date {
  return new Date(p.atualizadoEm ?? p.criadoEm);
}

export function dataValidade(p: DatasProposta & Pick<Proposal, "briefing">): Date {
  return new Date(dataEmissao(p).getTime() + p.briefing.validadeDias * 86_400_000);
}

// Só importa enquanto a proposta ainda está em jogo — uma já aceita, recusada
// ou perdida não "vence" mais. Usa a mesma data de validade que o documento
// mostra, pra painel e proposta nunca discordarem sobre o prazo.
export function propostaVencida(
  p: DatasProposta & Pick<Proposal, "status" | "assinatura" | "briefing">
): boolean {
  const status = statusEfetivo(p);
  if (status === "aceita" || status === "recusada" || status === "perdida") return false;
  return dataValidade(p).getTime() < Date.now();
}
