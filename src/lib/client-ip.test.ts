import { describe, expect, test } from "vitest";
import { clientIp } from "./client-ip";

describe("clientIp", () => {
  test("prefers x-real-ip over X-Forwarded-For", () => {
    expect(
      clientIp(
        new Headers({
          "x-real-ip": "8.8.8.8",
          "x-forwarded-for": "1.1.1.1, 8.8.8.8",
        }),
      ),
    ).toBe("8.8.8.8");
  });

  test("ignores a spoofed leftmost X-Forwarded-For hop", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "10.0.0.1, 1.1.1.1" }))).toBe("1.1.1.1");
  });
});
