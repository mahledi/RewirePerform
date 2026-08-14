import { describe, expect, it } from "vitest";
import {
  calculateFirstRunCameraFit,
  FIRST_RUN_SCREEN_HEIGHT,
  FIRST_RUN_SCREEN_WIDTH,
} from "@/lib/firstRunCameraFit";

describe("first-run camera fit", () => {
  it("fits the complete app screen into a short mobile website camera", () => {
    const fit = calculateFirstRunCameraFit({
      viewportWidth: 358,
      viewportHeight: 480,
      reservedBottom: 48,
    });

    expect(FIRST_RUN_SCREEN_WIDTH * fit).toBeLessThanOrEqual(358 - 16);
    expect(FIRST_RUN_SCREEN_HEIGHT * fit).toBeLessThanOrEqual(480 - 48 - 16);
    expect(fit).toBeGreaterThan(0);
    expect(fit).toBeLessThan(1);
  });

  it("never enlarges the app screen beyond its authored size", () => {
    expect(calculateFirstRunCameraFit({ viewportWidth: 900, viewportHeight: 900 })).toBe(1);
  });

  it("keeps the initial render stable before the camera has dimensions", () => {
    expect(calculateFirstRunCameraFit({ viewportWidth: 0, viewportHeight: 0 })).toBe(1);
  });
});
