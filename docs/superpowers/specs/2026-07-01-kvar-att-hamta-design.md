# Kvar att hämta — design

Efter gruppspelet vill spelarna se hur mycket **mer** poäng de kan hämta, och
vilket sluttotal de kan landa på, baserat på nuläget i slutspelet.

## Vad som är kvar

Bara de fyra slutspels-bonusarna är öppna efter gruppspelet:

| Kategori      | Poäng |
| ------------- | ----- |
| `finalist_1`  | 8     |
| `finalist_2`  | 8     |
| `bronze`      | 8     |
| `champion`    | 16    |

Allt annat är låst: matchpoäng (bara gruppspelets 72 matcher tippas),
gruppvinnare, flest mål, färst mål — alla avgjorda av gruppspelet.

## Modell

Per spelare, **optimistiskt tak**: varje fortfarande levande pick antas gå hela
vägen.

```
kvar   = Σ poäng för de kategorier vars tippade lag lever OCH som inte redan är avgjorda
möjligt = nuvarande total + kvar
```

- **Lever** = laget finns inte i admin-listan över utslagna lag.
- **Avgjord** = kategorins avgörande KO-match är spelad (då är poängen redan
  låst i nuvarande total → räknas inte som "kvar", undviker dubbelräkning):
  - champion avgjord ⇔ final spelad
  - brons avgjord ⇔ bronsmatch spelad
  - finalist avgjord ⇔ båda semifinalerna spelade

## Admin styr levande lag

KO-matcherna i datan har platshållarnamn, så appen kan inte automatiskt läsa
vilka lag som åkt ut. Admin markerar därför utslagna lag manuellt.

- Ny tabell `eliminated_teams(team_id text primary key)`. Ett lag i tabellen =
  utslaget. (SQL körs mot Supabase manuellt.)
- Nytt `TeamStatusRepository` (interface + Supabase-impl + in-memory), speglar
  befintliga repos; factory i `repository.ts`.
- Admin-kort "Slutspel: levande lag" listar bara de lag som någon tippat på
  finalist/brons/vinnare (unionen av KO-picks) — inte alla 48. Toggle per lag,
  POST till `/api/admin/eliminated`.

## Ren scoring-funktion

`lib/scoring/remaining.ts` (Vitest-testad, ingen I/O):

```
computeRemaining({ predictions, eliminatedTeamIds, decided }) -> UserRemaining[]
```

där `decided = { finalists, bronze, champion }` (booleans från KO-matchstatus).
Varje `UserRemaining` har `reachable` + en `categories[]` med per-pick-status
(teamId, poäng, `alive`, `counts`) för utfällbar detalj i UI.

## Sida `/kvar`

`force-dynamic`, laddar via `serverData`. Kort/tabell sorterad på möjligt
sluttotal: spelare · nuvarande · kvar · möjligt max, med utfällbar rad som visar
vilka av de fyra picksen som lever/döda/avgjorda. Ny flik i BottomNav.

## Filer

Ny: `lib/scoring/remaining.ts` (+test), `lib/db/teamStatusRepository.ts`,
`lib/db/supabaseTeamStatusRepository.ts`, `lib/db/inMemoryTeamStatusRepository.ts`
(+test), `lib/view/remainingView.ts` (+test), `app/kvar/page.tsx`,
`components/KvarView.tsx`, `components/admin/EliminatedTeams.tsx`,
`app/api/admin/eliminated/route.ts`, `data/sql/eliminated_teams.sql`.
Ändras: `lib/db/repository.ts`, `app/admin/page.tsx`, `components/BottomNav.tsx`.
