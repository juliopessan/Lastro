import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { urlInterna, urlPublica } from "./url";

const req = new NextRequest("http://10.0.0.5:3000/api/proposals/x/enviar-email");
const original = { ...process.env };

describe("endereços", () => {
  afterEach(() => {
    process.env = { ...original };
  });

  it("link público usa NEXT_PUBLIC_SITE_URL, sem barra no fim", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://propostas.exemplo.com/";
    expect(urlPublica(req)).toBe("https://propostas.exemplo.com");
  });

  it("sem a variável, cai no host da requisição", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(urlPublica(req)).toBe("http://10.0.0.5:3000");
  });

  it("o PDF vai pelo loopback quando há PORT", () => {
    process.env.PORT = "3000";
    expect(urlInterna(req)).toBe("http://127.0.0.1:3000");
  });

  it("sem PORT (next dev), usa o host da requisição", () => {
    delete process.env.PORT;
    expect(urlInterna(req)).toBe("http://10.0.0.5:3000");
  });
});
