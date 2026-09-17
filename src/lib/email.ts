import { Resend } from "resend";

const DEFAULT_FROM = "Lastro <onboarding@resend.dev>";

function resendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada. Defina no arquivo .env.local.");
  }
  return new Resend(apiKey);
}

function emailHtml(params: {
  cliente: string;
  tituloProposta: string;
  link: string;
  mensagem?: string;
}) {
  const { cliente, tituloProposta, link, mensagem } = params;
  return `
    <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #11110f; max-width: 560px; margin: 0 auto;">
      <p>Olá${cliente ? `, ${cliente}` : ""},</p>
      <p>Segue a proposta comercial <strong>${tituloProposta}</strong>${
    mensagem ? `.</p><p>${mensagem}` : ""
  }.</p>
      <p style="margin: 28px 0;">
        <a href="${link}" style="background:#11110f;color:#f2efe8;padding:12px 20px;text-decoration:none;font-size:14px;display:inline-block;">
          Revisar e assinar a proposta
        </a>
      </p>
      <p style="color:#55524b;font-size:13px;">O PDF em anexo é uma cópia da proposta para seus registros. A revisão e a assinatura digital são feitas pelo link acima.</p>
    </div>
  `;
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
