import { afterEach, describe, expect, it, vi } from "vitest";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
} from "@/lib/screenWakeLock";

describe("visualization screen wake lock", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the standard screen lock when the device supports it", async () => {
    const handle = { released: false, release: vi.fn(async () => undefined) };
    const request = vi.fn(async () => handle);
    vi.stubGlobal("navigator", { wakeLock: { request } });

    await expect(requestScreenWakeLock()).resolves.toBe(handle);
    expect(request).toHaveBeenCalledWith("screen");
    await releaseScreenWakeLock(handle);
    expect(handle.release).toHaveBeenCalledOnce();
  });

  it("falls back quietly when unsupported or denied", async () => {
    vi.stubGlobal("navigator", {});
    await expect(requestScreenWakeLock()).resolves.toBeNull();

    vi.stubGlobal("navigator", {
      wakeLock: { request: vi.fn(async () => Promise.reject(new Error("denied"))) },
    });
    await expect(requestScreenWakeLock()).resolves.toBeNull();
  });
});
