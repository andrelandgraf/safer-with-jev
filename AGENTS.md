# safer-with-jev

Personal demo. GitHub `andrelandgraf/safer-with-jev`. Neon org `org-summer-dust-66593634` (personal account, `neon` with no `--profile`). Project `typesafe-on-neon` (`blue-band-77747273`). Region `aws-us-east-2`.

Newspaper site: Vercel project `safer-with-jev`, production domain `safer-with-jev.com`. Next.js app in `web/`.

API: Function slug `gateway`, custom domain `api.safer-with-jev.com`. Native URL: `neon functions get gateway`. AI Gateway is caption-only and unused while `/block-unsafe-images` is 404. TypeSafe Jev (`jev-latest`) scores prompt injections and replies. Image-caption judging is listed as a use case, not a public route.

`neon.ts` uploads `NEON_FUNCTION_GATEWAY_BASE_URL` as Function env. The Functions load path calls `parseEnv` and requires that key; the runtime does not inject it. `neon env pull` writes it locally.

Vercel `NEXT_PUBLIC_API_ORIGIN=https://api.safer-with-jev.com`. The browser calls that origin directly. Do not proxy Jev through Vercel.

## Git

This repo ships from `main`. Never open a PR. This overrides the PR default in `~/workspaces/AGENTS.md`.

1. Work on `main`.
2. `bun run test` and `bun run typecheck`.
3. Commit and `git push origin main`.
4. `neon deploy --env .env.local` immediately after the push.
5. Confirm the Vercel production deployment for `web/`.
6. Smoke:

```bash
SITE_URL=https://safer-with-jev.com API_URL=https://api.safer-with-jev.com bun smoke
```

A pushed-but-undeployed change is not done.

`main` has a repo ruleset (PR + 1 review). Admins bypass it (`current_user_can_bypass: always`). Direct pushes print a ruleset warning and still land.

## Setup

```bash
bun install
neon link -y
neon env pull
# .env.local must also contain TYPESAFE_API_KEY
cp web/.env.example web/.env.local
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
bun run test
bun run typecheck
bun run dev:api
bun run dev:web
bun run build
neon deploy --env .env.local
SITE_URL=… API_URL=… bun smoke
neon functions get gateway
neon function domains list
neon logs query --source function --since 1h
```

## Layout

```text
src/index.ts     Hono API
src/lib/         routing, SSRF, Jev, vision, limiter, pinned HTTPS
web/             Next.js newspaper site
scripts/smoke.ts live site + API check
neon.ts          AI Gateway + Function env + custom domain
web/content/AGENTS.md  public agent contract at /AGENTS.md; /SITE.md serves the same bytes
DESIGN.md        contract
```
