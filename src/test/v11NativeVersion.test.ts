import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = readFileSync(
  resolve(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj"),
  "utf8",
);

describe("V1.1 native release identity", () => {
  it("uses version 1.1 and the next unused build number in every App configuration", () => {
    expect(project.match(/MARKETING_VERSION = 1\.1;/g)).toHaveLength(2);
    expect(project.match(/CURRENT_PROJECT_VERSION = 5;/g)).toHaveLength(2);
    expect(project).not.toContain("MARKETING_VERSION = 1.0;");
    expect(project).not.toContain("CURRENT_PROJECT_VERSION = 4;");
  });

  it("keeps the production bundle identifier unchanged", () => {
    expect(project.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.rewireperform\.app;/g)).toHaveLength(2);
  });
});
