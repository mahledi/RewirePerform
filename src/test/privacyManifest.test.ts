import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const privacyManifest = readFileSync(
  resolve(process.cwd(), "ios/App/App/PrivacyInfo.xcprivacy"),
  "utf8",
);

describe("iOS privacy manifest", () => {
  it("declares only the diagnostics collected by the final app", () => {
    expect(privacyManifest).not.toContain(
      "NSPrivacyCollectedDataTypeCrashData",
    );
    expect(privacyManifest).toContain(
      "NSPrivacyCollectedDataTypeOtherDiagnosticData",
    );
  });

  it("does not declare cross-app tracking", () => {
    expect(privacyManifest).toMatch(
      /<key>NSPrivacyTracking<\/key>\s*<false\/>/,
    );
    expect(privacyManifest).toMatch(
      /<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/,
    );
  });
});
