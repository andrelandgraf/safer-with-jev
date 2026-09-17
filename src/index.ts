import { Hono } from "hono";
import { cors } from "hono/cors";
import { Pool } from "pg";
import { attachDatabasePool } from "@neon/functions";
import { TypeSafeClient } from "@typesafe-ai/sdk";
import { handleSaferRequest } from "./lib/handler";
import { homepageResponse } from "./lib/homepage";
import { createLimiter } from "./lib/limiter";
import { STAGE_MS } from "./lib/limits";
import { CORS_EXPOSE } from "./lib/response";
import { SITE_MARKDOWN } from "./lib/site-markdown";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
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

app.get("/", () => homepageResponse(SITE_MARKDOWN));

app.all("*", (c) =>
  handleSaferRequest(c.req.raw, {
    typesafe,
    limiter,
    gatewayBaseUrl,
    gatewayToken,
  }),
);

export default app;
