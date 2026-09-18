import { describe, expect, test } from "vitest";
import { OG_PNG } from "./og-png";
import { faviconResponse, ogPngResponse, robotsResponse, sitemapResponse } from "./static-pages";

describe("og png", () => {
  test("is a PNG", () => {
    expect(OG_PNG.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  });

  test("GET /og.png serves the card", async () => {
    const response = ogPngResponse();
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.equals(OG_PNG)).toBe(true);
  });
});

describe("static pages", () => {
  test("favicon is SVG", async () => {
    const response = faviconResponse();
    expect(response.headers.get("content-type")).toBe("image/svg+xml; charset=utf-8");
    expect(await response.text()).toContain("<svg");
  });

  test("robots points at the sitemap", async () => {
    const body = await robotsResponse().text();
    expect(body).toContain("Sitemap: https://safer-with-jev.com/sitemap.xml");
    expect(body).toContain("Allow: /");
    expect(body).not.toContain("Allow: /ask-jev");
    expect(body).not.toContain("Disallow:");
  });

  test("sitemap lists the homepage only", async () => {
    const body = await sitemapResponse().text();
    expect(body).toContain("<loc>https://safer-with-jev.com/</loc>");
    expect(body).not.toContain("ask-jev");
    expect(body).not.toContain("block-unsafe");
  });
});
