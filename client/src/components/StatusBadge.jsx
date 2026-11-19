import { css, colors, statusColors } from "../styles.js";

export function StatusBadge({ status }) {
  return <span style={{ ...css.status, background: statusColors[status] || colors.muted }}>{status}</span>;
}
