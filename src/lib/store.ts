import { randomUUID } from "crypto";
import { getDb } from "./db";
import { Assinatura, BriefingInput, ConteudoGerado, Contato, Geracao, NotaCrm, Proposal, StatusProposta } from "./types";
import { hashBriefing } from "./briefing-hash";
import { dataEmissao } from "./crm";

type Row = {
  id: string;
  criado_em: string;
  cliente: string;
  dados: string;
};

function rowParaProposta(row: Row): Proposal {
  return JSON.parse(row.dados) as Proposal;
}

function salvarLinha(db: ReturnType<typeof getDb>, proposta: Proposal) {
  db.prepare(`UPDATE propostas SET dados = ?, cliente = ? WHERE id = ?`).run(
    JSON.stringify(proposta),
    proposta.briefing.cliente,
    proposta.id
  );
}

export async function salvarProposta(
  proposal: Omit<Proposal, "id" | "criadoEm">
): Promise<Proposal> {
  const db = getDb();
  const completa: Proposal = {
    ...proposal,
    id: randomUUID(),
    criadoEm: new Date().toISOString(),
    status: "enviada",
  };
  db.prepare(
    `INSERT INTO propostas (id, criado_em, cliente, dados) VALUES (?, ?, ?, ?)`
  ).run(completa.id, completa.criadoEm, completa.briefing.cliente, JSON.stringify(completa));
  return completa;
}

function todasAsPropostas(): Proposal[] {
  const db = getDb();
  return (db.prepare(`SELECT * FROM propostas`).all() as Row[]).map(rowParaProposta);
}

export async function listarPropostas(): Promise<Proposal[]> {
  // Ordena pela data de emissão, não pela de criação: é essa que o painel
  // mostra, e uma proposta reeditada hoje precisa subir pro topo em vez de
  // ficar enterrada na posição de quando nasceu.
  return todasAsPropostas()
    .filter((p) => !p.excluidoEm)
    .sort((a, b) => dataEmissao(b).getTime() - dataEmissao(a).getTime());
}

export async function listarLixeira(): Promise<Proposal[]> {
  return todasAsPropostas()
    .filter((p) => p.excluidoEm)
    .sort((a, b) => new Date(b.excluidoEm!).getTime() - new Date(a.excluidoEm!).getTime());
}

/**
 * Proposta na lixeira conta como inexistente para todo o resto do sistema:
 * página pública, assinatura, edição, CRM, PDF, e-mail. Só a própria lixeira
 * pede incluirLixeira para restaurar ou excluir de vez.
 */
export async function buscarProposta(
  id: string,
  opcoes: { incluirLixeira?: boolean } = {}
): Promise<Proposal | null> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as
    | Row
    | undefined;
  if (!row) return null;
  const proposta = rowParaProposta(row);
  if (proposta.excluidoEm && !opcoes.incluirLixeira) return null;
  return proposta;
}

export async function duplicarProposta(id: string): Promise<Proposal | null> {
  const original = await buscarProposta(id);
  if (!original) return null;
  // Só briefing e narrativa seguem pra cópia — CRM (status, contato, notas,
  // assinatura) começa do zero, porque é um prospect novo, não o mesmo negócio.
  return salvarProposta({
    briefing: original.briefing,
    gerado: {
      ...original.gerado,
      tituloProposta: `${original.gerado.tituloProposta} (cópia)`,
    },
    geracao: original.geracao,
  });
}

function comNota(p: Proposal, texto: string): Proposal {
  const nota: NotaCrm = { texto, criadoEm: new Date().toISOString() };
  return { ...p, notas: [...(p.notas || []), nota] };
}

// "Excluir" no painel manda para a lixeira. Antes era um DELETE direto, com um
// clique e sem volta — a explicação mais provável para uma proposta ter
// sumido do banco sem rastro.
export async function moverParaLixeira(id: string): Promise<Proposal | null> {
  const proposta = await buscarProposta(id);
  if (!proposta) return null;
  const atualizada = comNota({ ...proposta, excluidoEm: new Date().toISOString() }, "Movida para a lixeira.");
  salvarLinha(getDb(), atualizada);
  return atualizada;
}

export async function restaurarDaLixeira(id: string): Promise<Proposal | null> {
  const proposta = await buscarProposta(id, { incluirLixeira: true });
  if (!proposta?.excluidoEm) return null;
  const { excluidoEm: _removido, ...resto } = proposta;
  void _removido;
  const atualizada = comNota(resto, "Restaurada da lixeira.");
  salvarLinha(getDb(), atualizada);
  return atualizada;
}

