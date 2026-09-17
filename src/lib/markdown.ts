function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const INLINE_TOKEN =
  /(`[^`]+`|\[[^\]]+\]\(https:\/\/[^)\s]+\)|\*\*[^*]+\*\*)/g;

function inlineMarkdown(text: string): string {
  const parts = text.split(INLINE_TOKEN);
  return parts
    .map((part) => {
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 3) {
        return `<code>${escapeHtml(part.slice(1, -1))}</code>`;
      }
      const link = /^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/.exec(part);
      if (link?.[1] && link[2]) {
        return `<a href="${escapeHtml(link[2])}">${escapeHtml(link[1])}</a>`;
      }
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return `<strong>${escapeHtml(part.slice(2, -2))}</strong>`;
      }
      return escapeHtml(part);
    })
    .join("");
}

export function markdownToHtml(markdown: string): string {
  const blocks: string[] = [];
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
      blocks.push(`<pre><code>${escapeHtml(body.join("\n"))}</code></pre>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      blocks.push("<hr>");
      i += 1;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const hashes = heading[1];
      const title = heading[2];
      if (!hashes || title === undefined) {
        throw new Error("Invalid heading");
      }
      const level = hashes.length;
      blocks.push(`<h${level}>${inlineMarkdown(title)}</h${level}>`);
      i += 1;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push(`<li>${inlineMarkdown((lines[i] ?? "").replace(/^\s*[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      blocks.push(`<ul>${items.join("")}</ul>`);
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
    blocks.push(`<p>${inlineMarkdown(para.join(" "))}</p>`);
  }
  return blocks.join("\n");
}
