import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "ukode_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    throw new Error("SESSION_SECRET não configurada. Defina no arquivo .env.local.");
  }
  return s;
}

// Sessão sem banco: o cookie é o próprio HMAC de um payload fixo + validade.
// Só existe um usuário (a senha do admin), então não precisa de id de sessão.
export function createSessionToken(): string {
  const expira = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `ukode-admin.${expira}`;
  const assinatura = createHmac("sha256", secret()).update(payload).digest("hex");
  return `${payload}.${assinatura}`;
}

export function verificarSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  if (!process.env.SESSION_SECRET) return false; // sem segredo configurado, nunca autentica

  const partes = token.split(".");
  if (partes.length !== 3) return false;
  const [prefixo, expiraStr, assinatura] = partes;
  if (prefixo !== "ukode-admin") return false;

  const expira = Number(expiraStr);
  if (!Number.isFinite(expira) || Date.now() > expira) return false;

  const payload = `${prefixo}.${expiraStr}`;
  const esperada = createHmac("sha256", secret()).update(payload).digest("hex");

  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verificarSenha(senha: string): boolean {
  const esperada = process.env.ADMIN_PASSWORD;
  if (!esperada) {
    throw new Error("ADMIN_PASSWORD não configurada. Defina no arquivo .env.local.");
  }
  const a = Buffer.from(senha);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_SECONDS;
