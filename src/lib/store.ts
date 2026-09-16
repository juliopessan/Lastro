import { randomUUID } from "crypto";
import { getDb } from "./db";
import { Assinatura, Proposal } from "./types";

type Row = {
  id: string;
  criado_em: string;
  cliente: string;
  dados: string;
};

function rowParaProposta(row: Row): Proposal {
  return JSON.parse(row.dados) as Proposal;
}

export async function salvarProposta(
  proposal: Omit<Proposal, "id" | "criadoEm">
): Promise<Proposal> {
  const db = getDb();
  const completa: Proposal = {
    ...proposal,
    id: randomUUID(),
    criadoEm: new Date().toISOString(),
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
  const atualizada: Proposal = { ...proposta, assinatura };
  db.prepare(`UPDATE propostas SET dados = ? WHERE id = ?`).run(
    JSON.stringify(atualizada),
    id
  );
  return atualizada;
}
