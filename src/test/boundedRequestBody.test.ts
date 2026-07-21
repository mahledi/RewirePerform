import { describe, expect, it } from "vitest";
import {
  readBoundedRequestText,
  RequestBodyTooLargeError,
} from "../../supabase/functions/_shared/boundedRequestBody";

const requestWithBody = (body: string, contentLength?: string) => new Request(
  "https://rewireperform.test/functions/v1/mahleos-read",
  {
    method: "POST",
    headers: contentLength === undefined ? {} : { "Content-Length": contentLength },
    body,
  },
);

describe("bounded machine request bodies", () => {
  it("returns a body that stays within the byte limit", async () => {
    await expect(readBoundedRequestText(requestWithBody('{"view":"daily_brief"}'), 64))
      .resolves.toBe('{"view":"daily_brief"}');
  });

  it("stops streamed bodies as soon as they cross the limit", async () => {
    await expect(readBoundedRequestText(requestWithBody("x".repeat(65)), 64))
      .rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects an oversized declared content length before reading the body", async () => {
    await expect(readBoundedRequestText(requestWithBody("{}", "4097"), 4096))
      .rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it("rejects malformed content lengths", async () => {
    await expect(readBoundedRequestText(requestWithBody("{}", "invalid"), 4096))
      .rejects.toThrow("invalid_content_length");
  });
});
