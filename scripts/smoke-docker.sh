#!/usr/bin/env bash
# Sobe a imagem do Lastro e confere o caminho de produção de ponta a ponta:
# healthcheck, login, SQLite nativo gravando no volume, página pública da
# proposta e o PDF gerado pela rota real do app, com o Chrome do contêiner
# indo pelo loopback, que só funciona com o HOSTNAME=0.0.0.0 do Dockerfile.
# Roda no CI; localmente, precisa de Docker.
#
#   docker build -t lastro:ci . && scripts/smoke-docker.sh lastro:ci
set -euo pipefail

IMAGEM="${1:-lastro:ci}"
NOME="lastro-smoke"
SENHA="smoke-$(date +%s)"

limpar() { docker rm -f "$NOME" >/dev/null 2>&1 || true; }
trap limpar EXIT
limpar

docker run -d --name "$NOME" -p 3000:3000 \
  -e ADMIN_PASSWORD="$SENHA" -e SESSION_SECRET="smoke-segredo-$RANDOM" \
  "$IMAGEM" >/dev/null

echo "== esperando o healthcheck"
for _ in $(seq 1 40); do
  estado=$(docker inspect -f '{{.State.Health.Status}}' "$NOME")
  [ "$estado" = "healthy" ] && break
  [ "$estado" = "unhealthy" ] && { docker logs "$NOME"; echo "contêiner unhealthy"; exit 1; }
  sleep 3
done
[ "$(docker inspect -f '{{.State.Health.Status}}' "$NOME")" = "healthy" ] || { docker logs "$NOME"; exit 1; }
echo "   healthy"

echo "== processo não roda como root"
[ "$(docker exec "$NOME" id -u)" != "0" ] || { echo "rodando como root"; exit 1; }

echo "== login e rota protegida"
codigo=$(curl -s -o /dev/null -w '%{http_code}' -c /tmp/smoke-jar -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' -d "{\"senha\":\"$SENHA\"}")
[ "$codigo" = "200" ] || { echo "login devolveu $codigo"; exit 1; }
codigo=$(curl -s -o /dev/null -w '%{http_code}' -b /tmp/smoke-jar http://127.0.0.1:3000/admin)
[ "$codigo" = "200" ] || { echo "/admin devolveu $codigo"; exit 1; }

echo "== SQLite nativo grava no volume"
docker exec "$NOME" node -e '
  const Database = require("better-sqlite3");
  const db = new Database(process.env.DATA_DIR + "/propostas.db");
  db.exec("CREATE TABLE IF NOT EXISTS propostas (id TEXT PRIMARY KEY, criado_em TEXT NOT NULL, cliente TEXT NOT NULL, dados TEXT NOT NULL)");
  const p = { id: "smoke", criadoEm: new Date().toISOString(), status: "enviada",
    briefing: { cliente: "Smoke", projetos: "", contexto: "", frentes: [{ titulo: "Frente", itens: [{ descricao: "item" }] }],
      itensInvestimento: [{ modulo: "M", descricao: "d", valor: 1 }], condicoesPagamento: "", recorrencia: [], cronograma: [], validadeDias: 15 },
    gerado: { tituloProposta: "Smoke", resumoExecutivo: "r", frentesNarrativa: [{ titulo: "Frente", introducao: "i" }], proximosPassos: ["p"], notaFinal: "n" },
    geracao: { modelo: "smoke", tokensEntrada: 0, tokensSaida: 0, custoUsd: 0, duracaoMs: 0 } };
  db.prepare("INSERT OR REPLACE INTO propostas VALUES (?,?,?,?)").run(p.id, p.criadoEm, "Smoke", JSON.stringify(p));
'

echo "== página pública da proposta"
codigo=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/propostas/smoke)
[ "$codigo" = "200" ] || { echo "/propostas/smoke devolveu $codigo"; exit 1; }

echo "== PDF pela rota real do app (lib/pdf.ts + endereço interno)"
codigo=$(curl -s -b /tmp/smoke-jar -o /tmp/smoke.pdf -w '%{http_code}' http://127.0.0.1:3000/api/proposals/smoke/pdf)
if [ "$codigo" != "200" ]; then
  echo "rota do PDF devolveu $codigo"; cat /tmp/smoke.pdf; echo; docker logs "$NOME" | tail -30; exit 1
fi
[ "$(head -c 4 /tmp/smoke.pdf)" = "%PDF" ] || { echo "resposta não é PDF"; exit 1; }
tamanho=$(wc -c < /tmp/smoke.pdf | tr -d ' ')
[ "$tamanho" -gt 10000 ] || { echo "PDF pequeno demais: $tamanho bytes"; exit 1; }
echo "   PDF com $tamanho bytes"

echo "OK: imagem pronta para produção"
