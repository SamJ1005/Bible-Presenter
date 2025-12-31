import React from "react";

export default function ChapterList({ count = 0, selectedChapter, setSelectedChapter, chapterScrollRef, theme }) {
  const sbWidth = 14;
  return (
    <div style={{ width: "28%", display: "flex", flexDirection: "column", minWidth: 0 }}>
      <h3 style={{ marginBottom: "10px", opacity: 0.7, fontSize: "1.1rem" }}>Chapter</h3>
      <div style={{ position: "relative", flex: 1, minHeight: 0, border: "1px solid #aaa", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
        <div ref={chapterScrollRef} style={{flex: 1, minHeight: 0, overflowY: "auto", background: theme === "dark" ? "#0f0e0eff" : "#eee" }}>
          {Array.from({ length: count }, (_, i) => i + 1).map((ch) => (
            <div key={ch} className={`chapter-item ${ch === selectedChapter ? "selected" : ""}`} onClick={() => setSelectedChapter(ch)} style={{ padding: "4px", borderRadius: "4px", cursor: "pointer", background: ch === Number(selectedChapter) ? (theme === "dark" ? "#00ff9933" : "#c0d5ffff") : "transparent" }}>
              {ch}
            </div>
          ))}
        </div>

        <button onClick={() => (chapterScrollRef.current.scrollTop -= 40)} style={{ position: "absolute", top: 0, right: 0, width: `${sbWidth}px`, height: "20px", background: theme === "dark" ? "#1e1e1e" : "#ddd", border: "none", color: theme === "dark" ? "#00ff99" : "#003399", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
          ▲
        </button>
        <button onClick={() => (chapterScrollRef.current.scrollTop += 40)} style={{ position: "absolute", bottom: 0, right: 0, width: `${sbWidth}px`, height: "20px", background: theme === "dark" ? "#1e1e1e" : "#ddd", border: "none", color: theme === "dark" ? "#00ff99" : "#003399", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
          ▼
        </button>
      </div>
    </div>
  );
}
