import { useRef, useState } from "react";
import { runAgent } from "./runAgent.js";

const STATUS_COLORS = { running: "#2563eb", done: "#16a34a", blocked: "#d97706", error: "#dc2626" };

const css = {
  root: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14, color: "#1f2937" },
  form: { display: "flex", gap: 8, padding: 6, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  input: { flex: 1, minWidth: 0, padding: "8px 10px", border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit" },
  button: { padding: "8px 16px", border: "none", borderRadius: 8, font: "inherit", fontWeight: 600, color: "#fff", cursor: "pointer" },
  panel: { marginTop: 8, padding: "10px 12px", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 12 },
  status: { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: "#fff", textTransform: "capitalize" },
  list: { listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 6, maxHeight: 240, overflowY: "auto" },
  step: { display: "flex", gap: 8, alignItems: "baseline" },
  num: { flex: "none", width: 20, color: "#9ca3af", fontSize: 12, textAlign: "right" },
  op: { fontWeight: 600, fontSize: 12, fontFamily: "ui-monospace, monospace" },
  reason: { color: "#6b7280", fontSize: 13 },
  error: { color: "#dc2626" },
};

// <AgentBar serverUrl="https://agent.example.com" apiKey="pk_..." />
// data-agent-ignore keeps the bar out of what the agent sees.
export function AgentBar({ serverUrl, apiKey, maxSteps, placeholder = "What should I do on this page?", className, style }) {
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState("idle");
  const [steps, setSteps] = useState([]);
  const [error, setError] = useState("");
  const controller = useRef(null);
  const running = status === "running";

  async function start(event) {
    event.preventDefault();
    if (running || !goal.trim()) return;
    controller.current = new AbortController();
    setSteps([]);
    setError("");
    setStatus("running");
    try {
      const final = await runAgent({
        goal, serverUrl, apiKey, maxSteps,
        signal: controller.current.signal,
        onStep: (step) => setSteps((s) => [...s, step]),
      });
      setStatus(final);
    } catch (e) {
      if (controller.current.signal.aborted) return setStatus("stopped");
      setError(e.message);
      setStatus("error");
    }
  }

  return (
    <div data-agent-ignore="" className={className} style={{ ...css.root, ...style }}>
      <form onSubmit={start} style={css.form}>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={placeholder}
          disabled={running}
          style={css.input}
        />
        {running ? (
          <button type="button" onClick={() => controller.current.abort()} style={{ ...css.button, background: "#dc2626" }}>
            Stop
          </button>
        ) : (
          <button type="submit" disabled={!goal.trim()} style={{ ...css.button, background: "#2563eb", opacity: goal.trim() ? 1 : 0.5 }}>
            Run
          </button>
        )}
      </form>
      {status !== "idle" && (
        <div style={css.panel}>
          <span style={{ ...css.status, background: STATUS_COLORS[status] || "#6b7280" }}>{status}</span>
          {error && <span style={css.error}> {error}</span>}
          <ol style={css.list}>
            {steps.map((s) => (
              <li key={s.n} style={css.step}>
                <span style={css.num}>{s.n}</span>
                <div>
                  <span style={css.op}>{s.operation}</span> {s.target} {s.text && `"${s.text}"`}
                  {s.result && s.result !== "ok" && <span style={css.error}> ({s.result})</span>}
                  <div style={css.reason}>{s.reason}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
