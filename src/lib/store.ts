import { randomUUID } from "crypto";
import { getDb } from "./db";
import { Assinatura, BriefingInput, ConteudoGerado, Contato, Geracao, NotaCrm, Proposal, StatusProposta } from "./types";
import { hashBriefing } from "./briefing-hash";

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

export async function listarPropostas(): Promise<Proposal[]> {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM propostas ORDER BY criado_em DESC`)
    .all() as Row[];
  return rows.map(rowParaProposta);
}

export async function buscarProposta(id: string): Promise<Proposal | null> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as
    | Row
    | undefined;
  return row ? rowParaProposta(row) : null;
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

export async function excluirProposta(id: string): Promise<void> {
  const db = getDb();
  db.prepare(`DELETE FROM propostas WHERE id = ?`).run(id);
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
  contato?: Contato;
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
    atualizada.contato = { ...proposta.contato, ...patch.contato };
  }
  if (patch.nota?.trim()) {
    const nota: NotaCrm = { texto: patch.nota.trim(), criadoEm: new Date().toISOString() };
    atualizada.notas = [...(proposta.notas || []), nota];
  }

  salvarLinha(db, atualizada);
  return atualizada;
}
