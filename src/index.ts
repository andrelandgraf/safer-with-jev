import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { bearerToken, tokensMatch } from "./lib/auth";
import { aliasModels } from "./lib/jobs";
import { isRecord, readJsonObject } from "./lib/json";
import { promptFromChatBody, promptFromResponsesBody } from "./lib/prompt";
import { resolveCatalogModel } from "./lib/resolve";
import { proxyGateway } from "./lib/gateway";
import { applyTimingHeaders } from "./lib/timing";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

const gatewayBaseUrl = requireEnv("NEON_AI_GATEWAY_BASE_URL");
const gatewayToken = requireEnv("NEON_AI_GATEWAY_TOKEN");
const proxyApiKey = requireEnv("PROXY_API_KEY");
const typesafe = new TypeSafeClient({
  apiKey: requireEnv("TYPESAFE_API_KEY"),
});

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type", "x-api-key"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: [
      "x-neon-job",
      "x-neon-model",
      "x-neon-classify-ms",
      "x-neon-gateway-ms",
      "x-neon-total-ms",
      "Server-Timing",
    ],
  }),
);

app.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS" || c.req.path === "/") {
    await next();
    return;
  }

  const token = bearerToken(c.req.raw);
  if (!token || !tokensMatch(token, proxyApiKey)) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

app.get("/", (c) =>
  c.json({
    name: "typesafe-on-neon",
    docs: "POST /v1/chat/completions and POST /v1/responses proxy the Neon AI Gateway.",
    models: {
      main: "grok-4-6",
      plan_review: "gpt-6-astra",
      sec_review: "gpt-6-astra",
      eng_review: "gpt-6-astra",
      auto: "TypeSafe Jev picks a job, then the matching catalog model",
    },
    auth: "Authorization: Bearer $PROXY_API_KEY",
    timing:
      "x-neon-classify-ms, x-neon-gateway-ms, x-neon-total-ms, and Server-Timing (classify, gateway, total)",
  }),
);

app.get("/v1/models", async (c) => {
  const upstream = await proxyGateway({
    baseUrl: gatewayBaseUrl,
    token: gatewayToken,
    path: "/v1/models",
    method: "GET",
  });
  if (!upstream.ok) {
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers,
    });
  }

  const payload: unknown = await upstream.json();
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new Error("AI Gateway /v1/models returned an unexpected body");
  }

  const aliases = aliasModels().map((alias) => ({
    id: alias.id,
    object: "model",
    owned_by: "typesafe-on-neon",
    job: alias.job,
    catalog_id: alias.catalogId,
  }));

  return c.json({
    object: "list",
    data: [...aliases, ...payload.data],
  });
});

async function proxyWithResolvedModel(
  c: Context,
  promptFrom: (body: Record<string, unknown>) => string,
  path: string,
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await readJsonObject(c.req.raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return c.json({ error: message }, 400);
  }

  const started = performance.now();
  const prompt = promptFrom(body);
  let resolved: { job: string | null; catalogId: string };
  try {
    resolved = await resolveCatalogModel({
      modelField: body.model,
      prompt,
      client: typesafe,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Classification failed";
    if (message.startsWith("Cannot classify")) {
      return c.json({ error: message }, 400);
    }
    throw error;
  }
  const afterClassify = performance.now();

  const upstream = await proxyGateway({
    baseUrl: gatewayBaseUrl,
    token: gatewayToken,
    path,
    method: "POST",
    body: JSON.stringify({ ...body, model: resolved.catalogId }),
  });
  const afterGateway = performance.now();

  const headers = new Headers(upstream.headers);
  headers.set("x-neon-model", resolved.catalogId);
  if (resolved.job) {
    headers.set("x-neon-job", resolved.job);
  }
  applyTimingHeaders(headers, {
    classifyMs: afterClassify - started,
    gatewayMs: afterGateway - afterClassify,
    totalMs: afterGateway - started,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

app.post("/v1/chat/completions", (c) =>
  proxyWithResolvedModel(c, promptFromChatBody, "/v1/chat/completions"),
);

app.post("/v1/responses", (c) =>
  proxyWithResolvedModel(c, promptFromResponsesBody, "/openai/v1/responses"),
);

export default app;
