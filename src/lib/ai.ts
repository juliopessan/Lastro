import OpenAI from "openai";
import { BriefingInput, ConteudoGerado, Geracao } from "./types";
import { custoGeracaoUsd } from "./pricing";
import { hashBriefing, resumoBriefingParaIa } from "./briefing-hash";
import { geradoSchema } from "./schemas";
import { buscarCategoriaMercado, CATEGORIAS_MERCADO } from "./market-pricing";
import { z } from "zod";
import { ehMoeda } from "./moeda";

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

type ParametrosChat = Parameters<OpenAI["chat"]["completions"]["create"]>[0];

/**
 * Chama a DeepSeek e traduz as falhas comuns para algo que o admin consegue
 * resolver. Sem isso, a tela mostrava o texto cru do provedor, em inglês
 * ("401 Authentication Fails, Your api key ... is invalid").
 */
async function chamarIa(params: ParametrosChat) {
  try {
    return (await client().chat.completions.create({ ...params, stream: false })) as OpenAI.Chat.Completions.ChatCompletion;
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) throw new Error("A chave da DeepSeek (DEEPSEEK_API_KEY) é inválida ou não está configurada no servidor.");
    if (status === 402) throw new Error("A conta da DeepSeek está sem saldo. Recarregue em platform.deepseek.com.");
    if (status === 429) throw new Error("Limite de uso da DeepSeek atingido. Tente de novo em alguns instantes.");
    if (status && status >= 500) throw new Error("A DeepSeek está instável no momento. Tente de novo em alguns instantes.");
    throw err;
  }
}

const SYSTEM_PROMPT = `Você é redator de propostas comerciais da UKode Labs, um estúdio de desenvolvimento e design de produtos digitais.
Sua tarefa é escrever APENAS o texto narrativo de uma proposta comercial a partir de um briefing estruturado.

Regras estritas:
- NUNCA invente números, prazos, valores ou itens de escopo que não estejam no briefing. Todos os números (preços, prazos, quantidades) já foram definidos pelo usuário e não fazem parte da sua resposta.
- Sua função é só a narrativa: resumo executivo, uma introdução curta para cada frente de escopo, os próximos passos e uma nota final.
- Tom: consultivo, direto, confiante, sem exagero de marketing. Português do Brasil.
- Os valores do briefing estão em reais, a menos que venha o campo "moeda" (USD = dólar americano, EUR = euro). Se citar algum valor, use essa moeda.
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
export function semTravessao(texto: string, separador: string): string {
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
  const completion = await chamarIa({
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

// ---------------------------------------------------------------------------
// Extração do briefing a partir de um documento (requisitos, proposta antiga,
// anotações de reunião). Preenche o formulário de nova proposta; nada é
// gravado até o admin conferir e clicar em "Gerar proposta".

const PROMPT_EXTRACAO = `Você lê documentos de requisitos, propostas comerciais ou anotações de reunião e preenche o briefing estruturado de uma proposta da UKode Labs.

Regras estritas:
- Copie SOMENTE o que está escrito no documento. NUNCA invente cliente, valor, prazo, item ou condição. O que não estiver no texto fica vazio ("" ou lista vazia) ou 0.
- Ignore texto de modelo ou campo a preencher, como "[Nome da empresa]" ou "Cliente: ______": isso não é dado.
- Valores: número puro, sem símbolo de moeda nem separador de milhar. Ex.: "US$ 3.000,00" vira 3000; "R$ 1.250,50" vira 1250.5. Use o valor que o documento atribui a cada item; não redistribua, não some, não arredonde.
- moeda: código ISO da moeda em que os valores estão ("BRL", "USD", "EUR"...). Sem indicação, "BRL".
- frentes: os grandes blocos do escopo (módulos, fases de entrega ou áreas), cada um com itens curtos e concretos do que será entregue.
- itensInvestimento: cada linha de preço do projeto (módulo, descrição curta, valor). Não inclua a linha de total.
- recorrencia: só valores mensais recorrentes (suporte, mensalidade). Sem isso, lista vazia.
- projetos: nome curto do projeto ou das marcas envolvidas, até 8 palavras (ex.: "Loja Virtual WooCommerce"). A descrição vai no contexto.
- cronograma: as fases com período e entregas. "fase" é o nome da fase sem o período (ex.: "Discovery e configuração"); "periodo" é quando (ex.: "Semana 1").
- condicoesPagamento: as condições de pagamento como o documento descreve, numa frase.
- validadeDias: validade da proposta em dias, se o documento disser; senão 15.
- contexto: 2 a 5 frases com objetivo, premissas e exclusões importantes, só com o que o documento diz.
- categoriaMercado: a categoria é a faixa de preço de mercado de UM projeto inteiro. Use um id da lista só quando uma linha de investimento for, sozinha, um projeto inteiro daquela categoria. Quando as linhas forem etapas do mesmo projeto (discovery, design, testes...), omita o campo em todas.
- Português do Brasil. Não use travessão (—).

