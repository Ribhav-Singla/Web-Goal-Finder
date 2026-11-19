import { css } from "../styles.js";

export function StepList({ steps }) {
  return (
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
  );
}
