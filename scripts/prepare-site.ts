import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Next.js regenerates web/AGENTS.md. The public contract is web/content/AGENTS.md.
const markdown = readFileSync(join(root, "web/content/AGENTS.md"));
if (!markdown.includes("Jev answers yes/no questions")) {
  throw new Error("web/content/AGENTS.md is missing expected copy");
}

function writeTsModule(path: string, value: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `export const AGENTS_MARKDOWN = ${JSON.stringify(value.toString("utf8"))};\n`);
}

writeTsModule(join(root, "src/lib/agents-markdown.ts"), markdown);
writeTsModule(join(root, "web/src/generated/agents-markdown.ts"), markdown);
