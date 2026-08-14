import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Android native release contract", () => {
  it("uses the Play identity and Android 16 target without changing the iOS build number", () => {
    const build = read("android/app/build.gradle");
    const variables = read("android/variables.gradle");
    const iosProject = read("ios/App/App.xcodeproj/project.pbxproj");

    expect(build).toContain('applicationId "com.rewireperform.app"');
    expect(build).toContain("versionCode 1");
    expect(build).toContain('versionName "1.1"');
    expect(variables).toContain("compileSdkVersion = 36");
    expect(variables).toContain("targetSdkVersion = 36");
    expect(iosProject.match(/CURRENT_PROJECT_VERSION = 6;/g)).toHaveLength(2);
  });

  it("binds only the native auth, athlete invite and coach invite paths to verified HTTPS App Links", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");

    expect(manifest.match(/android:autoVerify="true"/g)).toHaveLength(3);
    expect(manifest.match(/android:scheme="https"/g)).toHaveLength(3);
    expect(manifest.match(/android:host="rewireperform\.com"/g)).toHaveLength(3);
    expect(manifest).toContain('android:path="/auth"');
    expect(manifest).toContain('android:path="/join"');
    expect(manifest).toContain('android:path="/organization/invite"');
    expect(manifest).not.toContain('android:scheme="http"');
  });

  it("fails closed on backup and cleartext without requesting unrelated sensitive permissions", () => {
    const manifest = read("android/app/src/main/AndroidManifest.xml");

    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android:usesCleartextTraffic="false"');
    expect(manifest).not.toContain("android.permission.RECORD_AUDIO");
    expect(manifest).not.toContain("android.permission.ACCESS_FINE_LOCATION");
    expect(manifest).not.toContain("android.permission.USE_EXACT_ALARM");
  });

  it("keeps the Android launch artwork proportional and centered", () => {
    const capacitor = read("capacitor.config.ts");
    const styles = read("android/app/src/main/res/values/styles.xml");
    const launchBackground = read(
      "android/app/src/main/res/drawable/launch_background.xml",
    );

    expect(capacitor).toContain('androidScaleType: "CENTER_CROP"');
    expect(styles).toContain("@drawable/launch_background");
    expect(launchBackground).toContain('android:gravity="center"');
    expect(launchBackground).toContain('android:src="@drawable/splash_logo"');
  });
});
