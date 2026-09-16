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
};

export type Assinatura = {
  nome: string;
  cargo?: string;
  imagemPng: string; // data URL do traço desenhado
  aceitoEm: string;
};

export type Proposal = {
  id: string;
  criadoEm: string;
  briefing: BriefingInput;
  gerado: ConteudoGerado;
  geracao: Geracao;
  assinatura?: Assinatura;
};
