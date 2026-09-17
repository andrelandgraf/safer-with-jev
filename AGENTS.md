# typesafe-on-neon

Personal demo. GitHub `andrelandgraf/typesafe-on-neon`. Neon org `org-summer-dust-66593634` (personal account, `neon` with no `--profile`). Project `typesafe-on-neon` (`blue-band-77747273`). Region `aws-us-east-2`.

Function slug `gateway` at `https://br-long-cell-b4hdnmi3-gateway.compute.c-6.us-east-2.aws.neon.tech/`. AI Gateway on the branch. TypeSafe Jev (`jev-latest`) classifies `model: "auto"`. Catalog models: `grok-4-6` for main work, `gpt-6-astra` for plan / sec / eng review.

`neon.ts` uploads `NEON_FUNCTION_GATEWAY_BASE_URL` as Function env. The Functions load path calls `parseEnv` and requires that key; the runtime does not inject it. `neon env pull` writes it locally.

## Setup

```bash
bun install
neon link -y
neon env pull
# .env.local must also contain TYPESAFE_API_KEY and PROXY_API_KEY
neon deploy --env .env.local
```

`.neon` and `.env.local` are gitignored. Do not commit them. Do not pass `--project-id` once the worktree is linked.

## Skills

Installed into this repo with:

```bash
neon skills -y --agent cursor
npx skills add typesafe-ai/skills --skill typesafe-ai -a cursor -y
```

Use the TypeSafe skill when changing classification or job criteria.

## Commands

```bash
bun test
bun run typecheck
neon dev
neon deploy --env .env.local
PROXY_BASE_URL=… PROXY_API_KEY=… bun smoke
neon functions get gateway
neon logs query --source function --since 1h
```

## Layout

```text
src/index.ts     Hono fetch handler
src/lib/         job aliases, prompt extract, Jev classify, gateway proxy
scripts/smoke.ts live Function check
neon.ts          AI Gateway + Function env
```
