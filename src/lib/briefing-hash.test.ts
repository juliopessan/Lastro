import { describe, expect, it } from "vitest";
import { hashBriefing } from "./briefing-hash";
import { briefingFake } from "./test-fixtures";

describe("hashBriefing", () => {
  it("é estável para o mesmo briefing", () => {
    expect(hashBriefing(briefingFake())).toBe(hashBriefing(briefingFake()));
  });

  it("muda quando muda algo que a IA vê", () => {
    const base = hashBriefing(briefingFake());
    expect(hashBriefing(briefingFake({ itensInvestimento: [{ modulo: "M", descricao: "d", valor: 2000 }] }))).not.toBe(base);
    expect(hashBriefing(briefingFake({ contexto: "outro" }))).not.toBe(base);
  });

  it("não muda com a validade, que a IA nunca vê", () => {
    expect(hashBriefing(briefingFake({ validadeDias: 99 }))).toBe(hashBriefing(briefingFake()));
  });

  it("não depende da ordem das chaves do cronograma", () => {
    const a = briefingFake({ cronograma: [{ fase: "F", periodo: "P", entregas: "E" }] });
    const b = briefingFake({ cronograma: [{ entregas: "E", periodo: "P", fase: "F" }] });
    expect(hashBriefing(a)).toBe(hashBriefing(b));
  });
});
