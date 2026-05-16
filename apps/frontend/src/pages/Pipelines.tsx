import { useEffect, useState } from "react";

interface Stage {
  id: string;
  name: string;
  order: number;
}

interface Pipeline {
  id: string;
  name: string;
  atsSource: string | null;
  active: boolean;
  stages: Stage[];
}

export function Pipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  useEffect(() => {
    fetch("/api/pipelines?tenantId=demo-tenant")
      .then((r) => r.json())
      .then(setPipelines)
      .catch(() => setPipelines([]));
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 24, marginBottom: 24 }}>Pipelines</h2>
      {pipelines.length === 0 ? (
        <p style={{ color: "var(--color-text-muted)" }}>No pipelines synced yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600 }}>{pipeline.name}</h3>
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: pipeline.active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                    color: pipeline.active ? "var(--color-success)" : "var(--color-danger)",
                  }}
                >
                  {pipeline.active ? "Active" : "Inactive"}
                </span>
              </div>
              {pipeline.atsSource && (
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 12 }}>
                  Source: {pipeline.atsSource}
                </p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {pipeline.stages.map((stage) => (
                  <span
                    key={stage.id}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 4,
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {stage.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
