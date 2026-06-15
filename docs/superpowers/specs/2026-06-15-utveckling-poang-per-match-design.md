# Design: "Utveckling" — Poäng per match

**Datum:** 2026-06-15
**Projekt:** VM-tipset 2026
**Status:** Godkänd

## Sammanfattning

En ny vy som visar varje spelares **kumulativa poäng efter varje avslutad match** som en linjegraf. En linje per spelare (max 9). Primärt tänkt för desktop. Inspirerad av en referensbild med "Poäng per match"-graf + spelarlista.

## Beslut (från brainstorm)

| Fråga | Beslut |
|-------|--------|
| Vad plottas (Y) | **Total poäng** (match + bonus). Bonusar (gruppvinnare 4p, flest/färst mål 4p, finalister 8p, brons 8p, VM-vinnare 16p) hoppar in i kliv vid den match som avgör dem. |
| X-axel | Avslutade matcher i kronologisk ordning (kickoff), index 1…K. x=0 = startpunkt (0p). |
| Chart-teknik | **Handrullad SVG** (inga nya deps, matchar appens bespoke/testade stil, React-19-säkert). |
| Placering | **Egen flik `/utveckling`** ("Utveckling"). Sidan är full size — ingen modal. |
| Default-läge | **Alla 9 linjer färgade**, namn vid spetsen. Klick på chip lyfter fram (tjockare), övriga tonas. Flera kan vara aktiva. "Alla" återställer. |
| Mobil | Funkar, men graf optimeras för bredd. Ingen separat mobil-vy. |

## Arkitektur

### 1. Route `/utveckling`
- `app/utveckling/page.tsx` — server-component, `export const dynamic = 'force-dynamic'`.
- Laddar data via `loadPointsTimeline()` + `loadStandingsView()` (namn/avatar), skickar till client-wrapper för interaktivitet.
- Nav-flik "Utveckling" läggs till i `components/Nav.tsx` efter Statistik.

### 2. Datalager — `lib/view/pointsTimeline.ts` (ren, testbar)
- `buildPointsTimeline(input: ScoringInput): PointsTimeline`
- **Logik:** sortera avslutade matcher (status finished / har score) på `kickoff` → `[f1…fK]`. För varje steg `i` (1…K): kör `computeScores` med resultat applicerade endast för `f1…fi` (övriga matcher som scheduled, score=null). Resultat = varje spelares kumulativa total efter match `i`. Bonusar tänds automatiskt när triggermatchen kommer in (gruppen blir komplett resp. slutspel avgörs).
- **Returtyp:**
  - `steps: TimelineStep[]` — `{ index, matchId, label, kickoff }` för X-axel/tooltip.
  - `series: PlayerSeries[]` — `{ userId, points: number[] }` där `points[0] = 0` och `points[i]` = total efter `i` avslutade matcher.
- **Prestanda:** ≤72 matcher × 9 spelare, replay ≤72 ggr → försumbart.
- Laddas via ny `loadPointsTimeline()` i `lib/view/serverData.ts` (samma `safe()`-mönster som `loadStandingsView`).

### 3. SVG-skalor — `lib/view/chartScale.ts` (rena funktioner)
- `linearScale(domain: [number, number], range: [number, number]): (v: number) => number`
- `buildLinePath(points: {x:number,y:number}[]): string` → SVG `"M…L…"`.
- Y-domän `0 … max(total)+marginal`; X-domän `0 … K`. Inga deps.

### 4. UI-komponenter (client)
- `components/PointsChart.tsx` — handrullad `<svg>`: axlar, rutnät, en `<path>` per spelare, namn-etikett vid spetsen. Hover → närmaste X-punkt → tooltip (namn + poäng vid den matchen). Highlight-state via props.
- `components/PlayerLegend.tsx` — chip-rutnät (färgprick + namn + totalpoäng) som togglar highlight. "Alla"-knapp.
- Highlight-state (`useState<Set<userId>>`) i en client-wrapper som `page.tsx` renderar.
- **Färger:** återanvänd spelarens identitetsfärg från Loppet-hästarna (`RaceLanes`/`RaceTrack`) om sådan finns; annars stabil palett-funktion på `userId`.

### 5. Tomt/låst läge
- Före första avspark (= lås, 2026-06-11T19:00Z) finns inga avslutade matcher → graf tom.
- Tomtillstånd: "Inga avslutade matcher än — grafen vaknar när resultaten börjar trilla in."
- Ingen extra sekretessgrind: inga resultat existerar före lås, så inget avslöjas i förtid.

## Felhantering
- `loadPointsTimeline()` faller tillbaka till tomt (`{ steps: [], series: [] }`) vid DB-fel (via `safe()`), precis som andra loaders → sidan kraschar aldrig.
- 0 avslutade matcher → tomtillstånd, ingen SVG ritas.
- 1 avslutad match → minst två punkter (x=0 och x=1) så path är giltig.

## Tester (Vitest)
- `lib/view/pointsTimeline.test.ts`: kumulativ korrekthet; bonus-kliv vid rätt match (t.ex. gruppvinnarpoäng dyker upp vid matchen som kompletterar gruppen); tomt läge (0 matcher); en match.
- `lib/view/chartScale.test.ts`: skala mappar domän→range korrekt; path-sträng för 0/1/flera punkter.
- Komponenter hålls tunna; all logik i testade lib-funktioner.

## Medvetet bortvalt (YAGNI)
- Toggle mellan total/match-only (bara total).
- Fullskärms-overlay/modal (egen flik räcker).
- Separat mobil-vy.
- KO-matcher kommer fortfarande inte in automatiskt (befintlig begränsning) — påverkar inte denna vy; bonusar tänds bara om resultat finns.

## Push-regler
Byggs lokalt med tester + ren commit. **Pushas aldrig utan Carls explicita OK per push.** Carl pushar själv.
