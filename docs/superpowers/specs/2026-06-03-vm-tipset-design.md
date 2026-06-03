# VM-tipset 2026 — designdokument

**Datum:** 2026-06-03
**Status:** Godkänd design (brainstorming klar, redo för implementationsplan)
**Ägare:** Carl (admin)

---

## 1. Översikt & mål

En PWA/webbapp för ett kompisgängs VM-tips till fotbolls-VM 2026. Den sociala ritualen är
att alla fyller i en Excel-tipslapp. Appen samlar in alla tips, räknar poäng automatiskt
och visar resultatet — med en **hero-barometer ("Loppet")** där varje deltagares ansikte är
en "häst" som rör sig mot mål efter poäng. Det är huvudattraktionen.

**Designmål, i prioritetsordning:**
1. Kul och snyggt — barometern ska vara värd att öppna varje dag.
2. Robust — deterministisk poängräkning, hanterar alla scenarier, går aldrig sönder tyst.
3. Lågt underhåll för admin — resultat fylls i halvautomatiskt, slutspel räknas av sig självt.

**Icke-mål (YAGNI för v1):** se §13.

---

## 2. Användare & roller

- **Admin (Carl):** skapar konton, delar ut inloggningsuppgifter, matar in/godkänner resultat,
  kan låsa upp en enskild deltagares tips innan avspark.
- **Deltagare:** loggar in (namn + lösenord), laddar upp sin egen Excel, ser barometer,
  tabell, matcher och statistik.

Slutet gäng → **inga self-registreringar**. Admin skapar alla konton.

---

## 3. Spelregler & poäng

Poängsystemet är hämtat direkt från tipslappen. Total maxpoäng = **168p**.

| Del | Antal | Poäng/st | Summa |
|-----|-------|----------|-------|
| Gruppmatcher (1/X/2) | 72 | 1p | 72p |
| Gruppvinnare (grupp A–L) | 12 | 4p | 48p |
| Flest mål i gruppspelet | 1 | 4p | 4p |
| Minst mål i gruppspelet | 1 | 4p | 4p |
| Finalister (2 lag, ordning spelar ingen roll) | 2 | 8p | 16p |
| VM-brons (vinnare bronsmatch) | 1 | 8p | 8p |
| VM-vinnare (mästare) | 1 | 16p | 16p |
| **Totalt** | | | **168p** |

Endast de 72 gruppmatchernas 1/X/2 tippas radvis. Slutspelet fångas **bara** via bonusrutorna
(finalister, brons, vinnare) och härleds ur matchresultaten — inga slutspelsrader tippas.

**Definierade kantfallsregler (för entydig poängräkning):**
- **Gruppvinnare:** 1:a-platsen i gruppen efter FIFA:s tiebreaker-ordning: poäng → målskillnad →
  gjorda mål → inbördes möte → (fair play / lottning som sista utväg, sätts manuellt om det krävs).
- **Flest/minst mål:** laget med flest resp. minst *gjorda* mål summerat över alla sina gruppmatcher.
  Vid oavgjort räknas en tippning som rätt om det tippade laget är *ett av* de delade lagen.
- **Finalister:** vart och ett av deltagarens två finalist-lag som faktiskt spelar finalen ger 8p
  (max 16p). Samma lag tippat två gånger ger bara 8p.
- **Brons:** vinnaren av bronsmatchen (match om 3:e plats).
- **Vinnare:** vinnaren av finalen.

**Tabell-tiebreaker mellan deltagare** (lika totalpoäng): 1) flest exakt rätt 1/X/2,
2) tidigast inlämnat tip, 3) delad placering om fortfarande lika.

**Tipslappens kända typo:** rutan "Vilket lag vinner VM 2024" ska vara **2026** — rättas i mallen.

---

## 4. Arkitektur & teknikstack

- **Frontend + backend:** Next.js (App Router) + TypeScript + Tailwind CSS.
  Route handlers ger oss serverless-endpoints för login, Excel-parsning, API-synk och
  poängkörning — allt i ett repo, deployas direkt på Vercel.
- **Databas:** Supabase (Postgres). Åtkomst via service-nyckel i serverless-koden;
  ingen direkt klient→DB för skrivningar (allt går via våra endpoints).
- **Auth:** egen enkel auth — username + lösenord, `bcryptjs`-hash, session via signerad
  JWT i HttpOnly-cookie (`jose`). Ingen tredjepartsinloggning.
