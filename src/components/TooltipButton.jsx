import { useState } from "react";

export default function TooltipButton({ title, onClick, children, style }) {
  const [show, setShow] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={style}
      >
        {children}
      </button>

      {show && (
        <div
          style={{
            position: "absolute",
            top: "-32px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            padding: "4px 8px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
            fontSize: "12px",
            zIndex: 9999,
            pointerEvents: "none",
          }}
        >
          {title}
        </div>
      )}
    </div>
  );
}
