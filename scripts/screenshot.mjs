// Gera o screenshot usado no README (docs/screenshot-dashboard.png).
// Requer: `npm run build && npm run start` rodando em localhost:3000
// (produção, sem o indicador de dev do Next) e o Google Chrome instalado.
import puppeteer from "puppeteer-core";
import path from "path";

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 300)); // fontes/transições

const outPath = path.join(process.cwd(), "docs", "screenshot-dashboard.png");
await page.screenshot({
  path: outPath,
  clip: { x: 0, y: 0, width: 1280, height: 610 },
});

await browser.close();
console.log("salvo em", outPath);
