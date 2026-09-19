#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const projectPath = path.join(root, "ios/App/App.xcodeproj");
const projectFilePath = path.join(projectPath, "project.pbxproj");
const shouldBuild = process.argv.includes("--build");
const requireSigning = process.argv.includes("--require-signing");
const checks = [];

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
};

const record = (id, description, passed, detail) => {
  checks.push({ id, description, passed: Boolean(passed), detail });
};

record("X-01", "macOS host", process.platform === "darwin", process.platform);
record("X-02", "Xcode project exists", existsSync(projectPath), projectPath);

const developerDir = run("xcode-select", ["-p"]);
record(
  "X-03",
  "Full Xcode developer directory is selected",
  developerDir.ok && developerDir.output.includes(".app/Contents/Developer"),
  developerDir.output || "xcode-select failed",
);

const versionResult = run("xcodebuild", ["-version"]);
const xcodeVersion = versionResult.output.match(/Xcode\s+(\d+(?:\.\d+)*)/)?.[1];
record(
  "X-04",
  "Xcode 26 or newer",
  versionResult.ok && Number.parseInt(xcodeVersion ?? "0", 10) >= 26,
  versionResult.output || "xcodebuild failed",
);

const firstLaunch = run("xcodebuild", ["-checkFirstLaunchStatus"]);
record(
  "X-05",
  "Xcode first-launch components are initialized",
  firstLaunch.ok,
  firstLaunch.ok ? "initialized" : firstLaunch.output,
);

const sdkResult = run("xcodebuild", ["-showsdks"]);
const iosSdk = sdkResult.output.match(/-sdk\s+iphoneos(\d+(?:\.\d+)?)/)?.[1];
record(
  "X-06",
  "iOS 26 SDK or newer",
  sdkResult.ok && Number.parseInt(iosSdk ?? "0", 10) >= 26,
  iosSdk ? `iphoneos${iosSdk}` : sdkResult.output || "iOS SDK not found",
);

const projectResult = run("xcodebuild", [
  "-project",
  projectPath,
  "-disableAutomaticPackageResolution",
  "-list",
]);
record(
  "X-07",
  "App scheme resolves with Swift packages",
  projectResult.ok && /Schemes:[\s\S]*\n\s+App(?:\n|$)/.test(projectResult.output),
  projectResult.ok ? "scheme App" : projectResult.output,
);

const runtimeResult = run("xcrun", ["simctl", "list", "runtimes", "--json"]);
let availableIosRuntimes = [];
if (runtimeResult.ok) {
  try {
    const parsed = JSON.parse(runtimeResult.output);
    availableIosRuntimes = (parsed.runtimes ?? []).filter(
      (runtime) =>
        runtime.isAvailable !== false &&
        typeof runtime.identifier === "string" &&
        runtime.identifier.includes("SimRuntime.iOS-") &&
        Number.parseInt(runtime.version ?? "0", 10) >= 26,
    );
  } catch {
    availableIosRuntimes = [];
  }
}
record(
  "X-08",
  "An iOS 26 or newer Simulator runtime is installed",
  availableIosRuntimes.length > 0,
  availableIosRuntimes.map((runtime) => runtime.name).join(", ") || "none",
);

const signingResult = run("security", ["find-identity", "-v", "-p", "codesigning"]);
const signingIdentityCount = Number.parseInt(
  signingResult.output.match(/(\d+) valid identities found/)?.[1] ?? "0",
  10,
);
const projectFile = existsSync(projectFilePath) ? readFileSync(projectFilePath, "utf8") : "";
const developmentTeams = [
  ...new Set([...projectFile.matchAll(/DEVELOPMENT_TEAM = ([A-Z0-9]+);/g)].map((match) => match[1])),
];
if (requireSigning) {
  record(
    "X-09",
    "A valid Apple code-signing identity is installed",
    signingIdentityCount > 0,
    `${signingIdentityCount} valid identities`,
  );
  record(
    "X-10",
    "An Apple Developer Team is configured",
    developmentTeams.length === 1,
    developmentTeams.join(", ") || "none",
  );
} else {
  console.log(`INFO X-09 ${signingIdentityCount} valid code-signing identities; signing is not required for this gate.`);
  console.log(`INFO X-10 Apple Developer Team: ${developmentTeams.join(", ") || "not configured"}.`);
}

if (shouldBuild) {
  const blockingSetupFailure = checks.some((check) => !check.passed);
  if (blockingSetupFailure) {
    record("X-11", "Unsigned iOS Simulator build", false, "skipped because setup checks failed");
  } else {
    const derivedDataPath = mkdtempSync(path.join(tmpdir(), "rewireperform-xcode-"));
    try {
      const buildResult = run("xcodebuild", [
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
      ]);
      record(
        "X-11",
        "Unsigned iOS Simulator build",
        buildResult.ok,
        buildResult.ok ? "build succeeded" : buildResult.output,
      );
    } finally {
      rmSync(derivedDataPath, { recursive: true, force: true });
    }
  }
}

for (const check of checks) {
  console.log(`${check.passed ? "PASS" : "FAIL"} ${check.id} ${check.description}: ${check.detail}`);
}

const failures = checks.filter((check) => !check.passed);
console.log("");
console.log(`Xcode readiness result: ${checks.length - failures.length}/${checks.length} checks passed.`);

if (failures.length > 0) process.exitCode = 1;
