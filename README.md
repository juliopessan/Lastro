# Propostas IA — UKode Labs

![Dashboard do sistema de propostas](docs/screenshot-dashboard.png)

Toda proposta comercial que a UKode Labs manda pra um cliente novo começa do mesmo jeito: abrir a última proposta parecida, trocar nome de cliente, recalcular os valores, reescrever o resumo executivo pra soar específico daquele projeto e torcer pra não ter esquecido de atualizar um número em algum canto do documento. Funciona, mas cada proposta rouba uma tarde — e quando você usa IA pra acelerar a redação, sobra a dúvida oposta: quais desses números o modelo realmente calculou e quais ele só *parece* ter calculado?

Este projeto nasceu pra resolver as duas coisas ao mesmo tempo: tirar o trabalho braçal de montar o documento e deixar explícito, na própria proposta, o que é dado que você digitou e o que é texto que a IA escreveu.

## O que ele faz

1. **Você preenche um briefing estruturado** em [`/novo`](http://localhost:3000/novo) — cliente, frentes de escopo, itens de investimento, condições de pagamento, recorrência mensal e cronograma. Todo número que importa é digitado por você, não pela IA.
2. **A IA escreve só a narrativa.** Ao enviar o briefing, o `deepseek-flash` recebe apenas o que você preencheu e devolve resumo executivo, uma introdução por frente de escopo, próximos passos e um fechamento — nunca um valor ou prazo novo.
3. **A proposta nasce pronta**, no layout de documento comercial, assinada com a identidade da UKode Labs, e fica salva com link próprio em `/propostas/[id]`.
4. **Cada item pode ser comparado com o mercado.** Se você marcar a categoria de um item (ex: "Catálogo Digital / E-commerce MVP"), a proposta mostra a faixa de preço de SP/BR ao lado do valor cobrado.
5. **O cliente assina direto na página.** Sem PDF, sem e-mail de ida e volta: ele desenha a assinatura, o sistema grava nome, traço e data/hora.
6. **Você acompanha tudo pelo painel** em `/` — todas as propostas, valor total ativo e, discreto no rodapé, quanto cada geração de IA custou de verdade.

## Como funciona

A ideia central do projeto é nunca deixar o texto gerado se disfarçar de dado medido. Isso aparece em três lugares do código:

- **O briefing é a única fonte de números.** `src/lib/types.ts` define o formato do briefing; a IA (`src/lib/ai.ts`) recebe esse JSON, tem instrução explícita pra não inventar valores e devolve só os campos de texto (`resumoExecutivo`, `frentesNarrativa`, `proximosPassos`, `notaFinal`).
- **A proposta renderizada mistura os dois com selo visual diferente.** `src/app/propostas/[id]/page.tsx` mostra os números do briefing dentro de um painel escuro ("ledger") com um selo verde de "medido, não estimado" — e um aviso laranja avisando que os parágrafos ali embaixo foram escritos por IA e merecem revisão antes do envio.
- **O custo da geração é real, não estimado.** Cada chamada ao modelo grava `tokensEntrada`/`tokensSaida` retornados pela API e calcula o custo em cima da tabela de preço configurada em `src/lib/pricing.ts` — é esse número que aparece no rodapé do painel.

```
briefing (form) ──► POST /api/proposals ──► DeepSeek (só narrativa)
                                 │
                                 ▼
                         SQLite (data/propostas.db)
                                 │
                                 ▼
                    /propostas/[id]  (medido + gerado + assinatura)
```

Persistência é SQLite local via `better-sqlite3` (`src/lib/db.ts`) — sem serviço externo, o arquivo fica em `data/propostas.db`. A tabela de referência de mercado (`src/lib/market-pricing.ts`) é estática, editável direto no código; não vem de nenhuma API.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha DEEPSEEK_API_KEY
npm run dev
```

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | sim | Chave da API oficial da DeepSeek (`api.deepseek.com`) |
| `AI_MODEL` | não | Modelo usado na geração — padrão `deepseek-flash` |

## Stack

Next.js (App Router, TypeScript) · SQLite via `better-sqlite3` · DeepSeek Flash (API oficial, cliente OpenAI-compatible) · design system Ledger (interno, `src/app/globals.css`) para a interface.

## Limitações conhecidas

O sistema roda como app local de uso interno: não tem autenticação, então qualquer pessoa com acesso à máquina (ou à porta 3000, se exposta) vê e cria propostas de qualquer cliente. Serve bem para uso individual da UKode Labs — não é o desenho certo pra virar produto multiusuário sem antes adicionar login e isolamento por conta.
