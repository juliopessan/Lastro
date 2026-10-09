import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  verificarSenha,
} from "@/lib/auth";
import { limparFalhas, registrarFalha, segundosBloqueado } from "@/lib/rate-limit";

function identificarCliente(req: NextRequest): string {
  const encaminhado = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return encaminhado || req.headers.get("x-real-ip") || "desconhecido";
}

export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    // Sem isso, verificarSenha/createSessionToken lançam e o usuário vê só um
    // 500 genérico. Melhor dizer o que falta configurar.
    return NextResponse.json(
      { erro: "Servidor sem ADMIN_PASSWORD ou SESSION_SECRET configurada." },
      { status: 500 }
    );
  }

  const cliente = identificarCliente(req);
  const espera = segundosBloqueado(cliente);
  if (espera > 0) {
    const minutos = Math.ceil(espera / 60);
    return NextResponse.json(
      { erro: `Muitas tentativas. Tente de novo em ${minutos} min.` },
      { status: 429, headers: { "Retry-After": String(espera) } }
    );
  }

  const { senha } = (await req.json().catch(() => ({}))) as { senha?: unknown };

  if (typeof senha !== "string" || !senha || !verificarSenha(senha)) {
    registrarFalha(cliente);
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

  limparFalhas(cliente);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  return res;
}
