import { describe, expect, it } from "vitest";
import {
  congelarDocumento,
  hashDocumento,
  hashDocumentoAtual,
  ipDoCliente,
  jsonCanonico,
  mascararIp,
  resumirNavegador,
  dataHoraBrasilia,
} from "./assinatura";
import { propostaFake } from "./test-fixtures";

const cab = (h: Record<string, string>) => new Headers(h);

describe("jsonCanonico", () => {
  it("mesma saída para o mesmo conteúdo, em qualquer ordem de chaves", () => {
    expect(jsonCanonico({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: "z" } })).toBe(
      jsonCanonico({ a: { c: "z", d: [2, { x: 2, y: 1 }] }, b: 1 })
    );
  });

  it("ignora chave undefined, como o JSON.stringify", () => {
    expect(jsonCanonico({ a: 1, b: undefined })).toBe(jsonCanonico({ a: 1 }));
  });
});

describe("hash do documento", () => {
  it("é estável para a mesma proposta", () => {
    expect(hashDocumentoAtual(propostaFake())).toBe(hashDocumentoAtual(propostaFake()));
  });

  it("é SHA-256 em hexadecimal", () => {
    expect(hashDocumentoAtual(propostaFake())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("muda se mudar qualquer valor, texto ou a moeda", () => {
    const base = hashDocumentoAtual(propostaFake());
    const p = propostaFake();
    expect(hashDocumentoAtual({ ...p, briefing: { ...p.briefing, itensInvestimento: [{ modulo: "M", descricao: "d", valor: 1001 }] } })).not.toBe(base);
    expect(hashDocumentoAtual({ ...p, gerado: { ...p.gerado, notaFinal: "Outra nota" } })).not.toBe(base);
    expect(hashDocumentoAtual({ ...p, briefing: { ...p.briefing, moeda: "USD" } })).not.toBe(base);
  });

  it("muda quando a proposta é reemitida (data de emissão e validade entram)", () => {
    expect(hashDocumentoAtual(propostaFake({ atualizadoEm: "2026-09-20T12:00:00.000Z" }))).not.toBe(
      hashDocumentoAtual(propostaFake())
    );
  });

  it("a cópia congelada guarda emissão e validade explícitas", () => {
    const d = congelarDocumento(propostaFake());
    expect(d.emitidaEm).toBe("2026-09-01T12:00:00.000Z");
    expect(d.validaAte).toBe("2026-09-16T12:00:00.000Z");
    expect(hashDocumento(d)).toBe(hashDocumentoAtual(propostaFake()));
  });

  it("alterar a cópia congelada depois do aceite muda o hash (é assim que se detecta adulteração)", () => {
    const d = congelarDocumento(propostaFake());
    const registrado = hashDocumento(d);
    const adulterado = { ...d, briefing: { ...d.briefing, condicoesPagamento: "100% antecipado" } };
    expect(hashDocumento(adulterado)).not.toBe(registrado);
  });
});

describe("ipDoCliente", () => {
  it("pega o primeiro do X-Forwarded-For", () => {
    expect(ipDoCliente(cab({ "x-forwarded-for": "179.118.177.188, 10.0.0.1" }))).toBe("179.118.177.188");
  });

  it("cai no X-Real-IP e aceita IPv6", () => {
    expect(ipDoCliente(cab({ "x-real-ip": "2804:14C:5B:1::1" }))).toBe("2804:14c:5b:1::1");
  });

  it("tira o prefixo de IPv4 mapeado em IPv6", () => {
    expect(ipDoCliente(cab({ "x-forwarded-for": "::ffff:187.77.253.105" }))).toBe("187.77.253.105");
  });

  it("descarta o que não é IP", () => {
    expect(ipDoCliente(cab({ "x-forwarded-for": "<script>" }))).toBeUndefined();
    expect(ipDoCliente(cab({ "x-forwarded-for": "999.1.1.1" }))).toBeUndefined();
    expect(ipDoCliente(cab({}))).toBeUndefined();
  });
});

describe("mascararIp", () => {
  it("esconde o final do IPv4 e do IPv6", () => {
    expect(mascararIp("179.118.177.188")).toBe("179.118.•••.•••");
    expect(mascararIp("2804:14c:5b:1::1")).toBe("2804:14c:•••");
    expect(mascararIp(undefined)).toBe("não registrado");
  });
});

describe("resumirNavegador", () => {
  it.each([
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36", "Chrome no macOS"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", "Safari no iPhone"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0", "Edge no Windows"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0", "Firefox no Linux"],
    [undefined, "não registrado"],
  ])("%s", (ua, esperado) => {
    expect(resumirNavegador(ua)).toBe(esperado);
  });
});

describe("dataHoraBrasilia", () => {
  it("mostra no fuso de Brasília, seja qual for o fuso do servidor", () => {
    expect(dataHoraBrasilia("2026-10-09T23:30:00.000Z")).toBe("09/10/2026, 20:30:00");
  });
});
