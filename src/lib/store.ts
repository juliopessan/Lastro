import { randomUUID } from "crypto";
import { getDb } from "./db";
import { Assinatura, BriefingInput, ConteudoGerado, Contato, Geracao, NotaCrm, Proposal, StatusProposta, VersaoDocumento } from "./types";
import { congelarDocumento, hashDocumento, hashDocumentoAtual } from "./assinatura";
import { hashBriefing } from "./briefing-hash";
import { dataEmissao } from "./crm";
import { JANELA_MESMA_VISITA_MS, MAX_VISUALIZACOES_GUARDADAS } from "./visualizacao";

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

export type EntradaAssinatura = Pick<
  Assinatura,
  "nome" | "cargo" | "email" | "imagemPng" | "ip" | "navegador" | "declaracao"
>;

export type ResultadoAssinatura =
  | { ok: Proposal }
  | { erro: "nao-encontrada" | "ja-assinada" | "versao-mudou" };

/**
 * Grava o aceite congelando o documento que o cliente viu.
 *
 * `hashVisto` é o hash do documento que a página entregou ao cliente. Se a
 * proposta foi editada depois disso, os hashes não batem e o aceite é
 * recusado: ninguém assina uma versão que não leu. Leitura, conferência e
 * gravação acontecem sem nenhum await no meio — o better-sqlite3 é síncrono,
 * então nenhuma edição consegue entrar entre conferir e gravar.
 */
export async function assinarProposta(
  id: string,
  entrada: EntradaAssinatura,
  hashVisto: string
): Promise<ResultadoAssinatura> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as Row | undefined;
  if (!row) return { erro: "nao-encontrada" };
  const proposta = rowParaProposta(row);
  if (proposta.excluidoEm) return { erro: "nao-encontrada" };
  if (proposta.assinatura) return { erro: "ja-assinada" };

  const documento = congelarDocumento(proposta);
  const hash = hashDocumento(documento);
  if (hash !== hashVisto) return { erro: "versao-mudou" };

  const assinatura: Assinatura = {
    ...entrada,
    aceitoEm: new Date().toISOString(),
    hashDocumento: hash,
    documento,
  };
  const atualizada: Proposal = { ...proposta, assinatura, status: "aceita" };
  salvarLinha(db, atualizada);
  return { ok: atualizada };
}

// Remove a assinatura atual pra que a proposta possa ser editada e assinada de
// novo. Nada se perde: a assinatura liberada, com o documento congelado e as
// evidências, vai para assinaturasAnteriores — e a nota do CRM registra o ato.
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
    assinaturasAnteriores: [...(proposta.assinaturasAnteriores || []), anterior],
  };
  salvarLinha(getDb(), atualizada);
  return atualizada;
}

export async function atualizarProposta(
  id: string,
  patch: { briefing?: BriefingInput; gerado?: ConteudoGerado; geracao?: Geracao }
): Promise<Proposal | null | "assinada"> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as
    | Row
    | undefined;
  if (!row) return null;
  const proposta = rowParaProposta(row);
  // Documento assinado é imutável: o que o cliente aceitou não muda por baixo
  // dele. Para reemitir, primeiro libera a assinatura (que vai para o
  // histórico) e só então edita.
  if (proposta.assinatura) return "assinada";

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

  // A versão que está saindo vai para o histórico, com o hash dela: dá para
  // provar depois o que o cliente tinha em mãos em cada reemissão.
  const versaoAnterior: VersaoDocumento = {
    registradaEm: new Date().toISOString(),
    hash: hashDocumentoAtual(proposta),
    briefing: proposta.briefing,
    gerado: proposta.gerado,
    emitidaEm: dataEmissao(proposta).toISOString(),
  };

  const atualizada: Proposal = {
    ...proposta,
    briefing,
    gerado: patch.gerado ?? proposta.gerado,
    geracao,
    versoes: [...(proposta.versoes || []), versaoAnterior],
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

/**
 * Registra uma abertura da página pelo cliente. A mesma pessoa (mesmo IP e
 * navegador) recarregando dentro de 30 minutos conta uma vez só. A primeira
 * abertura vira nota no CRM: é o sinal de que a proposta chegou.
 *
 * Não mexe em atualizadoEm nem no documento: abrir não é reemitir, e o hash do
 * que foi ou será assinado não muda.
 */
export async function registrarVisualizacao(
  id: string,
  quem: { ip?: string; navegador?: string },
  agora: number = Date.now()
): Promise<"registrada" | "repetida" | "nao-encontrada"> {
  const db = getDb();
  const row = db.prepare(`SELECT * FROM propostas WHERE id = ?`).get(id) as Row | undefined;
  if (!row) return "nao-encontrada";
  const proposta = rowParaProposta(row);
  if (proposta.excluidoEm) return "nao-encontrada";

  const lista = proposta.visualizacoes ?? [];
  const mesmaPessoa = [...lista].reverse().find((v) => v.ip === quem.ip && v.navegador === quem.navegador);
  if (mesmaPessoa && agora - Date.parse(mesmaPessoa.em) < JANELA_MESMA_VISITA_MS) return "repetida";

  const em = new Date(agora).toISOString();
  const total = (proposta.totalVisualizacoes ?? 0) + 1;
  const atualizada: Proposal = {
    ...proposta,
    visualizacoes: [...lista, { em, ...quem }].slice(-MAX_VISUALIZACOES_GUARDADAS),
    totalVisualizacoes: total,
    notas:
      total === 1
        ? [...(proposta.notas || []), { texto: "Cliente abriu a proposta pela primeira vez.", criadoEm: em }]
        : proposta.notas,
  };
  salvarLinha(db, atualizada);
  return "registrada";
}

// Controle do resumo diário por e-mail (lib/agendador).
export function lembreteJaTratado(chave: string): boolean {
  return Boolean(getDb().prepare(`SELECT 1 FROM lembretes_enviados WHERE chave = ?`).get(chave));
}

/**
 * Reserva o lembrete antes de enviar, de forma atômica: o INSERT falha pela
 * chave primária se outro processo já reservou. O Next sobe a inicialização
 * em mais de um processo, e sem isto os dois enviariam o mesmo resumo.
 */
export function reservarLembrete(chave: string): boolean {
  try {
    getDb()
      .prepare(`INSERT INTO lembretes_enviados (chave, em, resultado) VALUES (?, ?, 'em andamento')`)
      .run(chave, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export function registrarLembrete(chave: string, resultado: string): void {
  getDb()
    .prepare(`INSERT OR REPLACE INTO lembretes_enviados (chave, em, resultado) VALUES (?, ?, ?)`)
    .run(chave, new Date().toISOString(), resultado.slice(0, 500));
}
