import OpenAI from "openai";
import { BriefingInput, ConteudoGerado, Geracao } from "./types";
import { custoGeracaoUsd } from "./pricing";
import { hashBriefing, resumoBriefingParaIa } from "./briefing-hash";
import { geradoSchema } from "./schemas";

const MODEL = process.env.AI_MODEL || "deepseek-flash";

function client() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPSEEK_API_KEY não configurada. Defina no arquivo .env.local."
    );
  }
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
  });
}

const SYSTEM_PROMPT = `Você é redator de propostas comerciais da UKode Labs, um estúdio de desenvolvimento e design de produtos digitais.
Sua tarefa é escrever APENAS o texto narrativo de uma proposta comercial a partir de um briefing estruturado.

Regras estritas:
- NUNCA invente números, prazos, valores ou itens de escopo que não estejam no briefing. Todos os números (preços, prazos, quantidades) já foram definidos pelo usuário e não fazem parte da sua resposta.
- Sua função é só a narrativa: resumo executivo, uma introdução curta para cada frente de escopo, os próximos passos e uma nota final.
- Tom: consultivo, direto, confiante, sem exagero de marketing. Português do Brasil.
- Escreva para o cliente, não para outro técnico. Nada de jargão: use "projeto" e "primeira versão" no lugar de MVP, "reunião de início" no lugar de kickoff, "publicação" no lugar de deploy. Evite sprint, stack, backlog, entregável.
- NUNCA use travessão (—) nem hífen duplo (--) no meio das frases: é a marca registrada de texto escrito por IA. Separe as ideias com ponto, vírgula, dois-pontos ou parênteses.
- Responda SOMENTE com um objeto JSON válido, sem markdown, sem texto fora do JSON, no formato exato:
{
  "tituloProposta": "string curta e específica ao projeto",
  "resumoExecutivo": "1 a 2 parágrafos",
  "frentesNarrativa": [{ "titulo": "deve bater com o título da frente recebida", "introducao": "1 parágrafo curto" }],
  "proximosPassos": ["string", "..."],
  "notaFinal": "1 parágrafo curto de fechamento, convidando para o próximo passo"
}`;

function buildUserPrompt(briefing: BriefingInput): string {
  return JSON.stringify(resumoBriefingParaIa(briefing), null, 2);
}

// Travessão com espaço em volta ("isso — aquilo") é a marca de texto de IA que
// o cliente reconhece. O prompt já proíbe; isto é a rede de segurança para
// quando o modelo escorrega. Não mexe em faixa sem espaço ("10–15 dias").
function semTravessao(texto: string, separador: string): string {
  return texto
    .replace(/\s+[—–]\s+|\s*—\s*|\s+--\s+/g, separador)
    .replace(/,\s*([.,;:])/g, "$1")
    .trim();
}

/**
 * Confere o formato do que a IA devolveu e o deixa pronto para gravar.
 *
 * Sem isto, uma resposta fora do formato (proximosPassos como texto em vez de
 * lista, por exemplo) era gravada assim mesmo e a página do cliente quebrava
 * com erro 500 no primeiro .map.
 *
 * Também amarra cada introdução à frente certa do briefing. A página casa
 * frente e introdução pelo título exato, e o modelo às vezes reescreve o
 * título ("VR Motors" vira "VR Motors (Contagem)"); aí a frente aparecia sem
 * texto. Procura pelo título sem diferença de maiúsculas e, se não achar, usa
 * a posição — o prompt pede as frentes na mesma ordem do briefing.
 */
export function normalizarConteudo(bruto: unknown, briefing: BriefingInput): ConteudoGerado {
  const r = geradoSchema.safeParse(bruto);
  if (!r.success) {
    throw new Error("A IA devolveu um conteúdo fora do formato esperado. Tente gerar de novo.");
  }
  const c = r.data;
  const chave = (t: string) => t.trim().toLowerCase();

  const frentesNarrativa = briefing.frentes.map((frente, i) => {
    const porTitulo = c.frentesNarrativa.find((n) => chave(n.titulo) === chave(frente.titulo));
    const introducao = porTitulo?.introducao ?? c.frentesNarrativa[i]?.introducao ?? "";
    return { titulo: frente.titulo, introducao: semTravessao(introducao, ", ") };
  });

  return {
    tituloProposta: semTravessao(c.tituloProposta, ": "),
    resumoExecutivo: semTravessao(c.resumoExecutivo, ", "),
    frentesNarrativa,
    proximosPassos: c.proximosPassos.map((p) => semTravessao(p, ", ")).filter(Boolean),
    notaFinal: semTravessao(c.notaFinal, ", "),
  };
}

export async function gerarConteudoProposta(
  briefing: BriefingInput
): Promise<{ conteudo: ConteudoGerado; geracao: Geracao }> {
  const inicio = Date.now();
  const openai = client();

  const completion = await openai.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0.4,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(briefing) },
    ],
  });

  const duracaoMs = Date.now() - inicio;
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("A IA não retornou conteúdo.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("A IA retornou um JSON inválido.");
  }
  const conteudo = normalizarConteudo(json, briefing);

  const tokensEntrada = completion.usage?.prompt_tokens ?? 0;
  const tokensSaida = completion.usage?.completion_tokens ?? 0;

  const geracao: Geracao = {
    modelo: MODEL,
    tokensEntrada,
    tokensSaida,
    custoUsd: custoGeracaoUsd(tokensEntrada, tokensSaida),
    duracaoMs,
    briefingHash: hashBriefing(briefing),
  };

  return { conteudo, geracao };
}
