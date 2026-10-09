# Imagem do Lastro — Next.js standalone + Chromium (pro PDF) + SQLite.
# Funciona em qualquer host com disco persistente: Railway, Fly.io, Render,
# VPS com Docker. Monte um volume em /data e aponte DATA_DIR pra ele.

# Imagem base oficial do Node, puxada do espelho público da AWS em vez do
# Docker Hub: é a mesma imagem, mas sem o limite de downloads anônimos que
# derrubou o build do CI ("429 Too Many Requests") e que também pegaria os
# deploys da VPS.
ARG NODE_IMAGE=public.ecr.aws/docker/library/node:22-bookworm-slim

# ---------- build ----------
FROM ${NODE_IMAGE} AS builder
WORKDIR /app

# better-sqlite3 compila binário nativo no install
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# O build do Next não precisa das chaves reais, mas precisa das variáveis
# existirem para não quebrar em import time.
ENV NEXT_TELEMETRY_DISABLED=1
# A landing é pré-gerada no build, então o endereço da imagem de
# compartilhamento (og:image) fica gravado nela. Sem este argumento, sai
# "localhost:3000" e a prévia no WhatsApp/LinkedIn vem sem imagem. O resto do
# app lê a variável em tempo de execução, do .env.
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN npm run build

# ---------- runtime ----------
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

# Chromium + fontes: sem isso o puppeteer-core não gera o PDF.
# tzdata: as datas da proposta são renderizadas no servidor; sem fuso, uma
# edição às 22h de Brasília sairia com a data do dia seguinte.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium fonts-liberation fonts-dejavu-core ca-certificates tzdata \
  && rm -rf /var/lib/apt/lists/*

# Litestream: backup contínuo do SQLite para S3/R2/B2 (ver docker/entrypoint.sh).
# Versão fixa e checksum conferido contra o checksums.txt oficial da release.
ARG LITESTREAM_VERSION=0.5.17
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && case "$(dpkg --print-architecture)" in \
       amd64) ARQ=x86_64 ;; arm64) ARQ=arm64 ;; \
       *) echo "arquitetura sem build do Litestream: $(dpkg --print-architecture)"; exit 1 ;; \
     esac \
  && DEB="litestream-${LITESTREAM_VERSION}-linux-${ARQ}.deb" \
  && BASE="https://github.com/benbjohnson/litestream/releases/download/v${LITESTREAM_VERSION}" \
  && cd /tmp \
  && curl -fsSLO "${BASE}/${DEB}" \
  && curl -fsSL "${BASE}/checksums.txt" | grep " ${DEB}$" | sha256sum -c - \
  && dpkg -i "${DEB}" && rm -f "${DEB}" \
  && apt-get purge -y curl && apt-get autoremove -y && rm -rf /var/lib/apt/lists/* \
  && litestream version

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium
ENV DATA_DIR=/data
ENV PORT=3000
ENV TZ=America/Sao_Paulo
# O server.js do standalone escuta em HOSTNAME. Dentro do Docker essa
# variável vem preenchida com o id do contêiner, e aí o servidor não atende
# no loopback — que é por onde o Chrome headless imprime o PDF (lib/url).
ENV HOSTNAME=0.0.0.0

# Saída standalone do Next + assets estáticos
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Binário nativo do better-sqlite3 (não vai no standalone)
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY docker/litestream.yml /etc/litestream.yml
COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/lastro-entrypoint

# Usuário sem privilégio: se algo no processo for comprometido, não é root.
# Precisa de pasta pessoal gravável: o Chromium grava ali o perfil e o banco
# do crashpad, e sem ela nem abre ("chrome_crashpad_handler: --database is
# required"). O teste de fumaça do CI pegou isso.
# UID/GID fixos (10001): a pasta de backup montada do host precisa de um dono
# previsível — na VPS, `chown 10001:10001 /var/backups/lastro`.
RUN groupadd --system --gid 10001 lastro \
  && useradd --system --uid 10001 --gid lastro --create-home --home-dir /home/lastro lastro \
  && mkdir -p /data && chown -R lastro:lastro /data /app
ENV HOME=/home/lastro
USER lastro
VOLUME ["/data"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["lastro-entrypoint"]
