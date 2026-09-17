import { describe, expect, test } from "vitest";
import { bearerToken, tokensMatch } from "./auth";

describe("bearerToken", () => {
  test("reads Authorization Bearer", () => {
    const request = new Request("https://example.test/", {
      headers: { Authorization: "Bearer secret-token" },
    });
    expect(bearerToken(request)).toBe("secret-token");
  });

  test("reads x-api-key when Authorization is missing", () => {
    const request = new Request("https://example.test/", {
      headers: { "x-api-key": "header-key" },
    });
    expect(bearerToken(request)).toBe("header-key");
  });
});

describe("tokensMatch", () => {
  test("accepts the expected secret and rejects a different one", () => {
    expect(tokensMatch("abc123", "abc123")).toBe(true);
    expect(tokensMatch("abc123", "abc124")).toBe(false);
    expect(tokensMatch("short", "longer-secret")).toBe(false);
  });
});
