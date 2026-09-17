import { describe, expect, test } from "vitest";
import { HttpError } from "./http-error";
import { isBlockedAddress, redactTarget, validateTargetUrl } from "./ssrf";

describe("isBlockedAddress", () => {
  test("blocks loopback, private, link-local, CGNAT, and mapped IPv4", () => {
    expect(isBlockedAddress("127.0.0.1")).toBe(true);
    expect(isBlockedAddress("10.0.0.1")).toBe(true);
    expect(isBlockedAddress("192.168.1.1")).toBe(true);
    expect(isBlockedAddress("169.254.1.1")).toBe(true);
    expect(isBlockedAddress("100.64.0.1")).toBe(true);
    expect(isBlockedAddress("::1")).toBe(true);
    expect(isBlockedAddress("::ffff:127.0.0.1")).toBe(true);
  });

  test("allows public unicast", () => {
    expect(isBlockedAddress("1.1.1.1")).toBe(false);
    expect(isBlockedAddress("8.8.8.8")).toBe(false);
  });
});

describe("validateTargetUrl", () => {
  test("accepts https on 443", () => {
    const target = validateTargetUrl("https://api.openai.com/v1/chat/completions");
    expect(target.hostname).toBe("api.openai.com");
  });

  test("rejects http, userinfo, fragments, and non-443 ports", () => {
    expect(() => validateTargetUrl("http://api.openai.com/v1")).toThrow(HttpError);
    expect(() => validateTargetUrl("https://user:pass@api.openai.com/v1")).toThrow(HttpError);
    expect(() => validateTargetUrl("https://api.openai.com/v1#x")).toThrow(HttpError);
    expect(() => validateTargetUrl("https://api.openai.com:8443/v1")).toThrow(HttpError);
  });

  test("rejects private IP literals", () => {
    expect(() => validateTargetUrl("https://127.0.0.1/")).toThrow(HttpError);
  });
});

describe("redactTarget", () => {
  test("keeps origin and hides path/query", () => {
    expect(redactTarget("https://s3.amazonaws.com/bucket/key?X-Amz-Signature=secret")).toBe(
      "https://s3.amazonaws.com/<redacted>",
    );
  });
});

describe("requestPath", () => {
  test("preserves escaped path and query bytes", () => {
    const target = validateTargetUrl(
      "https://s3.amazonaws.com/bucket/key%2Fpath?X-Amz-Signature=a%2Fb",
    );
    expect(target.requestPath).toBe("/bucket/key%2Fpath?X-Amz-Signature=a%2Fb");
  });
});
