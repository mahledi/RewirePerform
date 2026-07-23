import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const files = {
  capacitor: readText("capacitor.config.ts"),
  info: readText("ios/App/App/Info.plist"),
  privacy: readText("ios/App/App/PrivacyInfo.xcprivacy"),
  project: readText("ios/App/App.xcodeproj/project.pbxproj"),
  nativeShell: readText("src/lib/nativeApp.ts"),
  nativeNotifications: readText("src/lib/nativeNotifications.ts"),
  nativeNotificationRouter: readText("src/components/notifications/NativeNotificationRouter.tsx"),
  package: JSON.parse(readText("package.json")),
};

const failures = [];
const requireText = (label, source, expected) => {
  if (!source.includes(expected)) failures.push(`${label}: missing ${expected}`);
};

requireText("Capacitor app id", files.capacitor, 'appId: "com.rewireperform.app"');
requireText("Capacitor app name", files.capacitor, 'appName: "RewirePerform"');
requireText("Capacitor hostname", files.capacitor, 'hostname: "rewireperform.com"');
requireText("Status bar config", files.capacitor, 'style: "LIGHT"');
requireText("Native status bar", files.nativeShell, "Style.Light");
requireText("Local notification config", files.capacitor, "LocalNotifications:");
requireText("Local notification planner", files.nativeNotifications, "MAX_PRE_TRAINING_NOTIFICATIONS = 56");
requireText("Local notification routing", files.nativeNotificationRouter, '"/pre-training"');

for (const key of [
  "NSMicrophoneUsageDescription",
  "NSSpeechRecognitionUsageDescription",
]) {
  requireText("Info.plist", files.info, `<key>${key}</key>`);
}
if (!/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\s*\/>/.test(files.info)) {
  failures.push("Info.plist: ITSAppUsesNonExemptEncryption must be false");
}
requireText("Info.plist architecture", files.info, "<string>arm64</string>");
if (files.info.includes("<string>armv7</string>")) {
  failures.push("Info.plist architecture: obsolete armv7 requirement remains");
}

for (const dataType of [
  "NSPrivacyCollectedDataTypeName",
  "NSPrivacyCollectedDataTypeEmailAddress",
  "NSPrivacyCollectedDataTypeUserID",
  "NSPrivacyCollectedDataTypeHealth",
  "NSPrivacyCollectedDataTypeFitness",
  "NSPrivacyCollectedDataTypeOtherUserContent",
  "NSPrivacyCollectedDataTypeCustomerSupport",
  "NSPrivacyCollectedDataTypeProductInteraction",
  "NSPrivacyCollectedDataTypeOtherDiagnosticData",
]) {
  requireText("Privacy manifest", files.privacy, `<string>${dataType}</string>`);
}
if (files.privacy.includes("<string>NSPrivacyCollectedDataTypeCrashData</string>")) {
  failures.push("Privacy manifest: Crash Data must remain absent while the app ships no crash collector");
}
if (!/<key>NSPrivacyTracking<\/key>\s*<false\s*\/>/.test(files.privacy)) {
  failures.push("Privacy manifest: NSPrivacyTracking must be false");
}
requireText("Privacy manifest resource", files.project, "PrivacyInfo.xcprivacy in Resources");
requireText("Bundle id", files.project, "PRODUCT_BUNDLE_IDENTIFIER = com.rewireperform.app;");

for (const dependency of [
  "@capacitor/cli",
  "@capacitor/core",
  "@capacitor/ios",
  "@capacitor/local-notifications",
]) {
  const version = files.package.dependencies?.[dependency];
  if (!version || !/^\^?8\./.test(version)) {
    failures.push(`package.json: ${dependency} must use Capacitor 8`);
  }
}

const pngSignature = "89504e470d0a1a0a";
const verifyPng = (label, relativePath, expectedWidth, expectedHeight, rejectAlpha = false) => {
  const icon = readFileSync(path.join(root, relativePath));
  if (icon.subarray(0, 8).toString("hex") !== pngSignature) {
    failures.push(`${label}: expected a PNG file`);
    return;
  }
  const width = icon.readUInt32BE(16);
  const height = icon.readUInt32BE(20);
  const colorType = icon[25];
  if (width !== expectedWidth || height !== expectedHeight) {
    failures.push(`${label}: expected ${expectedWidth}x${expectedHeight}, got ${width}x${height}`);
  }
  if (
    rejectAlpha &&
    (colorType === 4 || colorType === 6 || icon.includes(Buffer.from("tRNS")))
  ) {
    failures.push(`${label}: alpha channel is not allowed`);
  }
};

verifyPng(
  "App icon",
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  1024,
  1024,
  true,
);
verifyPng("PWA icon", "public/app-icon-192.png", 192, 192);
verifyPng("PWA icon", "public/app-icon-512.png", 512, 512);

if (failures.length > 0) {
  console.error("App Store static readiness checks failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("App Store static readiness checks passed.");
