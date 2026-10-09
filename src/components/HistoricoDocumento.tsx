import { Assinatura, VersaoDocumento } from "@/lib/types";

// Histórico do documento, só para o admin: cada versão anterior (com o hash
// que identifica exatamente o que o cliente tinha em mãos) e cada assinatura
// liberada para reemissão, com as evidências que ela tinha.

function quando(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

const rotulo = {
  fontFamily: "var(--mono)",
  fontSize: 10.5,
  letterSpacing: "0.13em",
  textTransform: "uppercase" as const,
  color: "var(--ink-faint)",
  marginBottom: 10,
};

const linha = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap" as const,
  padding: "10px 0",
  borderTop: "1px solid var(--rule)",
  fontSize: 13,
  color: "var(--ink-soft)",
};

export function HistoricoDocumento({
  versoes = [],
  assinaturasAnteriores = [],
}: {
  versoes?: VersaoDocumento[];
  assinaturasAnteriores?: Assinatura[];
}) {
  if (!versoes.length && !assinaturasAnteriores.length) return null;

  return (
    <section style={{ marginTop: 56 }}>
      <h3 style={{ fontSize: 15, marginBottom: 6 }}>Histórico do documento</h3>
      <p style={{ color: "var(--ink-faint)", fontSize: 12.5, marginBottom: 20, maxWidth: "70ch" }}>
        Cada reemissão guarda a versão anterior com o hash SHA-256 do conteúdo. O hash identifica
        exatamente o que o cliente tinha em mãos naquela data.
      </p>

      {assinaturasAnteriores.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <p style={rotulo}>Assinaturas liberadas ({assinaturasAnteriores.length})</p>
          {[...assinaturasAnteriores].reverse().map((a, i) => (
            <div key={i} style={linha}>
              <span>
                {a.nome}
                {a.email ? ` · ${a.email}` : ""} · {quando(a.aceitoEm)}
                {a.ip ? ` · IP ${a.ip}` : ""}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>
                {a.hashDocumento ? `${a.hashDocumento.slice(0, 16)}…` : "sem hash (aceite antigo)"}
              </span>
            </div>
          ))}
        </div>
      )}

      {versoes.length > 0 && (
        <div>
          <p style={rotulo}>Versões anteriores ({versoes.length})</p>
          {[...versoes].reverse().map((v, i) => (
            <div key={i} style={linha}>
              <span>
                Emitida em {new Date(v.emitidaEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} ·
                substituída em {quando(v.registradaEm)}
              </span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{v.hash.slice(0, 16)}…</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
