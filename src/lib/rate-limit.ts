// Limite de tentativas de login, em memória.
//
// Duas travas, porque cada uma sozinha falha:
// - por cliente (5 erros em 15 min): é o que um admin que errou a senha
//   sente, sem afetar mais ninguém;
// - global (30 erros em 15 min): o IP vem de cabeçalho, que quem ataca pode
//   trocar a cada tentativa. A trava global torna força bruta inviável mesmo
//   assim. O custo é que, sob ataque, o login fica fechado para todos até a
//   janela passar — aceitável numa ferramenta com um único admin.
//
// Vale para uma instância só (o Docker do projeto). Reiniciar zera a contagem;
// várias instâncias precisariam de um armazenamento compartilhado.

export const MAX_FALHAS_POR_CLIENTE = 5;
export const MAX_FALHAS_GLOBAL = 30;
export const JANELA_MS = 15 * 60 * 1000;

type Janela = { falhas: number; reiniciaEm: number };

const janelas = new Map<string, Janela>();
const GLOBAL = "*";

function janelaAtual(chave: string, agora: number): Janela | undefined {
  const j = janelas.get(chave);
  if (j && j.reiniciaEm <= agora) {
    janelas.delete(chave);
    return undefined;
  }
  return j;
}

/** Segundos até liberar, ou 0 se pode tentar agora. */
export function segundosBloqueado(cliente: string, agora: number = Date.now()): number {
  const espera = (j: Janela | undefined, max: number) =>
    j && j.falhas >= max ? Math.ceil((j.reiniciaEm - agora) / 1000) : 0;
  return Math.max(
    espera(janelaAtual(cliente, agora), MAX_FALHAS_POR_CLIENTE),
    espera(janelaAtual(GLOBAL, agora), MAX_FALHAS_GLOBAL)
  );
}

export function registrarFalha(cliente: string, agora: number = Date.now()): void {
  for (const chave of [cliente, GLOBAL]) {
    const j = janelaAtual(chave, agora);
    if (j) j.falhas += 1;
    else janelas.set(chave, { falhas: 1, reiniciaEm: agora + JANELA_MS });
  }
  // Não deixa o mapa crescer sem fim com IPs que passaram uma vez só.
  if (janelas.size > 5000) {
    for (const [chave, j] of janelas) if (j.reiniciaEm <= agora) janelas.delete(chave);
  }
}

/** Login certo zera só o contador do cliente; o global segue contando. */
export function limparFalhas(cliente: string): void {
  janelas.delete(cliente);
}

/** Só para testes. */
export function _zerarTudo(): void {
  janelas.clear();
}
