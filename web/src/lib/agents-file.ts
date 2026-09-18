import { readFileSync } from "node:fs";
import { join } from "node:path";

export function readAgentsMarkdown(): Buffer {
  return readFileSync(join(process.cwd(), "content/AGENTS.md"));
}
