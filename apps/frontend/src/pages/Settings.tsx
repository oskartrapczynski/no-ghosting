import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface Adapter {
  id: string;
  name: string;
}

export function Settings() {
  const [adapters, setAdapters] = useState<Adapter[]>([]);

  useEffect(() => {
    api<Adapter[]>("/adapters")
      .then(setAdapters)
      .catch(() => setAdapters([]));
  }, []);

  return (
    <div>
      <h2 style={{ fontSize: 24, marginBottom: 24 }}>Settings</h2>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>ATS Adapters</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {adapters.map((adapter) => (
            <div
              key={adapter.id}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{adapter.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>ID: {adapter.id}</div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "rgba(34,197,94,0.1)",
                  color: "var(--color-success)",
                }}
              >
                Registered
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Channels</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { type: "EMAIL", name: "Email (SMTP)", configured: false },
            { type: "SMS", name: "SMS", configured: false },
            { type: "ATS_MESSAGE", name: "ATS Messaging", configured: false },
          ].map((ch) => (
            <div
              key={ch.type}
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{ch.name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Type: {ch.type}</div>
              </div>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: ch.configured ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                  color: ch.configured ? "var(--color-success)" : "var(--color-warning)",
                }}
              >
                {ch.configured ? "Configured" : "Not configured"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
