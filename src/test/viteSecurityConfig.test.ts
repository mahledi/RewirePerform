import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const viteConfig = readFileSync(
  resolve(process.cwd(), "vite.config.ts"),
  "utf8",
);

describe("Vite development server security", () => {
  it("binds to loopback unless a developer explicitly opts into another host", () => {
    expect(viteConfig).toContain(
      'env.DEV_SERVER_HOST?.trim() || "127.0.0.1"',
    );
    expect(viteConfig).not.toMatch(/host:\s*["']::["']/);
    expect(viteConfig).not.toMatch(/host:\s*true/);
  });
});
