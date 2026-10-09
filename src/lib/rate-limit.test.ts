import { beforeEach, describe, expect, it } from "vitest";
import {
  _zerarTudo,
  JANELA_MS,
  limparFalhas,
  MAX_FALHAS_GLOBAL,
  MAX_FALHAS_POR_CLIENTE,
  registrarFalha,
  segundosBloqueado,
} from "./rate-limit";

const t0 = 1_000_000;

describe("limite de tentativas de login", () => {
  beforeEach(() => _zerarTudo());

  it("bloqueia o cliente ao atingir o limite, não antes", () => {
    for (let i = 0; i < MAX_FALHAS_POR_CLIENTE - 1; i++) registrarFalha("ip-a", t0);
    expect(segundosBloqueado("ip-a", t0)).toBe(0);
    registrarFalha("ip-a", t0);
    expect(segundosBloqueado("ip-a", t0)).toBe(JANELA_MS / 1000);
  });

  it("o bloqueio de um cliente não afeta outro", () => {
    for (let i = 0; i < MAX_FALHAS_POR_CLIENTE; i++) registrarFalha("ip-a", t0);
    expect(segundosBloqueado("ip-b", t0)).toBe(0);
  });

  it("libera quando a janela passa", () => {
    for (let i = 0; i < MAX_FALHAS_POR_CLIENTE; i++) registrarFalha("ip-a", t0);
    expect(segundosBloqueado("ip-a", t0 + JANELA_MS)).toBe(0);
  });

  it("login certo zera o contador do cliente", () => {
    for (let i = 0; i < MAX_FALHAS_POR_CLIENTE; i++) registrarFalha("ip-a", t0);
    limparFalhas("ip-a");
    expect(segundosBloqueado("ip-a", t0)).toBe(0);
  });

  it("trava global pega quem troca de IP a cada tentativa", () => {
    for (let i = 0; i < MAX_FALHAS_GLOBAL; i++) registrarFalha(`ip-${i}`, t0);
    expect(segundosBloqueado("ip-nunca-visto", t0)).toBeGreaterThan(0);
  });
});
