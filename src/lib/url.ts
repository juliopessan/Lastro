import { NextRequest } from "next/server";

/**
 * Endereço público do Lastro, para tudo que sai do servidor e vai ser aberto
 * por outra pessoa: o link "Revisar e assinar" do e-mail ao cliente e o link
 * do aviso de assinatura.
 *
 * Em produção, defina NEXT_PUBLIC_SITE_URL. Sem ela, o endereço sai do host
 * da requisição, que atrás do proxy de uma hospedagem pode ser o interno do
 * contêiner — e aí o cliente recebe um link que não abre.
 */
export function urlPublica(req: NextRequest): string {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return configurada || req.nextUrl.origin;
}

/**
 * Endereço para o servidor acessar a si mesmo — usado pelo Chrome headless que
 * imprime o PDF. Com PORT definida (Docker, Railway, Render), vai pelo
 * loopback: não depende de DNS nem de o domínio público ser alcançável de
 * dentro do contêiner. No `next dev` local, cai no próprio host da requisição.
 */
export function urlInterna(req: NextRequest): string {
  const porta = process.env.PORT;
  return porta ? `http://127.0.0.1:${porta}` : req.nextUrl.origin;
}
