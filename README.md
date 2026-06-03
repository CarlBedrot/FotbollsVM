# VM-tipset 2026

A friend-group World Cup 2026 prediction game. Everyone fills in an Excel tipslapp, uploads it, and a Retro Panini-styled site shows the leaderboard and the "Loppet" race barometer.

- **Stack:** Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres) · Vercel · Vitest
- **Scoring:** deterministic, pure TypeScript (max 168p, self-tested). No LLM in the scoring path.
- **Fixtures:** generated from the public-domain openfootball WC2026 dataset (`npm run build:fixtures`).

## Develop

```
npm install
npm run dev      # styled shell works without a DB (empty states)
npm test         # full unit suite
```

See `DEPLOY.md` for going live.
