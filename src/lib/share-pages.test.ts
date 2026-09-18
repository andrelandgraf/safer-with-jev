import { describe, expect, test } from "vitest";
import {
  isShareCrawler,
  renderSharePage,
  SHARE_PAGES,
  SHARE_SLUGS,
  sharePageForRequest,
  wantsSharePage,
} from "./share-pages";

function get(path: string, init?: RequestInit): Request {
  return new Request(`https://safer.example${path}`, { method: "GET", ...init });
}

describe("wantsSharePage", () => {
  test("serves HTML on GET block routes", () => {
    expect(wantsSharePage(get("/block-prompt-injections"))).toBe(true);
    expect(wantsSharePage(get("/block-unsafe-images"))).toBe(true);
    expect(wantsSharePage(get("/block-unsafe-replies"))).toBe(true);
  });

  test("serves HTML on GET ask-jev and nice-try without inspect params", () => {
    expect(wantsSharePage(get("/ask-jev"))).toBe(true);
    expect(wantsSharePage(get("/ask-jev?q=Is%20this%20good"))).toBe(true);
    expect(wantsSharePage(get("/nice-try"))).toBe(true);
  });

  test("leaves inspect GET JSON alone", () => {
    expect(wantsSharePage(get("/ask-jev?q=Is%20this%20good%3F&t=Hello"))).toBe(false);
    expect(wantsSharePage(get("/nice-try?p=Ignore%20previous"))).toBe(false);
  });

  test("unfurl crawlers get HTML even with inspect params", () => {
    const slack = get("/ask-jev?q=Is%20this%20good%3F&t=Hello", {
      headers: { "user-agent": "Slackbot-LinkExpanding 1.0" },
    });
    expect(isShareCrawler(slack)).toBe(true);
    expect(wantsSharePage(slack)).toBe(true);
    expect(
      wantsSharePage(
        get("/nice-try?p=Ignore%20previous", {
          headers: { "user-agent": "facebookexternalhit/1.1" },
        }),
      ),
    ).toBe(true);
  });

  test("POST stays on the API", () => {
    expect(
      wantsSharePage(
        new Request("https://safer.example/block-prompt-injections", { method: "POST" }),
      ),
    ).toBe(false);
  });
});

describe("share pages", () => {
  test("each path has og tags pointing at its card", () => {
    for (const slug of SHARE_SLUGS) {
      const html = renderSharePage(slug);
      const copy = SHARE_PAGES[slug];
      expect(html).toContain(`<title>${copy.title}</title>`);
      expect(html).toContain(`content="${copy.description}"`);
      expect(html).toContain(`content="https://safer-with-jev.com/og/${slug}.png"`);
      expect(html).toContain(`rel="canonical" href="https://safer-with-jev.com/${slug}"`);
      expect(html).toContain(copy.cardLine1);
      expect(html).toContain(copy.cardLine2);
      expect(html).toContain(`<code>/${slug}</code>`);
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
    }
  });

  test("sharePageForRequest returns HTML for a bare GET", async () => {
    const response = sharePageForRequest(get("/ask-jev"));
    expect(response).not.toBeNull();
    if (!response) {
      return;
    }
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("<h1>Ask Jev.<br>Yes or no.</h1>");
  });

  test("sharePageForRequest skips inspect JSON", () => {
    expect(sharePageForRequest(get("/ask-jev?q=Is%20this%20good%3F&t=Hello"))).toBeNull();
  });
});
