// ChapterTable.jsx
import React, { useEffect, useRef } from "react";

export default function ChapterTable({
  nkjvSource,
  tamilBookData,
  selectedBook,
  selectedChapter,
  selectedVerse,
  setSelectedVerse,
  theme,
  sendToPresentation,
  verseTableRef,
  settings,
  resetFontOffsets,
  zeroedSettings,
  getTamilVerse,
}) {
  const primaryIsEnglish = (settings?.primaryTranslation ?? "Tamil") === "English";

  // english verses for chapter
  const englishVerses =
    nkjvSource?.books?.find((b) => b.name === selectedBook)?.chapters?.find(
      (c) => Number(c.chapter) === Number(selectedChapter)
    )?.verses ?? [];

  const engMap = Object.fromEntries(englishVerses.map((v) => [String(v.verse), v.text]));

  // Tamil verse numbers from legacy JSON; XML tamil uses verse numbers from english
  const tamilVerses = tamilBookData?.chapters?.find((c) => Number(c.chapter) === Number(selectedChapter))?.verses ?? [];
  const oldTamilVerseNums = tamilVerses.map((v) => Number(v.verse));

  const verseNums = Array.from(
    new Set([...englishVerses.map((v) => Number(v.verse)), ...oldTamilVerseNums])
  ).sort((a, b) => a - b);

  const tamilMap = {};
  if (getTamilVerse) {
    verseNums.forEach((vn) => {
      tamilMap[String(vn)] = getTamilVerse(selectedBook, selectedChapter, vn);
    });
  } else {
    tamilVerses.forEach((v) => {
      tamilMap[String(v.verse)] = v.text;
    });
  }

  const rowRefs = useRef({});

  function handleRowClick(vn) {
    setSelectedVerse(Number(vn));
    resetFontOffsets?.();
    sendToPresentation({
      selectedBook,
      selectedChapter,
      selectedVerse: Number(vn),
      settings: zeroedSettings ? zeroedSettings(settings) : settings,
    });
  }

  useEffect(() => {
    if (selectedVerse && rowRefs.current[selectedVerse]) {
      setTimeout(() => {
        rowRefs.current[selectedVerse]?.scrollIntoView({ behavior: "instant", block: "center" });
      }, 100);
    }
  }, [selectedVerse]);

  const selColor = theme === "dark" ? "#00ff99" : "#003399";
  const borderColor = theme === "dark" ? "#ffffff22" : "#dddddd";

  // Column definitions — order swaps based on primaryTranslation
  const tamilCol = (vn, isSel) => (
    <td style={{ padding: "14px 18px", borderBottom: `1px solid ${borderColor}`, fontFamily: "TamilBibleFont, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ marginRight: 8, fontWeight: 600, flexShrink: 0 }}>{vn}.</div>
        <div style={{ fontSize: 15, lineHeight: 1.5, color: isSel ? selColor : "inherit" }}>
          {tamilMap[String(vn)] ?? <span style={{ opacity: 0.5 }}>—</span>}
        </div>
      </div>
    </td>
  );

  const englishCol = (vn, isSel) => (
    <td style={{ padding: "14px 18px", borderBottom: `1px solid ${borderColor}` }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ marginRight: 8, fontWeight: 600, flexShrink: 0 }}>{vn}.</div>
        <div style={{ fontSize: 15, lineHeight: 1.5, color: isSel ? selColor : "inherit" }}>
          {engMap[String(vn)] ?? <span style={{ opacity: 0.5 }}>—</span>}
        </div>
      </div>
    </td>
  );

  return (
    <table
      ref={verseTableRef}
      style={{ width: "100%", borderCollapse: "collapse", color: theme === "dark" ? "white" : "black" }}
    >
      <thead>
        <tr>
          {primaryIsEnglish ? (
            <>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>English (NKJV)</th>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>Tamil</th>
            </>
          ) : (
            <>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>Tamil</th>
              <th style={{ padding: 10, borderBottom: "1px solid #ddd", textAlign: "left" }}>English (NKJV)</th>
            </>
          )}
        </tr>
      </thead>
      <tbody>
        {verseNums.map((vn) => {
          const isSel = Number(vn) === Number(selectedVerse);
          return (
            <tr
              key={vn}
              ref={(el) => (rowRefs.current[vn] = el)}
              data-vn={vn}
              onClick={() => handleRowClick(vn)}
              style={{
                cursor: "pointer",
                background: isSel ? (theme === "dark" ? "#1f1f1f" : "#e8f3ff") : "transparent",
                transition: "background 0.15s",
              }}
            >
              {primaryIsEnglish ? (
                <>{englishCol(vn, isSel)}{tamilCol(vn, isSel)}</>
              ) : (
                <>{tamilCol(vn, isSel)}{englishCol(vn, isSel)}</>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
