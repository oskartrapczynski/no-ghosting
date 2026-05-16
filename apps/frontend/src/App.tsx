import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Pipelines } from "./pages/Pipelines";
import { Candidates } from "./pages/Candidates";
import { Rules } from "./pages/Rules";
import { Settings } from "./pages/Settings";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pipelines" element={<Pipelines />} />
        <Route path="/candidates" element={<Candidates />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
