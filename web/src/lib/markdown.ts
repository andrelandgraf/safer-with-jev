export type Inline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "link"; text: string; href: string };

export type Block =
  | { kind: "heading"; level: 1 | 2 | 3; inlines: Inline[] }
  | { kind: "paragraph"; inlines: Inline[] }
  | { kind: "list"; items: Inline[][] }
  | { kind: "pre"; text: string }
  | { kind: "hr" };

const INLINE_TOKEN =
  /(`[^`]+`|\[[^\]]+\]\((?:https:\/\/[^)\s]+|\/[^)\s]+)\)|\*\*[^*]+\*\*)/g;

function parseInlines(text: string): Inline[] {
  const parts = text.split(INLINE_TOKEN);
  const inlines: Inline[] = [];
  for (const part of parts) {
    if (part === "") {
      continue;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 3) {
      inlines.push({ kind: "code", text: part.slice(1, -1) });
      continue;
    }
    const link = /^\[([^\]]+)\]\((https:\/\/[^)\s]+|\/[^)\s]+)\)$/.exec(part);
    if (link?.[1] && link[2]) {
      inlines.push({ kind: "link", text: link[1], href: link[2] });
      continue;
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      inlines.push({ kind: "strong", text: part.slice(2, -2) });
      continue;
    }
    inlines.push({ kind: "text", text: part });
  }
  return inlines;
}

export function parseMarkdown(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined || line.trim() === "") {
      i += 1;
      continue;
    }
    if (line.startsWith("```")) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) {
        body.push(lines[i] ?? "");
        i += 1;
      }
      if (i >= lines.length) {
        throw new Error("Unclosed markdown fence");
      }
      i += 1;
      blocks.push({ kind: "pre", text: body.join("\n") });
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      blocks.push({ kind: "hr" });
      i += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading?.[1] && heading[2] !== undefined) {
      const level = heading[1].length as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, inlines: parseInlines(heading[2]) });
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push(parseInlines((lines[i] ?? "").replace(/^\s*[-*]\s+/, "")));
        i += 1;
      }
      blocks.push({ kind: "list", items });
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !(lines[i] ?? "").startsWith("```") &&
      !/^(#{1,3})\s+/.test(lines[i] ?? "") &&
      !/^---+$/.test((lines[i] ?? "").trim()) &&
      !/^\s*[-*]\s+/.test(lines[i] ?? "")
    ) {
      para.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ kind: "paragraph", inlines: parseInlines(para.join(" ")) });
  }
  return blocks;
}

export type ChipTarget =
  | { kind: "ask"; q: string; t: string }
  | { kind: "nice-try"; p: string };

export function chipTargetFromHref(href: string): ChipTarget | null {
  let url: URL;
  try {
    url = new URL(href, "https://safer-with-jev.com");
  } catch {
    return null;
  }
  if (url.hostname !== "safer-with-jev.com") {
    return null;
  }
  if (url.pathname === "/ask-jev") {
    const q = url.searchParams.get("q");
    const t = url.searchParams.get("t");
    if (q && t) {
      return { kind: "ask", q, t };
    }
  }
  if (url.pathname === "/nice-try") {
    const p = url.searchParams.get("p");
    if (p) {
      return { kind: "nice-try", p };
    }
  }
  return null;
}
