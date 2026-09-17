import { applyTimingHeaders, roundMs, serverTimingValue } from "./timing";
import { describe, expect, test } from "vitest";

describe("roundMs", () => {
  test("rounds to a non-negative integer millisecond", () => {
    expect(roundMs(12.4)).toBe(12);
    expect(roundMs(12.5)).toBe(13);
    expect(roundMs(-1)).toBe(0);
  });
});

describe("serverTimingValue", () => {
  test("omits vision on text routes", () => {
    expect(
      serverTimingValue({
        visionMs: 0,
        jevMs: 45,
        proxyMs: 80,
        totalMs: 130,
        includeVision: false,
      }),
    ).toBe("jev;dur=45, proxy;dur=80, total;dur=130");
  });

  test("includes vision when requested", () => {
    expect(
      serverTimingValue({
        visionMs: 620,
        jevMs: 45,
        proxyMs: 80,
        totalMs: 753,
        includeVision: true,
      }),
    ).toBe("vision;dur=620, jev;dur=45, proxy;dur=80, total;dur=753");
  });
});

describe("applyTimingHeaders", () => {
  test("sets Safer timing headers", () => {
    const headers = new Headers();
    applyTimingHeaders(headers, {
      visionMs: 620.4,
      jevMs: 44.5,
      proxyMs: 80.2,
      totalMs: 753.9,
      includeVision: true,
    });
    expect(headers.get("x-neon-vision-ms")).toBe("620");
    expect(headers.get("x-neon-jev-ms")).toBe("45");
    expect(headers.get("x-neon-proxy-ms")).toBe("80");
    expect(headers.get("x-neon-total-ms")).toBe("754");
  });
});
