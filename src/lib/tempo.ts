// Tempo relativo em português, para o painel e o CRM ("há 3 dias").
// Sem dependência de servidor: roda também no navegador.

const DIA = 86_400_000;

function diaEmBrasilia(ms: number): string {
  return new Date(ms).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function haQuantoTempo(iso: string, agora: number = Date.now()): string {
  const quando = Date.parse(iso);
  const diff = agora - quando;
  if (diff < 60_000) return "agora há pouco";
  if (diff < 3_600_000) return `há ${Math.floor(diff / 60_000)} min`;
  if (diaEmBrasilia(quando) === diaEmBrasilia(agora)) return `hoje às ${new Date(quando).toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`;
  if (diaEmBrasilia(quando) === diaEmBrasilia(agora - DIA)) return "ontem";
  const dias = Math.max(2, Math.round(diff / DIA));
  return dias < 30 ? `há ${dias} dias` : `em ${diaEmBrasilia(quando)}`;
}

/** "ainda não aberta", "aberta 1 vez · ontem", "aberta 4 vezes · há 3 dias". */
export function resumoAberturas(total: number | undefined, ultima: string | undefined, agora?: number): string {
  if (!total || !ultima) return "ainda não aberta";
  return `aberta ${total} ${total === 1 ? "vez" : "vezes"} · ${haQuantoTempo(ultima, agora)}`;
}
