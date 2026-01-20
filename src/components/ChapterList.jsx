import React, { useEffect } from "react";

export default function ChapterList({ count = 0, selectedChapter, setSelectedChapter, chapterScrollRef, theme }) {
  
  // Auto-scroll to selected chapter
  useEffect(() => {
    if (chapterScrollRef.current) {
      const selectedEl = chapterScrollRef.current.querySelector(".chapter-item.selected");
      if (selectedEl) {
        const container = chapterScrollRef.current;
        const offset = selectedEl.offsetTop;
        const height = selectedEl.clientHeight;
        const containerHeight = container.clientHeight;
        container.scrollTop = offset - (containerHeight / 2) + (height / 2);
      }
    }
  }, [selectedChapter]);

  return (
    <div style={{ width: "28%", display: "flex", flexDirection: "column", minWidth: 0 }}>
      <h3 style={{ marginBottom: "10px", opacity: 0.7, fontSize: "1.1rem" }}>Chapter</h3>
      <div style={{ flex: 1, minHeight: 0, border: "1px solid #aaa", borderRadius: "6px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        
        <div ref={chapterScrollRef} style={{flex: 1, minHeight: 0, overflowY: "auto", position: "relative", background: theme === "dark" ? "#0f0e0eff" : "#eee" }}>
          {Array.from({ length: count }, (_, i) => i + 1).map((ch) => (
            <div key={ch} className={`chapter-item ${ch === selectedChapter ? "selected" : ""}`} onClick={() => setSelectedChapter(ch)} style={{ padding: "4px", borderRadius: "4px", cursor: "pointer", background: ch === Number(selectedChapter) ? (theme === "dark" ? "#00ff9933" : "#c0d5ffff") : "transparent" }}>
              {ch}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
