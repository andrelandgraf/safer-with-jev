export type DocumentationKind = "markdown" | "plain";

export type AcceptDecision =
  | { kind: "html" }
  | { kind: "markdown" }
  | { kind: "plain" }
  | { kind: "not_acceptable" };

const HTML_TYPES = new Set(["text/html", "application/xhtml+xml", "text/x-component"]);
const Q_PATTERN = /^q=(0(?:\.\d{1,3})?|1(?:\.0{1,3})?)$/;

function parseQuality(params: string[]): number {
  for (const param of params) {
    const trimmed = param.trim();
    if (!trimmed.toLowerCase().startsWith("q=")) {
      continue;
    }
    if (!Q_PATTERN.test(trimmed)) {
      return 0;
    }
    return Number(trimmed.slice(2));
  }
  return 1;
}

function parseParts(header: string): { type: string; quality: number }[] {
  return header.split(",").map((part) => {
    const [rawType, ...params] = part.trim().split(";");
    const type = (rawType ?? "").trim().toLowerCase();
    return { type, quality: parseQuality(params) };
  });
}

function htmlQuality(parts: { type: string; quality: number }[]): number {
  let best = 0;
  let bestSpecificity = 0;
  for (const part of parts) {
    let specificity = 0;
    if (HTML_TYPES.has(part.type)) {
      specificity = 3;
    } else if (part.type === "text/*") {
      specificity = 2;
    } else if (part.type === "*/*") {
      specificity = 1;
    } else {
      continue;
    }
    if (specificity > bestSpecificity || (specificity === bestSpecificity && part.quality > best)) {
      bestSpecificity = specificity;
      best = part.quality;
    }
  }
  return best;
}

function namedQuality(parts: { type: string; quality: number }[], type: string): number {
  let best = 0;
  for (const part of parts) {
    if (part.type === type && part.quality > best) {
      best = part.quality;
    }
  }
  return best;
}

export function negotiateAccept(header: string | null): AcceptDecision {
  if (!header || header.trim() === "") {
    return { kind: "html" };
  }
  const parts = parseParts(header);
  const html = htmlQuality(parts);
  const markdown = namedQuality(parts, "text/markdown");
  const plain = namedQuality(parts, "text/plain");
  const docs = markdown >= plain ? markdown : plain;
  const docsKind: DocumentationKind = markdown >= plain ? "markdown" : "plain";
  if (docs > html && docs > 0) {
    return { kind: docsKind };
  }
  if (html > 0) {
    return { kind: "html" };
  }
  if (docs > 0) {
    return { kind: docsKind };
  }
  return { kind: "not_acceptable" };
}
