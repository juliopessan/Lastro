import Link from "next/link";
import { ResumoDoDia } from "@/lib/lembretes";
import { haQuantoTempo } from "@/lib/tempo";
import { EnviarResumoButton } from "@/components/EnviarResumoButton";

// Bloco "Para hoje" do painel: o mesmo resumo que vai por e-mail às 8h.

const rotulo = {
  fontFamily: "var(--mono)",
  fontSize: 10.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase" as const,
  color: "var(--ink-faint)",
  margin: "18px 0 6px",
};

function Grupo({ titulo, itens }: { titulo: string; itens: { id: string; texto: React.ReactNode }[] }) {
  if (!itens.length) return null;
  return (
    <div>
      <p style={rotulo}>{titulo}</p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {itens.map((i) => (
          <li key={i.id} style={{ padding: "7px 0", borderTop: "1px solid var(--rule)", fontSize: 14, color: "var(--ink-soft)" }}>
            {i.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ParaHoje({ resumo, emailAtivo }: { resumo: ResumoDoDia; emailAtivo: boolean }) {
  const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const nome = (id: string, cliente: string) => (
    <Link href={`/propostas/${id}`} style={{ fontWeight: 700, color: "var(--ink)" }}>
      {cliente}
    </Link>
  );

  return (
    <section style={{ marginTop: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
        <h3 style={{ fontSize: 15 }}>Para hoje</h3>
        <EnviarResumoButton />
      </div>
      {resumo.vazio ? (
        <p style={{ color: "var(--ink-faint)", fontSize: 13.5, marginTop: 10 }}>
          Nada pendente: nenhum contato marcado para hoje, nenhuma proposta vencendo nos próximos 3
          dias e nenhuma aberta pelo cliente nas últimas 24 horas.
        </p>
      ) : (
        <>
          <Grupo
            titulo="Contatos para fazer"
            itens={resumo.contatos.map((c) => ({
              id: c.id,
              texto: (
                <>
                  {nome(c.id, c.cliente)}: {c.titulo}
                  {c.atrasado && (
                    <span style={{ color: "var(--clay-deep)" }}> · atrasado, era {data(`${c.data}T12:00:00Z`)}</span>
                  )}
                </>
              ),
            }))}
          />
          <Grupo
            titulo="Vencendo em até 3 dias"
            itens={resumo.vencendo.map((v) => ({
              id: v.id,
              texto: (
                <>
                  {nome(v.id, v.cliente)}: vence em {data(v.venceEm)}
                </>
              ),
            }))}
          />
          <Grupo
            titulo="Abertas pelo cliente nas últimas 24h"
            itens={resumo.aberturas.map((a) => ({
              id: a.id,
              texto: (
                <>
                  {nome(a.id, a.cliente)}: {a.vezes} {a.vezes === 1 ? "vez" : "vezes"}, a última {haQuantoTempo(a.ultima)}
                </>
              ),
            }))}
          />
        </>
      )}
      <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", marginTop: 14 }}>
        {emailAtivo
          ? "Este resumo também chega por e-mail todo dia às 8h, quando há algo pendente."
          : "Resumo diário por e-mail desligado: defina ADMIN_EMAIL e RESEND_API_KEY no servidor."}
      </p>
    </section>
  );
}
