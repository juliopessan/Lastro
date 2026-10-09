import { describe, expect, it } from "vitest";
import { destinoSeguro } from "./redirect";

describe("destinoSeguro", () => {
  it.each([
    ["https://site-falso.test/login", "domínio externo"],
    ["//site-falso.test", "protocolo relativo"],
    ["/\\site-falso.test", "barra invertida"],
    ["/\t/site-falso.test", "tab que o navegador descarta"],
    ["javascript:alert(1)", "javascript:"],
  ])("manda %s para /admin (%s)", (next) => {
    expect(destinoSeguro(next)).toBe("/admin");
  });

  it("sem next, vai para /admin", () => {
    expect(destinoSeguro(null)).toBe("/admin");
    expect(destinoSeguro("")).toBe("/admin");
  });

  it("caminho interno passa, com query e âncora", () => {
    expect(destinoSeguro("/admin/crm")).toBe("/admin/crm");
    expect(destinoSeguro("/admin?aba=2#topo")).toBe("/admin?aba=2#topo");
  });
});
