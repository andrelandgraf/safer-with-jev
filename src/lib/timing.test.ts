import { describe, expect, test } from "vitest";
import { applyTimingHeaders, roundMs, serverTimingValue } from "./timing";

describe("roundMs", () => {
  test("rounds to a non-negative integer millisecond", () => {
    expect(roundMs(12.4)).toBe(12);
    expect(roundMs(12.5)).toBe(13);
    expect(roundMs(-1)).toBe(0);
  });
});

describe("serverTimingValue", () => {
  test("emits classify, gateway, and total durations", () => {
    expect(
      serverTimingValue({ classifyMs: 41, gatewayMs: 812, totalMs: 860 }),
    ).toBe("classify;dur=41, gateway;dur=812, total;dur=860");
  });
});

describe("applyTimingHeaders", () => {
  test("sets x-neon-*-ms and Server-Timing", () => {
    const headers = new Headers();
    applyTimingHeaders(headers, {
      classifyMs: 40.6,
      gatewayMs: 800.1,
      totalMs: 850.9,
    });
    expect(headers.get("x-neon-classify-ms")).toBe("41");
    expect(headers.get("x-neon-gateway-ms")).toBe("800");
    expect(headers.get("x-neon-total-ms")).toBe("851");
    expect(headers.get("Server-Timing")).toBe(
      "classify;dur=41, gateway;dur=800, total;dur=851",
    );
  });
});
