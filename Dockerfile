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
# tzdata: as datas da proposta são renderizadas no servidor; sem fuso, uma
# edição às 22h de Brasília sairia com a data do dia seguinte.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium fonts-liberation fonts-dejavu-core ca-certificates tzdata \
  && rm -rf /var/lib/apt/lists/*

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

# Usuário sem privilégio: se algo no processo for comprometido, não é root.
RUN groupadd --system lastro && useradd --system --gid lastro --no-create-home lastro \
  && mkdir -p /data && chown -R lastro:lastro /data /app
USER lastro
VOLUME ["/data"]

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
