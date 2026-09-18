# Contributing

Personal demo under `andrelandgraf/safer-with-jev`. Ships from `main`: commit, push, `neon deploy --env .env.local`, and the Vercel production deploy for `web/`. Never open a PR.

## Prereqs

- Bun
- Node.js 24
- Neon CLI (`neon`), signed in as andre.timo.landgraf@gmail.com
- Personal Vercel CLI (`vercel`), user `andre-landgraf`
- Cursor skills in this repo (`neon skills -y --agent cursor`, TypeSafe skill)

## Loop

```bash
bun install
neon link -y
neon env pull
# add TYPESAFE_API_KEY to .env.local if it is missing
cp web/.env.example web/.env.local
bun run test
bun run typecheck
git commit
git push origin main
neon deploy --env .env.local
SITE_URL=https://safer-with-jev.com API_URL=https://api.safer-with-jev.com bun smoke
```

Do not commit `.neon`, `.env.local`, or Function secrets. Do not proxy the Function through Vercel.
