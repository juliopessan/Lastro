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

describe("aberturas pelo cliente", () => {
  const cliente = { ip: "179.118.177.188", navegador: "Safari" };
  const t0 = Date.parse("2026-10-09T12:00:00.000Z");

  it("a primeira abertura conta e vira nota no CRM", async () => {
    const p = await novaProposta();
    expect(await store.registrarVisualizacao(p.id, cliente, t0)).toBe("registrada");
    const depois = await store.buscarProposta(p.id);
    expect(depois?.totalVisualizacoes).toBe(1);
    expect(depois?.notas?.map((n) => n.texto)).toContain("Cliente abriu a proposta pela primeira vez.");
  });

  it("recarregar dentro de 30 minutos não conta de novo; depois disso conta", async () => {
    const p = await novaProposta();
    await store.registrarVisualizacao(p.id, cliente, t0);
    expect(await store.registrarVisualizacao(p.id, cliente, t0 + 10 * 60_000)).toBe("repetida");
    expect(await store.registrarVisualizacao(p.id, cliente, t0 + 31 * 60_000)).toBe("registrada");
    expect((await store.buscarProposta(p.id))?.totalVisualizacoes).toBe(2);
  });

  it("outra pessoa no mesmo minuto conta", async () => {
    const p = await novaProposta();
    await store.registrarVisualizacao(p.id, cliente, t0);
    expect(await store.registrarVisualizacao(p.id, { ip: "200.1.1.1", navegador: "Chrome" }, t0 + 1000)).toBe("registrada");
  });

  it("só a primeira abertura gera nota", async () => {
    const p = await novaProposta();
    await store.registrarVisualizacao(p.id, cliente, t0);
    await store.registrarVisualizacao(p.id, cliente, t0 + 3_600_000);
    const notas = (await store.buscarProposta(p.id))?.notas?.filter((n) => n.texto.includes("abriu"));
    expect(notas).toHaveLength(1);
  });

  it("guarda no máximo 100 aberturas, mas o total segue contando", async () => {
    const p = await novaProposta();
    for (let i = 0; i < 105; i++) await store.registrarVisualizacao(p.id, { ip: `10.0.0.${i}` }, t0 + i);
    const depois = await store.buscarProposta(p.id);
    expect(depois?.visualizacoes).toHaveLength(100);
    expect(depois?.totalVisualizacoes).toBe(105);
  });

  it("abrir não reemite nem muda o hash do documento", async () => {
    const { hashDocumentoAtual } = await import("./assinatura");
    const p = await novaProposta();
    const antes = hashDocumentoAtual(p);
    await store.registrarVisualizacao(p.id, cliente, t0);
    const depois = await store.buscarProposta(p.id);
    expect(depois?.atualizadoEm).toBeUndefined();
    expect(hashDocumentoAtual(depois!)).toBe(antes);
  });

  it("proposta na lixeira não registra", async () => {
    const p = await novaProposta();
    await store.moverParaLixeira(p.id);
    expect(await store.registrarVisualizacao(p.id, cliente, t0)).toBe("nao-encontrada");
  });
});

describe("reserva do resumo diário", () => {
  it("só a primeira reserva do dia passa; as outras desistem", () => {
    expect(store.reservarLembrete("resumo:2026-10-09")).toBe(true);
    expect(store.reservarLembrete("resumo:2026-10-09")).toBe(false);
    expect(store.reservarLembrete("resumo:2026-10-10")).toBe(true);
  });

  it("registrar o resultado não reabre a reserva", () => {
    expect(store.reservarLembrete("resumo:2026-11-01")).toBe(true);
    store.registrarLembrete("resumo:2026-11-01", "enviado");
    expect(store.reservarLembrete("resumo:2026-11-01")).toBe(false);
  });
});
