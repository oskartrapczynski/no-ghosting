import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface FollowUpLog {
  id: string;
  channelType: string;
  attemptNumber: number;
  sentAt: string;
  deliveredAt: string | null;
  failedAt: string | null;
}

interface CandidatePipeline {
  id: string;
  status: string;
  currentStageId: string;
  lastContactAt: string | null;
  nextFollowUpAt: string | null;
  pipeline: { name: string };
  stage: { name: string };
  followUpLogs: FollowUpLog[];
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  pipelines: CandidatePipeline[];
}

export function Candidates() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const qs = filter ? `?status=${filter}` : "";
    api<Candidate[]>(`/candidates${qs}`)
      .then(setCandidates)
      .catch(() => setCandidates([]));
  }, [filter]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 24 }}>Candidates</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["", "ACTIVE", "GHOSTED", "HIRED", "REJECTED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: "4px 12px",
                borderRadius: 4,
                border: "1px solid var(--color-border)",
                background: filter === s ? "var(--color-primary)" : "var(--color-surface)",
                color: filter === s ? "#fff" : "var(--color-text-muted)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>
      {candidates.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>No candidates found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>Name</th>
              <th style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>Email</th>
              <th style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>Stage</th>
              <th style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>Status</th>
              <th style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>Next Follow-up</th>
              <th style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-muted)" }}>Attempts</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) =>
              c.pipelines.length > 0 ? (
                c.pipelines.map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "10px 12px", fontSize: 14 }}>{c.name}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-text-muted)" }}>{c.email}</td>
                    <td style={{ padding: "10px 12px", fontSize: 13 }}>{p.stage.name}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <StatusBadge status={p.status} />
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
                      {p.nextFollowUpAt ? new Date(p.nextFollowUpAt).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
                      {p.followUpLogs.length}
                    </td>
                  </tr>
                ))
              ) : (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 12px", fontSize: 14 }}>{c.name}</td>
                  <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-text-muted)" }}>{c.email}</td>
                  <td colSpan={4} style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-text-muted)" }}>Not in pipeline</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    ACTIVE: { bg: "rgba(34,197,94,0.1)", text: "var(--color-success)" },
    GHOSTED: { bg: "rgba(239,68,68,0.1)", text: "var(--color-danger)" },
    HIRED: { bg: "rgba(99,102,241,0.1)", text: "var(--color-primary)" },
    REJECTED: { bg: "rgba(245,158,11,0.1)", text: "var(--color-warning)" },
    WITHDRAWN: { bg: "rgba(139,143,163,0.1)", text: "var(--color-text-muted)" },
  };
  const c = colors[status] || colors.WITHDRAWN;
  return (
    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 4, background: c.bg, color: c.text }}>
      {status}
    </span>
  );
}
