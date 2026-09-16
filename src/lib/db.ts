import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "propostas.db");

// Uma única conexão reaproveitada entre requisições (padrão recomendado do
// better-sqlite3 em apps Next.js — evita reabrir o arquivo a cada chamada).
declare global {
  var __propostasDb: Database.Database | undefined;
}

function criarConexao(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS propostas (
      id TEXT PRIMARY KEY,
      criado_em TEXT NOT NULL,
      cliente TEXT NOT NULL,
      dados TEXT NOT NULL
    );
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!global.__propostasDb) {
    global.__propostasDb = criarConexao();
  }
  return global.__propostasDb;
}
