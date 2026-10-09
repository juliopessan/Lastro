import { beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { propostaFake } from "./test-fixtures";

// Banco SQLite de verdade, numa pasta temporária: a lixeira é regra de
// persistência, e testá-la com mock não provaria nada.
let store: typeof import("./store");

beforeAll(async () => {
  process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "lastro-teste-"));
  (globalThis as { __propostasDb?: unknown }).__propostasDb = undefined;
  store = await import("./store");
});

async function novaProposta() {
  const { briefing, gerado, geracao } = propostaFake();
  return store.salvarProposta({ briefing, gerado, geracao });
}

describe("lixeira", () => {
  it("mover para a lixeira tira do painel e do link público, sem apagar", async () => {
    const p = await novaProposta();
    await store.moverParaLixeira(p.id);

    expect((await store.listarPropostas()).map((x) => x.id)).not.toContain(p.id);
    expect(await store.buscarProposta(p.id)).toBeNull();
    expect((await store.buscarProposta(p.id, { incluirLixeira: true }))?.excluidoEm).toBeTruthy();
    expect((await store.listarLixeira()).map((x) => x.id)).toContain(p.id);
  });

  it("registra a ida e a volta como nota no CRM", async () => {
    const p = await novaProposta();
    await store.moverParaLixeira(p.id);
    const restaurada = await store.restaurarDaLixeira(p.id);

    expect(restaurada?.excluidoEm).toBeUndefined();
    expect(restaurada?.notas?.map((n) => n.texto)).toEqual(["Movida para a lixeira.", "Restaurada da lixeira."]);
    expect(await store.buscarProposta(p.id)).not.toBeNull();
  });

  it("não apaga de vez o que não está na lixeira", async () => {
    const p = await novaProposta();
    expect(await store.excluirDefinitivo(p.id)).toBe("fora-da-lixeira");
    expect(await store.buscarProposta(p.id)).not.toBeNull();
  });

  it("apaga de vez o que está na lixeira", async () => {
    const p = await novaProposta();
    await store.moverParaLixeira(p.id);
    expect(await store.excluirDefinitivo(p.id)).toBe("excluida");
    expect(await store.buscarProposta(p.id, { incluirLixeira: true })).toBeNull();
  });

  it("proposta inexistente devolve null ou nao-encontrada, sem erro", async () => {
    expect(await store.moverParaLixeira("nao-existe")).toBeNull();
    expect(await store.restaurarDaLixeira("nao-existe")).toBeNull();
    expect(await store.excluirDefinitivo("nao-existe")).toBe("nao-encontrada");
  });

  it("restaurar o que não está na lixeira não faz nada", async () => {
    const p = await novaProposta();
    expect(await store.restaurarDaLixeira(p.id)).toBeNull();
  });
});

describe("assinatura com evidências", () => {
  const entrada = {
    nome: "Maria Silva",
    email: "maria@empresa.com",
    imagemPng: "data:image/png;base64,AA==",
    ip: "179.118.177.188",
    navegador: "Chrome",
    declaracao: "Li e aceito.",
  };

  it("congela o documento visto e grava o hash dele", async () => {
    const { hashDocumento, hashDocumentoAtual } = await import("./assinatura");
    const p = await novaProposta();
    const hash = hashDocumentoAtual(p);
    const r = await store.assinarProposta(p.id, entrada, hash);
    if (!("ok" in r)) throw new Error(r.erro);

    const a = r.ok.assinatura!;
    expect(a.hashDocumento).toBe(hash);
    expect(hashDocumento(a.documento!)).toBe(hash);
    expect(a.ip).toBe("179.118.177.188");
    expect(r.ok.status).toBe("aceita");
  });

  it("recusa assinar se o documento mudou depois que o cliente abriu a página", async () => {
    const { hashDocumentoAtual } = await import("./assinatura");
    const p = await novaProposta();
    const hashVisto = hashDocumentoAtual(p);
    await store.atualizarProposta(p.id, { gerado: { ...p.gerado, notaFinal: "Mudou" } });
    expect(await store.assinarProposta(p.id, entrada, hashVisto)).toEqual({ erro: "versao-mudou" });
  });

  it("não assina duas vezes", async () => {
    const { hashDocumentoAtual } = await import("./assinatura");
    const p = await novaProposta();
    await store.assinarProposta(p.id, entrada, hashDocumentoAtual(p));
    const depois = await store.buscarProposta(p.id);
    expect(await store.assinarProposta(p.id, entrada, hashDocumentoAtual(depois!))).toEqual({ erro: "ja-assinada" });
  });

  it("documento assinado não se edita", async () => {
    const { hashDocumentoAtual } = await import("./assinatura");
    const p = await novaProposta();
    await store.assinarProposta(p.id, entrada, hashDocumentoAtual(p));
    expect(await store.atualizarProposta(p.id, { gerado: { ...p.gerado, notaFinal: "x" } })).toBe("assinada");
  });

  it("liberar guarda a assinatura inteira no histórico e volta a permitir edição", async () => {
    const { hashDocumentoAtual } = await import("./assinatura");
    const p = await novaProposta();
    await store.assinarProposta(p.id, entrada, hashDocumentoAtual(p));
    const liberada = await store.liberarAssinatura(p.id);

    expect(liberada?.assinatura).toBeUndefined();
    expect(liberada?.assinaturasAnteriores?.[0].hashDocumento).toMatch(/^[0-9a-f]{64}$/);
    expect(liberada?.assinaturasAnteriores?.[0].documento).toBeTruthy();
    expect(await store.atualizarProposta(p.id, { gerado: { ...p.gerado, notaFinal: "y" } })).not.toBe("assinada");
  });

  it("cada edição guarda a versão anterior com o hash dela", async () => {
    const { hashDocumentoAtual } = await import("./assinatura");
    const p = await novaProposta();
    const hashOriginal = hashDocumentoAtual(p);
    const editada = await store.atualizarProposta(p.id, { gerado: { ...p.gerado, notaFinal: "v2" } });
    if (!editada || editada === "assinada") throw new Error("edição falhou");

    expect(editada.versoes).toHaveLength(1);
    expect(editada.versoes![0].hash).toBe(hashOriginal);
    expect(editada.versoes![0].gerado.notaFinal).toBe(p.gerado.notaFinal);
  });
});
