import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Vercel Web Analytics public-website boundary", () => {
  it("only enables collection through an explicit public-web build flag", () => {
    const source = read("src/main.tsx");

    expect(source).toContain('VITE_WEB_ANALYTICS_ENABLED === "true"');
    expect(source).toContain("!Capacitor.isNativePlatform()");
    expect(source).toContain('<Analytics mode="production" />');
  });

  it("explains the limited, account-separated website measurement", () => {
    const privacy = read("src/pages/Privacy.tsx");

    expect(privacy).toContain("Vercel Web Analytics");
    expect(privacy).toContain("cookie-freie, aggregierte Aufrufstatistiken");
    expect(privacy).toContain("nicht mit RewirePerform-Konten oder Produktdaten verknüpft");
  });
});
