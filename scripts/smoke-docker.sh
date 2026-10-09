#!/usr/bin/env bash
# Sobe a imagem do Lastro e confere o caminho de produção de ponta a ponta:
# healthcheck, login, SQLite nativo gravando no volume, página pública, o PDF
# gerado pela rota real do app (Chrome do contêiner indo pelo loopback, que só
# funciona com o HOSTNAME=0.0.0.0 do Dockerfile) e o backup do Litestream:
# grava uma proposta, destrói o contêiner e confere que ela volta num volume
# vazio. Roda no CI; localmente, precisa de Docker.
#
#   docker build -t lastro:ci . && scripts/smoke-docker.sh lastro:ci
set -euo pipefail

IMAGEM="${1:-lastro:ci}"
SENHA="smoke-$(date +%s)"
SEGREDO="smoke-segredo-$RANDOM"
REPLICA="$(mktemp -d)"
chmod 777 "$REPLICA"

limpar() { docker rm -f lastro-smoke lastro-backup-a lastro-backup-b >/dev/null 2>&1 || true; }
trap limpar EXIT
limpar

# subir NOME PORTA [args extras do docker run...]
subir() {
  local nome="$1" porta="$2"; shift 2
  docker run -d --name "$nome" -p "$porta:3000" \
    -e ADMIN_PASSWORD="$SENHA" -e SESSION_SECRET="$SEGREDO" "$@" "$IMAGEM" >/dev/null
  for _ in $(seq 1 40); do
    local estado
    estado=$(docker inspect -f '{{.State.Health.Status}}' "$nome" 2>/dev/null || echo "sumiu")
    [ "$estado" = "healthy" ] && return 0
    if [ "$estado" = "unhealthy" ] || [ "$estado" = "sumiu" ]; then break; fi
    sleep 3
  done
  echo "$nome não ficou saudável"; docker logs "$nome" 2>&1 | tail -40; exit 1
}

# inserir_proposta CONTAINER ID — grava direto no SQLite de dentro do contêiner.
inserir_proposta() {
  docker exec -e ID="$2" "$1" node -e '
    const Database = require("better-sqlite3");
    const db = new Database(process.env.DATA_DIR + "/propostas.db");
    db.pragma("journal_mode = WAL");
    db.exec("CREATE TABLE IF NOT EXISTS propostas (id TEXT PRIMARY KEY, criado_em TEXT NOT NULL, cliente TEXT NOT NULL, dados TEXT NOT NULL)");
    const id = process.env.ID;
    const p = { id, criadoEm: new Date().toISOString(), status: "enviada",
      briefing: { cliente: "Smoke", projetos: "", contexto: "", frentes: [{ titulo: "Frente", itens: [{ descricao: "item" }] }],
        itensInvestimento: [{ modulo: "M", descricao: "d", valor: 1 }], condicoesPagamento: "", recorrencia: [], cronograma: [], validadeDias: 15 },
      gerado: { tituloProposta: "Smoke " + id, resumoExecutivo: "r", frentesNarrativa: [{ titulo: "Frente", introducao: "i" }], proximosPassos: ["p"], notaFinal: "n" },
      geracao: { modelo: "smoke", tokensEntrada: 0, tokensSaida: 0, custoUsd: 0, duracaoMs: 0 } };
    db.prepare("INSERT OR REPLACE INTO propostas VALUES (?,?,?,?)").run(id, p.criadoEm, "Smoke", JSON.stringify(p));
    db.close();
  '
}

status_de() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# ---------------------------------------------------------------------------
echo "== [app] sobe sem backup configurado"
subir lastro-smoke 3000
docker logs lastro-smoke 2>&1 | grep -q "SEM backup externo" || { echo "faltou o aviso de banco sem backup"; exit 1; }
echo "   saudável, e avisa que está sem backup"

echo "== [app] processo não roda como root"
[ "$(docker exec lastro-smoke id -u)" != "0" ] || { echo "rodando como root"; exit 1; }

echo "== [app] login e rota protegida"
[ "$(status_de -c /tmp/smoke-jar -X POST http://127.0.0.1:3000/api/auth/login \
  -H 'Content-Type: application/json' -d "{\"senha\":\"$SENHA\"}")" = "200" ] || { echo "login falhou"; exit 1; }
[ "$(status_de -b /tmp/smoke-jar http://127.0.0.1:3000/admin)" = "200" ] || { echo "/admin falhou"; exit 1; }

echo "== [app] SQLite nativo grava no volume e a página pública abre"
inserir_proposta lastro-smoke smoke
[ "$(status_de http://127.0.0.1:3000/propostas/smoke)" = "200" ] || { echo "página pública falhou"; exit 1; }

echo "== [app] PDF pela rota real do app (lib/pdf.ts + endereço interno)"
codigo=$(curl -s -b /tmp/smoke-jar -o /tmp/smoke.pdf -w '%{http_code}' http://127.0.0.1:3000/api/proposals/smoke/pdf)
if [ "$codigo" != "200" ]; then
  echo "rota do PDF devolveu $codigo"; cat /tmp/smoke.pdf; echo; docker logs lastro-smoke 2>&1 | tail -30; exit 1
fi
[ "$(head -c 4 /tmp/smoke.pdf)" = "%PDF" ] || { echo "resposta não é PDF"; exit 1; }
tamanho=$(wc -c < /tmp/smoke.pdf | tr -d ' ')
[ "$tamanho" -gt 10000 ] || { echo "PDF pequeno demais: $tamanho bytes"; exit 1; }
echo "   PDF com $tamanho bytes"
docker rm -f lastro-smoke >/dev/null

# ---------------------------------------------------------------------------
echo "== [backup] contêiner A replica cada escrita"
subir lastro-backup-a 3001 -e LITESTREAM_REPLICA_URL=file:///replica/lastro -v "$REPLICA:/replica"
inserir_proposta lastro-backup-a sobrevivente
# O Litestream sincroniza a cada segundo; espera a réplica receber a escrita.
for _ in $(seq 1 20); do
  [ -n "$(find "$REPLICA" -type f 2>/dev/null | head -1)" ] && break
  sleep 1
done
sleep 3
[ -n "$(find "$REPLICA" -type f | head -1)" ] || { echo "réplica vazia"; docker logs lastro-backup-a 2>&1 | tail -30; exit 1; }
echo "   réplica com $(find "$REPLICA" -type f | wc -l | tr -d ' ') arquivo(s)"

echo "== [backup] destrói A; contêiner B nasce com volume vazio e restaura"
docker rm -f lastro-backup-a >/dev/null
subir lastro-backup-b 3001 -e LITESTREAM_REPLICA_URL=file:///replica/lastro -v "$REPLICA:/replica"
[ "$(status_de http://127.0.0.1:3001/propostas/sobrevivente)" = "200" ] || {
  echo "a proposta não voltou depois da restauração"; docker logs lastro-backup-b 2>&1 | tail -30; exit 1;
}
echo "   proposta restaurada no contêiner novo"

echo "OK: imagem pronta para produção"
