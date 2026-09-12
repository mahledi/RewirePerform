import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const serviceWorker = readFileSync(resolve(process.cwd(), "src/sw.ts"), "utf8");

describe("visible Android web push notification", () => {
  it("uses persistent, non-silent Android-compatible presentation options", () => {
    expect(serviceWorker).toContain('icon: "/app-icon-192.png"');
    expect(serviceWorker).toContain('badge: "/favicon-64.png"');
    expect(serviceWorker).toContain("renotify: true");
    expect(serviceWorker).toContain("requireInteraction: true");
    expect(serviceWorker).toContain("silent: false");
    expect(serviceWorker).toContain("vibrate: [240, 120, 240]");
  });

  it("keeps each reminder uniquely tagged and clickable to its internal route", () => {
    expect(serviceWorker).toContain("`rewireperform-${data.notificationId}`");
    expect(serviceWorker).toContain("notificationclick");
    expect(serviceWorker).toContain("safeInternalUrl");
    expect(serviceWorker).toContain("appClient.navigate(targetUrl)");
    expect(serviceWorker).toContain("self.clients.openWindow(targetUrl)");
  });
});
