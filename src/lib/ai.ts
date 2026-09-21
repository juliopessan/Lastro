import OpenAI from "openai";
import { BriefingInput, ConteudoGerado, Geracao } from "./types";
import { custoGeracaoUsd } from "./pricing";
import { hashBriefing, resumoBriefingParaIa } from "./briefing-hash";

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

  let conteudo: ConteudoGerado;
  try {
    conteudo = JSON.parse(raw);
  } catch {
    throw new Error("A IA retornou um JSON inválido.");
  }

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
