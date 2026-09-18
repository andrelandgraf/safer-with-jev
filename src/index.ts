import { Hono } from "hono";
import { cors } from "hono/cors";
import { Pool } from "pg";
import { attachDatabasePool } from "@neon/functions";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { API_INFO } from "./lib/api-info";
import { handleSaferRequest } from "./lib/handler";
import { homepageResponse } from "./lib/homepage";
import { createLimiter } from "./lib/limiter";
import { STAGE_MS } from "./lib/limits";
import { servesLegacySite } from "./lib/request-host";
import { CORS_EXPOSE } from "./lib/response";
import { AGENTS_MARKDOWN } from "./lib/agents-markdown";
import {
  faviconResponse,
  ogPngResponse,
  robotsResponse,
  sitemapResponse,
} from "./lib/static-pages";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function notFound(): Response {
  return new Response("Not found.", { status: 404 });
}

function apiInfoResponse(): Response {
  return new Response(JSON.stringify(API_INFO), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=120",
    },
  });
}

const typesafe = new TypeSafeClient({
  apiKey: requireEnv("TYPESAFE_API_KEY"),
  timeout: STAGE_MS,
  retry: { maxRetries: 0 },
  logLevel: "error",
});

const gatewayBaseUrl = requireEnv("NEON_AI_GATEWAY_BASE_URL");
const gatewayToken = requireEnv("NEON_AI_GATEWAY_TOKEN");

const databaseUrl = process.env.DATABASE_URL;
const pool = databaseUrl ? new Pool({ connectionString: databaseUrl, max: 5 }) : null;
if (pool) {
  attachDatabasePool(pool);
}

const limiter = createLimiter(pool);

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
    allowHeaders: [
      "Authorization",
      "Content-Type",
      "OpenAI-Organization",
      "OpenAI-Project",
      "Idempotency-Key",
    ],
    exposeHeaders: [...CORS_EXPOSE],
  }),
);

app.get("/", (c) => {
  if (servesLegacySite(c.req.raw)) {
    return homepageResponse(AGENTS_MARKDOWN);
  }
  return apiInfoResponse();
});

function agentsMarkdownResponse(): Response {
  return new Response(AGENTS_MARKDOWN, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=120",
    },
  });
}

app.get("/AGENTS.md", () => agentsMarkdownResponse());
app.get("/SITE.md", () => agentsMarkdownResponse());
app.get("/og.png", (c) => (servesLegacySite(c.req.raw) ? ogPngResponse() : notFound()));
app.get("/favicon.svg", (c) => (servesLegacySite(c.req.raw) ? faviconResponse() : notFound()));
app.get("/robots.txt", (c) => (servesLegacySite(c.req.raw) ? robotsResponse() : notFound()));
app.get("/sitemap.xml", (c) => (servesLegacySite(c.req.raw) ? sitemapResponse() : notFound()));

app.all("*", (c) => {
  return handleSaferRequest(c.req.raw, {
    typesafe,
    limiter,
    gatewayBaseUrl,
    gatewayToken,
  });
});

export default app;
