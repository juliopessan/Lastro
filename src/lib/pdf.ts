import puppeteer from "puppeteer-core";

// Gera o PDF renderizando a própria página pública da proposta — o mesmo
// HTML/CSS que o cliente vê, sem duplicar o layout numa lib de PDF separada.
// Requer um Chrome instalado; o caminho pode ser configurado via
// CHROME_EXECUTABLE_PATH (útil em servidores Linux ou hosts serverless).
export async function gerarPdfProposta(url: string): Promise<Buffer> {
  const executablePath =
    process.env.CHROME_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
