# Lastro

![Landing page do Lastro](docs/screenshot-landing.png)

A reunião com o cliente novo ninguém delega no começo — é ali que você aprende o jogo, sente a dor de quem tá do outro lado, calibra o preço. Isso, na UKode Labs, continua sendo feito por gente. O problema começa depois: muita agência, muita consultoria, muito prestador de serviço bom demora dias pra mandar a proposta comercial daquela reunião. Não é força de expressão — às vezes são 3, 4 dias, às vezes uma semana, pra entregar um PDF que leva uns 30 minutos de trabalho de verdade pra escrever. Nesse intervalo o cliente esfria, compara com quem respondeu no mesmo dia, ou esquece por que te chamou.

A parte mecânica de montar esse documento também não ajuda: abrir a última proposta parecida, trocar nome de cliente, recalcular os valores, reescrever o resumo executivo pra soar específico daquele projeto, torcer pra não ter esquecido de atualizar um número em algum canto. E quando você usa IA pra acelerar a redação, sobra a dúvida oposta: quais desses números o modelo realmente calculou e quais ele só *parece* ter calculado?

O **Lastro** nasceu pra resolver as duas coisas ao mesmo tempo: tirar o trabalho braçal de montar o documento — e o atraso de dias que ele costuma custar — e deixar explícito, na própria proposta, o que é dado que você digitou e o que é texto que a IA escreveu. O nome é literal — lastro é o que dá respaldo real a alguma coisa, como o lastro de uma moeda. Aqui, todo número da proposta tem lastro no que você preencheu, nunca no que o modelo inventou.

## O que ele faz

1. **`/` é a porta pública** — a landing page do Lastro, sem nenhum dado de cliente. Só tem um botão: "Entrar".
2. **Você entra com a senha do estúdio** em `/login` e cai no painel interno.
3. **Você preenche um briefing estruturado** em `/admin/novo` — cliente, frentes de escopo, itens de investimento, condições de pagamento, recorrência mensal e cronograma. Todo número que importa é digitado por você, não pela IA.
4. **A IA escreve só a narrativa.** Ao enviar o briefing, o `deepseek-flash` recebe apenas o que você preencheu e devolve resumo executivo, uma introdução por frente de escopo, próximos passos e um fechamento — nunca um valor ou prazo novo.
5. **A proposta nasce pronta**, no layout de documento comercial, assinada com a identidade da UKode Labs, e fica salva com link próprio e público em `/propostas/[id]` — é esse link que você manda pro cliente, sem exigir login dele.
6. **Antes de mandar, você pode ajustar qualquer coisa** em `/admin/propostas/[id]/editar` — números do briefing ou o texto que a IA escreveu. A edição é direta e não chama a IA; quando você quiser o texto reescrito a partir do escopo que está na tela, o botão "Atualizar narrativa" faz isso sob demanda, e um selo ao lado da seção diz se a narrativa ainda bate com o escopo atual. Se a proposta já foi assinada, um aviso lembra que editar não desfaz a assinatura — e um botão libera o campo pro cliente assinar de novo, registrando a assinatura antiga como nota no CRM.
7. **Cada item pode ser comparado com o mercado.** Se você marcar a categoria de um item (ex: "Catálogo Digital / E-commerce MVP"), a proposta mostra a faixa de preço de SP/BR ao lado do valor cobrado.
8. **O cliente assina direto na página.** Sem PDF, sem e-mail de ida e volta: ele desenha a assinatura, o sistema grava nome, traço e data/hora — e o status da proposta muda pra "Aceita" sozinho. O PDF anexado traz um campo de assinatura no mesmo desenho do documento — painel escuro, assinatura, nome e cargo, data — pra quem preferir fechar no papel.
9. **Você manda a proposta por e-mail direto do painel**, com um PDF em anexo (gerado a partir da própria página, não de um template separado) e o link pra revisar e assinar — sem sair do navegador pra caçar o e-mail do cliente ou anexar arquivo manualmente.
10. **Você acompanha o funil no CRM** em `/admin/crm` — um board por status (enviada, em negociação, aceita, recusada, perdida) que você arrasta e solta pra qualificar, igual num CRM de mercado. Cada card guarda o contato do cliente (nome, e-mail, telefone), a data do próximo follow-up e um histórico de notas — o e-mail cadastrado já pré-preenche o envio da próxima proposta, sem precisar caçar de novo.
11. **Você recebe um aviso quando o cliente assina** (se configurar `ADMIN_EMAIL`) — um e-mail curto avisando quem assinou e link direto pro painel, sem precisar ficar checando o CRM.
12. **Uma proposta parecida não começa do zero.** O botão "duplicar" no painel clona o briefing inteiro pra edição imediata — troca o cliente e os valores, sem preencher tudo de novo. O rascunho de uma proposta nova também se salva sozinho no navegador (`localStorage`), então fechar a aba sem querer não perde nada.
13. **Proposta vencida não fica invisível.** A validade que você define no briefing vira um aviso em clay no painel e no CRM quando passa do prazo — só enquanto a proposta ainda está em aberto (uma já aceita, recusada ou perdida não "vence" mais).
14. **Você gerencia tudo pelo painel** em `/admin` — busca por cliente, filtro por status, duplicar, excluir, valor total ativo e, discreto no rodapé, quanto cada geração de IA custou de verdade.

