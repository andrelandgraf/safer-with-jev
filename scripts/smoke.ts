const baseUrl = process.env.PROXY_BASE_URL;
const apiKey = process.env.PROXY_API_KEY;

export {};

if (!baseUrl) {
  throw new Error("PROXY_BASE_URL is not set");
}
if (!apiKey) {
  throw new Error("PROXY_API_KEY is not set");
}

function authHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${response.status} ${response.url}: ${text.slice(0, 500)}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const unauth = await fetch(`${baseUrl}/v1/models`);
if (unauth.status !== 401) {
  throw new Error(`expected 401 without a key, got ${unauth.status}`);
}

const modelsResponse = await fetch(`${baseUrl}/v1/models`, {
  headers: authHeaders(),
});
if (!modelsResponse.ok) {
  throw new Error(`/v1/models failed: ${modelsResponse.status} ${await modelsResponse.text()}`);
}
const models = await readJson(modelsResponse);
if (!isRecord(models) || !Array.isArray(models.data)) {
  throw new Error("/v1/models returned an unexpected body");
}
const ids = models.data
  .map((row) => (isRecord(row) && typeof row.id === "string" ? row.id : null))
  .filter((id): id is string => id !== null);
for (const id of ["auto", "main", "grok-4-6", "gpt-6-astra"]) {
  if (!ids.includes(id)) {
    throw new Error(`/v1/models missing ${id}`);
  }
}

const mainResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
  method: "POST",
  headers: authHeaders(),
  body: JSON.stringify({
    model: "main",
    messages: [{ role: "user", content: "Reply with exactly: grok-ok" }],
  }),
});
if (!mainResponse.ok) {
  throw new Error(`main completion failed: ${mainResponse.status} ${await mainResponse.text()}`);
}
if (mainResponse.headers.get("x-neon-model") !== "grok-4-6") {
  throw new Error(
    `main expected x-neon-model grok-4-6, got ${mainResponse.headers.get("x-neon-model")}`,
  );
}
const mainBody = await readJson(mainResponse);
if (!isRecord(mainBody) || !Array.isArray(mainBody.choices) || !isRecord(mainBody.choices[0])) {
  throw new Error("main completion returned an unexpected body");
}

const reviewResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
  method: "POST",
  headers: authHeaders(),
  body: JSON.stringify({
    model: "sec-review",
    messages: [{ role: "user", content: "Reply with exactly: astra-ok" }],
  }),
});
if (!reviewResponse.ok) {
  throw new Error(
    `sec-review completion failed: ${reviewResponse.status} ${await reviewResponse.text()}`,
  );
}
if (reviewResponse.headers.get("x-neon-model") !== "gpt-6-astra") {
  throw new Error(
    `sec-review expected x-neon-model gpt-6-astra, got ${reviewResponse.headers.get("x-neon-model")}`,
  );
}
if (reviewResponse.headers.get("x-neon-job") !== "sec_review") {
  throw new Error(
    `sec-review expected x-neon-job sec_review, got ${reviewResponse.headers.get("x-neon-job")}`,
  );
}

const autoResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
  method: "POST",
  headers: authHeaders(),
  body: JSON.stringify({
    model: "auto",
    messages: [
      {
        role: "user",
        content:
          "Security review this handler: it concatenates req.query.id into SQL and returns process.env.DATABASE_URL.",
      },
    ],
  }),
});
if (!autoResponse.ok) {
  throw new Error(`auto completion failed: ${autoResponse.status} ${await autoResponse.text()}`);
}
const autoJob = autoResponse.headers.get("x-neon-job");
const autoModel = autoResponse.headers.get("x-neon-model");
if (autoJob !== "sec_review") {
  throw new Error(`auto expected x-neon-job sec_review, got ${autoJob}`);
}
if (autoModel !== "gpt-6-astra") {
  throw new Error(`auto expected x-neon-model gpt-6-astra, got ${autoModel}`);
}

function requireMsHeader(response: Response, name: string): number {
  const raw = response.headers.get(name);
  if (raw === null || !/^\d+$/.test(raw)) {
    throw new Error(`${name} missing or not an integer ms value: ${raw}`);
  }
  return Number(raw);
}

const autoClassifyMs = requireMsHeader(autoResponse, "x-neon-classify-ms");
const autoGatewayMs = requireMsHeader(autoResponse, "x-neon-gateway-ms");
const autoTotalMs = requireMsHeader(autoResponse, "x-neon-total-ms");
if (autoClassifyMs < 1) {
  throw new Error(`auto expected x-neon-classify-ms >= 1, got ${autoClassifyMs}`);
}
if (autoGatewayMs < 1) {
  throw new Error(`auto expected x-neon-gateway-ms >= 1, got ${autoGatewayMs}`);
}
if (Math.abs(autoTotalMs - (autoClassifyMs + autoGatewayMs)) > 1) {
  throw new Error(
    `auto x-neon-total-ms ${autoTotalMs} != classify ${autoClassifyMs} + gateway ${autoGatewayMs}`,
  );
}
const autoServerTiming = autoResponse.headers.get("Server-Timing");
if (
  !autoServerTiming ||
  !autoServerTiming.includes(`classify;dur=${autoClassifyMs}`) ||
  !autoServerTiming.includes(`gateway;dur=${autoGatewayMs}`)
) {
  throw new Error(`auto Server-Timing mismatch: ${autoServerTiming}`);
}

const mainClassifyMs = requireMsHeader(mainResponse, "x-neon-classify-ms");
if (mainClassifyMs > 20) {
  throw new Error(`main alias should skip Jev, x-neon-classify-ms=${mainClassifyMs}`);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      models: ids.length,
      main: "grok-4-6",
      secReview: "gpt-6-astra",
      autoJob,
      autoClassifyMs,
      autoGatewayMs,
      autoTotalMs,
    },
    null,
    2,
  ),
);
