# Deploy & credentials checklist

Everything below is the one-time setup that needs you (accounts + secrets). The app reads all of these from environment variables.

## 1. Supabase (database)
1. Create a free project at supabase.com.
2. In the SQL editor, run the migrations in order: `supabase/migrations/0001_users.sql`, `0002_tournament.sql`, `0003_predictions.sql`, `0004_standings.sql`.
3. From Project Settings → API, copy: Project URL, `anon` public key, `service_role` key.

## 2. Environment variables
Create `.env.local` (local) and set the same in Vercel (Project → Settings → Environment Variables). See `.env.example`:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — **required** (the app is fully server-side)
- `SESSION_SECRET` — **required.** Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `FOOTBALL_DATA_TOKEN` — free from football-data.org (only needed for the "hämta resultat" button)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — **optional**, not read by any code today (reserved for a possible future client-side use)
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY_NAME` — only used by the one-time `seed:admin` script (step 3); `ADMIN_DISPLAY_NAME` defaults to `Carl`

## 3. Seed the data (with env set locally)

```
npm run build:fixtures      # already committed, re-run only to refresh the draw
npm run seed:tournament     # teams + matches + lock time into Supabase
ADMIN_USERNAME=carl ADMIN_PASSWORD=*** npm run seed:admin   # your admin account
```

## 4. Deploy to Vercel
1. Push this repo to GitHub.
2. Import it in Vercel, add the env vars from step 2, deploy.
3. Open the URL, log in as the admin, and from **/admin** create accounts for the gang.

## 5. During the tournament
- Players download the tipslapp from **/tips**, fill it in, upload before the first kickoff (tips lock at 2026-06-11 19:00 UTC).
- You enter results at **/admin** — either manually per match, or "Hämta dagens resultat" to pull proposals from the API and approve them. Standings recompute automatically.
- Replace `public/icon.svg` with branded PNG icons if you want full install polish.
