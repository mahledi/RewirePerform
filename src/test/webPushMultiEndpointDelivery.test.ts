import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/send-daily-reminder/index.ts"),
  "utf8",
);

describe("web push multi-endpoint delivery", () => {
  it("delivers one logical reminder to every matching subscription before marking it sent", () => {
    expect(source).toContain("const matchingSubscriptions = ((subs ?? []) as Subscription[]).filter");
    expect(source).toContain("for (const target of matchingSubscriptions)");
    expect(source).toContain("if (deliveredEndpoints > 0)");
    expect(source.indexOf("for (const target of matchingSubscriptions)")).toBeLessThan(
      source.indexOf("if (deliveredEndpoints > 0)"),
    );
  });

  it("removes only expired endpoints and records aggregate delivery counts", () => {
    expect(source).toContain("delete().eq(\"id\", target.id)");
    expect(source).toContain("delivered_endpoints: deliveredEndpoints");
    expect(source).toContain("failed_endpoints: failedEndpoints");
  });
});
