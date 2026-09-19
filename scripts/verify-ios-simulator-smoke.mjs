#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectPath = path.join(root, "ios/App/App.xcodeproj");
const derivedDataPath = mkdtempSync(path.join(tmpdir(), "rewireperform-ios-smoke-"));
const screenshotBasePath = path.resolve(
  process.env.IOS_SIMULATOR_SCREENSHOT_PATH ?? path.join(tmpdir(), "rewireperform-ios-simulator-smoke.png"),
);
const activeSimulatorIds = new Set();
const capturedScreenshots = [];

mkdirSync(path.dirname(screenshotBasePath), { recursive: true });

const run = (command, args, maxBuffer = 50 * 1024 * 1024) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

const requireSuccess = (label, result) => {
  if (!result.ok) throw new Error(`${label} failed\n${result.output}`);
  console.log(`PASS ${label}${result.output ? `: ${result.output.split("\n").at(-1)}` : ""}`);
};

const parseJson = (label, result) => {
  if (!result.ok) throw new Error(`${label} failed\n${result.output}`);
  console.log(`PASS ${label}`);
  try {
    return JSON.parse(result.output);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const compareVersions = (left, right) => {
  const leftParts = String(left).split(".").map(Number);
  const rightParts = String(right).split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (rightParts[index] ?? 0) - (leftParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};

const targetScreenshotPath = (key) => {
  if (key === "iphone") return screenshotBasePath;
  const extension = path.extname(screenshotBasePath) || ".png";
  const stem = screenshotBasePath.slice(0, screenshotBasePath.length - path.extname(screenshotBasePath).length);
  return `${stem}-${key}${extension}`;
};

const inspectCenterPixels = (label, screenshotPath, centerCropPath, centerBmpPath) => {
  rmSync(centerCropPath, { force: true });
  rmSync(centerBmpPath, { force: true });

  const cropResult = run("sips", [
    "--cropToHeightWidth",
    "500",
    "500",
    screenshotPath,
    "--out",
    centerCropPath,
  ]);
  if (!cropResult.ok || !existsSync(centerCropPath)) {
    throw new Error(`${label} screenshot center extraction failed\n${cropResult.output}`);
  }

  const bmpResult = run("sips", ["-s", "format", "bmp", screenshotPath, "--out", centerBmpPath]);
  if (!bmpResult.ok || !existsSync(centerBmpPath)) {
    throw new Error(`${label} screenshot pixel conversion failed\n${bmpResult.output}`);
  }

  const bitmap = readFileSync(centerBmpPath);
  const pixelOffset = bitmap.readUInt32LE(10);
  const bitsPerPixel = bitmap.readUInt16LE(28);
  const bytesPerPixel = bitsPerPixel / 8;
  if (![3, 4].includes(bytesPerPixel) || pixelOffset >= bitmap.length) {
    throw new Error(`${label} screenshot pixel format unsupported: ${bitsPerPixel} bits`);
  }

  let sampled = 0;
  let darkPixels = 0;
  let brandPixels = 0;
  let luminanceTotal = 0;
  for (let offset = pixelOffset; offset + bytesPerPixel <= bitmap.length; offset += bytesPerPixel * 97) {
    const blue = bitmap[offset];
    const green = bitmap[offset + 1];
    const red = bitmap[offset + 2];
    const luminance = (red * 0.2126) + (green * 0.7152) + (blue * 0.0722);
    luminanceTotal += luminance;
    if (luminance < 235) darkPixels += 1;
    if (green > red + 20 && green > blue + 20 && green > 80) brandPixels += 1;
    sampled += 1;
  }

  const darkPixelRatio = sampled ? darkPixels / sampled : 0;
  const brandPixelRatio = sampled ? brandPixels / sampled : 0;
  const meanLuminance = sampled ? luminanceTotal / sampled : 255;
  return {
    cropSize: statSync(centerCropPath).size,
    darkPixelRatio,
    brandPixelRatio,
    meanLuminance,
    visiblyNonblank: brandPixelRatio >= 0.001,
  };
};

const verifySimulatorTarget = async ({
  key,
  label,
  deviceType,
  runtime,
  appPath,
  uiPreferences = {},
}) => {
  const screenshotPath = targetScreenshotPath(key);
  const centerCropPath = path.join(derivedDataPath, `simulator-center-${key}.png`);
  const centerBmpPath = path.join(derivedDataPath, `simulator-center-${key}.bmp`);
  let simulatorId = null;

  rmSync(screenshotPath, { force: true });
  try {
    const createResult = run("xcrun", [
      "simctl",
      "create",
      `RewirePerform QA ${label} ${process.pid}`,
      deviceType.identifier,
      runtime.identifier,
    ]);
    requireSuccess(`${label} ephemeral simulator created`, createResult);
    simulatorId = createResult.output.trim().split("\n").at(-1);
    activeSimulatorIds.add(simulatorId);

    requireSuccess(`${label} simulator boot requested`, run("xcrun", ["simctl", "boot", simulatorId]));
    requireSuccess(`${label} simulator boot completed`, run("xcrun", ["simctl", "bootstatus", simulatorId, "-b"]));

    for (const [preference, value] of Object.entries(uiPreferences)) {
      requireSuccess(
        `${label} ${preference} set to ${value}`,
        run("xcrun", ["simctl", "ui", simulatorId, preference, value]),
      );
      const readPreference = run("xcrun", ["simctl", "ui", simulatorId, preference]);
      requireSuccess(`${label} ${preference} readback`, readPreference);
      if (readPreference.output.trim() !== value) {
        throw new Error(
          `${label} ${preference} readback mismatch: expected ${value}, received ${readPreference.output.trim()}`,
        );
      }
    }

    if (Object.keys(uiPreferences).length > 0) {
      await new Promise((resolve) => setTimeout(resolve, 25_000));
      console.log(`PASS ${label} accessibility system overlays settled before app launch`);
    }

    requireSuccess(`${label} app installed`, run("xcrun", ["simctl", "install", simulatorId, appPath]));
    requireSuccess(
      `${label} app launched`,
      run("xcrun", ["simctl", "launch", "--terminate-running-process", simulatorId, "com.rewireperform.app"]),
    );

    const launchStartedAt = Date.now();
    let centerInspection = null;
    let visibleAfterMs = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      const screenshotResult = run("xcrun", ["simctl", "io", simulatorId, "screenshot", screenshotPath]);
      if (!screenshotResult.ok || !existsSync(screenshotPath) || statSync(screenshotPath).size < 10_000) {
        throw new Error(`${label} screenshot failed\n${screenshotResult.output}`);
      }

      centerInspection = inspectCenterPixels(label, screenshotPath, centerCropPath, centerBmpPath);
      if (centerInspection.visiblyNonblank) {
        visibleAfterMs = Date.now() - launchStartedAt;
        break;
      }
    }

    console.log(`PASS ${label} simulator screenshot captured: ${screenshotPath}`);
    console.log(
      `PASS ${label} screenshot center inspected: ${centerInspection?.cropSize ?? 0} bytes, `
      + `${((centerInspection?.brandPixelRatio ?? 0) * 100).toFixed(2)}% brand pixels, `
      + `${((centerInspection?.darkPixelRatio ?? 0) * 100).toFixed(1)}% non-white pixels`,
    );
    if (visibleAfterMs === null) {
      throw new Error(
        `${label} app surface stayed visually blank for 20 seconds `
        + `(mean luminance ${(centerInspection?.meanLuminance ?? 255).toFixed(1)})`,
      );
    }
    console.log(`PASS ${label} app surface became visibly nonblank after ${visibleAfterMs} ms`);

    await new Promise((resolve) => setTimeout(resolve, 8_000));
    const stabilizedScreenshot = run("xcrun", ["simctl", "io", simulatorId, "screenshot", screenshotPath]);
    if (!stabilizedScreenshot.ok || !existsSync(screenshotPath) || statSync(screenshotPath).size < 10_000) {
      throw new Error(`${label} stabilized screenshot failed\n${stabilizedScreenshot.output}`);
    }
    const stabilizedInspection = inspectCenterPixels(label, screenshotPath, centerCropPath, centerBmpPath);
    if (!stabilizedInspection.visiblyNonblank) {
      throw new Error(
        `${label} stabilized app surface is visually blank `
        + `(mean luminance ${stabilizedInspection.meanLuminance.toFixed(1)})`,
      );
    }
    console.log(`PASS ${label} stabilized screenshot captured after system overlays settled`);
    requireSuccess(
      `${label} app remained alive through visual verification`,
      run("xcrun", ["simctl", "terminate", simulatorId, "com.rewireperform.app"]),
    );
    capturedScreenshots.push(screenshotPath);
  } finally {
    if (simulatorId) {
      run("xcrun", ["simctl", "shutdown", simulatorId]);
      run("xcrun", ["simctl", "delete", simulatorId]);
      activeSimulatorIds.delete(simulatorId);
    }
  }
};

try {
  const runtimeList = parseJson(
    "S-01 Simulator runtimes resolve",
    run("xcrun", ["simctl", "list", "runtimes", "--json"]),
  );
  const runtime = (runtimeList.runtimes ?? [])
    .filter(
      (candidate) =>
        candidate.isAvailable !== false &&
        candidate.identifier?.includes("SimRuntime.iOS-") &&
        Number.parseInt(candidate.version ?? "0", 10) >= 26,
    )
    .sort((left, right) => compareVersions(left.version, right.version))[0];
  if (!runtime) throw new Error("S-01 failed: no available iOS 26 or newer runtime");
  console.log(`PASS S-02 Runtime selected: ${runtime.name}`);

  const deviceTypeList = parseJson(
    "S-03 Simulator device types resolve",
    run("xcrun", ["simctl", "list", "devicetypes", "--json"]),
  );
  const deviceTypes = deviceTypeList.devicetypes ?? [];
  const iPhoneTypes = deviceTypes.filter((candidate) => candidate.name?.startsWith("iPhone"));
  const iPadTypes = deviceTypes.filter((candidate) => candidate.name?.startsWith("iPad"));
  const iPhoneType =
    iPhoneTypes.find((candidate) => /iPhone 1[67] Pro Max/.test(candidate.name)) ??
    iPhoneTypes.find((candidate) => candidate.name.includes("Pro Max")) ??
    iPhoneTypes[0];
  const iPadType =
    iPadTypes.find((candidate) => /iPad Pro 13-inch/.test(candidate.name) && !candidate.name.includes("16GB")) ??
    iPadTypes.find((candidate) => candidate.name.includes("13-inch")) ??
    iPadTypes[0];
  if (!iPhoneType) throw new Error("S-03 failed: no iPhone simulator device type");
  if (!iPadType) throw new Error("S-03 failed: no iPad simulator device type");
  console.log(`PASS S-04 iPhone selected: ${iPhoneType.name}`);
  console.log(`PASS S-05 iPad selected: ${iPadType.name}`);

  requireSuccess(
    "S-06 Unsigned universal simulator app built",
    run("xcodebuild", [
      "-project",
      projectPath,
      "-scheme",
      "App",
      "-configuration",
      "Debug",
      "-sdk",
      "iphonesimulator",
      "-destination",
      "generic/platform=iOS Simulator",
      "-derivedDataPath",
      derivedDataPath,
      "-disableAutomaticPackageResolution",
      "CODE_SIGNING_ALLOWED=NO",
      "build",
      "-quiet",
    ]),
  );

  const appPath = path.join(derivedDataPath, "Build/Products/Debug-iphonesimulator/App.app");
  if (!existsSync(appPath)) throw new Error(`S-06 failed: app bundle not found at ${appPath}`);

  await verifySimulatorTarget({
    key: "iphone",
    label: iPhoneType.name,
    deviceType: iPhoneType,
    runtime,
    appPath,
  });
  await verifySimulatorTarget({
    key: "ipad",
    label: iPadType.name,
    deviceType: iPadType,
    runtime,
    appPath,
  });
  await verifySimulatorTarget({
    key: "accessibility-iphone",
    label: `${iPhoneType.name} accessibility`,
    deviceType: iPhoneType,
    runtime,
    appPath,
    uiPreferences: {
      appearance: "dark",
      content_size: "accessibility-extra-extra-extra-large",
      increase_contrast: "enabled",
    },
  });
  await verifySimulatorTarget({
    key: "accessibility-ipad",
    label: `${iPadType.name} accessibility`,
    deviceType: iPadType,
    runtime,
    appPath,
    uiPreferences: {
      appearance: "dark",
      content_size: "accessibility-extra-extra-extra-large",
      increase_contrast: "enabled",
    },
  });

  console.log("");
  console.log(`iOS Simulator matrix passed. Screenshots: ${capturedScreenshots.join(", ")}`);
} catch (error) {
  console.error("");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  for (const simulatorId of activeSimulatorIds) {
    run("xcrun", ["simctl", "shutdown", simulatorId]);
    run("xcrun", ["simctl", "delete", simulatorId]);
  }
  rmSync(derivedDataPath, { recursive: true, force: true });
}