- **Excel:** `xlsx` (SheetJS) i en Node-route handler.
- **Resultat-API:** football-data.org (gratis token, FIFA World Cup ingår, 10 req/min).
- **Deploy:** Vercel (frontend + serverless) + Supabase (DB). Uppdatering via Claude Code → push → Vercel-redeploy.
- **PWA:** manifest + ikoner + service worker (offline app-shell + cachad senaste tabell).

**Varför Next.js framför Vite+SPA:** vi behöver server-sidans endpoints för auth, filparsning,
hemlig API-nyckel och poängmotor. Next.js samlar detta i ett projekt utan separat backend.

---

## 5. Datamodell (Supabase / Postgres)

**Vem / login**
- `users` — `id`, `username` (unik), `display_name`, `password_hash`, `is_admin`,
  `avatar_url` (null → initial-cirkel), `color` (hästfärg, hex), `created_at`
- `prediction_status` — `user_id`, `submitted`, `submitted_at`, `locked`, `unlocked_by_admin`

**Turneringsdata (seedas från API en gång)**
- `teams` — `id`, `name`, `group` (A–L), `flag_code`, `source_team_id`
- `matches` — `id`, `stage` (`group`|`r32`|`r16`|`qf`|`sf`|`bronze`|`final`), `group`,
  `home_team_id`, `away_team_id`, `kickoff`, `status` (`scheduled`|`live`|`finished`),
  `home_score`, `away_score`, `result_source` (`manual`|`api`), `updated_by`, `updated_at`

**Tipsen (från Excel-uppladdningen)**
- `prediction_matches` — `user_id`, `match_id`, `pick` (`1`|`X`|`2`) · PK (user_id, match_id) → 72 rader/person
- `prediction_bonus` — `user_id`, `bonus_key`, `team_id` · PK (user_id, bonus_key)
  Nycklar: `group_winner_A`…`group_winner_L`, `most_goals`, `fewest_goals`,
  `finalist_1`, `finalist_2`, `bronze`, `champion`

**Resultat & poäng**
- `standings` — `user_id`, `total_points`, `match_points`, `bonus_points`, `rank`,
  `prev_rank` (för ▲▼), `breakdown` (JSON per delkategori), `computed_at`
- `settings` — singleton: `lock_at` (= första avspark), `season`, `active`

---

## 6. Tipsflöde (Excel-uppladdning + parsning)

1. **Mallen genereras från riktig WC2026-data** (API), så Excelens matchordning, lag, datum och
   rad-index matchar API:ts match-id:n exakt.
2. **Bonusrutorna har data-validation-dropdowns** med exakta lagnamn → ingen fri text att gissa på.
3. Deltagaren laddar upp sin ifyllda fil. Parsern läser **fasta cellpositioner**:
   varje matchrad (radindex → fixtur-ordning) ger ett `1/X/2`, varje bonusruta ger ett lag.
4. **Bekräftelsesteg:** "så här tolkade jag ditt tip" visas innan något sparas. Deltagaren
   godkänner → tipset sparas till `prediction_matches` + `prediction_bonus`.
5. **Felhantering:** ofullständig/trasig fil → tydligt felmeddelande, inget sparas.
   Parsern är deterministisk; fuzzy lagnamns-matchning behövs inte tack vare dropdowns
   (och ingen LLM i kritiska vägen).
6. **Lås:** uppladdning/ersättning tillåts fram till `settings.lock_at` (första avspark, 11 juni 2026).
   Därefter låst för alla. Admin kan sätta `unlocked_by_admin` på en enskild person innan avspark.

---

## 7. Resultat & poängmotor

**Resultatkälla:** `matches`-raden är sanningen.
- Admin har en **"hämta dagens resultat"-knapp** som hämtar färdiga/pågående matcher från API:t
  och visar förslag på slutresultat. Admin granskar och **godkänner** → skrivs med `result_source='api'`.
- Manuell inmatning är alltid möjlig och **övertrumfar** API (`result_source='manual'`).

**Poängmotor:** ren TypeScript-funktion (`scoring.ts`), ingen LLM.
- Input: alla matcher+resultat, alla tips, reglerna. Output: poäng/person + breakdown.
- **Deterministisk:** samma tips + samma facit → identiska poäng.
- **Självtest:** ett "facit" där allt är rätt → exakt 168p (enhetstest).
- Körs om efter varje godkänd resultatuppdatering; skriver `standings` (inkl. `prev_rank` för ▲▼).

**Härledda värden (räknas ur resultaten, matas aldrig in manuellt):**
grupptabeller & gruppvinnare, flest/minst mål, vilka lag som går vidare, finalister, brons, vinnare.