Categorias de mercado (id: categoria, unidade):
${CATEGORIAS_MERCADO.map((c) => `- ${c.id}: ${c.categoria} (${c.unidade})`).join("\n")}

Responda SOMENTE com um objeto JSON válido, sem markdown, no formato exato:
{
  "moeda": "BRL",
  "briefing": {
    "cliente": "", "projetos": "", "contexto": "",
    "frentes": [{ "titulo": "", "itens": [{ "descricao": "" }] }],
    "itensInvestimento": [{ "modulo": "", "descricao": "", "valor": 0, "categoriaMercado": "id opcional" }],
    "condicoesPagamento": "",
    "recorrencia": [{ "servico": "", "descricao": "", "valorMensal": 0, "categoriaMercado": "id opcional" }],
    "cronograma": [{ "fase": "", "periodo": "", "entregas": "" }],
    "validadeDias": 15
  }
}`;

// Leniente na entrada (o modelo às vezes manda número como texto ou omite
// campos), estrito na saída: o que volta para o formulário é sempre um
// BriefingInput completo e limpo.
const texto = z.coerce.string().catch("");
/**
 * Valor escrito como texto, no formato brasileiro ou americano. O separador
 * decimal é o último que aparece quando há os dois ("1.250,50" e "1,250.50"
 * valem 1250.5); com um só tipo, grupos de três dígitos são milhar ("3.000"
 * e "3,000" valem 3000) e o resto é decimal ("12,5" vale 12.5).
 */
export function paraNumero(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const s = v.replace(/[^\d.,-]/g, "");
  if (!s) return NaN;
  const ponto = s.lastIndexOf(".");
  const virgula = s.lastIndexOf(",");
  if (ponto >= 0 && virgula >= 0) {
    const decimal = ponto > virgula ? "." : ",";
    const milhar = decimal === "." ? "," : ".";
    return Number(s.split(milhar).join("").replace(decimal, "."));
  }
  const sep = ponto >= 0 ? "." : virgula >= 0 ? "," : "";
  if (!sep) return Number(s);
  const ehMilhar = new RegExp(`^-?\\d{1,3}(\\${sep}\\d{3})+$`).test(s);
  return Number(ehMilhar ? s.split(sep).join("") : s.replace(sep, "."));
}

const numero = z.preprocess(paraNumero, z.number().finite().nonnegative()).catch(0);
const lista = <T extends z.ZodTypeAny>(item: T) => z.array(z.unknown()).catch([]).transform((xs) =>
  xs.map((x) => item.safeParse(x)).filter((r) => r.success).map((r) => r.data as z.infer<T>)
);

const extracaoSchema = z.object({
  moeda: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).catch("BRL"),
  briefing: z.object({
    cliente: texto,
    projetos: texto,
    contexto: texto,
    frentes: lista(z.object({ titulo: texto, itens: lista(z.object({ descricao: texto })) })),
    itensInvestimento: lista(z.object({ modulo: texto, descricao: texto, valor: numero, categoriaMercado: z.string().optional().catch(undefined) })),
    condicoesPagamento: texto,
    recorrencia: lista(z.object({ servico: texto, descricao: texto, valorMensal: numero, categoriaMercado: z.string().optional().catch(undefined) })),
    cronograma: lista(z.object({ fase: texto, periodo: texto, entregas: texto })),
    validadeDias: z.coerce.number().int().positive().max(365).catch(15),
  }),
});

const PLACEHOLDER = /^\s*(\[[^\]]*\]|_+|-+|\.+)\s*$/;

/** Só mantém a categoria se ela existe e é da unidade certa (projeto x mensal). */
function categoriaValida(id: string | undefined, unidade: "projeto" | "mensal"): string | undefined {
  const c = buscarCategoriaMercado(id);
  return c && c.unidade === unidade ? c.id : undefined;
}

export type BriefingExtraido = { briefing: BriefingInput; moeda: string };

/**
 * A categoria de mercado é a faixa de preço de um projeto inteiro, e o
 * comparativo soma a faixa por linha. Se a mesma categoria aparece em mais de
 * uma linha, são etapas de um projeto só, e somar cinco vezes a faixa de
 * "E-commerce" contra um projeto de US$ 3.000 seria um comparativo falso.
 * Categoria repetida sai de todas as linhas.
 */
function semCategoriaRepetida<T extends { categoriaMercado?: string }>(itens: T[]): T[] {
  const contagem = new Map<string, number>();
  for (const i of itens) if (i.categoriaMercado) contagem.set(i.categoriaMercado, (contagem.get(i.categoriaMercado) ?? 0) + 1);
  return itens.map((i) => {
    if (!i.categoriaMercado || (contagem.get(i.categoriaMercado) ?? 0) < 2) return i;
    const { categoriaMercado: _repetida, ...resto } = i;
    void _repetida;
    return resto as T;
  });
}

export function normalizarBriefingExtraido(bruto: unknown): BriefingExtraido {
  const r = extracaoSchema.safeParse(bruto);
  if (!r.success) {
    throw new Error("A IA devolveu um conteúdo fora do formato esperado. Tente de novo.");
  }
  const b = r.data.briefing;
  const limpo = (t: string, sep = ", ") => (PLACEHOLDER.test(t) ? "" : semTravessao(t, sep));

  const frentes = b.frentes
    .map((f) => ({
      titulo: limpo(f.titulo, ": "),
      itens: f.itens.map((i) => ({ descricao: limpo(i.descricao) })).filter((i) => i.descricao),
    }))
    .filter((f) => f.titulo || f.itens.length);

  const briefing: BriefingInput = {
    cliente: limpo(b.cliente),
    projetos: limpo(b.projetos),
    contexto: limpo(b.contexto),
    frentes: frentes.length ? frentes : [{ titulo: "", itens: [{ descricao: "" }] }],
    itensInvestimento: semCategoriaRepetida(b.itensInvestimento
      .map((i) => ({
        modulo: limpo(i.modulo, ": "),
        descricao: limpo(i.descricao),
        valor: i.valor,
        ...(categoriaValida(i.categoriaMercado, "projeto") ? { categoriaMercado: categoriaValida(i.categoriaMercado, "projeto") } : {}),
      }))
      .filter((i) => i.modulo || i.descricao || i.valor)),
    condicoesPagamento: limpo(b.condicoesPagamento),
    recorrencia: semCategoriaRepetida(b.recorrencia
      .map((i) => ({
        servico: limpo(i.servico, ": "),
        descricao: limpo(i.descricao),
        valorMensal: i.valorMensal,
        ...(categoriaValida(i.categoriaMercado, "mensal") ? { categoriaMercado: categoriaValida(i.categoriaMercado, "mensal") } : {}),
      }))
      .filter((i) => i.servico || i.valorMensal)),
    cronograma: b.cronograma
      .map((f) => ({ fase: limpo(f.fase, ": "), periodo: limpo(f.periodo), entregas: limpo(f.entregas) }))
      .filter((f) => f.fase || f.entregas),
    validadeDias: b.validadeDias,
  };
  // Real, dólar e euro viram a moeda da proposta. Outra moeda (libra, iene...)
  // fica sem: a tela avisa que os números vieram sem conversão.
  if (ehMoeda(r.data.moeda) && r.data.moeda !== "BRL") briefing.moeda = r.data.moeda;
  if (!briefing.itensInvestimento.length) briefing.itensInvestimento = [{ modulo: "", descricao: "", valor: 0 }];
  if (!briefing.cronograma.length) briefing.cronograma = [{ fase: "", periodo: "", entregas: "" }];

  return { briefing, moeda: r.data.moeda };
}

export async function extrairBriefing(
  documento: string
): Promise<BriefingExtraido & { custoUsd: number }> {
  const completion = await chamarIa({
    model: MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: PROMPT_EXTRACAO },
      { role: "user", content: documento },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("A IA não retornou conteúdo.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("A IA retornou um JSON inválido.");
  }

  const custoUsd = custoGeracaoUsd(
    completion.usage?.prompt_tokens ?? 0,
    completion.usage?.completion_tokens ?? 0
  );
  return { ...normalizarBriefingExtraido(json), custoUsd };
}
