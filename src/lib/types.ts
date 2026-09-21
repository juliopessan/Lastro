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

export type Assinatura = {
  nome: string;
  cargo?: string;
  imagemPng: string; // data URL do traço desenhado
  aceitoEm: string;
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
  briefing: BriefingInput;
  gerado: ConteudoGerado;
  geracao: Geracao;
  assinatura?: Assinatura;
  status?: StatusProposta;
  proximoContato?: string | null;
  notas?: NotaCrm[];
  contato?: Contato;
};
