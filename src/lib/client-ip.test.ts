import { describe, expect, test } from "vitest";
import { clientIp } from "./client-ip";

describe("clientIp", () => {
  test("uses the last X-Forwarded-For hop and ignores spoofed x-real-ip", () => {
    expect(
      clientIp(
        new Headers({
          "x-real-ip": "8.8.8.8",
          "x-forwarded-for": "1.1.1.1, 9.9.9.9",
        }),
      ),
    ).toBe("9.9.9.9");
  });

  test("ignores a spoofed leftmost X-Forwarded-For hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "10.0.0.1, 1.1.1.1" }))).toBe("1.1.1.1");
  });
});
