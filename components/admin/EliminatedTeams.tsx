"use client";
import { useState } from "react";
import type { EliminationEntry } from "@/lib/view/serverData";

export function EliminatedTeams({ initial }: { initial: EliminationEntry[] }) {
  const [teams, setTeams] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(teamId: string, eliminated: boolean) {
    setBusy(teamId);
    const res = await fetch("/api/admin/eliminated", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ teamId, eliminated }),
    });
    if (res.ok)
      setTeams((ts) =>
        ts.map((t) => (t.teamId === teamId ? { ...t, eliminated } : t)),
      );
    setBusy(null);
  }

  if (teams.length === 0) {
    return (
      <p className="muted" style={{ fontSize: 12 }}>
        Inga lag att visa.
      </p>
    );
  }

  return (
    <div
      className="stack"
      style={{ gap: 6, maxHeight: 320, overflowY: "auto", paddingRight: 4 }}
    >
      {teams.map((t) => (
        <div
          key={t.teamId}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              textDecoration: t.eliminated ? "line-through" : "none",
              opacity: t.eliminated ? 0.55 : 1,
            }}
          >
            {t.teamName}
          </span>
          <button
            type="button"
            className={`btn ${t.eliminated ? "" : "btn-accent"}`}
            disabled={busy === t.teamId}
            onClick={() => toggle(t.teamId, !t.eliminated)}
          >
            {t.eliminated ? "Återuppliva" : "Slå ut"}
          </button>
        </div>
      ))}
    </div>
  );
}
