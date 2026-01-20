// ChapterTable.jsx
<<<<<<< HEAD
import React, { useEffect, useRef } from "react";
=======
import React from "react";
>>>>>>> df6ff92576ed2d760c32421564f8a0b07e8e9d22

export default function ChapterTable({
  kjvSource,
  tamilBookData,
  selectedBook,
  selectedChapter,
  selectedVerse,
  setSelectedVerse,
  theme,
  sendToPresentation,
  verseTableRef,
  settings,
}) {
  // english verses for chapter
  const englishVerses =
    kjvSource?.books?.find((b) => b.name === selectedBook)?.chapters?.find(
      (c) => Number(c.chapter) === Number(selectedChapter)
    )?.verses ?? [];

  const tamilVerses =
    tamilBookData?.chapters?.find((c) => Number(c.chapter) === Number(selectedChapter))?.verses ?? [];

  const engMap = Object.fromEntries(englishVerses.map((v) => [String(v.verse), v.text]));
  const tamilMap = Object.fromEntries(tamilVerses.map((v) => [String(v.verse), v.text]));

  const verseNums = Array.from(
    new Set([...englishVerses.map((v) => Number(v.verse)), ...tamilVerses.map((v) => Number(v.verse))])
  ).sort((a, b) => a - b);

<<<<<<< HEAD
  const rowRefs = useRef({});

=======
>>>>>>> df6ff92576ed2d760c32421564f8a0b07e8e9d22
  function handleRowClick(vn) {
    // update selection in App
    setSelectedVerse(Number(vn));

    // send to presentation (Option A)
    sendToPresentation({
      selectedBook,
      selectedChapter,
      selectedVerse: Number(vn),
      settings,
    });
  }

<<<<<<< HEAD
  // Auto-scroll to selected verse instantly
  useEffect(() => {
    if (selectedVerse && rowRefs.current[selectedVerse]) {
      setTimeout(() => {
        if (rowRefs.current[selectedVerse]) {
          rowRefs.current[selectedVerse].scrollIntoView({
            behavior: 'instant',
            block: 'center',
          });
        }
      }, 100);
    }
  }, [selectedVerse]);

=======
>>>>>>> df6ff92576ed2d760c32421564f8a0b07e8e9d22
  return (
    <table
      ref={verseTableRef}
      style={{ width: "100%", borderCollapse: "collapse", color: theme === "dark" ? "white" : "black" }}
    >
      <thead>
        <tr>
          <th style={{ padding: 10, borderBottom: "1px solid #ddd" }}>Tamil</th>
          <th style={{ padding: 10, borderBottom: "1px solid #ddd" }}>English (KJV)</th>
        </tr>
      </thead>
      <tbody>
        {verseNums.map((vn) => {
          const isSel = Number(vn) === Number(selectedVerse);
          return (
            <tr
              key={vn}
<<<<<<< HEAD
              ref={el => rowRefs.current[vn] = el}
=======
>>>>>>> df6ff92576ed2d760c32421564f8a0b07e8e9d22
              data-vn={vn}
              onClick={() => handleRowClick(vn)}
              style={{
                cursor: "pointer",
                background: isSel ? (theme === "dark" ? "#1f1f1f" : "#e8f3ff") : "transparent",
                transition: "background 0.15s",
              }}
            >
              <td style={{ padding: "14px 18px", borderBottom: "1px solid #ffffff55", fontFamily: "TamilBibleFont" }}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{ marginRight: 8, fontWeight: 600 }}>{vn}.</div>
                  <div style={{ fontSize: 15, lineHeight: 1.5, color: isSel ? (theme === "dark" ? "#00ff99" : "#003399") : "inherit" }}>
                    {tamilMap[String(vn)] ?? <span style={{ opacity: 0.5 }}>—</span>}
                  </div>
                </div>
              </td>

              <td style={{ padding: "14px 18px", borderBottom: "1px solid #ffffff55", fontWeight: "bold" }}>
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <div style={{ marginRight: 8, fontWeight: 600 }}>{vn}.</div>
                  <div style={{ fontSize: 15, lineHeight: 1.5, color: isSel ? (theme === "dark" ? "#00ff99" : "#003399") : "inherit" }}>
                    {engMap[String(vn)] ?? <span style={{ opacity: 0.5 }}>—</span>}
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
