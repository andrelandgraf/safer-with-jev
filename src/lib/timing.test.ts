import { applyTimingHeaders, roundMs } from "./timing";
import { describe, expect, test } from "vitest";

describe("roundMs", () => {
  test("rounds to a non-negative integer millisecond", () => {
    expect(roundMs(12.4)).toBe(12);
    expect(roundMs(12.5)).toBe(13);
    expect(roundMs(-1)).toBe(0);
  });
});

describe("applyTimingHeaders", () => {
  test("sets x-neon-jev-ms only", () => {
    const headers = new Headers();
    applyTimingHeaders(headers, {
      visionMs: 620.4,
      jevMs: 44.5,
      proxyMs: 80.2,
      totalMs: 753.9,
      includeVision: true,
    });
    expect(headers.get("x-neon-jev-ms")).toBe("45");
    expect(headers.get("x-neon-vision-ms")).toBeNull();
    expect(headers.get("x-neon-proxy-ms")).toBeNull();
    expect(headers.get("x-neon-total-ms")).toBeNull();
    expect(headers.get("Server-Timing")).toBeNull();
  });
});
