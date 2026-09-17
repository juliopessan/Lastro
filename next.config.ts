import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" empacota só o necessário pra rodar em container.
  output: "standalone",
  // better-sqlite3 e puppeteer-core são binários/nativos: precisam ser
  // carregados em tempo de execução, não empacotados pelo bundler.
  serverExternalPackages: ["better-sqlite3", "puppeteer-core"],
};

export default nextConfig;
