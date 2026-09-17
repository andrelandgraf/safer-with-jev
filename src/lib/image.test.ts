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
});