---

## 8. Slutspels-/avancemangslogik

Riktiga WC2026-formatet: 12 grupper à 4 lag → topp 2 + 8 bästa trea går till slutspel (R32),
sedan R16, kvartsfinal, semifinal, bronsmatch, final (totalt 104 matcher).

- Gruppplaceringar räknas ur gruppmatchernas resultat (FIFA-tiebreakers, §3).
- Slutspelsträdet (vem möter vem) kommer från API:t när grupperna är klara; lagras på
  `matches`-rader med `stage` ≠ `group` och TBD-lag tills resultaten finns.
- Bonuspoäng för finalister/brons/vinnare härleds ur slutspelsresultaten.

Manuell override (§7) är säkerhetsnätet om API:t har fel eller släpar.

---

## 9. UI & designspråk

**Designriktning:** Retro Panini-VM — tjocka svarta konturer (#1c1c22), hard-shadow-kort,
klassiska VM-primärfärger (röd #e23b3b, blå #2b5fd0, grön #1b9e5a) på gräddvit (#fdeecf).
Mockup: `mockups/layout-retro.html`.

**Sidor:**
- **Loppet** (start) — hero-barometern. En bana per deltagare, ansiktet (initial-cirkel tills
  foto laddats upp) glider mot mål vid 168p, ledaren markeras (krona). Animeras när poäng uppdateras.
- **Tabell** — leaderboard med placering, poäng/168 och rörelsepilar (▲▼ vs gårdagen).
- **Matcher** — matchlista per dag: färdigspelad / live / kommande, med deltagarens eget tips + rätt/fel.
- **Statistik** — kul fakta (bäst på resultat, mest vågat tips, längsta rätt-svit, dagens klättrare).
- **Admin** (endast Carl) — skapa/hantera konton, hämta & godkänna resultat, manuell inmatning,
  lås upp enskild deltagare, kör om poäng.

Avatarer börjar som initial-cirklar (placeholder) och byts mot riktiga ansiktsfoton.

---

## 10. PWA & deploy

- **PWA:** web app manifest, ikoner, service worker för offline app-shell och cachad senaste tabell.
  Installerbar på mobilens hemskärm.
- **Deploy:** Vercel (Next.js) + Supabase (Postgres). Miljövariabler: Supabase-URL/nyckel,
  JWT-secret, football-data.org-token. Uppdateringar via Claude Code → commit → push → auto-redeploy.

---

## 11. Säkerhet

- Lösenord hashas med bcrypt; aldrig i klartext.
- Session som signerad JWT i HttpOnly-, Secure-, SameSite-cookie.
- Alla skrivningar går via serverless-endpoints som verifierar session + ägarskap
  (en deltagare kan bara ändra sitt eget tip; bara admin når admin-endpoints).
- API-token och Supabase-service-nyckel ligger som server-side env, exponeras aldrig i klienten.
- Tips-lås upprätthålls server-side (inte bara i UI).

---

## 12. Testning & scenarier

Poängmotorn enhetstestas mot bl.a.:
- Tomt tip och delvis ifyllt tip.
- Allt-rätt-facit → exakt 168p (självtest).
- Oavgjort i flest/minst mål (delad topp/botten).
- Gruppvinnar-tiebreakers (lika poäng, målskillnad avgör).
- Slutspel ej spelat än (TBD-lag) → inga bonuspoäng utdelade i förtid.
- Dubblerat finalist-tip → max 8p, inte 16p.

Flödestester:
- Uppladdning efter lås nekas (server-side).
- Trasig/felformaterad Excel → tydligt fel, inget sparas.
- API nere → manuell inmatning fungerar fristående.
- API-förslag som admin avvisar → ingen ändring skrivs.

---

## 13. Utanför scope (YAGNI v1)

- Push-notiser / e-post.
- Chatt eller kommentarer i appen.
- Flera samtidiga turneringar/säsonger (byggs för 2026; generaliseras senare vid behov).
- Automatisk cron-synk (vi kör admin-knapp; cron kan läggas till senare om det blir tjatigt).
- In-app-formulär för tips (Excel-uppladdning är vald väg).

---

## 14. Antaganden

- WC2026-lottningen och fixturerna är spikade och tillgängliga via API innan turneringsstart 11 juni 2026.
- Gänget är litet (storleksordning 5–15 personer) → ingen skalningsoptimering behövs.
- Admin (Carl) är tillgänglig dagligen under turneringen för att godkänna resultat.
