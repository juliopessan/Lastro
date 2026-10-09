const BASE = "http://lastro.interno";

/**
 * Destino depois do login, a partir do ?next= da URL. Só aceita caminho
 * dentro do próprio Lastro; qualquer outra coisa vira /admin.
 *
 * Sem isso, um link legítimo como /login?next=https://site-falso levava o
 * admin, já autenticado, para uma página falsa que pedia a senha de novo.
 *
 * A checagem passa pelo parser de URL do próprio navegador em vez de olhar o
 * começo da string: "//site", "/\site" e "/<tab>/site" parecem caminhos, mas o
 * navegador os lê como outro domínio — e o parser normaliza do mesmo jeito.
 */
export function destinoSeguro(next: string | null | undefined): string {
  if (!next) return "/admin";
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return "/admin";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/admin";
  }
}
