// Benchmark de mercado SP/BR — perfil Enterprise / Senior Tech Lead
// (IA, arquiteturas Microsoft e governança digital), informado pela UKode Labs.
// Referência para precificação, não é uma pesquisa auditada. Atualize aqui
// conforme novos dados de mercado.

export type UnidadeMercado = "projeto" | "mensal";

export type CategoriaMercado = {
  id: string;
  categoria: string;
  escopo: string;
  faixaMin: number;
  faixaMax: number;
  horaMin?: number;
  horaMax?: number;
  unidade: UnidadeMercado;
};

export const FONTE_BENCHMARK = "Benchmark de mercado SP/BR, perfil Enterprise / Senior Tech Lead — 2026";

export const CATEGORIAS_MERCADO: CategoriaMercado[] = [
  {
    id: "ia-arquitetura",
    categoria: "Arquitetura & Soluções de IA",
    escopo: "SDR de IA, RAG, Multi-agentes, Copilot Studio, Azure AI",
    faixaMin: 15000,
    faixaMax: 45000,
    horaMin: 250,
    horaMax: 450,
    unidade: "projeto",
  },
  {
    id: "website-b2b",
    categoria: "Website & Presença Digital B2B",
    escopo: "Site institucional completo, SEO, Google Workspace, segurança",
    faixaMin: 8000,
    faixaMax: 20000,
    horaMin: 180,
    horaMax: 300,
    unidade: "projeto",
  },
  {
    id: "ecommerce-mvp",
    categoria: "Catálogo Digital / E-commerce MVP",
    escopo: "Portal de produtos, captura de leads e integração CRM/IA",
    faixaMin: 6000,
    faixaMax: 15000,
    horaMin: 180,
    horaMax: 280,
    unidade: "projeto",
  },
  {
    id: "bi-dashboards",
    categoria: "Dashboards & Business Intelligence",
    escopo: "DRE executiva, BI financeiro e acompanhamento de treinamentos",
    faixaMin: 5000,
    faixaMax: 15000,
    horaMin: 200,
    horaMax: 350,
    unidade: "projeto",
  },
  {
    id: "gestao-mkt",
    categoria: "Gestão Mensal de Mkt & Performance",
    escopo: "Redes sociais, tráfego pago (Meta/Google Ads), copy e criação",
    faixaMin: 2500,
    faixaMax: 6000,
    unidade: "mensal",
  },
  {
    id: "suporte-manutencao",
    categoria: "Suporte & Manutenção Técnica",
    escopo: "Gestão de infra, backups, atualizações e suporte N2/N3",
    faixaMin: 800,
    faixaMax: 2000,
    unidade: "mensal",
  },
];

export function buscarCategoriaMercado(id: string | undefined): CategoriaMercado | undefined {
  if (!id) return undefined;
  return CATEGORIAS_MERCADO.find((c) => c.id === id);
}

export function categoriasPorUnidade(unidade: UnidadeMercado): CategoriaMercado[] {
  return CATEGORIAS_MERCADO.filter((c) => c.unidade === unidade);
}
