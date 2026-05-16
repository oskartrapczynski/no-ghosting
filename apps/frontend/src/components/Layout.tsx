import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/pipelines", label: "Pipelines" },
  { to: "/candidates", label: "Candidates" },
  { to: "/rules", label: "Follow-up Rules" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <nav
        style={{
          width: 240,
          background: "var(--color-surface)",
          borderRight: "1px solid var(--color-border)",
          padding: "24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <h1
          style={{
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 24,
            color: "var(--color-primary)",
          }}
        >
          No Ghosting
        </h1>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            style={({ isActive }) => ({
              display: "block",
              padding: "8px 12px",
              borderRadius: 6,
              color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
              background: isActive ? "rgba(99, 102, 241, 0.1)" : "transparent",
              fontWeight: isActive ? 600 : 400,
              fontSize: 14,
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <main style={{ flex: 1, padding: 32 }}>
        <Outlet />
      </main>
    </div>
  );
}
