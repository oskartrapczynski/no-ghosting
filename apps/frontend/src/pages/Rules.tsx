import { useEffect, useState } from "react";

interface FollowUpRule {
  id: string;
  delayDays: number;
  channelType: string;
  templateSubject: string | null;
  templateBody: string;
  maxAttempts: number;
  escalate: boolean;
  active: boolean;
}

interface Stage {
  id: string;
  name: string;
  order: number;
  followUpRules: FollowUpRule[];
}

interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

export function Rules() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [detail, setDetail] = useState<Pipeline | null>(null);

  useEffect(() => {
    fetch("/api/pipelines?tenantId=demo-tenant")
      .then((r) => r.json())
      .then((data: Pipeline[]) => {
        setPipelines(data);
        if (data.length > 0) setSelectedPipeline(data[0].id);
      })
      .catch(() => setPipelines([]));
  }, []);

  useEffect(() => {
    if (!selectedPipeline) return;
    fetch(`/api/pipelines/${selectedPipeline}`)
      .then((r) => r.json())
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedPipeline]);

  return (
    <div>
      <h2 style={{ fontSize: 24, marginBottom: 24 }}>Follow-up Rules</h2>

      {pipelines.length > 1 && (
        <select
          value={selectedPipeline}
          onChange={(e) => setSelectedPipeline(e.target.value)}
          style={{
            marginBottom: 20,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 14,
          }}
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {detail ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {detail.stages.map((stage) => (
            <div
              key={stage.id}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: 16,
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                {stage.order + 1}. {stage.name}
              </h4>
              {stage.followUpRules.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  No rules configured — candidates at this stage won't receive automatic follow-ups.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {stage.followUpRules.map((rule) => (
                    <div
                      key={rule.id}
                      style={{
                        fontSize: 13,
                        padding: "8px 12px",
                        borderRadius: 4,
                        background: "var(--color-bg)",
                        display: "flex",
                        gap: 16,
                        alignItems: "center",
                      }}
                    >
                      <span>After <strong>{rule.delayDays} days</strong> of silence</span>
                      <span style={{ color: "var(--color-text-muted)" }}>via {rule.channelType}</span>
                      <span style={{ color: "var(--color-text-muted)" }}>max {rule.maxAttempts} attempts</span>
                      {rule.escalate && <span style={{ color: "var(--color-warning)" }}>escalates</span>}
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          color: rule.active ? "var(--color-success)" : "var(--color-danger)",
                        }}
                      >
                        {rule.active ? "active" : "disabled"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--color-text-muted)" }}>Select a pipeline to view rules.</p>
      )}
    </div>
  );
}
