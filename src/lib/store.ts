import { randomUUID } from "crypto";
import { getDb } from "./db";
import { Assinatura, BriefingInput, ConteudoGerado, NotaCrm, Proposal, StatusProposta } from "./types";

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

export async function atualizarProposta(
  id: string,
  patch: { briefing?: BriefingInput; gerado?: ConteudoGerado }
): Promise<Proposal | null> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as
    | Row
    | undefined;
  if (!row) return null;
  const proposta = rowParaProposta(row);

  const atualizada: Proposal = {
    ...proposta,
    briefing: patch.briefing ?? proposta.briefing,
    gerado: patch.gerado ?? proposta.gerado,
  };

  salvarLinha(db, atualizada);
  return atualizada;
}

export type PatchCrm = {
  status?: StatusProposta;
  proximoContato?: string | null;
  nota?: string;
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
  if (patch.nota?.trim()) {
    const nota: NotaCrm = { texto: patch.nota.trim(), criadoEm: new Date().toISOString() };
    atualizada.notas = [...(proposta.notas || []), nota];
  }

  salvarLinha(db, atualizada);
  return atualizada;
}
