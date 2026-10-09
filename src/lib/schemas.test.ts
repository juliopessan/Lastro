import { describe, expect, it } from "vitest";
import { assinaturaSchema, crmPatchSchema, LIMITE_ASSINATURA_PNG } from "./schemas";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

describe("assinaturaSchema", () => {
  it("aceita o que o quadro gera", () => {
    const r = assinaturaSchema.safeParse({ nome: "  Maria Silva  ", cargo: "Diretora", imagemPng: PNG });
    expect(r.success).toBe(true);
    expect(r.data?.nome).toBe("Maria Silva");
  });

  it.each([
    ["URL externa (rastreador)", "https://site.test/pixel.png"],
    ["SVG, que pode carregar script", "data:image/svg+xml;base64,PHN2Zz4="],
    ["base64 com lixo", "data:image/png;base64,<script>"],
  ])("recusa imagem: %s", (_, imagemPng) => {
    expect(assinaturaSchema.safeParse({ nome: "X", imagemPng }).success).toBe(false);
  });

  it("recusa imagem acima do teto", () => {
    const grande = "data:image/png;base64," + "A".repeat(LIMITE_ASSINATURA_PNG);
    expect(assinaturaSchema.safeParse({ nome: "X", imagemPng: grande }).success).toBe(false);
  });

  it("recusa nome vazio e nome longo demais", () => {
    expect(assinaturaSchema.safeParse({ nome: "   ", imagemPng: PNG }).success).toBe(false);
    expect(assinaturaSchema.safeParse({ nome: "x".repeat(121), imagemPng: PNG }).success).toBe(false);
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
