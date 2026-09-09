import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { COLORS } from "../constants/colors";

export default function SelectInput({ value, onChange, options, placeholder = "Select...", error, style: s = {} }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const selectedOption = options.find(o => o.value === value);

  const toggleDropdown = () => {
    if (!isOpen) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange({ target: { value: val } });
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", ...s }}>
      <div
        onClick={toggleDropdown}
        style={{
          width: "100%", padding: "9px 12px",
          border: error ? `1px solid ${COLORS.nonCompliant}` : `1px solid ${COLORS.border}`,
          borderRadius: 8, fontSize: 13,
          color: COLORS.text, outline: "none",
          background: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxSizing: "border-box",
          minHeight: 38,
        }}
      >
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: selectedOption ? COLORS.text : COLORS.muted }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 8, flexShrink: 0 }}>
          <path d="M2 4L6 8L10 4" stroke={COLORS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {isOpen && createPortal(
        <div
          style={{
            position: "absolute",
            top: dropdownPos.top + 4,
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: 320, // Add max height so long lists don't go off-screen
            overflowY: "auto", // Allow scrolling
            background: "#fff",
            border: `1px solid ${COLORS.border}`,
            borderRadius: 8,
            boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            zIndex: 99999,
          }}
        >
          {options.map(o => (
            <div
              key={o.value}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent focus loss
                handleSelect(o.value);
              }}
              style={{
                padding: "10px 12px",
                fontSize: 13,
                cursor: "pointer",
                background: value === o.value ? "#F0F9FF" : "#fff",
                color: value === o.value ? COLORS.accent : COLORS.text,
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => e.target.style.background = "#F9FAFB"}
              onMouseLeave={(e) => e.target.style.background = value === o.value ? "#F0F9FF" : "#fff"}
            >
              {o.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
