import React from "react";

export default function RecentList({ recent = [], onSelect, recentScrollRef, theme }) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
      <h3 style={{ marginTop: "20px", marginBottom: "8px" }}>Recent</h3>

      <div style={{ height: "100px", border: "1px solid #aaa", borderRadius: "6px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        <div ref={recentScrollRef} style={{ flex: 1, overflowY: "auto", padding: "2px", background: theme === "dark" ? "#0f0e0eff" : "#eee" }}>
          {recent.length === 0 && (
            <div style={{ padding: "4px", fontSize: "15px", fontStyle: "italic", opacity: 0.7 }}>No recent verses</div>
          )}
          {recent.map((ref, i) => (
            <div key={i} onClick={() => onSelect(ref)} style={{ padding: "2px 2px", cursor: "pointer", fontSize: "15px", borderBottom: "1px solid rgba(255,255,255,0.05)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {ref}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
