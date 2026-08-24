import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("native iOS program-start push V1.2 contract", () => {
  const migration = read("supabase/migrations/20260824080331_native_ios_push_devices_v1_2.sql");
  const client = read("src/lib/nativeRemotePush.ts");
  const edge = read("supabase/functions/send-program-start-notification/index.ts");
  const privacy = read("src/pages/Privacy.tsx");
  const entitlements = read("ios/App/App/App.entitlements");
  const appDelegate = read("ios/App/App/AppDelegate.swift");

  it("stores only an owner-bound iOS delivery token with RLS and deletion cascade", () => {
    expect(migration).toContain("CREATE TABLE public.native_push_devices");
    expect(migration).toContain("REFERENCES auth.users(id) ON DELETE CASCADE");
    expect(migration).toContain("ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain("platform = 'ios'");
  });

  it("never prompts or registers before the existing explicit notification opt-in", () => {
    expect(client).toContain("getNativeReminderPreferences(userId)?.enabled");
    expect(client).toContain("PushNotifications.checkPermissions()");
    expect(client).not.toContain("requestPermissions");
    expect(client).toContain('from("native_push_devices").upsert');
    expect(client).toContain("PushNotifications.unregister()");
  });

  it("delivers the existing program-start copy through APNs without private content", () => {
    expect(edge).toContain('"apns-topic": APNS_BUNDLE_ID');
    expect(edge).toContain('"apns-push-type": "alert"');
    expect(edge).toContain('notificationType: "program_start"');
    expect(edge).toContain('route: "/dashboard"');
    expect(edge).not.toMatch(/journal.*payload/i);
  });

  it("includes Apple's required registration bridge and documents revocation", () => {
    expect(entitlements).toContain("aps-environment");
    expect(appDelegate).toContain("capacitorDidRegisterForRemoteNotifications");
    expect(appDelegate).toContain("capacitorDidFailToRegisterForRemoteNotificationsWithError");
    expect(privacy).toContain("APNs-Gerätetoken");
    expect(privacy).toContain("beim Deaktivieren der Benachrichtigungen oder beim Löschen deines");
  });
});
