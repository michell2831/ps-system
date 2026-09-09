import { COLORS } from "../constants/colors";

export default function Input({ placeholder, type = "text", value, onChange, error, style: s = {} }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      style={{
        width: "100%", padding: "9px 12px",
        border: error ? `1px solid ${COLORS.nonCompliant}` : `1px solid ${COLORS.border}`,
        borderRadius: 8, fontSize: 13,
        color: COLORS.text, outline: "none",
        background: "#fff", boxSizing: "border-box",
        ...s,
      }}
    />
  );
}
