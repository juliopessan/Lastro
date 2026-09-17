# Imagem do Lastro — Next.js standalone + Chromium (pro PDF) + SQLite.
# Funciona em qualquer host com disco persistente: Railway, Fly.io, Render,
# VPS com Docker. Monte um volume em /data e aponte DATA_DIR pra ele.

# ---------- build ----------
FROM node:22-bookworm-slim AS builder
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
RUN npm run build

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

# Chromium + fontes: sem isso o puppeteer-core não gera o PDF.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium fonts-liberation fonts-dejavu-core ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium
ENV DATA_DIR=/data
ENV PORT=3000

# Saída standalone do Next + assets estáticos
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Binário nativo do better-sqlite3 (não vai no standalone)
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 3000
CMD ["node", "server.js"]
