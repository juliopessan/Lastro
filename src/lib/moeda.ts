// Moeda da proposta. Cada proposta tem uma só; propostas antigas, sem o
// campo, são em real. O Lastro nunca converte entre moedas: converter exige
// cotação, e cotação seria um número que ninguém digitou.

export const MOEDAS = ["BRL", "USD", "EUR"] as const;
export type Moeda = (typeof MOEDAS)[number];

export const NOME_MOEDA: Record<Moeda, string> = {
  BRL: "Real (R$)",
  USD: "Dólar (US$)",
  EUR: "Euro (€)",
};

export function ehMoeda(valor: unknown): valor is Moeda {
  return typeof valor === "string" && (MOEDAS as readonly string[]).includes(valor);
}

export function moedaDe(briefing: { moeda?: Moeda }): Moeda {
  return briefing.moeda ?? "BRL";
}

/** "R$ 3.000,00", "US$ 3.000,00", "€ 3.000,00" — formato brasileiro nas três. */
export function formatarMoeda(valor: number, moeda: Moeda = "BRL"): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: moeda });
}

/** Só o símbolo, para rótulos de campo: "R$", "US$", "€". */
export function simboloMoeda(moeda: Moeda): string {
  return formatarMoeda(0, moeda).replace(/[\d\s.,]/g, "").trim();
}

/**
 * Total de várias propostas sem misturar moedas: soma dentro de cada moeda e
 * devolve "R$ 14.000,00 · US$ 3.000,00". Sem nenhuma proposta, "R$ 0,00".
 */
export function formatarTotais(itens: { valor: number; moeda: Moeda }[]): string {
  const totais = new Map<Moeda, number>();
  for (const { valor, moeda } of itens) totais.set(moeda, (totais.get(moeda) ?? 0) + valor);
  const partes = MOEDAS.filter((m) => totais.has(m)).map((m) => formatarMoeda(totais.get(m)!, m));
  return partes.length ? partes.join(" · ") : formatarMoeda(0, "BRL");
}
