import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const project = readFileSync(
  resolve(process.cwd(), "ios/App/App.xcodeproj/project.pbxproj"),
  "utf8",
);

describe("V1.3 native release identity", () => {
  it("uses version 1.3 and the planned next build number in every App configuration", () => {
    expect(project.match(/MARKETING_VERSION = 1\.3;/g)).toHaveLength(2);
    expect(project.match(/CURRENT_PROJECT_VERSION = 19;/g)).toHaveLength(2);
    expect(project).toContain('CODE_SIGN_IDENTITY = "Apple Distribution";');
    expect(project).toContain("CODE_SIGN_STYLE = Manual;");
    expect(project).toContain(
      'PROVISIONING_PROFILE_SPECIFIER = "RewirePerform App Store Push 2026-08-30";',
    );
    expect(project).not.toContain("MARKETING_VERSION = 1.0;");
    expect(project).not.toContain("MARKETING_VERSION = 1.2;");
    expect(project).not.toContain("CURRENT_PROJECT_VERSION = 4;");
    expect(project).not.toContain("CURRENT_PROJECT_VERSION = 5;");
    expect(project).not.toContain("CURRENT_PROJECT_VERSION = 6;");
    expect(project).not.toContain("CURRENT_PROJECT_VERSION = 16;");
    expect(project).not.toContain("CURRENT_PROJECT_VERSION = 18;");
  });

  it("keeps the production bundle identifier unchanged", () => {
    expect(project.match(/PRODUCT_BUNDLE_IDENTIFIER = com\.rewireperform\.app;/g)).toHaveLength(2);
  });
});
