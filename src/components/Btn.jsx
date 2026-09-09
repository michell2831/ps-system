import { COLORS } from "../constants/colors";

const variants = {
  primary:   { background: COLORS.accentBtn, color: "#fff", border: "none" },
  secondary: { background: "#fff", color: COLORS.text, border: `1px solid ${COLORS.border}` },
  ghost:     { background: "transparent", color: COLORS.muted, border: `1px solid ${COLORS.border}` },
  danger:    { background: COLORS.nonCompliant, color: "#fff", border: "none" },
};

export default function Btn({ children, onClick, variant = "primary", style: s = {}, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      style={{
        padding: "9px 18px", borderRadius: 6,
        fontSize: 13, fontWeight: 600,
        cursor: "pointer",
        ...variants[variant],
        ...s,
      }}
    >
      {children}
    </button>
  );
}
