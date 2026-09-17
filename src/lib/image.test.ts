import { describe, expect, test } from "vitest";
import { inspectImage } from "./image";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

describe("inspectImage", () => {
  test("accepts a static PNG whose MIME matches", () => {
    expect(inspectImage(new Uint8Array(PNG_1X1), "image/png")).toEqual({
      kind: "png",
      mime: "image/png",
    });
  });

  test("rejects MIME mismatch", () => {
    expect(() => inspectImage(new Uint8Array(PNG_1X1), "image/jpeg")).toThrow(/does not match/);
  });

  test("rejects unknown bytes", () => {
    expect(() => inspectImage(new Uint8Array([1, 2, 3, 4]), "image/png")).toThrow(/Only static/);
  });

  test("rejects a truncated PNG that only contains IHDR", () => {
    expect(() => inspectImage(new Uint8Array(PNG_1X1.subarray(0, 33)), "image/png")).toThrow(/truncated/);
  });

  test("rejects a WebP VP8X chunk whose length would stall the parser", () => {
    const bytes = Buffer.alloc(30);
    bytes.write("RIFF", 0);
    bytes.writeUInt32LE(22, 4);
    bytes.write("WEBP", 8);
    bytes.write("VP8X", 12);
    bytes.writeUInt32LE(0xfffffff8, 16);
    expect(() => inspectImage(new Uint8Array(bytes), "image/webp")).toThrow(/truncated|missing dimensions/);
  });
});
