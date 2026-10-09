import { describe, expect, it } from "vitest";
import { assinaturaSchema, crmPatchSchema, LIMITE_ASSINATURA_PNG } from "./schemas";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("assinaturaSchema", () => {
  // Entrada válida completa; cada teste de recusa muda UM campo, para recusar
  // pelo motivo certo e não por outro campo faltando.
  const valida = {
    nome: "  Maria Silva  ",
    cargo: "Diretora",
    email: "maria@empresa.com",
    imagemPng: PNG,
    aceite: true,
    hashVisto: "a".repeat(64),
  };
  const passa = (mudanca: Record<string, unknown>) =>
    assinaturaSchema.safeParse({ ...valida, ...mudanca }).success;

  it("aceita o que o quadro gera", () => {
    const r = assinaturaSchema.safeParse(valida);
    expect(r.success).toBe(true);
    expect(r.data?.nome).toBe("Maria Silva");
  });

  it("aceita sem e-mail ou com e-mail vazio", () => {
    expect(passa({ email: undefined })).toBe(true);
    expect(passa({ email: "" })).toBe(true);
  });

  it.each([
    ["URL externa (rastreador)", "https://site.test/pixel.png"],
    ["SVG, que pode carregar script", "data:image/svg+xml;base64,PHN2Zz4="],
    ["base64 com lixo", "data:image/png;base64,<script>"],
  ])("recusa imagem: %s", (_, imagemPng) => {
    expect(passa({ imagemPng })).toBe(false);
  });

  it("recusa imagem acima do teto", () => {
    expect(passa({ imagemPng: "data:image/png;base64," + "A".repeat(LIMITE_ASSINATURA_PNG) })).toBe(false);
  });

  it("recusa nome vazio e nome longo demais", () => {
    expect(passa({ nome: "   " })).toBe(false);
    expect(passa({ nome: "x".repeat(121) })).toBe(false);
  });

  it("recusa sem a declaração marcada", () => {
    expect(passa({ aceite: false })).toBe(false);
    expect(passa({ aceite: undefined })).toBe(false);
    expect(passa({ aceite: "true" })).toBe(false);
  });

  it("recusa sem o hash do documento visto, ou com hash malformado", () => {
    expect(passa({ hashVisto: undefined })).toBe(false);
    expect(passa({ hashVisto: "abc" })).toBe(false);
    expect(passa({ hashVisto: "Z".repeat(64) })).toBe(false);
  });

  it("recusa e-mail inválido", () => {
    expect(passa({ email: "nao-e-email" })).toBe(false);
  });
});

describe("crmPatchSchema", () => {
  it("aceita os formatos que o quadro manda", () => {
    expect(crmPatchSchema.safeParse({ status: "em_negociacao" }).success).toBe(true);
    expect(crmPatchSchema.safeParse({ proximoContato: "2026-10-20" }).success).toBe(true);
    expect(crmPatchSchema.safeParse({ proximoContato: null }).success).toBe(true);
    expect(crmPatchSchema.safeParse({ contato: { nome: "Ana", email: null } }).success).toBe(true);
  });

  it("recusa status, data e e-mail inválidos", () => {
    expect(crmPatchSchema.safeParse({ status: "ganha" }).success).toBe(false);
    expect(crmPatchSchema.safeParse({ proximoContato: "amanhã" }).success).toBe(false);
    expect(crmPatchSchema.safeParse({ contato: { email: "nao-e-email" } }).success).toBe(false);
  });

  it("descarta chave inventada dentro do contato", () => {
    const r = crmPatchSchema.safeParse({ contato: { nome: "Ana", admin: true } });
    expect(r.data?.contato).toEqual({ nome: "Ana" });
  });
});
