# Contributing

Personal demo under `andrelandgraf/typesafe-on-neon`. Default branch is `main`.

## Prereqs

- Bun
- Node.js 24
- Neon CLI (`neon`), signed in as andre.timo.landgraf@gmail.com
- Cursor skills in this repo (`neon skills -y --agent cursor`, TypeSafe skill)

## Loop

```bash
bun install
neon link -y
neon env pull
# add TYPESAFE_API_KEY and PROXY_API_KEY to .env.local if they are missing
bun test
bun run typecheck
neon dev
neon deploy --env .env.local
PROXY_BASE_URL=$(neon functions get gateway --output json | jq -r .invocation_url) \
  PROXY_API_KEY="$(awk -F= '/^PROXY_API_KEY=/{print $2}' .env.local)" \
  bun smoke
```

Do not commit `.neon`, `.env.local`, or Function secrets.
