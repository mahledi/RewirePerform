import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("on-device speech native contract", () => {
  it("requires local recognition and rejects unsupported devices", () => {
    const source = readProjectFile(
      "plugins/capacitor-on-device-speech/ios/Sources/OnDeviceSpeechPlugin/OnDeviceSpeechPlugin.swift",
    );

    expect(source).toContain("request.requiresOnDeviceRecognition = true");
    expect(source).toContain("guard recognizer.supportsOnDeviceRecognition");
    expect(source).toContain('"ON_DEVICE_UNAVAILABLE"');
    expect(source).not.toContain("URLSession");
  });

  it("describes the same local-only behavior in iOS permissions and privacy copy", () => {
    const infoPlist = readProjectFile("ios/App/App/Info.plist");
    const privacyPage = readProjectFile("src/pages/Privacy.tsx");

    expect(infoPlist).toContain("ausschließlich auf diesem Gerät");
    expect(infoPlist).toContain("Deine Stimme verlässt das Gerät nicht");
    expect(privacyPage).toContain(
      "erfolgt kein automatischer Server-Fallback",
    );
    expect(privacyPage).toMatch(
      /werden\s+nicht zu RewirePerform oder einem Spracherkennungsserver übertragen/,
    );
  });
});
