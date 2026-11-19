import { useAgent } from "../useAgent.js";
import { css } from "../styles.js";
import { GoalInput } from "./GoalInput.jsx";
import { StatusBadge } from "./StatusBadge.jsx";
import { StepList } from "./StepList.jsx";

// <AgentBar serverUrl="https://agent.example.com" apiKey="pk_..." />
// data-agent-ignore keeps the bar out of what the agent sees. New variants should keep it on their root.
export function AgentBar({ serverUrl, apiKey, maxSteps, placeholder = "What should I do on this page?", className, style }) {
  const { status, steps, error, running, run, stop } = useAgent({ serverUrl, apiKey, maxSteps });

  return (
    <div data-agent-ignore="" className={className} style={{ ...css.root, ...style }}>
      <GoalInput running={running} onRun={run} onStop={stop} placeholder={placeholder} />
      {status !== "idle" && (
        <div style={css.panel}>
          <StatusBadge status={status} />
          {error && <span style={css.error}> {error}</span>}
          <StepList steps={steps} />
        </div>
      )}
    </div>
  );
}
