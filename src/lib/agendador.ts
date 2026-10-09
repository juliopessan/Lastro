import { enviarResumoDoDia } from "./email";
import { diaBrasilia, horaBrasilia, HORA_DO_RESUMO, montarResumoDoDia } from "./lembretes";
import { listarPropostas, registrarLembrete, reservarLembrete } from "./store";

// Resumo diário por e-mail para o admin. Iniciado uma vez pelo
// src/instrumentation.ts quando o servidor sobe.
//
// Só liga em produção, com ADMIN_EMAIL e RESEND_API_KEY definidos, e pode ser
// desligado com LEMBRETES_DIARIOS=desligado. Em desenvolvimento nunca dispara.
// Cada dia tratado fica registrado no banco (tabela lembretes_enviados): um
// reinício do servidor não manda o mesmo resumo de novo. Dia sem nada
// pendente é registrado e não gera e-mail.

const INTERVALO_MS = 15 * 60 * 1000;

declare global {
  var __lastroAgendador: ReturnType<typeof setInterval> | undefined;
}

export function agendadorAtivo(): boolean {
  return (
    process.env.NODE_ENV === "production" &&
    Boolean(process.env.ADMIN_EMAIL) &&
    Boolean(process.env.RESEND_API_KEY) &&
    process.env.LEMBRETES_DIARIOS !== "desligado"
  );
}

/**
 * Monta e envia o resumo do dia. `forcar` é o botão "enviar agora" do painel:
 * manda mesmo fora do horário, mesmo vazio, e não marca o dia como tratado.
 */
export async function enviarResumo(forcar = false): Promise<"enviado" | "vazio" | "ja-tratado" | "fora-do-horario"> {
  const agora = Date.now();
  const chave = `resumo:${diaBrasilia(agora)}`;
  if (!forcar) {
    if (horaBrasilia(agora) < HORA_DO_RESUMO) return "fora-do-horario";
    // Só um processo passa daqui por dia (ver reservarLembrete).
    if (!reservarLembrete(chave)) return "ja-tratado";
  }

  const resumo = montarResumoDoDia(await listarPropostas(), agora);
  if (resumo.vazio && !forcar) {
    registrarLembrete(chave, "vazio");
    return "vazio";
  }

  const urlBase = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "";
  try {
    await enviarResumoDoDia(resumo, urlBase);
    if (!forcar) registrarLembrete(chave, "enviado");
    return "enviado";
  } catch (err) {
    // Falha registrada como tratada: sem isto, um erro persistente (domínio
    // não verificado, chave inválida) viraria uma tentativa a cada 15 minutos.
    if (!forcar) registrarLembrete(chave, `erro: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

export function iniciarAgendador(): void {
  if (!agendadorAtivo() || globalThis.__lastroAgendador) return;
  const verificar = () =>
    enviarResumo().catch((err) => console.error("Falha no resumo diário do Lastro:", err));
  globalThis.__lastroAgendador = setInterval(verificar, INTERVALO_MS);
  globalThis.__lastroAgendador.unref?.();
  void verificar();
  console.log("Lastro: resumo diário por e-mail ativo (8h, horário de Brasília).");
}
