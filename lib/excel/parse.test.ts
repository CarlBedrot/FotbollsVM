// lib/excel/parse.test.ts
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { templateBuffer } from './template';
import { parseWorkbook } from './parse';
import { makeTestFixtures } from './testFixtures';
import { NAME_CELL, pickCell, bonusPickCell, bonusKeysInOrder } from './layout';
import { groupMatches } from '../fixtures/load';

describe('parseWorkbook (round-trip)', () => {
  const fixtures = makeTestFixtures();

  async function fillAndParse(fill: (ws: ExcelJS.Worksheet) => void) {
    const buf = await templateBuffer(fixtures);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    fill(wb.getWorksheet('Tips')!);
    const out = Buffer.from(await wb.xlsx.writeBuffer());
    return parseWorkbook(out, fixtures);
  }

  it('reads name, match picks and bonus team ids', async () => {
    const gms = groupMatches(fixtures);
    const parsed = await fillAndParse((ws) => {
      ws.getCell(NAME_CELL).value = 'Carl';
      ws.getCell(pickCell(0)).value = '1';
      ws.getCell(pickCell(1)).value = 'X';
      ws.getCell(pickCell(2)).value = '2';
      // group_winner_A = a team name from group A; champion = some team
      ws.getCell(bonusPickCell(12, 0)).value = 'Team A0';
      ws.getCell(bonusPickCell(12, 17)).value = 'Team B1';
    });

    expect(parsed.name).toBe('Carl');
    expect(parsed.matchPicks[gms[0].id]).toBe('1');
    expect(parsed.matchPicks[gms[1].id]).toBe('X');
    expect(parsed.matchPicks[gms[2].id]).toBe('2');
    expect(parsed.bonus.group_winner_A).toBe('a0');
    expect(parsed.bonus.champion).toBe('b1');
    expect(parsed.warnings).toEqual([]);
  });

  it('warns on an unrecognised team name and an invalid pick', async () => {
    const parsed = await fillAndParse((ws) => {
      ws.getCell(pickCell(0)).value = '3'; // invalid
      ws.getCell(bonusPickCell(12, 17)).value = 'Nonexistent FC';
    });
    expect(parsed.warnings.length).toBeGreaterThanOrEqual(2);
    expect(parsed.matchPicks[groupMatches(fixtures)[0].id]).toBeUndefined();
    expect(parsed.bonus.champion).toBeUndefined();
  });

  it('is tolerant of case and diacritics in team names', async () => {
    const parsed = await fillAndParse((ws) => {
      ws.getCell(bonusPickCell(12, 17)).value = '  team a0  '; // lower + spaces
    });
    expect(parsed.bonus.champion).toBe('a0');
  });
});
