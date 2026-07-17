#!/usr/bin/env node

import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectPath = path.join(root, "ios/App/App.xcodeproj");
const derivedDataPath = mkdtempSync(path.join(tmpdir(), "rewireperform-ios-smoke-"));
const screenshotPath = path.resolve(
  process.env.IOS_SIMULATOR_SCREENSHOT_PATH ?? path.join(tmpdir(), "rewireperform-ios-simulator-smoke.png"),
);
let simulatorId = null;

mkdirSync(path.dirname(screenshotPath), { recursive: true });
rmSync(screenshotPath, { force: true });

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
  const iPhoneTypes = (deviceTypeList.devicetypes ?? []).filter((candidate) => candidate.name?.startsWith("iPhone"));
  const deviceType =
    iPhoneTypes.find((candidate) => /iPhone 1[67] Pro Max/.test(candidate.name)) ??
    iPhoneTypes.find((candidate) => candidate.name.includes("Pro Max")) ??
    iPhoneTypes[0];
  if (!deviceType) throw new Error("S-03 failed: no iPhone simulator device type");
  console.log(`PASS S-04 Device selected: ${deviceType.name}`);

  const createResult = run("xcrun", [
    "simctl",
    "create",
    `RewirePerform QA ${process.pid}`,
    deviceType.identifier,
    runtime.identifier,
  ]);
  requireSuccess("S-05 Ephemeral simulator created", createResult);
  simulatorId = createResult.output.trim().split("\n").at(-1);

  requireSuccess("S-06 Simulator boot requested", run("xcrun", ["simctl", "boot", simulatorId]));
  requireSuccess("S-07 Simulator boot completed", run("xcrun", ["simctl", "bootstatus", simulatorId, "-b"]));

  requireSuccess(
    "S-08 Unsigned app built",
    run("xcodebuild", [
      "-project",
      projectPath,
      "-scheme",
      "App",
      "-configuration",
      "Debug",
      "-destination",
      `id=${simulatorId}`,
      "-derivedDataPath",
      derivedDataPath,
      "-disableAutomaticPackageResolution",
      "CODE_SIGNING_ALLOWED=NO",
      "build",
      "-quiet",
    ]),
  );

  const appPath = path.join(derivedDataPath, "Build/Products/Debug-iphonesimulator/App.app");
  if (!existsSync(appPath)) throw new Error(`S-08 failed: app bundle not found at ${appPath}`);

  requireSuccess("S-09 App installed", run("xcrun", ["simctl", "install", simulatorId, appPath]));
  requireSuccess(
    "S-10 App launched",
    run("xcrun", ["simctl", "launch", "--terminate-running-process", simulatorId, "com.rewireperform.app"]),
  );

  const centerCropPath = path.join(derivedDataPath, "simulator-center.png");
  const launchStartedAt = Date.now();
  let centerCropSize = 0;
  let visibleAfterMs = null;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2_000));
    const screenshotResult = run("xcrun", ["simctl", "io", simulatorId, "screenshot", screenshotPath]);
    if (!screenshotResult.ok || !existsSync(screenshotPath) || statSync(screenshotPath).size < 10_000) {
      throw new Error(`S-11 failed\n${screenshotResult.output}`);
    }

    rmSync(centerCropPath, { force: true });
    const cropResult = run("sips", [
      "--cropToHeightWidth",
      "500",
      "500",
      screenshotPath,
      "--out",
      centerCropPath,
    ]);
    if (!cropResult.ok || !existsSync(centerCropPath)) {
      throw new Error(`S-12 failed\n${cropResult.output}`);
    }

    centerCropSize = statSync(centerCropPath).size;
    if (centerCropSize >= 10_000) {
      visibleAfterMs = Date.now() - launchStartedAt;
      break;
    }
  }

  console.log(`PASS S-11 Simulator screenshot captured: ${screenshotPath}`);
  console.log(`PASS S-12 Screenshot center extracted: ${centerCropSize} bytes`);
  if (visibleAfterMs === null) {
    throw new Error(`S-13 failed: the app surface stayed blank for 20 seconds (${centerCropSize} byte center crop)`);
  }
  console.log(`PASS S-13 App surface became visibly nonblank after ${visibleAfterMs} ms`);
  requireSuccess(
    "S-14 App remained alive through visual verification",
    run("xcrun", ["simctl", "terminate", simulatorId, "com.rewireperform.app"]),
  );

  console.log("");
  console.log(`iOS Simulator smoke test passed. Screenshot: ${screenshotPath}`);
} catch (error) {
  console.error("");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (simulatorId) {
    run("xcrun", ["simctl", "shutdown", simulatorId]);
    run("xcrun", ["simctl", "delete", simulatorId]);
  }
  rmSync(derivedDataPath, { recursive: true, force: true });
}
