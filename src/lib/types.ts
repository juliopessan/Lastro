import type { Moeda } from "./moeda";

// Tipos centrais do sistema de propostas.
// "Medido" = veio direto do formulário (números, itens, prazos).
// "Gerado" = texto produzido pela IA a partir do briefing.

export type ItemEscopo = {
  descricao: string;
};

export type Frente = {
  titulo: string;
  itens: ItemEscopo[];
};

export type ItemInvestimento = {
  modulo: string;
  descricao: string;
  valor: number;
  categoriaMercado?: string;
};

export type ItemRecorrencia = {
  servico: string;
  descricao: string;
  valorMensal: number;
  categoriaMercado?: string;
};

export type FaseCronograma = {
  fase: string;
  periodo: string;
  entregas: string;
};

export type BriefingInput = {
  /** Moeda de todos os valores da proposta. Ausente = real (propostas antigas). */
  moeda?: Moeda;
  cliente: string;
  projetos: string;
  contexto: string;
  frentes: Frente[];
  itensInvestimento: ItemInvestimento[];
  condicoesPagamento: string;
  recorrencia: ItemRecorrencia[];
  cronograma: FaseCronograma[];
  validadeDias: number;
};

export type ConteudoGerado = {
  tituloProposta: string;
  resumoExecutivo: string;
  frentesNarrativa: { titulo: string; introducao: string }[];
  proximosPassos: string[];
  notaFinal: string;
};

export type Geracao = {
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custoUsd: number;
  duracaoMs: number;
  /**
   * Hash do escopo que produziu esta narrativa (ver lib/briefing-hash).
   * Comparado com o hash do briefing atual, diz se o texto ainda é coerente
   * com o escopo. Ausente nas propostas geradas antes desse controle existir —
   * nesse caso não dá pra afirmar nada, e a tela não afirma.
   */
  briefingHash?: string;
};

/** O conteúdo exato que o cliente viu e assinou (ver lib/assinatura). */
export type DocumentoAssinado = {
  versao: 1;
  briefing: BriefingInput;
  gerado: ConteudoGerado;
  emitidaEm: string;
  validaAte: string;
};

export type Assinatura = {
  nome: string;
  cargo?: string;
  imagemPng: string; // data URL do traço desenhado
  aceitoEm: string;
  // Evidências. Opcionais porque assinaturas anteriores a este registro não
  // têm: a página mostra o que existir e não afirma o que não foi gravado.
  email?: string;
  ip?: string;
  navegador?: string;
  declaracao?: string;
  hashDocumento?: string;
  documento?: DocumentoAssinado;
};

/** Uma versão anterior do documento, guardada a cada reemissão. */
export type VersaoDocumento = {
  registradaEm: string;
  hash: string;
  briefing: BriefingInput;
  gerado: ConteudoGerado;
  emitidaEm: string;
};

export type StatusProposta =
  | "enviada"
  | "em_negociacao"
  | "aceita"
  | "recusada"
  | "perdida";

export type NotaCrm = {
  texto: string;
  criadoEm: string;
};

export type Contato = {
  nome?: string;
  email?: string;
  telefone?: string;
};

export type Proposal = {
  id: string;
  criadoEm: string;
  /**
   * Última vez que o documento em si foi alterado (briefing ou narrativa).
   * Mexer no CRM — status, nota, contato, assinatura — não conta: aquilo é
   * controle interno, não uma revisão da proposta que o cliente lê.
   * Ausente enquanto a proposta nunca foi editada.
   */
  atualizadoEm?: string;
  /**
   * Quando foi para a lixeira. Proposta com este campo some do painel, do CRM
   * e do link público, mas continua no banco até alguém excluir de vez.
   */
  excluidoEm?: string;
  briefing: BriefingInput;
  gerado: ConteudoGerado;
  geracao: Geracao;
  assinatura?: Assinatura;
  /** Assinaturas liberadas para reemissão, com tudo que provava cada uma. */
  assinaturasAnteriores?: Assinatura[];
  /** Versões anteriores do documento, uma por edição salva. */
  versoes?: VersaoDocumento[];
  status?: StatusProposta;
  proximoContato?: string | null;
  notas?: NotaCrm[];
  contato?: Contato;
};
