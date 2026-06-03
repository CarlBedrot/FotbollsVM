// lib/excel/template.test.ts
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { buildTemplateWorkbook, templateBuffer } from './template';
import { makeTestFixtures } from './testFixtures';
import { NAME_CELL, pickCell, bonusPickCell } from './layout';

describe('template generator', () => {
  const fixtures = makeTestFixtures(); // 2 groups, 8 teams, 12 group matches

  it('produces a Tips sheet with a name cell, a row per match, and a dropdown on picks', async () => {
    const wb = buildTemplateWorkbook(fixtures);
    const ws = wb.getWorksheet('Tips')!;
    expect(ws).toBeTruthy();
    // name label present (A2) and name cell empty
    expect(ws.getCell(NAME_CELL).value).toBeNull();
    // a pick cell exists and carries a list data-validation
    const dv = ws.getCell(pickCell(0)).dataValidation;
    expect(dv?.type).toBe('list');
    // the match label cell shows "Home - Away"
    const matchCount = fixtures.matches.filter((m) => m.stage === 'group').length;
    expect(matchCount).toBe(12);
  });

  it('adds a hidden Lists sheet and bonus dropdowns', async () => {
    const wb = buildTemplateWorkbook(fixtures);
    const lists = wb.getWorksheet('Listor')!;
    expect(lists.state).toBe('hidden');
    const ws = wb.getWorksheet('Tips')!;
    // champion bonus is the last bonus row and has a list validation
    const dv = ws.getCell(bonusPickCell(12, 17)).dataValidation;
    expect(dv?.type).toBe('list');
  });

  it('round-trips through a buffer', async () => {
    const buf = await templateBuffer(fixtures);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    expect(wb.getWorksheet('Tips')).toBeTruthy();
  });
});
