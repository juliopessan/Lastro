import { Resend } from "resend";

const DEFAULT_FROM = "Lastro <onboarding@resend.dev>";

function resendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada. Defina no arquivo .env.local.");
  }
  return new Resend(apiKey);
}

// Mesmo layout de emails/proposta-template.html (o template que fica no
// editor HTML do Resend) — só trocando {{chaves}} por variáveis reais.
// Tudo inline, em tabela: é o que sobrevive a clientes de e-mail antigos
// (Outlook incluído), sem CSS custom properties nem flex/grid.
function emailHtml(params: {
  cliente: string;
  tituloProposta: string;
  link: string;
  mensagem?: string;
}) {
  const { cliente, tituloProposta, link, mensagem } = params;
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <title>Proposta comercial</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f2efe8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2efe8;">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
            <tr>
              <td style="padding-bottom: 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:22px; height:22px; background-color:#14140f; text-align:center; vertical-align:middle;">
                      <span style="color:#8fcfa6; font-size:12px; font-weight:700; line-height:22px;">&#10003;</span>
                    </td>
                    <td style="padding-left:10px; font-family: Helvetica, Arial, sans-serif; font-size:16px; font-weight:700; letter-spacing:-0.02em; color:#11110f;">
                      Lastro
                    </td>
                    <td style="padding-left:8px; font-family: 'Courier New', Courier, monospace; font-size:10px; letter-spacing:0.08em; color:#9c988e; text-transform:uppercase;">
                      por UKode Labs
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="border-top:1px solid #d6d2c8; font-size:0; line-height:0;">&nbsp;</td>
            </tr>

            <tr>
              <td style="padding: 28px 0 0; font-family: Helvetica, Arial, sans-serif; font-size:15px; line-height:1.6; color:#11110f;">
                Olá${cliente ? `, ${cliente}` : ""}
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0 0; font-family: Helvetica, Arial, sans-serif; font-size:15px; line-height:1.65; color:#55524b;">
                Segue a proposta comercial <strong style="color:#11110f;">${tituloProposta}</strong>.${
    mensagem ? ` ${mensagem}` : ""
  }
              </td>
            </tr>

            <tr>
              <td style="padding: 32px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color:#11110f;">
                      <a
                        href="${link}"
                        style="display:inline-block; padding:14px 26px; font-family: Helvetica, Arial, sans-serif; font-size:13px; font-weight:500; letter-spacing:0.03em; color:#f2efe8; text-decoration:none;"
                      >
                        Revisar e assinar a proposta &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="background-color:#14140f; padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:24px; vertical-align:top; padding-top:2px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:22px; height:22px; background-color:#8fcfa6; text-align:center; vertical-align:middle;">
                            <span style="color:#14140f; font-size:12px; font-weight:700; line-height:22px;">&#10003;</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding-left:12px; font-family: Helvetica, Arial, sans-serif; font-size:12.5px; line-height:1.55; color:#efece4;">
                      <span style="display:block; font-family: 'Courier New', Courier, monospace; font-size:9.5px; letter-spacing:0.1em; text-transform:uppercase; color:#85817a; margin-bottom:5px;">
                        Medido, não estimado
                      </span>
                      Os valores e prazos desta proposta vêm do briefing preenchido — não foram gerados pela IA.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 20px 0 0; font-family: Helvetica, Arial, sans-serif; font-size:12.5px; line-height:1.6; color:#9c988e;">
                O PDF em anexo é uma cópia desta proposta para os seus registros. A revisão e a assinatura digital são feitas pelo link acima.
              </td>
            </tr>

            <tr>
              <td style="border-top:1px solid #d6d2c8; padding-top:20px; margin-top:12px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;">
                  <tr>
                    <td style="font-family: 'Courier New', Courier, monospace; font-size:10.5px; color:#9c988e; letter-spacing:0.04em;">
                      UKode Labs
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function enviarPropostaPorEmail(params: {
  para: string;
  cliente: string;
  tituloProposta: string;
  link: string;
  mensagem?: string;
  pdf: Buffer;
}) {
  const { para, cliente, tituloProposta, link, mensagem, pdf } = params;
  const resend = resendClient();

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: para,
    subject: `Proposta comercial — ${tituloProposta}`,
    html: emailHtml({ cliente, tituloProposta, link, mensagem }),
    attachments: [
      {
        filename: `${tituloProposta}.pdf`,
        content: pdf,
      },
    ],
  });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

// Aviso pro time quando o cliente assina — best-effort, quem chama não deve
// deixar isso quebrar o fluxo de assinatura se o envio falhar.
export async function avisarAssinatura(params: {
  cliente: string;
  tituloProposta: string;
  nomeSignatario: string;
  linkAdmin: string;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return; // notificação é opcional — sem e-mail configurado, não faz nada

  const { cliente, tituloProposta, nomeSignatario, linkAdmin } = params;
  const resend = resendClient();

  const html = `
    <div style="font-family: Helvetica, Arial, sans-serif; color:#11110f; max-width:480px;">
      <p style="font-family: 'Courier New', Courier, monospace; font-size:11px; letter-spacing:0.08em; color:#4f9c6b; text-transform:uppercase; margin:0 0 12px;">
        ✓ Proposta assinada
      </p>
      <p style="font-size:15px; line-height:1.6;">
        <strong>${nomeSignatario}</strong> (${cliente}) acabou de assinar <strong>${tituloProposta}</strong>.
      </p>
      <p style="margin-top:20px;">
        <a href="${linkAdmin}" style="color:#11110f;">Ver no painel →</a>
      </p>
    </div>
  `;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_FROM,
    to: adminEmail,
    subject: `Assinada: ${tituloProposta}`,
    html,
  });
}
