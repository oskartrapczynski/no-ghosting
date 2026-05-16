import { useEffect, useState } from "react";

interface Stats {
  total: number;
  active: number;
  ghosted: number;
  responseRate: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/pipelines/stats?tenantId=demo")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setStats({ total: 0, active: 0, ghosted: 0, responseRate: 100 }));
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 24, marginBottom: 24 }}>Dashboard</h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard label="Total Candidates" value={stats?.total ?? "..."} />
        <StatCard label="Active" value={stats?.active ?? "..."} color="var(--color-success)" />
        <StatCard label="Ghosted" value={stats?.ghosted ?? "..."} color="var(--color-danger)" />
        <StatCard
          label="Response Rate"
          value={stats ? `${stats.responseRate.toFixed(1)}%` : "..."}
          color="var(--color-primary)"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: 20,
      }}
    >
      <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color ?? "var(--color-text)" }}>
        {value}
      </div>
    </div>
  );
}
