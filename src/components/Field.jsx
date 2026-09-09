import { COLORS } from "../constants/colors";

export default function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: "block", fontSize: 11, fontWeight: 600,
        color: COLORS.muted, letterSpacing: "0.05em",
        textTransform: "uppercase", marginBottom: 5,
      }}>
        {label}
        {required && <span style={{ color: COLORS.accentBtn }}> *</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}
