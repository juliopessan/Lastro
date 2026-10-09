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
