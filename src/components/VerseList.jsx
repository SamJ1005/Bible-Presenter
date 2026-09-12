// VerseList.jsx
import React, { useEffect } from "react";

export default function VerseList({ count = 0, selectedVerse, setSelectedVerse, verseScrollRef, theme, selectedBook, selectedChapter, sendToPresentation, settings, resetFontOffsets, zeroedSettings }) {
  
  // Auto-scroll to selected verse
  useEffect(() => {
    if (verseScrollRef.current) {
      const selectedEl = verseScrollRef.current.querySelector(".verse-item.selected");
      if (selectedEl) {
        // use manual scrollTop to avoid scrolling the whole page and ensure precise centering
        const container = verseScrollRef.current;
        const offset = selectedEl.offsetTop;
        const height = selectedEl.clientHeight; 
        const containerHeight = container.clientHeight;
        
        // Center the item: ScrollTop = ItemTop - (ContainerHeight/2) + (ItemHeight/2)
        container.scrollTop = offset - (containerHeight / 2) + (height / 2);
      }
    }
  }, [selectedVerse]);

  return (
    <div style={{ width: "25%", display: "flex", flexDirection: "column", minWidth: 0 }}>
      <h3 style={{ marginBottom: "10px", opacity: 0.8, fontSize: "1.1rem" }}>Verse</h3>
      <div style={{ flex: 1, minHeight: 0, border: "1px solid #aaa", borderRadius: "6px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div ref={verseScrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", position: "relative", background: theme === "dark" ? "#0f0e0eff" : "#eee" }}>
          {Array.from({ length: count }, (_, i) => i + 1).map((v) => (
            <div
              key={v}
              className={`verse-item ${Number(v) === Number(selectedVerse) ? "selected" : ""}`}
              onClick={() => {
                setSelectedVerse(v);
                // Also send to presentation (Option A)
                resetFontOffsets?.(); // Reset per-verse font offset in UI
                sendToPresentation({
                  selectedBook,
                  selectedChapter,
                  selectedVerse: v,
                  settings: zeroedSettings ? zeroedSettings(settings) : settings,
                });
              }}
              style={{
                padding: 4,
                cursor: "pointer",
                borderRadius: 4,
                background: Number(v) === Number(selectedVerse)
                  ? (theme === "dark" ? "rgba(0, 255, 153, 0.25)" : "rgba(0, 51, 153, 0.18)")
                  : "transparent",
                color: Number(v) === Number(selectedVerse)
                  ? (theme === "dark" ? "#00ff99" : "#003399")
                  : (theme === "dark" ? "#ffffff" : "#000000"),
                fontWeight: Number(v) === Number(selectedVerse) ? "700" : "400",
                transition: "background 0.2s ease, color 0.2s ease",
              }}
            >
              {v}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
//When the arrow buttons is added, the output is blank. why is the output blank so?