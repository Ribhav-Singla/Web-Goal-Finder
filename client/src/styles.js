// Inline styles, so the host app's CSS cannot break the component.
export const colors = {
  text: "#1f2937",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e5e7eb",
  surface: "#fff",
  panel: "#f9fafb",
  primary: "#2563eb",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
};

export const statusColors = { running: colors.primary, done: colors.success, blocked: colors.warning, error: colors.danger };

export const css = {
  root: { fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14, color: colors.text },
  form: { display: "flex", gap: 8, padding: 6, background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  input: { flex: 1, minWidth: 0, padding: "8px 10px", border: "none", outline: "none", background: "transparent", font: "inherit", color: "inherit" },
  button: { padding: "8px 16px", border: "none", borderRadius: 8, font: "inherit", fontWeight: 600, color: "#fff", cursor: "pointer" },
  panel: { marginTop: 8, padding: "10px 12px", background: colors.panel, border: `1px solid ${colors.border}`, borderRadius: 12 },
  status: { display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: "#fff", textTransform: "capitalize" },
  list: { listStyle: "none", margin: "8px 0 0", padding: 0, display: "grid", gap: 6, maxHeight: 240, overflowY: "auto" },
  step: { display: "flex", gap: 8, alignItems: "baseline" },
  num: { flex: "none", width: 20, color: colors.faint, fontSize: 12, textAlign: "right" },
  op: { fontWeight: 600, fontSize: 12, fontFamily: "ui-monospace, monospace" },
  reason: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger },
};