## Como funciona

A ideia central do projeto é nunca deixar o texto gerado se disfarçar de dado medido. Isso aparece em três lugares do código:

- **O briefing é a única fonte de números.** `src/lib/types.ts` define o formato do briefing; a IA (`src/lib/ai.ts`) recebe esse JSON, tem instrução explícita pra não inventar valores e devolve só os campos de texto (`resumoExecutivo`, `frentesNarrativa`, `proximosPassos`, `notaFinal`).
- **A proposta renderizada mistura os dois com selo visual diferente.** `src/app/propostas/[id]/page.tsx` mostra os números do briefing dentro de um painel escuro ("ledger") com um selo verde de "medido, não estimado" — e um aviso laranja avisando que os parágrafos ali embaixo foram escritos por IA e merecem revisão antes do envio.
- **O que é bastidor não vai pro cliente, por dois caminhos.** O aviso de revisão, o nome do modelo, o tempo de geração e os caminhos de arquivo do código só renderizam pra quem tem sessão — isso cobre o link que o cliente abre e o PDF do e-mail, que é gerado sem cookie. Mas esses mesmos blocos também levam `no-print`, porque o botão "Imprimir / PDF" imprime a página como ela está: sem isso, um admin logado geraria um PDF com o aviso de IA dentro.
- **Editar é reemitir.** O documento mostra "emitida em" (criação) e, quando houve edição, "revisada em" — e a validade passa a contar da revisão, não da versão que o cliente nunca viu. `dataEmissao`/`dataValidade` em `src/lib/crm.ts` são a única fonte dessa conta, usada tanto pelo documento quanto pelo aviso de "validade vencida" do painel e do CRM, pra que os dois não discordem do prazo. Mexer no CRM (status, nota, contato, assinatura) não conta como revisão: aquilo é controle interno, não uma versão nova da proposta.
- **A coerência entre escopo e narrativa é medida, não presumida.** `src/lib/briefing-hash.ts` calcula um hash do recorte do briefing que a IA realmente enxerga, e a mesma função monta o prompt em `ai.ts` — assim os dois não podem divergir, e mexer num campo que o modelo nunca viu (a validade, por exemplo) não marca o texto como desatualizado à toa. O hash fica em `geracao.briefingHash`; a tela de edição recalcula a cada tecla e vira o selo pra clay quando o escopo muda. Ao salvar, o servidor confere o hash contra o briefing que está sendo gravado de fato, pra nunca guardar um selo verde falso. Proposta gerada antes desse controle não tem hash — aí a tela diz que não dá pra verificar, em vez de afirmar.
- **O custo da geração é real, não estimado.** Cada chamada ao modelo grava `tokensEntrada`/`tokensSaida` retornados pela API e calcula o custo em cima da tabela de preço configurada em `src/lib/pricing.ts` — é esse número que aparece no rodapé do painel.
- **O acesso interno é separado do acesso do cliente.** `src/proxy.ts` intercepta toda rota `/admin/*` e a API de gestão (`/api/proposals/*`, exceto a de assinatura) e exige um cookie de sessão válido — sem sessão, redireciona pro `/login`. A rota pública `/propostas/[id]` e a assinatura nunca passam por essa checagem: o cliente só precisa do link.
- **O status do CRM (`src/lib/crm.ts`) é inferido quando não existe.** Propostas criadas antes do CRM não têm `status` salvo — nesses casos o sistema deduz "aceita" (se tem assinatura) ou "enviada" (se não tem), em vez de exigir uma migração de banco.
- **O arrastar-e-soltar do CRM é HTML5 nativo** (`CrmBoard.tsx`), sem lib de drag-and-drop. Funciona bem em desktop; como a API nativa não cobre toque, o seletor de status ao lado de cada card continua sendo o caminho em celular/tablet.
- **O contato se registra sozinho no primeiro envio.** Mandar uma proposta por e-mail salva `{ nome, email }` no `contato` da proposta (`/api/proposals/[id]/enviar-email`); da próxima vez, o formulário de envio já abre preenchido. Também dá pra cadastrar ou corrigir o contato direto no card do CRM, sem precisar mandar e-mail nenhum.
- **O PDF é a própria página, impressa.** `src/lib/pdf.ts` abre `/propostas/[id]` num Chrome headless (`puppeteer-core`) e usa `page.pdf()` — o mesmo CSS de impressão (`.no-print`, `.only-print`) que já existia pro botão "Imprimir/PDF" da interface. Nenhum layout duplicado numa lib de PDF à parte. O tamanho da folha vem do `@page` do CSS (`preferCSSPageSize`), com margem zero e o respiro como padding do `.wrap`: o Chrome não pinta fundo nas margens do `@page`, então sem isso o papel quente sairia com moldura branca em volta.
- **O e-mail é uma tabela HTML, não um componente React.** Cliente de e-mail não roda CSS custom property, flexbox ou grid — `src/lib/email.ts` monta o HTML na mão, com tudo inline, no mesmo desenho do `emails/proposta-template.html` (esse arquivo é a versão pra colar direto no editor de template do Resend, com `{{merge tags}}` no lugar das variáveis).

