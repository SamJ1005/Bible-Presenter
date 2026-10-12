// ChapterTable.jsx
import React, { useEffect, useRef, useState } from "react";

const ISSUE_HIGHLIGHT = {
  pending:   { dark: '#3d3520', light: '#fff8e1' },
  reported:  { dark: '#3d3520', light: '#fff8e1' },
  reviewing: { dark: '#1b324b', light: '#e8f4fd' },
};

const ISSUE_DOT = {
  reported:  '#ffc107',
  pending:   '#ffc107',
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
  // Issue reporting props
  verseIssues = {},
  onReportVerse,
  user,
}) {
  const primaryIsEnglish = (settings?.primaryTranslation ?? "Tamil") === "English";
  const [hoveredRow, setHoveredRow] = useState(null);

  // Load seen resolved report IDs from localStorage so user only sees green feedback once
  const [seenResolvedIds, setSeenResolvedIds] = useState(() => {
    try {
      const saved = localStorage.getItem("bp_seen_resolved_reports");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Track and mark newly displayed resolved report IDs as seen
  useEffect(() => {
    const newlySeenIds = [];
    Object.values(verseIssues).forEach((issueData) => {
      if (issueData?.reports) {
        issueData.reports.forEach((r) => {
          if (r.status === "resolved" && r.id && !seenResolvedIds.has(r.id)) {
            newlySeenIds.push(r.id);
          }
        });
      }
    });

    if (newlySeenIds.length > 0) {
      // Mark as seen after viewing so they don't see it a second time
      const timer = setTimeout(() => {
        setSeenResolvedIds((prev) => {
          const updated = new Set(prev);
          newlySeenIds.forEach((id) => updated.add(id));
          try {
            localStorage.setItem("bp_seen_resolved_reports", JSON.stringify(Array.from(updated)));
          } catch {}
          return updated;
        });
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [verseIssues]);

  const dismissResolvedFeedback = (reportIds) => {
    setSeenResolvedIds((prev) => {
      const updated = new Set(prev);
      reportIds.forEach((id) => updated.add(id));
      try {
        localStorage.setItem("bp_seen_resolved_reports", JSON.stringify(Array.from(updated)));
      } catch {}
      return updated;
    });
  };

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

  // Column widths (change these percentages to resize columns manually)
  const tamilWidth = "56%";
  const englishWidth = "44%";

  // Column definitions — order swaps based on primaryTranslation
  const tamilCol = (vn, isSel, isHovered, canReport) => (
    <td style={{
      width: tamilWidth,
      padding: "12px 14px",
      borderBottom: `1px solid ${borderColor}`,
      fontFamily: "TamilBibleFont, sans-serif",
      position: "relative",
      verticalAlign: "top",
      wordBreak: "break-word",
      overflowWrap: "break-word",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: 0 }}>
        <div style={{ marginRight: 8, fontWeight: 600, flexShrink: 0 }}>{vn}.</div>
        <div style={{ fontSize: 15, lineHeight: 1.5, color: isSel ? selColor : "inherit", flexGrow: 1, minWidth: 0 }}>
          {tamilMap[String(vn)] ?? <span style={{ opacity: 0.5 }}>—</span>}
        </div>
      </div>
      {(canReport && onReportVerse && user) && (
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

  const englishCol = (vn, isSel, isHovered, canReport) => (
    <td style={{
      width: englishWidth,
      padding: "12px 14px",
      borderBottom: `1px solid ${borderColor}`,
      position: "relative",
      verticalAlign: "top",
      wordBreak: "break-word",
      overflowWrap: "break-word",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: 0 }}>
        <div style={{ marginRight: 8, fontWeight: 600, flexShrink: 0 }}>{vn}.</div>
        <div style={{ fontSize: 15, lineHeight: 1.5, color: isSel ? selColor : "inherit", flexGrow: 1, minWidth: 0 }}>
          {engMap[String(vn)] ?? <span style={{ opacity: 0.5 }}>—</span>}
        </div>
      </div>
      {(canReport && onReportVerse && user) && (
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
      style={{
        width: "100%",
        tableLayout: "fixed",
        borderCollapse: "collapse",
        color: theme === "dark" ? "white" : "black"
      }}
    >
      <colgroup>
        {primaryIsEnglish ? (
          <>
            <col style={{ width: englishWidth }} />
            <col style={{ width: tamilWidth }} />
          </>
        ) : (
          <>
            <col style={{ width: tamilWidth }} />
            <col style={{ width: englishWidth }} />
          </>
        )}
        <col style={{ width: "28px" }} />
      </colgroup>
      <thead>
        <tr>
          {primaryIsEnglish ? (
            <>
              <th style={{ padding: "8px 14px", borderBottom: `1px solid ${borderColor}`, textAlign: "left", width: englishWidth }}>English (NKJV)</th>
              <th style={{ padding: "8px 14px", borderBottom: `1px solid ${borderColor}`, textAlign: "left", width: tamilWidth }}>Tamil</th>
            </>
          ) : (
            <>
              <th style={{ padding: "8px 14px", borderBottom: `1px solid ${borderColor}`, textAlign: "left", width: tamilWidth }}>Tamil</th>
              <th style={{ padding: "8px 14px", borderBottom: `1px solid ${borderColor}`, textAlign: "left", width: englishWidth }}>English (NKJV)</th>
            </>
          )}
          <th style={{ padding: "8px 2px", borderBottom: `1px solid ${borderColor}`, width: 28, textAlign: "center" }}></th>
        </tr>
      </thead>
      <tbody>
        {verseNums.map((vn) => {
          const isSel = Number(vn) === Number(selectedVerse);
          const issueData = verseIssues[String(vn)];
          const reports = issueData?.reports || [];

          // Check if there are active (unresolved) issues
          const hasPendingIssue = reports.some(
            (r) => r.status === 'pending' || r.status === 'reported' || r.status === 'reviewing'
          );

          // Check if there are resolved issues that have NOT been seen yet
          const unseenResolvedReports = reports.filter(
            (r) => r.status === 'resolved' && r.id && !seenResolvedIds.has(r.id)
          );

          // Show issue dot/badge if there's a pending issue OR an unseen resolved issue
          const showDot = hasPendingIssue || unseenResolvedReports.length > 0;
          const dotStatus = hasPendingIssue ? (issueData?.status || 'pending') : (unseenResolvedReports.length > 0 ? 'resolved' : null);

          // A resolved verse which was reported previously can again be allowed to report!
          const canReport = !hasPendingIssue;
          const isHovered = hoveredRow === vn;

          // Determine row background
          let rowBg = 'transparent';
          if (hasPendingIssue) {
            const hl = ISSUE_HIGHLIGHT[dotStatus];
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
                <>{englishCol(vn, isSel, isHovered, canReport)}{tamilCol(vn, isSel, isHovered, canReport)}</>
              ) : (
                <>{tamilCol(vn, isSel, isHovered, canReport)}{englishCol(vn, isSel, isHovered, canReport)}</>
              )}
              {/* Report / Issue indicator column */}
              <td style={{
                padding: '4px 2px',
                borderBottom: `1px solid ${borderColor}`,
                verticalAlign: 'middle',
                textAlign: 'center',
                width: 28,
              }}>
                {showDot && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      if (dotStatus === 'resolved') {
                        dismissResolvedFeedback(unseenResolvedReports.map(r => r.id));
                      }
                    }}
                    title={
                      dotStatus === 'resolved'
                        ? `${unseenResolvedReports.length} issue(s) resolved (click to dismiss)`
                        : `${issueData.count} issue(s) — ${dotStatus}`
                    }
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: ISSUE_DOT[dotStatus] || '#ffc107',
                      color: '#000',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: dotStatus === 'resolved' ? 'pointer' : 'default',
                    }}
                  >
                    {dotStatus === 'resolved' ? '✓' : issueData.count}
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
