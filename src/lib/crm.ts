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
