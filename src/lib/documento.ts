import { strFromU8, unzipSync } from "fflate";
import { extractText, getDocumentProxy } from "unpdf";

// Leitura de documentos de requisitos enviados pelo admin para preencher o
// briefing. Só extrai texto: a interpretação fica com a IA (lib/ai).

/** Tamanho máximo do arquivo enviado. Um documento de requisitos cabe folgado. */
export const LIMITE_ARQUIVO = 5 * 1024 * 1024;

/**
 * Texto máximo enviado à IA. Acima disso, recusa em vez de cortar: cortar
 * calaria a tabela de preços que costuma vir no fim e o briefing sairia
 * incompleto sem ninguém perceber.
 */
export const LIMITE_TEXTO = 60_000;

export type Formato = "texto" | "pdf" | "docx";

export function formatoDoArquivo(nome: string): Formato | null {
  const extensao = nome.toLowerCase().split(".").pop() ?? "";
  if (["txt", "md", "markdown"].includes(extensao)) return "texto";
  if (extensao === "pdf") return "pdf";
  if (extensao === "docx") return "docx";
  return null;
}

function decodificarXml(texto: string): string {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Converte o XML do corpo de um DOCX em texto corrido: um parágrafo por
 * linha, e tabela como "célula | célula" por linha — o formato que a IA lê
 * bem para tabelas de preço e de requisitos.
 */
export function xmlDocxParaTexto(xml: string): string {
  const semQuebraNaCelula = xml.replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (celula) =>
    celula.replace(/<\/w:p>/g, " ")
  );
  const texto = semQuebraNaCelula
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n")
    .replace(/<\/w:tc>/g, " | ")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "");
  return decodificarXml(texto)
    .replace(/ *\| */g, " | ")
    .replace(/[ \t]*\|[ \t]*\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function textoDeDocx(bytes: Uint8Array): string {
  let arquivos: Record<string, Uint8Array>;
  try {
    arquivos = unzipSync(bytes, { filter: (f) => f.name === "word/document.xml" });
  } catch {
    throw new Error("Não foi possível abrir o DOCX. O arquivo pode estar corrompido.");
  }
  const xml = arquivos["word/document.xml"];
  if (!xml) throw new Error("Esse DOCX não tem conteúdo de texto.");
  return xmlDocxParaTexto(strFromU8(xml));
}

export async function textoDePdf(bytes: Uint8Array): Promise<string> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text.trim();
  } catch {
    throw new Error("Não foi possível ler o PDF. O arquivo pode estar corrompido ou protegido por senha.");
  }
}

export async function textoDeArquivo(nome: string, bytes: Uint8Array): Promise<string> {
  const formato = formatoDoArquivo(nome);
  if (!formato) throw new Error("Formato não aceito. Envie .txt, .md, .pdf ou .docx.");

  let texto: string;
  if (formato === "pdf") texto = await textoDePdf(bytes);
  else if (formato === "docx") texto = textoDeDocx(bytes);
  else texto = new TextDecoder("utf-8").decode(bytes).trim();

  if (!texto) {
    throw new Error(
      formato === "pdf"
        ? "O PDF não tem texto selecionável (provavelmente é uma imagem digitalizada). Cole o texto no campo ao lado."
        : "O arquivo está vazio."
    );
  }
  return texto;
}
