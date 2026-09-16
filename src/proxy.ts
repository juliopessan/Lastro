import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verificarSessionToken } from "@/lib/auth";

// Fica público: "/", "/login", "/propostas/[id]" (o cliente assina sem conta)
// e a rota de assinatura. Tudo em "/admin" e a API de gestão de propostas
// exige sessão.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const ehApiPublica = pathname.endsWith("/assinar");
  const precisaAuth =
    (pathname.startsWith("/admin") || pathname.startsWith("/api/proposals")) &&
    !ehApiPublica;

  if (!precisaAuth) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (verificarSessionToken(token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/proposals/:path*"],
};
