import { describe, expect, it } from "vitest";
import { ehMoeda, formatarMoeda, formatarTotais, moedaDe, simboloMoeda } from "./moeda";

// toLocaleString usa espaço não separável entre símbolo e número.
const n = (s: string) => s.replace(/ /g, " ");

describe("moeda", () => {
  it("formata as três moedas no padrão brasileiro", () => {
    expect(n(formatarMoeda(3000, "BRL"))).toBe("R$ 3.000,00");
    expect(n(formatarMoeda(3000, "USD"))).toBe("US$ 3.000,00");
    expect(n(formatarMoeda(3000, "EUR"))).toBe("€ 3.000,00");
  });

  it("símbolo para rótulo de campo", () => {
    expect([simboloMoeda("BRL"), simboloMoeda("USD"), simboloMoeda("EUR")]).toEqual(["R$", "US$", "€"]);
  });

  it("proposta sem moeda é em real", () => {
    expect(moedaDe({})).toBe("BRL");
    expect(moedaDe({ moeda: "USD" })).toBe("USD");
  });

  it("só aceita as moedas suportadas", () => {
    expect(ehMoeda("EUR")).toBe(true);
    expect(ehMoeda("GBP")).toBe(false);
    expect(ehMoeda(undefined)).toBe(false);
  });

  it("totais nunca somam moedas diferentes", () => {
    expect(
      n(formatarTotais([
        { valor: 14000, moeda: "BRL" },
        { valor: 3000, moeda: "USD" },
        { valor: 1000, moeda: "BRL" },
      ]))
    ).toBe("R$ 15.000,00 · US$ 3.000,00");
  });

  it("sem propostas, zero em real", () => {
    expect(n(formatarTotais([]))).toBe("R$ 0,00");
  });
});
