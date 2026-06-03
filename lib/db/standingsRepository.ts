import type { Standing } from '../results/types';

export interface StandingsRepository {
  getAll(): Promise<Standing[]>;
  replaceAll(standings: Standing[]): Promise<void>;
}
