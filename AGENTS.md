# safer-with-jev

Personal demo. GitHub `andrelandgraf/safer-with-jev`. Neon org `org-summer-dust-66593634` (personal account, `neon` with no `--profile`). Project `typesafe-on-neon` (`blue-band-77747273`). Region `aws-us-east-2`.

Function slug `gateway`. Custom domain `safer-with-jev.com` via `functions.gateway.customDomains`. Native URL: `neon functions get gateway`. AI Gateway is caption-only. TypeSafe Jev (`jev-latest`) scores prompt injections, image captions, and replies.

`neon.ts` uploads `NEON_FUNCTION_GATEWAY_BASE_URL` as Function env. The Functions load path calls `parseEnv` and requires that key; the runtime does not inject it. `neon env pull` writes it locally.

## Git

This repo ships from `main`. Never open a PR. This overrides the PR default in `~/workspaces/AGENTS.md`.

1. Work on `main`.
2. `bun test` and `bun run typecheck`.
3. Commit and `git push origin main`.
4. `neon deploy --env .env.local` immediately after the push.
5. Smoke `https://safer-with-jev.com` (`BASE_URL=https://safer-with-jev.com bun smoke`).

A pushed-but-undeployed change is not done. Do not run neo eng-review / dx-review loops here.

`main` has a repo ruleset (PR + 1 review). Admins bypass it (`current_user_can_bypass: always`). Direct pushes print a ruleset warning and still land.

## Setup

```bash
bun install
neon link -y
neon env pull
# .env.local must also contain TYPESAFE_API_KEY
neon deploy --env .env.local
```

`.neon` and `.env.local` are gitignored. Do not commit them. Do not pass `--project-id` once the worktree is linked.

## Skills

Installed into this repo with:

```bash
neon skills -y --agent cursor
npx skills add typesafe-ai/skills --skill typesafe-ai -a cursor -y
```

Use the TypeSafe skill when changing Noul/Score questions.

## Commands

```bash
bun test
bun run typecheck
neon dev
neon deploy --env .env.local
BASE_URL=… bun smoke
neon functions get gateway
neon function domains list
neon logs query --source function --since 1h
```

## Layout

```text
src/index.ts     Hono fetch handler
src/lib/         routing, SSRF, Jev, vision, limiter, pinned HTTPS, homepage
scripts/smoke.ts live Function check
neon.ts          AI Gateway + Function env + custom domain
SITE.md          homepage copy (GET /)
DESIGN.md        contract
```
