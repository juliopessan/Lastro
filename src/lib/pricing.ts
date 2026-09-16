// Tabela de preço do modelo (USD por 1M tokens), informada pelo usuário.
export const PRICE_IN_PER_MILLION = 0.15;
export const PRICE_OUT_PER_MILLION = 0.6;

export function custoGeracaoUsd(tokensEntrada: number, tokensSaida: number): number {
  const custoEntrada = (tokensEntrada / 1_000_000) * PRICE_IN_PER_MILLION;
  const custoSaida = (tokensSaida / 1_000_000) * PRICE_OUT_PER_MILLION;
  return custoEntrada + custoSaida;
}

export function formatUsd(valor: number): string {
  if (valor < 0.01) return `$${valor.toFixed(4)}`;
  return `$${valor.toFixed(2)}`;
}

export function formatBrl(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
