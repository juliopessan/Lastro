// Texto da declaração que o cliente marca antes de assinar. Fica num módulo
// separado de lib/assinatura (que usa crypto do Node) para poder ser
// importado também pelo componente do navegador.
//
// O texto marcado vai junto com a assinatura: se um dia ele mudar, cada aceite
// continua registrando exatamente a frase que aquele cliente leu.
export const DECLARACAO_ACEITE =
  "Li esta proposta e aceito o escopo, os valores, os prazos e as condições descritos nela.";
