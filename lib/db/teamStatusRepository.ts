/** Which knockout teams admin has marked as eliminated. */
export interface TeamStatusRepository {
  /** Team ids currently marked as eliminated. */
  getEliminated(): Promise<string[]>;
  /** Mark a team eliminated (`true`) or alive again (`false`). */
  setEliminated(teamId: string, eliminated: boolean): Promise<void>;
}