```
                        /login ──► cookie de sessão (HMAC, sem banco)
                                          │
                                          ▼
briefing (/admin/novo) ──► POST /api/proposals ──► DeepSeek (só narrativa)
                                          │
                                          ▼
                                  SQLite (data/propostas.db)
                                          │
                                          ▼
                    /propostas/[id]  (medido + gerado + assinatura) ── link público, sem login
```

Persistência é SQLite local via `better-sqlite3` (`src/lib/db.ts`) — sem serviço externo, o arquivo fica em `data/propostas.db`. A tabela de referência de mercado (`src/lib/market-pricing.ts`) é estática, editável direto no código; não vem de nenhuma API.

## Rodando localmente

### 1. Pré-requisitos

- [Node.js](https://nodejs.org) 20 ou mais recente (`node -v` pra conferir)
- Uma chave de API da DeepSeek — crie uma em [platform.deepseek.com](https://platform.deepseek.com), na seção de API Keys

### 2. Clonar e instalar

```bash
git clone https://github.com/juliopessan/Lastro.git
cd Lastro
npm install
```

### 3. Configurar o ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Abra `.env.local` e preencha cada variável:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | sim | Chave da API oficial da DeepSeek (`api.deepseek.com`) |
| `AI_MODEL` | não | Modelo usado na geração — padrão `deepseek-flash` |
| `ADMIN_PASSWORD` | sim | Senha única de acesso ao `/admin`. Escolha algo seu — o valor de exemplo do repositório não deve ir pra produção |
| `SESSION_SECRET` | sim | Segredo usado para assinar o cookie de sessão. Gere um valor aleatório com o comando abaixo |
| `RESEND_API_KEY` | só pra enviar e-mail | Chave da API do [Resend](https://resend.com). Sem ela, tudo funciona menos o botão "Enviar proposta em PDF" |
| `EMAIL_FROM` | não | Remetente, ex: `Lastro <propostas@seudominio.com>`. Sem domínio verificado no Resend, só dá pra mandar pro e-mail da sua própria conta lá |
| `ADMIN_EMAIL` | não | Recebe um aviso quando um cliente assina uma proposta. Sem essa variável, a notificação simplesmente não é enviada — não quebra a assinatura |
| `CHROME_EXECUTABLE_PATH` | não | Caminho do Chrome usado pra gerar o PDF. Padrão assume macOS; em Linux costuma ser `/usr/bin/google-chrome` ou `/usr/bin/chromium` |
| `DATA_DIR` | não | Pasta onde o SQLite é criado. Padrão `./data`. Em produção, aponte pra um volume persistente (veja "Deploy" abaixo) |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) — essa é a landing page pública. Clique em "Entrar", digite o `ADMIN_PASSWORD` que você configurou, e você cai no painel em `/admin`. Na primeira execução, o SQLite é criado sozinho em `data/propostas.db` — não precisa rodar migração nem instalar banco nenhum.

Para gerar sua primeira proposta: `/admin` → **+ Nova proposta** → preencha o briefing → **Gerar proposta**. O link da proposta em `/propostas/[id]` já pode ser aberto por qualquer pessoa, sem login — é esse que você manda pro cliente.

### 5. Build de produção

```bash
npm run build
npm run start
```

### Comandos disponíveis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o servidor de desenvolvimento (Turbopack, hot reload) |
| `npm run build` | Gera o build de produção |
| `npm run start` | Roda o build de produção gerado por `npm run build` |
| `npm run lint` | Roda o ESLint |

## Deploy

O Lastro guarda tudo em SQLite num arquivo — precisa de um host com **disco
persistente**, não de função serverless. Vercel/Netlify não servem sem trocar
o banco por um serviço externo (o disco deles zera a cada deploy). Railway,
Fly.io, Render ou qualquer VPS com Docker funcionam de primeira.

```bash
docker build -t lastro .
docker run -d \
  -p 3000:3000 \
  -v lastro-data:/data \
  --env-file .env.local \
  --name lastro \
  lastro
```

O `Dockerfile` já inclui o Chromium (pro PDF) e compila o `better-sqlite3`
pra a arquitetura da imagem. `DATA_DIR=/data` e `CHROME_EXECUTABLE_PATH` já
vêm configurados nele — o `--env-file` só precisa trazer as chaves de API,
`ADMIN_PASSWORD` e `SESSION_SECRET`. O volume `lastro-data` é o que garante
que as propostas sobrevivem a um redeploy.

Em Railway ou Render: aponte o serviço pra este repositório (eles detectam o
`Dockerfile` sozinhos), anexe um volume persistente em `/data`, e configure
as mesmas variáveis de ambiente do `.env.local` no painel deles.

## Stack

Next.js (App Router, TypeScript) · SQLite via `better-sqlite3` · DeepSeek Flash (API oficial, cliente OpenAI-compatible) · Resend para e-mail · `puppeteer-core` para o PDF · design system Ledger (interno, `src/app/globals.css`) para a interface.

## Limitações conhecidas

A autenticação é uma senha única compartilhada, não contas por pessoa — todo mundo que acessa o `/admin` usa a mesma senha e enxerga as propostas de todo mundo. Está bem pro tamanho atual da UKode Labs; não é o desenho certo se o time crescer e precisar de permissões separadas por pessoa ou cliente.

O aceite em papel não fecha o ciclo. Quem assina pelo quadro impresso do PDF devolve um arquivo que o sistema não lê: não existe assinatura gravada, o status não muda sozinho e o aviso de assinatura não dispara. Nesse caminho você precisa marcar "Aceita" à mão no CRM. Só o aceite feito na página é rastreado ponta a ponta.

O selo de coerência da narrativa responde a mudança de escopo, não a qualidade do texto: ele fica verde quando o texto veio do escopo que está na tela, e não tem como saber se um parágrafo que você reescreveu à mão ficou coerente. Por isso um ajuste manual não devolve o selo ao verde — o que o sistema mede é a origem, e editar à mão não é algo que ele consiga verificar.

A geração de PDF precisa de um Chrome instalado na máquina que roda o servidor — o `Dockerfile` já resolve isso, mas um host serverless como a Vercel não serve sem trocar `puppeteer-core` por uma variante compatível (ex: `@sparticuz/chromium`) e o banco por um serviço externo. Sem domínio verificado no Resend, o envio de e-mail também só funciona pro endereço da sua própria conta lá — verificar um domínio custa uns minutos e libera pra qualquer cliente.
