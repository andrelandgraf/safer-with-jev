import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const markdown = readFileSync(join(root, "SITE.md"));
if (!markdown.includes("Safer with Jev")) {
  throw new Error("SITE.md is missing expected copy");
}

function writeTsModule(path: string, value: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `export const SITE_MARKDOWN = ${JSON.stringify(value.toString("utf8"))};\n`);
}

writeTsModule(join(root, "src/lib/site-markdown.ts"), markdown);
writeTsModule(join(root, "web/src/generated/site-markdown.ts"), markdown);
mkdirSync(join(root, "web/content"), { recursive: true });
writeFileSync(join(root, "web/content/SITE.md"), markdown);
