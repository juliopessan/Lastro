import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { Metadata } from "next";
import { buscarProposta } from "@/lib/store";
import { Eyebrow, Fig, Flag, LedgerPanel, Measured, Voice } from "@/components/Ledger";
import { PrintButton } from "@/components/PrintButton";
import { EmailSendForm } from "@/components/EmailSendForm";
import { SignaturePad } from "@/components/SignaturePad";
import { formatBrl } from "@/lib/pricing";
import { buscarCategoriaMercado, FONTE_BENCHMARK } from "@/lib/market-pricing";
import { dataEmissao, dataValidade } from "@/lib/crm";
import { SESSION_COOKIE, verificarSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  return { title: proposta ? proposta.gerado.tituloProposta : "Proposta" };
}

export default async function PropostaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposta = await buscarProposta(id);
  if (!proposta) notFound();

  const cookieStore = await cookies();
  const ehAdmin = verificarSessionToken(cookieStore.get(SESSION_COOKIE)?.value);

  const { briefing, gerado, geracao } = proposta;

  const totalSetup = briefing.itensInvestimento.reduce((s, i) => s + i.valor, 0);
  const totalRecorrencia = briefing.recorrencia.reduce((s, r) => s + r.valorMensal, 0);
  const totalItensEscopo = briefing.frentes.reduce((s, f) => s + f.itens.length, 0);

  // Editar a proposta é reemiti-la: o documento carrega uma data só, a da
  // última versão, e a validade conta dela. Mostrar "emitida em X · revisada
  // em Y" expunha ao cliente um rascunho que ele nunca viu. O histórico não se
  // perde — criadoEm continua no banco e no painel. Mesma conta que o painel e
  // o CRM usam pra marcar vencida (lib/crm), pra não discordarem do documento.
  const emissao = dataEmissao(proposta);
  const validade = dataValidade(proposta);

  const comparativoSetup = briefing.itensInvestimento
    .map((item) => ({ item, categoria: buscarCategoriaMercado(item.categoriaMercado) }))
    .filter((c) => c.categoria);
  const comparativoRecorrencia = briefing.recorrencia
    .map((item) => ({ item, categoria: buscarCategoriaMercado(item.categoriaMercado) }))
    .filter((c) => c.categoria);
  const temComparativo = comparativoSetup.length > 0 || comparativoRecorrencia.length > 0;
  const mercadoSetupMin = comparativoSetup.reduce((s, c) => s + c.categoria!.faixaMin, 0);
  const mercadoSetupMax = comparativoSetup.reduce((s, c) => s + c.categoria!.faixaMax, 0);
  const propostoComparadoSetup = comparativoSetup.reduce((s, c) => s + c.item.valor, 0);

  return (
    <main className="wrap" style={{ paddingTop: 48, paddingBottom: 120 }}>
      <div
        className="no-print"
        style={{ display: "flex", justifyContent: "space-between", marginBottom: 40 }}
      >
        {ehAdmin ? (
          <Link href="/admin" className="btn btn-ghost">
            ← Todas as propostas
          </Link>
        ) : (
          <span />
        )}
        <div style={{ display: "flex", gap: 12 }}>
          {ehAdmin && (
            <Link href={`/admin/propostas/${proposta.id}/editar`} className="btn btn-ghost" style={{ border: "1px solid var(--rule)" }}>
              Editar
            </Link>
          )}
          <PrintButton />
        </div>
      </div>

      {ehAdmin && (
        <div className="no-print" style={{ marginBottom: 40 }}>
          <EmailSendForm propostaId={proposta.id} contato={proposta.contato} />
        </div>
      )}

      <header style={{ marginBottom: 48 }}>
        <Eyebrow>UKode Labs · Proposta comercial</Eyebrow>
        <h1 style={{ fontSize: "clamp(30px, 4vw, 46px)", marginBottom: 16 }}>
          {gerado.tituloProposta}
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 15 }}>
          <strong>Cliente:</strong> {briefing.cliente}
          {briefing.projetos && (
            <>
              {" "}
              · <strong>Projetos:</strong> {briefing.projetos}
            </>
          )}
        </p>
        <p style={{ color: "var(--ink-faint)", fontSize: 13, marginTop: 6, fontFamily: "var(--mono)" }}>
          Emitida em {emissao.toLocaleDateString("pt-BR")} · válida até{" "}
          {validade.toLocaleDateString("pt-BR")}
        </p>
      </header>

      {/* O painel abaixo é a capa de números da proposta. Tudo que é bastidor
          da geração (modelo, tempo, aviso de revisão) só aparece para o admin:
          o cliente — e o PDF, que é renderizado sem sessão — vê só o documento. */}
      <LedgerPanel
        liveLabel="Ledger da proposta"
        meta={
          ehAdmin ? (
            <span className="no-print">
              {geracao.modelo} · {geracao.duracaoMs}ms
            </span>
          ) : undefined
        }
      >
        <div className="figs">
          <Fig value={formatBrl(totalSetup)} label="investimento de setup" />
          {totalRecorrencia > 0 && (
            <Fig value={formatBrl(totalRecorrencia)} label="recorrência (por mês)" />
          )}
          <Fig value={String(briefing.frentes.length).padStart(2, "0")} label="frentes de escopo" />
          <Fig value={String(totalItensEscopo).padStart(2, "0")} label="itens de escopo" />
        </div>

        <Measured titulo="Medido, não estimado">
          {ehAdmin
            ? "Valores, prazos e itens de escopo vieram direto do briefing preenchido — a IA não alterou nenhum número."
            : "Os totais acima somam exatamente os itens listados no escopo e no investimento — nenhum valor aqui é faixa ou estimativa."}
        </Measured>
      </LedgerPanel>

      {ehAdmin && (
        <div className="no-print">
          <Flag titulo="Texto gerado por IA — revisar antes do envio">
            O resumo executivo, as introduções de cada frente, os próximos passos e a nota final
            foram redigidos por <code>{geracao.modelo}</code> a partir do briefing. Releia esses
            trechos antes de enviar ao cliente. Este aviso é só seu: não vai para o cliente, nem
            quando você imprime ou envia o PDF.
          </Flag>
        </div>
      )}

      {/* Resumo executivo */}
      <section className="section">
        <Eyebrow>01 · Resumo executivo</Eyebrow>
        <p style={{ maxWidth: "68ch", color: "var(--ink-soft)", fontSize: 15.5, lineHeight: 1.7 }}>
          {gerado.resumoExecutivo}
        </p>
      </section>

      {/* Escopo */}
      <section className="section">
        <Eyebrow>02 · Escopo detalhado</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          {briefing.frentes.map((frente, i) => {
            const narrativa = gerado.frentesNarrativa.find((n) => n.titulo === frente.titulo);
            return (
              <div key={i}>
                <h3 style={{ fontSize: 19, marginBottom: 10 }}>{frente.titulo}</h3>
                {narrativa && (
                  <p style={{ color: "var(--ink-soft)", maxWidth: "64ch", marginBottom: 12 }}>
                    {narrativa.introducao}
                  </p>
                )}
                <ul style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 0, listStyle: "none" }}>
                  {frente.itens.map((item, ii) => (
                    <li
                      key={ii}
                      style={{
                        display: "flex",
                        gap: 10,
                        fontSize: 14,
                        color: "var(--ink-soft)",
                        borderTop: "1px solid var(--rule)",
                        paddingTop: 10,
                      }}
                    >
                      <span style={{ fontFamily: "var(--mono)", color: "var(--ink-faint)" }}>—</span>
                      {item.descricao}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Investimento */}
      <section className="section">
        <Eyebrow>03 · Investimento</Eyebrow>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Descrição</th>
                <th style={{ textAlign: "right" }}>Valor</th>
              </tr>
            </thead>
            <tbody>
              {briefing.itensInvestimento.map((item, i) => (
                <tr key={i}>
                  <td>{item.modulo}</td>
                  <td style={{ color: "var(--ink-soft)" }}>{item.descricao}</td>
                  <td className="num">{formatBrl(item.valor)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>
                  Total do setup
                </td>
                <td className="num" style={{ fontWeight: 700 }}>
                  {formatBrl(totalSetup)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {briefing.condicoesPagamento && (
          <p style={{ marginTop: 16, color: "var(--ink-soft)", maxWidth: "64ch" }}>
            <strong style={{ color: "var(--ink)" }}>Condições de pagamento: </strong>
            {briefing.condicoesPagamento}
          </p>
        )}

        {briefing.recorrencia.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12 }}>Recorrência mensal</h3>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Serviço</th>
                    <th>Escopo incluído</th>
                    <th style={{ textAlign: "right" }}>Valor mensal</th>
                  </tr>
                </thead>
                <tbody>
                  {briefing.recorrencia.map((item, i) => (
                    <tr key={i}>
                      <td>{item.servico}</td>
                      <td style={{ color: "var(--ink-soft)" }}>{item.descricao}</td>
                      <td className="num">{formatBrl(item.valorMensal)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} style={{ fontWeight: 700 }}>
                      Total mensal
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {formatBrl(totalRecorrencia)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Comparativo com mercado */}
      {temComparativo && (
        <section className="section">
          <Eyebrow>04 · Comparativo com mercado SP/BR</Eyebrow>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item da proposta</th>
                  <th>Categoria de mercado</th>
                  <th style={{ textAlign: "right" }}>Faixa de mercado</th>
                  <th style={{ textAlign: "right" }}>Valor proposto</th>
                </tr>
              </thead>
              <tbody>
                {comparativoSetup.map((c, i) => (
                  <tr key={`s${i}`}>
                    <td>{c.item.modulo}</td>
                    <td style={{ color: "var(--ink-soft)" }}>{c.categoria!.categoria}</td>
                    <td className="num">
                      {formatBrl(c.categoria!.faixaMin)} – {formatBrl(c.categoria!.faixaMax)}
                    </td>
                    <td className="num">{formatBrl(c.item.valor)}</td>
                  </tr>
                ))}
                {comparativoRecorrencia.map((c, i) => (
                  <tr key={`r${i}`}>
                    <td>{c.item.servico}</td>
                    <td style={{ color: "var(--ink-soft)" }}>{c.categoria!.categoria}</td>
                    <td className="num">
                      {formatBrl(c.categoria!.faixaMin)} – {formatBrl(c.categoria!.faixaMax)} /mês
                    </td>
                    <td className="num">{formatBrl(c.item.valorMensal)}/mês</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {comparativoSetup.length > 0 && (
            <div className="ledger" style={{ marginTop: 20, padding: 16 }}>
              <Measured titulo="Medido a partir da tabela de referência">
                Somando só os itens de setup com categoria de mercado atribuída: proposto{" "}
                {formatBrl(propostoComparadoSetup)} contra uma faixa de mercado de{" "}
                {formatBrl(mercadoSetupMin)} – {formatBrl(mercadoSetupMax)}. A faixa vem da
                tabela de referência da UKode Labs ({FONTE_BENCHMARK}) — é o parâmetro que
                usamos para precificar, não uma pesquisa de mercado auditada.
                {ehAdmin && (
                  <span className="no-print">
                    {" "}
                    Fonte no código: <code>src/lib/market-pricing.ts</code>.
                  </span>
                )}
              </Measured>
            </div>
          )}
        </section>
      )}

      {/* Cronograma */}
      <section className="section">
        <Eyebrow>{temComparativo ? "05" : "04"} · Cronograma de execução</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {briefing.cronograma.map((fase, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "160px 140px 1fr",
                gap: 16,
                padding: "16px 0",
                borderTop: "1px solid var(--rule)",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 14 }}>{fase.fase}</span>
              <span style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-faint)" }}>
                {fase.periodo}
              </span>
              <span style={{ color: "var(--ink-soft)", fontSize: 14 }}>{fase.entregas}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Próximos passos */}
      <section className="section">
        <Eyebrow>{temComparativo ? "06" : "05"} · Próximos passos</Eyebrow>
        <ol style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 20 }}>
          {gerado.proximosPassos.map((passo, i) => (
            <li key={i} style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>
              {passo}
            </li>
          ))}
        </ol>
        <p style={{ marginTop: 28, maxWidth: "62ch", fontSize: 15.5 }}>
          <Voice>{gerado.notaFinal}</Voice>
        </p>
      </section>

      {/* Aceite / assinatura */}
      <section className="section">
        <Eyebrow>{temComparativo ? "07" : "06"} · Aceite</Eyebrow>
        {proposta.assinatura ? (
          <div className="ledger" style={{ padding: 16 }}>
            <Measured titulo="Assinado">
              <span style={{ display: "block", marginBottom: 10 }}>
                {proposta.assinatura.nome}
                {proposta.assinatura.cargo && ` · ${proposta.assinatura.cargo}`} aceitou esta
                proposta em{" "}
                {new Date(proposta.assinatura.aceitoEm).toLocaleString("pt-BR")}.
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proposta.assinatura.imagemPng}
                alt={`Assinatura de ${proposta.assinatura.nome}`}
                style={{ maxWidth: 320, background: "#fff" }}
              />
            </Measured>
          </div>
        ) : (
          <>
            <div className="no-print">
              <p style={{ color: "var(--ink-soft)", maxWidth: "60ch", marginBottom: 20 }}>
                Ao assinar abaixo, você confirma o aceite desta proposta nas condições descritas
                acima.
              </p>
              <SignaturePad propostaId={proposta.id} />
            </div>
            {/* Campo de assinatura do PDF/impressão — na tela quem assina é o
                SignaturePad acima. Usa o painel escuro do ledger, mas sem o
                tique mint do <Measured>: aqui não há nada assinado ainda, e
                mint é reservado pro que já foi verificado. */}
            <div className="only-print evitar-quebra ledger" style={{ padding: "26px 28px" }}>
              <div style={{ border: "1px solid var(--ledger-rule)", padding: "22px 24px" }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "var(--ledger-dim)",
                    marginBottom: 12,
                  }}
                >
                  Aceite da proposta
                </span>
                <p
                  style={{
                    color: "var(--ledger-ink)",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    maxWidth: "62ch",
                    marginBottom: 38,
                  }}
                >
                  Ao assinar, o cliente declara aceite desta proposta nas condições, valores e
                  prazos descritos acima.
                </p>
                <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
                  {[
                    { rotulo: "Assinatura", flex: 2 },
                    { rotulo: "Nome e cargo", flex: 2 },
                    { rotulo: "Data", flex: 1 },
                  ].map((campo) => (
                    <div key={campo.rotulo} style={{ flex: campo.flex, minWidth: 0 }}>
                      <div style={{ borderBottom: "1px solid var(--ledger-dim)", height: 34 }} />
                      <span
                        style={{
                          display: "block",
                          marginTop: 7,
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: "var(--ledger-dim)",
                        }}
                      >
                        {campo.rotulo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <footer style={{ borderTop: "1px solid var(--rule)", paddingTop: 24, marginTop: 24 }}>
        <p style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.05em" }}>
          UKode Labs · Proposta para {briefing.cliente} · emitida em{" "}
          {emissao.toLocaleDateString("pt-BR")} · válida até{" "}
          {validade.toLocaleDateString("pt-BR")}
        </p>
      </footer>
    </main>
  );
}
