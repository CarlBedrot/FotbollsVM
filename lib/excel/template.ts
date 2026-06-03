import ExcelJS from 'exceljs';
import type { GroupId } from '../domain/types';
import { GROUP_IDS } from '../domain/rules';
import type { Fixtures, FixtureMatch } from '../fixtures/types';
import { groupMatches, teamsInGroup } from '../fixtures/load';
import {
  SHEET_TIPS, SHEET_LISTS, NAME_CELL,
  MATCH_HEADER_ROW, COL_DATE, COL_MATCH, COL_PICK, matchRow, pickCell,
  bonusKeysInOrder, bonusFirstRow, bonusRow, bonusPickCell, bonusLabelCell,
  listsColumnForGroup,
} from './layout';

const BONUS_LABELS: Record<string, string> = {
  most_goals: 'Flest mål i gruppspelet',
  fewest_goals: 'Minst mål i gruppspelet',
  finalist_1: 'Finalist 1',
  finalist_2: 'Finalist 2',
  bronze: 'VM-brons',
  champion: 'VM-vinnare',
};

function bonusLabel(key: string): string {
  if (key.startsWith('group_winner_')) return `Gruppvinnare ${key.slice('group_winner_'.length)}`;
  return BONUS_LABELS[key] ?? key;
}

export function buildTemplateWorkbook(fixtures: Fixtures): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(SHEET_TIPS);
  const lists = wb.addWorksheet(SHEET_LISTS);

  // --- Lists sheet: all teams in column A; each group's teams in C..N ---
  fixtures.teams
    .map((t) => t.name)
    .sort((a, b) => a.localeCompare(b))
    .forEach((name, i) => {
      lists.getCell(`A${i + 1}`).value = name;
    });
  for (const g of GROUP_IDS) {
    const col = listsColumnForGroup(g);
    teamsInGroup(fixtures, g).forEach((t, i) => {
      lists.getCell(`${col}${i + 1}`).value = t.name;
    });
  }
  lists.state = 'hidden';

  // --- Tips sheet header ---
  ws.getCell('A1').value = 'VM-tipset 2026';
  ws.getCell('A2').value = 'NAMN:';
  ws.getCell(NAME_CELL).value = null;
  ws.getCell(`${COL_DATE}${MATCH_HEADER_ROW}`).value = 'Datum';
  ws.getCell(`${COL_MATCH}${MATCH_HEADER_ROW}`).value = 'Match';
  ws.getCell(`${COL_PICK}${MATCH_HEADER_ROW}`).value = '1/X/2';

  // --- Match rows ---
  const gms: FixtureMatch[] = groupMatches(fixtures);
  gms.forEach((m, i) => {
    const r = matchRow(i);
    ws.getCell(`${COL_DATE}${r}`).value = m.kickoff.slice(0, 10);
    ws.getCell(`${COL_MATCH}${r}`).value = `${m.homeLabel} - ${m.awayLabel}`;
    const pick = ws.getCell(pickCell(i));
    pick.value = null;
    pick.dataValidation = { type: 'list', allowBlank: true, formulae: ['"1,X,2"'] };
  });

  // --- Bonus block ---
  const matchCount = gms.length;
  ws.getCell(`A${bonusFirstRow(matchCount)}`).value = 'BONUS';
  const allTeamsRange = `${SHEET_LISTS}!$A$1:$A$${fixtures.teams.length}`;
  bonusKeysInOrder().forEach((key, i) => {
    ws.getCell(bonusLabelCell(matchCount, i)).value = bonusLabel(key);
    const pick = ws.getCell(bonusPickCell(matchCount, i));
    pick.value = null;
    if (key.startsWith('group_winner_')) {
      const g = key.slice('group_winner_'.length) as GroupId;
      const col = listsColumnForGroup(g);
      pick.dataValidation = { type: 'list', allowBlank: true, formulae: [`${SHEET_LISTS}!$${col}$1:$${col}$4`] };
    } else {
      pick.dataValidation = { type: 'list', allowBlank: true, formulae: [allTeamsRange] };
    }
  });

  ws.getColumn('A').width = 22;
  ws.getColumn('B').width = 34;
  ws.getColumn('C').width = 10;
  return wb;
}

export async function templateBuffer(fixtures: Fixtures): Promise<Buffer> {
  const wb = buildTemplateWorkbook(fixtures);
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}
