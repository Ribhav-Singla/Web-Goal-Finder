import { useState } from "react";
import { css, colors } from "../styles.js";

// The text box with Run / Stop. Extra controls (e.g. a mic button) go next to the input.
export function GoalInput({ running, onRun, onStop, placeholder }) {
  const [goal, setGoal] = useState("");
  const empty = !goal.trim();

  return (
    <form onSubmit={(e) => { e.preventDefault(); onRun(goal); }} style={css.form}>
      <input
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder={placeholder}
        disabled={running}
        style={css.input}
      />
      {running ? (
        <button type="button" onClick={onStop} style={{ ...css.button, background: colors.danger }}>Stop</button>
      ) : (
        <button type="submit" disabled={empty} style={{ ...css.button, background: colors.primary, opacity: empty ? 0.5 : 1 }}>Run</button>
      )}
    </form>
  );
}
