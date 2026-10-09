#!/bin/sh
# Entrada da imagem do Lastro.
#
# Com LITESTREAM_REPLICA_URL definida:
#   1. Se o volume chegou vazio (deploy novo, disco perdido), restaura o banco
#      da réplica antes de o app abrir o arquivo.
#   2. Sobe o servidor como filho do Litestream, que replica cada escrita.
#      Se o servidor cair, o contêiner cai junto e a plataforma reinicia.
#
# Sem ela, sobe só o servidor — e avisa alto, porque aí o banco vive apenas
# no volume, sem cópia fora dele.
set -e

BANCO="${DATA_DIR:-/data}/propostas.db"
CONFIG=/etc/litestream.yml

if [ -n "${LITESTREAM_REPLICA_URL:-}" ]; then
  litestream restore -config "$CONFIG" -if-db-not-exists -if-replica-exists "$BANCO"
  exec litestream replicate -config "$CONFIG" -exec "node server.js"
fi

echo "AVISO: LITESTREAM_REPLICA_URL não definida. O banco está SEM backup externo." >&2
exec node server.js
