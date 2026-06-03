import { getSupabaseAdmin } from '../lib/supabase';
import { loadFixtures } from '../lib/fixtures/load';

async function main() {
  const db = getSupabaseAdmin();
  const f = loadFixtures();

  const teamRows = f.teams.map((t) => ({ id: t.id, name: t.name, group: t.group }));
  const { error: te } = await db.from('teams').upsert(teamRows, { onConflict: 'id' });
  if (te) throw new Error(`teams: ${te.message}`);

  const matchRows = f.matches.map((m) => ({
    id: m.id,
    stage: m.stage,
    group: m.group,
    home_team_id: m.homeTeamId,
    away_team_id: m.awayTeamId,
    home_label: m.homeLabel,
    away_label: m.awayLabel,
    kickoff: m.kickoff,
    ground: m.ground,
    status: 'scheduled',
  }));
  const { error: me } = await db.from('matches').upsert(matchRows, { onConflict: 'id' });
  if (me) throw new Error(`matches: ${me.message}`);

  const { error: se } = await db
    .from('settings')
    .upsert({ id: 1, season: f.season, lock_at: f.firstKickoff }, { onConflict: 'id' });
  if (se) throw new Error(`settings: ${se.message}`);

  console.log(`seeded ${teamRows.length} teams, ${matchRows.length} matches, lock_at=${f.firstKickoff}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
