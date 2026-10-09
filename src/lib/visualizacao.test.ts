import { describe, expect, it } from "vitest";
import { ehRobo } from "./visualizacao";
import { haQuantoTempo, resumoAberturas } from "./tempo";

describe("ehRobo", () => {
  it.each([
    ["WhatsApp/2.24.1 A", true],
    ["facebookexternalhit/1.1", true],
    ["LinkedInBot/1.0", true],
    ["Slackbot-LinkExpanding 1.0", true],
    ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0 Safari/537.36", true],
    ["curl/8.4.0", true],
    [null, true],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1", false],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36", false],
  ])("%s -> robô? %s", (ua, esperado) => {
    expect(ehRobo(ua)).toBe(esperado);
  });
});

describe("tempo relativo", () => {
  const agora = Date.parse("2026-10-09T18:00:00.000Z"); // 15:00 em Brasília

  it.each([
    ["2026-10-09T17:59:30.000Z", "agora há pouco"],
    ["2026-10-09T17:20:00.000Z", "há 40 min"],
    ["2026-10-09T12:30:00.000Z", "hoje às 09:30"],
    ["2026-10-08T15:00:00.000Z", "ontem"],
    ["2026-10-06T18:00:00.000Z", "há 3 dias"],
    ["2026-08-01T18:00:00.000Z", "em 01/08/2026"],
  ])("%s -> %s", (iso, esperado) => {
    expect(haQuantoTempo(iso, agora)).toBe(esperado);
  });

  it("resume as aberturas", () => {
    expect(resumoAberturas(undefined, undefined, agora)).toBe("ainda não aberta");
    expect(resumoAberturas(1, "2026-10-08T15:00:00.000Z", agora)).toBe("aberta 1 vez · ontem");
    expect(resumoAberturas(4, "2026-10-06T18:00:00.000Z", agora)).toBe("aberta 4 vezes · há 3 dias");
  });
});
