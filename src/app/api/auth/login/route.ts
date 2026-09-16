import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  verificarSenha,
} from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { senha } = (await req.json().catch(() => ({}))) as { senha?: string };

  if (!senha || !verificarSenha(senha)) {
    return NextResponse.json({ erro: "Senha incorreta." }, { status: 401 });
  }

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
