import { describe, expect, test } from "vitest";
import {
  assertPutSignedHeaders,
  connectionWouldDropRequired,
  filterUpstreamResponseHeaders,
  outboundModelHeaders,
  outboundPutHeaders,
} from "./headers";

describe("outboundModelHeaders", () => {
  test("strips hop-by-hop, cookies, and inbound Host; sets origin Host", () => {
    const inbound = new Headers({
      authorization: "Bearer sk-test",
      "content-type": "application/json",
      host: "safer.example",
      cookie: "session=1",
      connection: "keep-alive",
      "openai-organization": "org_123",
      "x-custom": "yes",
    });
    const outbound = outboundModelHeaders(inbound, "api.openai.com", 12);
    expect(outbound.get("authorization")).toBe("Bearer sk-test");
    expect(outbound.get("openai-organization")).toBe("org_123");
    expect(outbound.get("x-custom")).toBe("yes");
    expect(outbound.get("Host")).toBe("api.openai.com");
    expect(outbound.get("Content-Length")).toBe("12");
    expect(outbound.get("cookie")).toBeNull();
    expect(outbound.get("connection")).toBeNull();
  });

  test("strips Connection-nominated headers", () => {
    const inbound = new Headers({
      authorization: "Bearer sk-test",
      "content-type": "application/json",
      connection: "X-Do-Not-Forward",
      "x-do-not-forward": "nope",
    });
    const outbound = outboundModelHeaders(inbound, "example.com", 1);
    expect(outbound.get("x-do-not-forward")).toBeNull();
  });
});

describe("connectionWouldDropRequired", () => {
  test("detects Connection nominating Authorization", () => {
    expect(
      connectionWouldDropRequired(
        new Headers({ connection: "Authorization", authorization: "Bearer x" }),
      ),
    ).toBe(true);
  });
});

describe("outboundPutHeaders", () => {
  test("only host, content-type, content-length", () => {
    const outbound = outboundPutHeaders("image/png", "s3.amazonaws.com", 99);
    expect([...outbound.keys()].sort()).toEqual([
      "content-length",
      "content-type",
      "host",
    ]);
  });
});

describe("assertPutSignedHeaders", () => {
  test("allows host and content-type", () => {
    expect(() =>
      assertPutSignedHeaders("?X-Amz-SignedHeaders=host%3Bcontent-type"),
    ).not.toThrow();
  });

  test("rejects checksum signed headers", () => {
    expect(() => assertPutSignedHeaders("?X-Amz-SignedHeaders=host;x-amz-checksum-crc32")).toThrow(
      /cannot forward/,
    );
  });
});

describe("filterUpstreamResponseHeaders", () => {
  test("drops Location, Set-Cookie, and x-neon-* from upstream", () => {
    const upstream = new Headers({
      "content-type": "application/json",
      location: "https://evil.example",
      "set-cookie": "a=1",
      "x-neon-action": "spoof",
      "x-ratelimit-remaining": "9",
    });
    const filtered = filterUpstreamResponseHeaders(upstream);
    expect(filtered.get("content-type")).toBe("application/json");
    expect(filtered.get("x-ratelimit-remaining")).toBe("9");
    expect(filtered.get("location")).toBeNull();
    expect(filtered.get("set-cookie")).toBeNull();
    expect(filtered.get("x-neon-action")).toBeNull();
  });
});
