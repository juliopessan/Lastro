// Chamado uma vez pelo Next.js quando o servidor sobe (ver
// node_modules/next/dist/docs, file-conventions/instrumentation).
export async function register() {
  // O agendador usa SQLite e o Resend: só no runtime Node, nunca no edge.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { iniciarAgendador } = await import("./lib/agendador");
  iniciarAgendador();
}
