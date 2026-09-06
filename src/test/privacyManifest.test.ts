import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const privacyManifest = readFileSync(
  resolve(process.cwd(), "ios/App/App/PrivacyInfo.xcprivacy"),
  "utf8",
);

describe("iOS privacy manifest", () => {
  it("excludes crash data but declares retained operational diagnostics", () => {
    expect(privacyManifest).not.toContain(
      "NSPrivacyCollectedDataTypeCrashData",
    );
    expect(privacyManifest).toContain(
      "NSPrivacyCollectedDataTypeOtherDiagnosticData",
    );
  });

  it("declares the optional inquiry phone number and stored age band", () => {
    expect(privacyManifest).toContain("NSPrivacyCollectedDataTypePhoneNumber");
    expect(privacyManifest).toContain("NSPrivacyCollectedDataTypeOtherDataTypes");
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
