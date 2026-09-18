import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { homepageResponse, renderHomepage, SITE_META } from "./homepage";
import { markdownToHtml } from "./markdown";
import { AGENTS_MARKDOWN } from "./agents-markdown";

const agentsFile = readFileSync(join(process.cwd(), "web/content/AGENTS.md"), "utf8");

describe("web/content/AGENTS.md", () => {
  test("matches the bundled copy", () => {
    expect(AGENTS_MARKDOWN).toBe(agentsFile);
  });

  test("starts with the TypeSafe Jev announcement", () => {
    expect(agentsFile).toContain('first public "System One" class model');
    expect(agentsFile).toContain("not a chat model");
    expect(agentsFile).not.toContain("nextjs-agent-rules");
  });

  test("lists image captioning as a use case without a live route", () => {
    expect(agentsFile).toContain("generate a caption");
    expect(agentsFile).not.toContain("/block-unsafe-images");
  });
});

describe("markdownToHtml", () => {
  test("renders headings, fences, and inline code", () => {
    const html = markdownToHtml("# Title\n\nUse `curl`.\n\n```bash\necho hi\n```\n");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<code>curl</code>");
    expect(html).toContain("<pre><code>echo hi</code></pre>");
  });

  test("escapes HTML in copy and fences", () => {
    const html = markdownToHtml('See <script>alert(1)</script>\n\n```\n<img src=x>\n```\n');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x&gt;");
  });

  test("renders https links and lists", () => {
    const html = markdownToHtml("[Jev](https://safer-with-jev.com)\n\n- one\n- two\n");
    expect(html).toContain('<a href="https://safer-with-jev.com">Jev</a>');
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
  });

  test("rejects an unclosed fence", () => {
    expect(() => markdownToHtml("```\nno close")).toThrow(/Unclosed markdown fence/);
  });
});

describe("homepage", () => {
  test("GET body is HTML for AGENTS.md", async () => {
    const response = homepageResponse(AGENTS_MARKDOWN);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await response.text();
    expect(html).toContain('<main class="site">');
    expect(html).toContain("<h1>Safer with Jev</h1>");
    expect(html).not.toContain("Vol. 1");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
    expect(html).toContain("block-prompt-injections");
    expect(html).toContain("/nice-try?p=");
    expect(html).toContain("/ask-jev?");
    expect(html).toContain("<!doctype html>");
    expect(renderHomepage(AGENTS_MARKDOWN)).toBe(html);
  });

  test("includes title, description, and social tags", async () => {
    const html = await homepageResponse(AGENTS_MARKDOWN).text();
    expect(html).toContain(`<title>${SITE_META.title}</title>`);
    expect(html).toContain(`content="${SITE_META.description}"`);
    expect(html).toContain('property="og:image" content="https://safer-with-jev.com/og.png"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('rel="canonical" href="https://safer-with-jev.com/"');
    expect(html).toContain('name="color-scheme" content="light"');
    expect(html).toContain('content="#cfcbc4"');
    expect(html).toContain("Newsreader");
  });
});
