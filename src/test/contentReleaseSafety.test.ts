import { describe, expect, it } from "vitest";
import { getDailyContent } from "@/content/dailyContent";

describe("release content safety", () => {
  it("keeps placeholders out of every resolved program day", () => {
    for (let dayNumber = 1; dayNumber <= 56; dayNumber += 1) {
      const content = getDailyContent(dayNumber);
      expect(content, `day ${dayNumber}`).not.toBeNull();

      const serialized = JSON.stringify(content);
      expect(serialized, `day ${dayNumber}`).not.toMatch(
        /\[TODO|TODO Content|Lorem ipsum|\[object Object\]|\bundefined\b/i,
      );
    }
  });
});