/** Só apaga o que já está na lixeira: são sempre dois passos para perder dado. */
export async function excluirDefinitivo(id: string): Promise<"excluida" | "nao-encontrada" | "fora-da-lixeira"> {
  const proposta = await buscarProposta(id, { incluirLixeira: true });
  if (!proposta) return "nao-encontrada";
  if (!proposta.excluidoEm) return "fora-da-lixeira";
  getDb().prepare(`DELETE FROM propostas WHERE id = ?`).run(id);
  return "excluida";
}

export async function assinarProposta(
  id: string,
  assinatura: Assinatura
): Promise<Proposal | null> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as
    | Row
    | undefined;
  if (!row) return null;
  const proposta = rowParaProposta(row);
  if (proposta.assinatura) return proposta; // já assinada — não sobrescreve
  const atualizada: Proposal = { ...proposta, assinatura, status: "aceita" };
  salvarLinha(db, atualizada);
  return atualizada;
}

// Remove a assinatura atual pra que o cliente possa assinar de novo (ex.: depois
// de editar uma proposta já aceita). O registro da assinatura anterior fica numa
// nota do CRM, pra não sumir sem rastro.
export async function liberarAssinatura(id: string): Promise<Proposal | null> {
  const proposta = await buscarProposta(id);
  if (!proposta) return null;
  if (!proposta.assinatura) return proposta;

  const anterior = proposta.assinatura;
  const nota: NotaCrm = {
    texto: `Assinatura de ${anterior.nome} (${new Date(anterior.aceitoEm).toLocaleString("pt-BR")}) removida para permitir nova assinatura.`,
    criadoEm: new Date().toISOString(),
  };
  const { assinatura: _removida, ...resto } = proposta;
  void _removida;
  const atualizada: Proposal = {
    ...resto,
    status: proposta.status === "aceita" ? "enviada" : proposta.status,
    notas: [...(proposta.notas || []), nota],
  };
  salvarLinha(getDb(), atualizada);
  return atualizada;
}

export async function atualizarProposta(
  id: string,
  patch: { briefing?: BriefingInput; gerado?: ConteudoGerado; geracao?: Geracao }
): Promise<Proposal | null> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as
    | Row
    | undefined;
  if (!row) return null;
  const proposta = rowParaProposta(row);

  const briefing = patch.briefing ?? proposta.briefing;

  // `geracao` só vem quando a narrativa foi reescrita pela IA nesta edição.
  // O selo de coerência é uma afirmação sobre o que está sendo gravado, então
  // o servidor confere: se o escopo mudou depois da geração, o hash declarado
  // não bate e o selo cai fora em vez de virar uma garantia falsa.
  let geracao = proposta.geracao;
  if (patch.geracao) {
    const confere = patch.geracao.briefingHash === hashBriefing(briefing);
    geracao = { ...patch.geracao, briefingHash: confere ? patch.geracao.briefingHash : undefined };
  }

  const atualizada: Proposal = {
    ...proposta,
    briefing,
    gerado: patch.gerado ?? proposta.gerado,
    geracao,
    // Reemissão: o documento mudou, então a data de revisão anda — e é dela
    // que a validade passa a contar (ver dataEmissao em lib/crm).
    atualizadoEm: new Date().toISOString(),
  };

  salvarLinha(db, atualizada);
  return atualizada;
}

export type PatchCrm = {
  status?: StatusProposta;
  proximoContato?: string | null;
  nota?: string;
  // null apaga o campo. Omitido mantém o que já estava — é o que o envio por
  // e-mail usa para gravar só o e-mail sem perder o telefone.
  contato?: { [K in keyof Contato]?: string | null };
};

export async function atualizarCrm(id: string, patch: PatchCrm): Promise<Proposal | null> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as
    | Row
    | undefined;
  if (!row) return null;
  const proposta = rowParaProposta(row);

  const atualizada: Proposal = { ...proposta };
  if (patch.status) atualizada.status = patch.status;
  if (patch.proximoContato !== undefined) atualizada.proximoContato = patch.proximoContato;
  if (patch.contato) {
    const mesclado: Record<string, string | null | undefined> = { ...proposta.contato, ...patch.contato };
    for (const k of Object.keys(mesclado)) if (mesclado[k] == null) delete mesclado[k];
    atualizada.contato = mesclado as Contato;
  }
  if (patch.nota?.trim()) {
    const nota: NotaCrm = { texto: patch.nota.trim(), criadoEm: new Date().toISOString() };
    atualizada.notas = [...(proposta.notas || []), nota];
  }

  salvarLinha(db, atualizada);
  return atualizada;
}
