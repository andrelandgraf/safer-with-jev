import { describe, expect, test } from "vitest";
import { requestHosts, servesLegacySite } from "./request-host";

function req(url: string, headers?: Record<string, string>): Request {
  return new Request(url, { headers });
}

describe("servesLegacySite", () => {
  test("apex and www keep the newspaper HTML", () => {
    expect(
      servesLegacySite(
        req("https://native.example/", {
          host: "native.example",
          "x-forwarded-host": "safer-with-jev.com",
        }),
      ),
    ).toBe(true);
    expect(
      servesLegacySite(
        req("https://native.example/", {
          host: "native.example",
          "x-forwarded-host": "www.safer-with-jev.com",
        }),
      ),
    ).toBe(true);
  });

  test("api host wins over a spoofed site Host", () => {
    expect(
      servesLegacySite(
        req("https://native.example/", {
          host: "safer-with-jev.com",
          "x-forwarded-host": "api.safer-with-jev.com",
        }),
      ),
    ).toBe(false);
  });

  test("native and localhost are API", () => {
    expect(servesLegacySite(req("https://br-example-gateway.compute.example/"))).toBe(false);
    expect(servesLegacySite(req("http://localhost:3010/"))).toBe(false);
  });
});

describe("requestHosts", () => {
  test("dedupes and strips ports", () => {
    expect(
      requestHosts(
        req("https://native.example:443/", {
          host: "native.example:443",
          "x-forwarded-host": "api.safer-with-jev.com, other.example",
        }),
      ),
    ).toEqual(["api.safer-with-jev.com", "native.example"]);
  });
});
