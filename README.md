# typesafe-on-neon

A Neon Function that proxies the Neon AI Gateway. Callers send OpenAI-compatible chat completions; the Function holds the gateway credential and picks the catalog model.

TypeSafe Jev classifies `model: "auto"` into a job. Grok 4.6 does main work. GPT-6 Astra does plan, security, and engineering review.

```
client
  → Neon Function (this repo)
      → TypeSafe Jev when model is auto
      → Neon AI Gateway (grok-4-6 or gpt-6-astra)
```

## Use it

Auth is a bearer token (`PROXY_API_KEY`). The Function URL is `neon functions get gateway`.

```bash
export PROXY_BASE_URL="https://<branch>-gateway.compute.<cell>.us-east-2.aws.neon.tech"
export PROXY_API_KEY="…"
```

```bash
curl "$PROXY_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "main",
    "messages": [{"role": "user", "content": "Write a Hono GET /health handler."}]
  }'
```

```bash
curl "$PROXY_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sec-review",
    "messages": [{"role": "user", "content": "Review this handler for secret leaks."}]
  }'
```

```bash
curl "$PROXY_BASE_URL/v1/chat/completions" \
  -H "Authorization: Bearer $PROXY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Is concatenating req.query.id into SQL a problem?"}]
  }'
```

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.PROXY_API_KEY,
  baseURL: `${process.env.PROXY_BASE_URL}/v1`,
});

const completion = await client.chat.completions.create({
  model: "main",
  messages: [{ role: "user", content: "Write a Hono GET /health handler." }],
});
```

`x-neon-model` is the catalog id the gateway received. `x-neon-job` is set when the request used an alias or Jev.

Every completion also returns millisecond timings:

```
x-neon-classify-ms: 42
x-neon-gateway-ms: 810
x-neon-total-ms: 852
Server-Timing: classify;dur=42, gateway;dur=810, total;dur=852
```

`classify` is Jev when `model` is `auto` or omitted, otherwise the alias lookup. `gateway` is the AI Gateway hop until response headers arrive. `total` is both. Neither includes body transfer or streaming completion. Alias lookups are ~0 ms.

| `model` | Job | Catalog id |
|---|---|---|
| `main` | main | `grok-4-6` |
| `plan-review` | plan_review | `gpt-6-astra` |
| `sec-review` | sec_review | `gpt-6-astra` |
| `eng-review` | eng_review | `gpt-6-astra` |
| `review`, `astra` | plan_review | `gpt-6-astra` |
| `auto` or omitted | Jev chooses | matching catalog id |
| any other string | passthrough | that string |

`GET /v1/models` lists aliases plus the branch catalog. `POST /v1/responses` proxies the OpenAI Responses dialect at `/openai/v1/responses`.

## Run it

```bash
bun install
neon link --org-id org-summer-dust-66593634 --project-name typesafe-on-neon --region-id aws-us-east-2
# then put TYPESAFE_API_KEY and PROXY_API_KEY in .env.local
neon deploy --env .env.local
bun test
PROXY_BASE_URL=$(neon functions get gateway --output json | jq -r .invocation_url) bun smoke
# needs `gh` auth; four paid chat completions per non-bot open PR; JSON on stdout;
# HTTP 4xx/5xx are recorded in the JSON and the process still exits 0
PROXY_BASE_URL=$(neon functions get gateway --output json | jq -r .invocation_url) bun bench
```

Local:

```bash
neon dev
```
