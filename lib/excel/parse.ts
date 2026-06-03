import ExcelJS from 'exceljs';
import type { BonusKey, GroupId, Pick } from '../domain/types';
import type { Fixtures } from '../fixtures/types';
import { groupMatches, teamIdByName, teamsInGroup } from '../fixtures/load';
import { SHEET_TIPS, NAME_CELL, pickCell, bonusKeysInOrder, bonusPickCell } from './layout';

export interface ParsedPrediction {
  name: string | null;
  matchPicks: Record<string, Pick>;
  bonus: Partial<Record<BonusKey, string>>;
  warnings: string[];
}

function cellString(ws: ExcelJS.Worksheet, addr: string): string | null {
  const v = ws.getCell(addr).value;
  if (v === null || v === undefined) return null;
  if (typeof v === 'object' && 'result' in v) return String((v as { result: unknown }).result ?? '').trim() || null;
  return String(v).trim() || null;
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export async function parseBuffer(buffer: Buffer, fixtures: Fixtures): Promise<ParsedPrediction> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return parseLoaded(wb, fixtures);
}

export function parseWorkbook(buffer: Buffer, fixtures: Fixtures): Promise<ParsedPrediction> {
  return parseBuffer(buffer, fixtures);
}

function parseLoaded(wb: ExcelJS.Workbook, fixtures: Fixtures): ParsedPrediction {
  const ws = wb.getWorksheet(SHEET_TIPS);
  const warnings: string[] = [];
  if (!ws) {
    return { name: null, matchPicks: {}, bonus: {}, warnings: ['Bladet "Tips" saknas i filen.'] };
  }

  const name = cellString(ws, NAME_CELL);
  const matchPicks: Record<string, Pick> = {};
  const gms = groupMatches(fixtures);
  gms.forEach((m, i) => {
    const raw = cellString(ws, pickCell(i));
    if (raw === null) return;
    if (raw === '1' || raw === 'X' || raw === 'x' || raw === '2') {
      matchPicks[m.id] = (raw === 'x' ? 'X' : raw) as Pick;
    } else {
      warnings.push(`Ogiltigt tecken "${raw}" för match ${m.homeLabel}–${m.awayLabel} (förväntar 1, X eller 2).`);
    }
  });

  const byName = teamIdByName(fixtures);
  const bonus: Partial<Record<BonusKey, string>> = {};
  bonusKeysInOrder().forEach((key, i) => {
    const raw = cellString(ws, bonusPickCell(gms.length, i));
    if (raw === null) return;
    const id = byName.get(norm(raw));
    if (!id) {
      warnings.push(`Okänt lagnamn "${raw}" för ${key}.`);
      return;
    }
    if (key.startsWith('group_winner_')) {
      const g = key.slice('group_winner_'.length) as GroupId;
      const inGroup = teamsInGroup(fixtures, g).some((t) => t.id === id);
      if (!inGroup) {
        warnings.push(`"${raw}" tillhör inte grupp ${g}.`);
        return;
      }
    }
    bonus[key] = id;
  });

  return { name, matchPicks, bonus, warnings };
}
