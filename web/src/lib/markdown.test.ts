import { describe, expect, test } from "vitest";
import { parseMarkdown } from "./markdown";

describe("parseMarkdown", () => {
  test("parses headings, fences, and links", () => {
    const blocks = parseMarkdown(
      "# Title\n\nUse `curl`.\n\n[Ask](https://safer-with-jev.com/)\n\n```bash\necho hi\n```\n",
    );
    expect(blocks[0]).toEqual({
      kind: "heading",
      level: 1,
      inlines: [{ kind: "text", text: "Title" }],
    });
    expect(blocks[1]).toMatchObject({ kind: "paragraph" });
    expect(blocks[3]).toEqual({ kind: "pre", text: "echo hi" });
  });

  test("rejects an unclosed fence", () => {
    expect(() => parseMarkdown("```\nno close")).toThrow(/Unclosed markdown fence/);
  });
});
