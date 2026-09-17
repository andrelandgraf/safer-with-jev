import { spawnSync } from "node:child_process";

const baseUrl = process.env.PROXY_BASE_URL ?? process.env.NEON_FUNCTION_GATEWAY_BASE_URL;
const apiKey = process.env.PROXY_API_KEY;
const repo = process.env.BENCH_REPO ?? "neondatabase/mcp-server-neon";

export {};

if (!baseUrl) {
  throw new Error("PROXY_BASE_URL or NEON_FUNCTION_GATEWAY_BASE_URL is not set");
}
if (!apiKey) {
  throw new Error("PROXY_API_KEY is not set");
}

const PROMPT_KINDS = [
  { id: "plan", prefix: "plan this" },
  { id: "review", prefix: "review this" },
  { id: "sec-review", prefix: "security review this" },
  { id: "implement", prefix: "implement this" },
] as const;

type PromptKindId = (typeof PROMPT_KINDS)[number]["id"];

type OpenPr = {
  number: number;
  title: string;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOpenPrs(payload: unknown): OpenPr[] {
  if (!Array.isArray(payload)) {
    throw new Error("gh pr list returned a non-array");
  }
  const prs: OpenPr[] = [];
  for (const row of payload) {
    if (!isRecord(row)) {
      continue;
    }
    if (!isRecord(row.author) || row.author.is_bot === true) {
      continue;
    }
    if (
      typeof row.number !== "number" ||
      typeof row.title !== "string" ||
      typeof row.url !== "string"
    ) {
      continue;
    }
    prs.push({ number: row.number, title: row.title, url: row.url });
  }
  return prs;
}

function listOpenPrs(): OpenPr[] {
  const result = spawnSync(
    "gh",
    [
      "pr",
      "list",
      "--repo",
      repo,
      "--state",
      "open",
      "--limit",
      "50",
      "--json",
      "number,title,url,author",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`gh pr list failed: ${result.stderr}`);
  }
  const parsed: unknown = JSON.parse(result.stdout);
  return parseOpenPrs(parsed);
}

function promptFor(kind: (typeof PROMPT_KINDS)[number], pr: OpenPr): string {
  return `${kind.prefix}: ${pr.title} ${pr.url}`;
}

function readMsHeader(headers: Headers, name: string): number | null {
  const raw = headers.get(name);
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  return Number(raw);
}

type BenchRow = {
  pr: number;
  title: string;
  url: string;
  kind: PromptKindId;
  prompt: string;
  status: number;
  job: string | null;
  model: string | null;
  classifyMs: number | null;
  gatewayMs: number | null;
  totalMs: number | null;
  clientMs: number;
  error: string | null;
};

async function runOne(kind: (typeof PROMPT_KINDS)[number], pr: OpenPr): Promise<BenchRow> {
  const prompt = promptFor(kind, pr);
  const clientStarted = performance.now();
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "auto",
      // gpt-6-astra 400s when max_tokens is 1 ("Could not finish the message").
      max_tokens: 16,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const clientMs = Math.round(performance.now() - clientStarted);
  const bodyText = await response.text();
  const error = response.ok ? null : bodyText.slice(0, 300);
  return {
    pr: pr.number,
    title: pr.title,
    url: pr.url,
    kind: kind.id,
    prompt,
    status: response.status,
    job: response.headers.get("x-neon-job"),
    model: response.headers.get("x-neon-model"),
    classifyMs: readMsHeader(response.headers, "x-neon-classify-ms"),
    gatewayMs: readMsHeader(response.headers, "x-neon-gateway-ms"),
    totalMs: readMsHeader(response.headers, "x-neon-total-ms"),
    clientMs,
    error,
  };
}

const prs = listOpenPrs();
if (prs.length === 0) {
  throw new Error(`no non-bot open PRs in ${repo}`);
}

const rows: BenchRow[] = [];
for (const pr of prs) {
  for (const kind of PROMPT_KINDS) {
    rows.push(await runOne(kind, pr));
    console.error(`${pr.number} ${kind.id} ${rows[rows.length - 1]?.job} ${rows[rows.length - 1]?.classifyMs}ms`);
  }
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const even = sorted.length % 2 === 0;
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (even && left !== undefined && right !== undefined) {
    return Math.round((left + right) / 2);
  }
  return right ?? null;
}

const classified = rows.filter((row) => row.classifyMs !== null);
const classifyValues = classified
  .map((row) => row.classifyMs)
  .filter((value): value is number => value !== null);
const gatewayValues = classified
  .map((row) => row.gatewayMs)
  .filter((value): value is number => value !== null);

const jobCounts: Record<string, number> = {};
for (const row of classified) {
  const key = row.job ?? "none";
  jobCounts[key] = (jobCounts[key] ?? 0) + 1;
}

console.log(
  JSON.stringify(
    {
      repo,
      ranAt: new Date().toISOString(),
      generation: "max_tokens=16",
      prs: prs.length,
      requests: rows.length,
      classified: classified.length,
      classifyMs: {
        min: classifyValues.length ? Math.min(...classifyValues) : null,
        median: median(classifyValues),
        max: classifyValues.length ? Math.max(...classifyValues) : null,
      },
      gatewayMs: {
        min: gatewayValues.length ? Math.min(...gatewayValues) : null,
        median: median(gatewayValues),
        max: gatewayValues.length ? Math.max(...gatewayValues) : null,
      },
      jobs: jobCounts,
      rows,
    },
    null,
    2,
  ),
);
