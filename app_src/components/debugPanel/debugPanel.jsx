import "./debugPanel.scss";
import React from "react";
import { useContext } from "../../context";

const lineColor = (line) => {
  const t = line.replace(/^\s+/, '');
  if (t.startsWith("=== PASTE") || t.startsWith("=== SHAPE") || t.startsWith("=== FIT") || t.startsWith("=== END")) return { color: "#00B4D8", fontWeight: "bold" };
  if (t.startsWith("===")) return { color: "#00B4D8", fontWeight: "bold" };
  if (t.startsWith("--- [")) return { color: "#A78BFA", fontWeight: "bold" };
  if (t.startsWith("---") || t.startsWith("========")) return { color: "#8B8D97", fontWeight: "bold" };
  if (t.startsWith("[SHAPE] >>") || t.startsWith("[SHAPE] -> Prefer")) return { color: "#1CC88A", fontWeight: "bold" };
  if (t.startsWith("[SHAPE]") && t.indexOf("skip") !== -1) return { color: "#F59E0B" };
  if (t.startsWith("[SEL]")) return { color: "#00B4D8" };
  if (t.startsWith("[SHAPE]")) return { color: "#F6C23E" };
  if (t.startsWith("[FIT] Rendered") || t.startsWith("[FIT] Final")) return { color: "#1CC88A" };
  if (t.startsWith("[FIT]")) return { color: "#14B8A6" };
  if (t.startsWith("[WARN]")) return { color: "#F6C23E", fontWeight: "bold" };
  if (t.startsWith("[ERR]")) return { color: "#EF4444", fontWeight: "bold" };
  if (t.startsWith("error:")) return { color: "#EF4444" };
  if (t.startsWith("[INFO]")) return { color: "#8B8D97" };
  if (line.startsWith("  ")) return { color: "#9CA3AF" };
  return { color: "#D1D5DB" };
};

const DebugPanel = React.memo(function DebugPanel() {
  const context = useContext();
  const log = context.state.debugLog;

  if (!context.state.debugMode) return null;

  const clear = () => context.dispatch({ type: "setDebugLog", value: "" });

  const renderLog = (text) => {
    if (!text) return <span style={{ color: "#5A5C69" }}>(no log yet -- paste text to see debug output)</span>;
    return text.split("\n").map((line, idx) => (
      <span key={idx} style={{ display: "block", ...lineColor(line) }}>{line || "\u00a0"}</span>
    ));
  };

  return (
    <div className="debug-panel">
      <div className="debug-panel__header">
        <span className="debug-panel__title">Debug Log</span>
        <span className="debug-panel__clear" onClick={clear}>Clear</span>
        <span className="debug-panel__close" onClick={() => context.dispatch({ type: "setDebugMode", value: false })}>x</span>
      </div>
      <pre className="debug-panel__body">{renderLog(log)}</pre>
    </div>
  );
});

export default DebugPanel;
