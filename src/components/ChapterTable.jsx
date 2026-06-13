// ChapterTable.jsx
import React, { useEffect, useRef, useState } from "react";

const ISSUE_HIGHLIGHT = {
  pending:  { dark: '#3d3520', light: '#fff8e1' },
};

const ISSUE_DOT = {
  reported:  '#ffc107',
  reviewing: '#42a5f5',
  resolved:  '#66bb6a',
};

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
  // New: Issue reporting props
  verseIssues = {},
  onReportVerse,
  user,
}) {
  const primaryIsEnglish = (settings?.primaryTranslation ?? "Tamil") === "English";
  const [hoveredRow, setHoveredRow] = useState(null);

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
  const tamilCol = (vn, isSel, isHovered, hasIssue) => (
    <td style={{ padding: "14px 18px", borderBottom: `1px solid ${borderColor}`, fontFamily: "TamilBibleFont, sans-serif", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ marginRight: 8, fontWeight: 600, flexShrink: 0 }}>{vn}.</div>
        <div style={{ fontSize: 15, lineHeight: 1.5, color: isSel ? selColor : "inherit", flexGrow: 1 }}>
          {tamilMap[String(vn)] ?? <span style={{ opacity: 0.5 }}>—</span>}
        </div>
      </div>
      {(!hasIssue && onReportVerse && user) && (
        <button
          title="Report Tamil (BSI) verse"
          onClick={(e) => {
            e.stopPropagation();
            onReportVerse(selectedBook, selectedChapter, vn, "Tamil (BSI)");
          }}
          style={{
            position: 'absolute', bottom: '4px', right: '4px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '2px 4px', fontSize: '11px', fontWeight: 'bold', color: theme === 'dark' ? '#ccc' : '#666',
            opacity: isHovered ? 0.6 : 0, transition: 'opacity 0.15s', visibility: isHovered ? 'visible' : 'hidden'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
        >
          ⚠ TA
        </button>
      )}
    </td>
  );

  const englishCol = (vn, isSel, isHovered, hasIssue) => (
    <td style={{ padding: "14px 18px", borderBottom: `1px solid ${borderColor}`, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <div style={{ marginRight: 8, fontWeight: 600, flexShrink: 0 }}>{vn}.</div>
        <div style={{ fontSize: 15, lineHeight: 1.5, color: isSel ? selColor : "inherit", flexGrow: 1 }}>
          {engMap[String(vn)] ?? <span style={{ opacity: 0.5 }}>—</span>}
        </div>
      </div>
      {(!hasIssue && onReportVerse && user) && (
        <button
          title="Report English (NKJV) verse"
          onClick={(e) => {
            e.stopPropagation();
            onReportVerse(selectedBook, selectedChapter, vn, "NKJV");
          }}
          style={{
            position: 'absolute', bottom: '4px', right: '4px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '2px 4px', fontSize: '11px', fontWeight: 'bold', color: theme === 'dark' ? '#ccc' : '#666',
            opacity: isHovered ? 0.6 : 0, transition: 'opacity 0.15s', visibility: isHovered ? 'visible' : 'hidden'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
        >
          ⚠ EN
        </button>
      )}
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
          <th style={{ padding: 10, borderBottom: "1px solid #ddd", width: 44 }}></th>
        </tr>
      </thead>
      <tbody>
        {verseNums.map((vn) => {
          const isSel = Number(vn) === Number(selectedVerse);
          const issueData = verseIssues[String(vn)];
          const hasIssue = issueData && issueData.count > 0;
          const issueStatus = issueData?.status || 'pending';
          const isHovered = hoveredRow === vn;

          // Determine row background
          let rowBg = 'transparent';
          if (hasIssue) {
            const hl = ISSUE_HIGHLIGHT[issueStatus];
            if (hl) {
              rowBg = theme === 'dark' ? hl.dark : hl.light;
            }
          }
          if (isSel) {
            rowBg = theme === "dark" ? "#1f1f1f" : "#e8f3ff";
          }

          return (
            <tr
              key={vn}
              ref={(el) => (rowRefs.current[vn] = el)}
              data-vn={vn}
              onClick={() => handleRowClick(vn)}
              onMouseEnter={() => setHoveredRow(vn)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                cursor: "pointer",
                background: rowBg,
                transition: "background 0.15s",
                position: "relative",
              }}
            >
              {primaryIsEnglish ? (
                <>{englishCol(vn, isSel, isHovered, hasIssue)}{tamilCol(vn, isSel, isHovered, hasIssue)}</>
              ) : (
                <>{tamilCol(vn, isSel, isHovered, hasIssue)}{englishCol(vn, isSel, isHovered, hasIssue)}</>
              )}
              {/* Report / Issue indicator column */}
              <td style={{
                padding: '8px 6px',
                borderBottom: `1px solid ${borderColor}`,
                verticalAlign: 'middle',
                textAlign: 'center',
              }}>
                {hasIssue && (
                  <span
                    title={`${issueData.count} issue(s) — ${issueStatus}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      background: ISSUE_DOT[issueStatus] || '#ffc107',
                      color: '#000',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {issueData.count}
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
