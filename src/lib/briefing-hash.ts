import { BriefingInput } from "./types";

/**
 * O recorte do briefing que a IA realmente enxerga ao escrever a narrativa.
 * Serve de base para o prompt (ai.ts) e para o hash de coerência — mantendo os
 * dois na mesma função eles não podem divergir: se o modelo não viu o campo,
 * mexer nesse campo não marca a narrativa como desatualizada.
 */
export function resumoBriefingParaIa(briefing: BriefingInput) {
  return {
    cliente: briefing.cliente,
    projetos: briefing.projetos,
    contexto: briefing.contexto,
    frentes: briefing.frentes.map((f) => ({
      titulo: f.titulo,
      itens: f.itens.map((i) => i.descricao),
    })),
    investimentoTotal: briefing.itensInvestimento.reduce((s, i) => s + i.valor, 0),
    condicoesPagamento: briefing.condicoesPagamento,
    recorrenciaMensalTotal: briefing.recorrencia.reduce((s, r) => s + r.valorMensal, 0),
    // Remontado campo a campo pra ordem das chaves não depender de como o
    // objeto foi criado — o hash tem que ser estável entre sessões.
    cronograma: briefing.cronograma.map((f) => ({
      fase: f.fase,
      periodo: f.periodo,
      entregas: f.entregas,
    })),
  };
}

/**
 * Hash estável do escopo que gerou a narrativa. Roda igual no servidor e no
 * browser (sem `crypto`), porque a tela de edição recalcula a cada tecla pra
 * dizer se o texto ainda bate com o escopo. Não é criptográfico: só precisa
 * detectar mudança.
 */
export function hashBriefing(briefing: BriefingInput): string {
  const texto = JSON.stringify(resumoBriefingParaIa(briefing));
  let h = 5381;
  for (let i = 0; i < texto.length; i++) {
    h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}
