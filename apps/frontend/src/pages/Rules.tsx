import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface FollowUpRule {
  id: string;
  delayDays: number;
  channelType: "EMAIL" | "SMS" | "ATS_MESSAGE";
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
  const [openForm, setOpenForm] = useState<string | null>(null); // stageId

  useEffect(() => {
    api<Pipeline[]>("/pipelines")
      .then((data) => {
        setPipelines(data);
        if (data.length > 0) setSelectedPipeline(data[0].id);
      })
      .catch(() => setPipelines([]));
  }, []);

  useEffect(() => {
    if (!selectedPipeline) return;
    api<Pipeline>(`/pipelines/${selectedPipeline}`)
      .then(setDetail)
      .catch(() => setDetail(null));
  }, [selectedPipeline]);

  const refresh = () => {
    if (!selectedPipeline) return;
    api<Pipeline>(`/pipelines/${selectedPipeline}`)
      .then(setDetail)
      .catch(() => {});
  };

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
          {detail.stages.map((stage) => {
            const existingRule = stage.followUpRules[0];
            const isOpen = openForm === stage.id;
            return (
              <div
                key={stage.id}
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600 }}>
                    {stage.order + 1}. {stage.name}
                  </h4>
                  <button
                    onClick={() => setOpenForm(isOpen ? null : stage.id)}
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 4,
                      border: "1px solid var(--color-border)",
                      background: isOpen ? "var(--color-bg)" : "var(--color-primary)",
                      color: isOpen ? "var(--color-text-muted)" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {isOpen
                      ? "Cancel"
                      : existingRule
                      ? "Edit rule"
                      : "+ Add rule"}
                  </button>
                </div>

                {!isOpen && (
                  existingRule ? (
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
                  ) : (
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                      No rules configured — candidates at this stage won't receive automatic follow-ups.
                    </p>
                  )
                )}

                {isOpen && (
                  <RuleForm
                    stageId={stage.id}
                    rule={existingRule}
                    onDone={() => {
                      setOpenForm(null);
                      refresh();
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: "var(--color-text-muted)" }}>Select a pipeline to view rules.</p>
      )}
    </div>
  );
}

function RuleForm({
  stageId,
  rule,
  onDone,
}: {
  stageId: string;
  rule?: FollowUpRule;
  onDone: () => void;
}) {
  const isEdit = !!rule;
  const [delayDays, setDelayDays] = useState(rule?.delayDays ?? 3);
  const [channelType, setChannelType] = useState<"EMAIL" | "SMS" | "ATS_MESSAGE">(
    rule?.channelType ?? "EMAIL",
  );
  const [templateSubject, setTemplateSubject] = useState(
    rule?.templateSubject ?? "Following up on your application",
  );
  const [templateBody, setTemplateBody] = useState(
    rule?.templateBody ??
      "Hi {{candidateName}},\n\nJust checking in about your application for {{pipelineName}}. We'll be in touch soon.\n\nThanks!",
  );
  const [maxAttempts, setMaxAttempts] = useState(rule?.maxAttempts ?? 3);
  const [escalate, setEscalate] = useState(rule?.escalate ?? false);
  const [active, setActive] = useState(rule?.active ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        delayDays,
        channelType,
        templateSubject: channelType === "EMAIL" ? templateSubject : undefined,
        templateBody,
        maxAttempts,
        escalate,
        ...(isEdit && { active }),
      };
      if (isEdit) {
        await api(`/follow-ups/rules/by-id/${rule!.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api(`/follow-ups/rules/${stageId}`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      onDone();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!rule) return;
    if (!confirm("Delete this rule?")) return;
    setSubmitting(true);
    setError(null);
    try {
      await api(`/follow-ups/rules/by-id/${rule.id}`, { method: "DELETE" });
      onDone();
    } catch (e: any) {
      setError(e?.message ?? "Failed to delete rule");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: 4,
    border: "1px solid var(--color-border)",
    background: "var(--color-bg)",
    color: "var(--color-text)",
    fontSize: 13,
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 6,
        background: "var(--color-bg)",
        border: "1px dashed var(--color-border)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
          Delay (days)
          <input
            type="number"
            min={0}
            max={365}
            value={delayDays}
            onChange={(e) => setDelayDays(parseInt(e.target.value, 10) || 0)}
            style={{ ...fieldStyle, width: 80 }}
          />
        </label>
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
          Channel
          <select
            value={channelType}
            onChange={(e) => setChannelType(e.target.value as typeof channelType)}
            style={fieldStyle}
          >
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
            <option value="ATS_MESSAGE">ATS_MESSAGE</option>
          </select>
        </label>
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
          Max attempts
          <input
            type="number"
            min={1}
            max={20}
            value={maxAttempts}
            onChange={(e) => setMaxAttempts(parseInt(e.target.value, 10) || 1)}
            style={{ ...fieldStyle, width: 80 }}
          />
        </label>
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 6, alignSelf: "end" }}>
          <input type="checkbox" checked={escalate} onChange={(e) => setEscalate(e.target.checked)} />
          Escalate
        </label>
        {isEdit && (
          <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 6, alignSelf: "end" }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active
          </label>
        )}
      </div>

      {channelType === "EMAIL" && (
        <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
          Subject
          <input
            value={templateSubject}
            onChange={(e) => setTemplateSubject(e.target.value)}
            style={fieldStyle}
          />
        </label>
      )}

      <label style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
        Body — supports {"{{candidateName}}, {{pipelineName}}, {{stageName}}, {{attemptNumber}}"}
        <textarea
          value={templateBody}
          onChange={(e) => setTemplateBody(e.target.value)}
          rows={5}
          style={{ ...fieldStyle, fontFamily: "inherit", resize: "vertical" }}
        />
      </label>

      {error && <div style={{ fontSize: 12, color: "var(--color-danger)" }}>{error}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        {isEdit ? (
          <button
            onClick={remove}
            disabled={submitting}
            style={{
              fontSize: 13,
              padding: "6px 14px",
              borderRadius: 4,
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-danger)",
              cursor: submitting ? "default" : "pointer",
            }}
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={submit}
          disabled={submitting || !templateBody}
          style={{
            fontSize: 13,
            padding: "6px 14px",
            borderRadius: 4,
            border: "none",
            background: "var(--color-primary)",
            color: "#fff",
            cursor: submitting ? "default" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Saving..." : isEdit ? "Save changes" : "Save rule"}
        </button>
      </div>
    </div>
  );
}
