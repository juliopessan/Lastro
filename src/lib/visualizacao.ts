// Quem conta como "o cliente abriu a proposta".
//
// O registro vem de um aviso que o navegador manda depois de carregar a
// página (components/RegistrarVisualizacao). Isso já deixa de fora a maioria
// dos robôs que leem o link para montar prévia (WhatsApp, LinkedIn, Slack),
// porque eles não executam JavaScript. Este filtro pega os que executam e o
// Chrome headless que imprime o PDF no próprio servidor.
//
// Limite conhecido: alguns antivírus de e-mail corporativo abrem o link com um
// navegador completo antes do cliente. Esses podem contar como abertura.

const ROBO =
  /bot|crawl|spider|slurp|headless|facebookexternalhit|whatsapp|telegram|slack|discord|linkedin|skype|preview|python|curl|wget|httpclient|go-http|okhttp|java\//i;

export function ehRobo(userAgent: string | null | undefined): boolean {
  return !userAgent || ROBO.test(userAgent);
}

/** Recarregar a página dentro desta janela não conta de novo. */
export const JANELA_MESMA_VISITA_MS = 30 * 60 * 1000;

/** Quantas visualizações individuais ficam guardadas por proposta. */
export const MAX_VISUALIZACOES_GUARDADAS = 100;
