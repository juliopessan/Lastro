import { dataValidade, statusEfetivo } from "./crm";
import { Proposal } from "./types";

// O resumo do dia: o que precisa da atenção do admin hoje. O mesmo resumo
// aparece no painel ("Para hoje") e vai por e-mail toda manhã (lib/agendador).

const DIA = 86_400_000;
const FUSO = "America/Sao_Paulo";

/** "2026-10-09" no fuso de Brasília: a chave do dia, independente do servidor. */
export function diaBrasilia(ms: number): string {
  return new Date(ms).toLocaleDateString("en-CA", { timeZone: FUSO });
}

/** Hora (0-23) em Brasília. */
export function horaBrasilia(ms: number): number {
  return Number(new Date(ms).toLocaleString("en-US", { timeZone: FUSO, hour: "2-digit", hour12: false })) % 24;
}

function emAberto(p: Proposal): boolean {
  const s = statusEfetivo(p);
  return !p.assinatura && s !== "aceita" && s !== "recusada" && s !== "perdida";
}

export type ItemResumo = { id: string; titulo: string; cliente: string };

export type ResumoDoDia = {
  dia: string;
  contatos: (ItemResumo & { data: string; atrasado: boolean })[];
  vencendo: (ItemResumo & { venceEm: string; dias: number })[];
  aberturas: (ItemResumo & { vezes: number; ultima: string })[];
  vazio: boolean;
};

function item(p: Proposal): ItemResumo {
  return { id: p.id, titulo: p.gerado.tituloProposta, cliente: p.briefing.cliente };
}

export function montarResumoDoDia(propostas: Proposal[], agora: number = Date.now()): ResumoDoDia {
  const hoje = diaBrasilia(agora);

  // Contato marcado para hoje ou que já passou, em proposta ainda em jogo.
  const contatos = propostas
    .filter((p) => emAberto(p) && p.proximoContato && p.proximoContato <= hoje)
    .map((p) => ({ ...item(p), data: p.proximoContato!, atrasado: p.proximoContato! < hoje }))
    .sort((a, b) => a.data.localeCompare(b.data));

  // Vence nos próximos 3 dias e ninguém assinou ainda: hora de cobrar.
  const vencendo = propostas
    .filter(emAberto)
    .map((p) => ({ p, vence: dataValidade(p).getTime() }))
    .filter(({ vence }) => vence >= agora && vence - agora <= 3 * DIA)
    .map(({ p, vence }) => ({ ...item(p), venceEm: new Date(vence).toISOString(), dias: Math.ceil((vence - agora) / DIA) }))
    .sort((a, b) => a.venceEm.localeCompare(b.venceEm));

  // O cliente abriu nas últimas 24 horas: bom momento para ligar.
  const aberturas = propostas
    .map((p) => ({ p, recentes: (p.visualizacoes ?? []).filter((v) => agora - Date.parse(v.em) <= DIA) }))
    .filter(({ recentes }) => recentes.length > 0)
    .map(({ p, recentes }) => ({ ...item(p), vezes: recentes.length, ultima: recentes.at(-1)!.em }))
    .sort((a, b) => b.ultima.localeCompare(a.ultima));

  return {
    dia: hoje,
    contatos,
    vencendo,
    aberturas,
    vazio: !contatos.length && !vencendo.length && !aberturas.length,
  };
}

/** A partir de que hora (Brasília) o resumo do dia sai por e-mail. */
export const HORA_DO_RESUMO = 8;
