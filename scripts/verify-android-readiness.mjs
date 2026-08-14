import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const readText = (relativePath) =>
  readFileSync(path.join(root, relativePath), "utf8");

const files = {
  build: readText("android/app/build.gradle"),
  capacitor: readText("capacitor.config.ts"),
  manifest: readText("android/app/src/main/AndroidManifest.xml"),
  package: JSON.parse(readText("package.json")),
  variables: readText("android/variables.gradle"),
  backup: readText("android/app/src/main/res/xml/backup_rules.xml"),
  extraction: readText("android/app/src/main/res/xml/data_extraction_rules.xml"),
  styles: readText("android/app/src/main/res/values/styles.xml"),
};

const failures = [];
const requireText = (label, source, expected) => {
  if (!source.includes(expected)) failures.push(`${label}: missing ${expected}`);
};

requireText("Capacitor app id", files.capacitor, 'appId: "com.rewireperform.app"');
requireText("Capacitor app name", files.capacitor, 'appName: "RewirePerform"');
requireText("Android WebView background", files.capacitor, 'backgroundColor: "#0D0E12"');
requireText("Android mixed-content policy", files.capacitor, "allowMixedContent: false");
requireText("Android bridge policy", files.capacitor, "useLegacyBridge: false");
requireText("Android inset policy", files.capacitor, 'insetsHandling: "disable"');
requireText("Android splash scaling", files.capacitor, 'androidScaleType: "CENTER_CROP"');
requireText("Android launch background", files.styles, "@drawable/launch_background");
requireText(
  "Android window background",
  files.styles,
  '<item name="android:windowBackground">@color/colorPrimaryDark</item>',
);
requireText("Android application id", files.build, 'applicationId "com.rewireperform.app"');
requireText("Android version", files.build, 'versionName "1.1"');
requireText("Android version code", files.build, "versionCode 1");
requireText("Android compile SDK", files.variables, "compileSdkVersion = 36");
requireText("Android target SDK", files.variables, "targetSdkVersion = 36");
requireText("Android minimum SDK", files.variables, "minSdkVersion = 24");

for (const expected of [
  'android:allowBackup="false"',
  'android:usesCleartextTraffic="false"',
  'android:launchMode="singleTask"',
  'android:windowSoftInputMode="adjustResize"',
  'android:autoVerify="true"',
  'android:scheme="https"',
  'android:host="rewireperform.com"',
  'android:path="/auth"',
  'android:path="/join"',
  'android:path="/organization/invite"',
]) {
  requireText("Android manifest", files.manifest, expected);
}

for (const domain of ["root", "file", "database", "sharedpref", "external"]) {
  requireText("Legacy backup exclusion", files.backup, `domain="${domain}"`);
  requireText("Android 12+ extraction exclusion", files.extraction, `domain="${domain}"`);
}

for (const forbiddenPermission of [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.RECORD_AUDIO",
  "android.permission.SCHEDULE_EXACT_ALARM",
  "android.permission.USE_EXACT_ALARM",
]) {
  if (files.manifest.includes(forbiddenPermission)) {
    failures.push(`Android manifest: unexpected permission ${forbiddenPermission}`);
  }
}

for (const dependency of [
  "@capacitor/android",
  "@capacitor/app",
  "@capacitor/cli",
  "@capacitor/core",
  "@capacitor/local-notifications",
]) {
  const version = files.package.dependencies?.[dependency];
  if (!version || !/^\^?8\./.test(version)) {
    failures.push(`package.json: ${dependency} must use Capacitor 8`);
  }
}

const pngSignature = "89504e470d0a1a0a";
const templateHashes = new Set([
  "27ed3603010ebc278f64f8645741ab132ff517abb5308eb9df6c8e42a48956b2",
  "58e78a618778926b1f6d9472a6468de878de8530970934e94aab5ba4ba08cc00",
  "07fa579e1c83e04ba7f9cbcbfcf41b68e15fe3638f2c44a04e58b809103e6b69",
  "5cf98b4451bd99b20df26f9e608a46946118be6b0ae90762f9ca1786a30c76ff",
]);

const verifyPng = (label, relativePath, expectedWidth, expectedHeight, expectedColorType) => {
  const asset = readFileSync(path.join(root, relativePath));
  if (asset.subarray(0, 8).toString("hex") !== pngSignature) {
    failures.push(`${label}: expected a PNG file`);
    return;
  }
  const width = asset.readUInt32BE(16);
  const height = asset.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    failures.push(`${label}: expected ${expectedWidth}x${expectedHeight}, got ${width}x${height}`);
  }
  if (expectedColorType !== undefined && asset.readUInt8(25) !== expectedColorType) {
    failures.push(`${label}: expected PNG color type ${expectedColorType}, got ${asset.readUInt8(25)}`);
  }
  const digest = createHash("sha256").update(asset).digest("hex");
  if (templateHashes.has(digest)) {
    failures.push(`${label}: default Capacitor template artwork must be replaced`);
  }
};

verifyPng("Android launcher icon", "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png", 192, 192);
verifyPng("Android adaptive foreground", "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png", 432, 432, 6);
verifyPng("Android launch symbol", "android/app/src/main/res/drawable-xxxhdpi/splash_logo.png", 768, 768, 6);
verifyPng("Android portrait splash", "android/app/src/main/res/drawable-port-xxxhdpi/splash.png", 1280, 1920);
verifyPng("Android landscape splash", "android/app/src/main/res/drawable-land-xxxhdpi/splash.png", 1920, 1280);

const verifyStorePng = (
  label,
  relativePath,
  expectedWidth,
  expectedHeight,
  expectedColorType,
  maxBytes,
) => {
  const asset = readFileSync(path.join(root, relativePath));
  if (asset.subarray(0, 8).toString("hex") !== pngSignature) {
    failures.push(`${label}: expected a PNG file`);
    return;
  }
  const width = asset.readUInt32BE(16);
  const height = asset.readUInt32BE(20);
  const colorType = asset.readUInt8(25);
  if (width !== expectedWidth || height !== expectedHeight) {
    failures.push(`${label}: expected ${expectedWidth}x${expectedHeight}, got ${width}x${height}`);
  }
  if (colorType !== expectedColorType) {
    failures.push(`${label}: expected PNG color type ${expectedColorType}, got ${colorType}`);
  }
  if (asset.byteLength > maxBytes) {
    failures.push(`${label}: exceeds ${maxBytes} bytes`);
  }
};

verifyStorePng(
  "Google Play app icon",
  "docs/google-play/assets/app-icon-512-rgba.png",
  512,
  512,
  6,
  1024 * 1024,
);
verifyStorePng(
  "Google Play feature graphic",
  "docs/google-play/assets/feature-graphic-1024x500.png",
  1024,
  500,
  2,
  15 * 1024 * 1024,
);

const assetLinks = path.join(root, "public/.well-known/assetlinks.json");
if (existsSync(assetLinks)) {
  const association = readText("public/.well-known/assetlinks.json");
  requireText("Android asset links", association, '"package_name": "com.rewireperform.app"');
  if (/PLACEHOLDER|TODO|SHA256_FINGERPRINT/u.test(association)) {
    failures.push("Android asset links: signing fingerprint placeholder is not allowed");
  }
}

if (failures.length > 0) {
  console.error("Android static readiness checks failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Android static readiness checks passed.");
if (!existsSync(assetLinks)) {
  console.log("Android App Links website association remains gated on the Play signing fingerprint.");
}
