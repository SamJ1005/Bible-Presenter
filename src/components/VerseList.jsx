// VerseList.jsx
import React from "react";

export default function VerseList({ count = 0, selectedVerse, setSelectedVerse, verseScrollRef, theme, selectedBook, selectedChapter, sendToPresentation }) {
  const sbWidth = 14;
  return (
    <div style={{ width: 90, display: "flex", flexDirection: "column" }}>
      <h3 style={{ marginBottom: "10px" }}>Verse</h3>
      <div style={{ position: "relative", height: "300px", border: "1px solid #aaa", borderRadius: "6px", overflow: "hidden", display: "flex" }}>
        <div ref={verseScrollRef} style={{ flex: 1, overflowY: "scroll", background: theme === "dark" ? "#0f0e0eff" : "#eee" }}>
          {Array.from({ length: count }, (_, i) => i + 1).map((v) => (
            <div
              key={v}
              onClick={() => {
                setSelectedVerse(v);
                // Also send to presentation (Option A)
                sendToPresentation({
                  selectedBook,
                  selectedChapter,
                  selectedVerse: v,
                });
              }}
              style={{
                padding: 6,
                cursor: "pointer",
                borderRadius: 4,
                background: Number(v) === Number(selectedVerse) ? (theme === "dark" ? "#00ff9933" : "#c0d5ffff") : "transparent",
              }}
            >
              {v}
            </div>
          ))}
        </div>
        <button onClick={() => (verseScrollRef.current.scrollTop -= 40)} style={{ position: "absolute", top: 0, right: 0, width: `${sbWidth}px`, height: "20px", background: theme === "dark" ? "#1e1e1e" : "#ddd", border: "none", color: theme === "dark" ? "#00ff99" : "#003399", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
          ▲
        </button>
        <button onClick={() => (verseScrollRef.current.scrollTop += 40)} style={{ position: "absolute", bottom: 0, right: 0, width: `${sbWidth}px`, height: "20px", background: theme === "dark" ? "#1e1e1e" : "#ddd", border: "none", color: theme === "dark" ? "#00ff99" : "#003399", cursor: "pointer", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px" }}>
          ▼
        </button>
      </div>
    </div>
  );
}
//When the arrow buttons is added, the output is blank. why is the output blank so?