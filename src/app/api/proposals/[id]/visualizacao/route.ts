import { NextRequest, NextResponse } from "next/server";
import { registrarVisualizacao } from "@/lib/store";
import { ehRobo } from "@/lib/visualizacao";
import { ipDoCliente } from "@/lib/assinatura";
import { SESSION_COOKIE, verificarSessionToken } from "@/lib/auth";

// Rota pública (o cliente abre a proposta sem conta): o proxy libera
// /visualizacao como libera /assinar. Responde 204 em qualquer caso para não
// revelar nada a quem sondar; só grava quando é uma abertura de verdade.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userAgent = req.headers.get("user-agent");
  const admin = verificarSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (!admin && !ehRobo(userAgent)) {
    const { id } = await params;
    await registrarVisualizacao(id, {
      ip: ipDoCliente(req.headers),
      navegador: userAgent?.slice(0, 300) || undefined,
    });
  }
  return new NextResponse(null, { status: 204 });
}
