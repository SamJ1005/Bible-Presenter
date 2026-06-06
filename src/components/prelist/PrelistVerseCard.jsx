import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import PrelistEditToolbar from "./PrelistEditToolbar";
import { getTamilBookName } from "../../utils/bibleBooks";

// Virtual slide: 1920×1080 — matches presentation_prelist.html vw/vh base
const VIRTUAL_W = 1920;
const VIRTUAL_H = 1080;

// ── Module-level blob URL cache ──────────────────────────────────────────────
// All card instances share the same loaded HTML (one fetch per app session).
let _prelistIframeSrc = null;
async function getPrelistIframeSrc() {
  if (_prelistIframeSrc) return _prelistIframeSrc;
  try {
    if (!window.electron?.getElectronPath || !window.electron?.getPrelistHtml) return null;
    const [electronPath, htmlContent] = await Promise.all([
      window.electron.getElectronPath(),
      window.electron.getPrelistHtml(),
    ]);
    if (!htmlContent) return null;
    // Patch font url() references to absolute file:// paths so they load inside the blob
    const pathNormalized = electronPath.replace(/\\/g, "/");
    const patchedHtml = htmlContent.replace(
      /url\("fonts\//g,
      `url("file:///${pathNormalized}/fonts/`
    );
    const blob = new Blob([patchedHtml], { type: "text/html" });
    _prelistIframeSrc = URL.createObjectURL(blob);
    return _prelistIframeSrc;
  } catch (err) {
    console.error("[PrelistVerseCard] Failed to init iframe src:", err);
    return null;
  }
}

const ISSUE_DOT_COLORS = {
  reported:  '#ffc107',
  reviewing: '#42a5f5',
  resolved:  '#66bb6a',
};

const PrelistVerseCard = ({
  item,
  theme,
  isEditing,
  isActive,
  displayEnglish,
  displayTamil,
  editingRefId,
  startEditingText,
  saveTextEdit,
  cancelTextEdit,
  applyStyle,
  tamilContentRef,
  englishContentRef,
  handleItemClick,
  handlePresent,
  itemRefs,
  onFontSizeChange,
  onLivePreviewUpdate,
  settings,
  pendingLayoutOverrides,
  setPendingLayoutOverrides,
  applyCustomFontSize,
  // Issue reporting
  verseIssues = {},
  onReportVerse,
  user,
}) => {
  const [localFontOffset, setLocalFontOffset] = useState(
    item.fontSizeOffset || 0,
  );
  const containerRef = useRef(null);
  const verseAreaRef = useRef(null);
  const [scale, setScale] = useState(0.3);

  const boxRef = useRef(null);
  const tamilTextRef = useRef(null);
  const engTextRef = useRef(null);
  const indexTextRef = useRef(null);

  // Iframe state for WYSIWYG preview
  const iframeRef = useRef(null);
  const [iframeSrc, setIframeSrc] = useState(null);
  const [iframeReady, setIframeReady] = useState(false);

  useEffect(() => {
    setLocalFontOffset(item.fontSizeOffset || 0);
  }, [item.fontSizeOffset]);


  // ── Use ResizeObserver to track ACTUAL container width (not window width).
  //    window.resize does NOT fire when sidebar toggles or panel layout shifts.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const w = el.offsetWidth;
      if (w > 0) setScale(w / VIRTUAL_W);
    };
    measure(); // initial
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Initialize iframe src on mount (uses module-level cache) ─────────────────
  useEffect(() => {
    getPrelistIframeSrc().then((src) => {
      if (src) setIframeSrc(src);
    });
  }, []);

  // ── Send current verse data to iframe via postMessage ─────────────────────────
  // Fires when iframe becomes ready OR whenever verse data / settings change.
  useEffect(() => {
    if (!iframeReady || !iframeRef.current?.contentWindow) return;
    const payload = {
      type: "bible",
      index: `${getTamilBookName(item.book)} ${item.chapter}:${item.verse}   ${item.book}`,
      tamilText: displayTamil || "",
      englishText: displayEnglish || "",
      fontSizeOffset: localFontOffset,
      tamilFontOffset: settings?.tamilFontOffset ?? 0,
      englishFontOffset: settings?.englishFontOffset ?? 0,
      indexFontOffset: settings?.indexFontOffset ?? 0,
      tamilEnabled: settings?.isTamilEnabled !== false,
      englishEnabled: settings?.isEnglishEnabled !== false,
      primaryTranslation: settings?.primaryTranslation ?? "Tamil",
      presentationBgType: settings?.presentationBgType ?? "color",
      presentationBgImage: settings?.presentationBgImage ?? "",
      presentationBgColor: settings?.presentationBgColor ?? "black",
      presentationTextColor: settings?.presentationTextColor ?? "white",
      enableTransition: false, // No animation in preview
      customWatermark: settings?.customWatermark ?? "",
      layoutOverrides: pendingLayoutOverrides || item.layoutOverrides || {},
    };
    try {
      iframeRef.current.contentWindow.postMessage({ type: "SHOW_VERSE", payload }, "*");
    } catch (err) {
      console.error("[PrelistVerseCard] postMessage failed:", err);
    }
  }, [
    iframeReady,
    displayTamil,
    displayEnglish,
    item.book,
    item.chapter,
    item.verse,
    localFontOffset,
    settings,
    item.layoutOverrides,
    pendingLayoutOverrides,
  ]);

  // ─── Reference string
  const tamilBook = getTamilBookName(item.book);
  const indexStr = `${tamilBook} ${item.chapter}:${item.verse}   ${item.book}`;

  // ─── Verse type — identical to presentation_prelist.html
  const cleanText = (html) => (html || "").replace(/<[^>]*>/g, "");
  const getVerseType = (tamil, english) => {
    const len = (tamil?.length || 0) * 1.2 + (english?.length || 0);
    if (len < 80) return "small";
    if (len > 250) return "large";
    return "medium";
  };

  const type = getVerseType(cleanText(displayTamil), cleanText(displayEnglish));
  const isSingle = !indexStr.includes(",") && !indexStr.includes("-");
  const verseCount = item.versesPayload?.length || 1;

  // ─── FONT_PRESETS — MUST match presentation_prelist.html exactly
  const FONT_PRESETS = {
    small: { tamil: 9.2, eng: 7.0, min: 0.0 },
    medium: { tamil: 7.2, eng: 5.8, min: 3.5 },
    large: { tamil: 4.7, eng: 3.9, min: 2.8 },
    huge: { tamil: 9.8, eng: 7.8, min: 3.0 },
    multi2: { tamil: 5.5, eng: 4.5, min: 3.0 },
    multi: { tamil: 4.2, eng: 3.5, min: 2.0 },
  };

  let effectiveType = type;
  if (isSingle && (type === "small" || type === "medium")) {
    effectiveType = "huge";
  } else if (!isSingle) {
    effectiveType = verseCount === 2 ? "multi2" : "multi";
  }
  const preset = FONT_PRESETS[effectiveType];

  useLayoutEffect(() => {
    if (!tamilTextRef.current || !boxRef.current || !verseAreaRef.current)
      return;

    const offset = localFontOffset;
    let tamilVW = preset.tamil;
    let engVW = preset.eng;
    if (tamilVW < 1.5) tamilVW = 1.5;
    if (engVW < 1.2) engVW = 1.2;



    const vwUnit = VIRTUAL_W / 100;

    // Apply initial sizes without offset
    tamilTextRef.current.style.fontSize = `${tamilVW * vwUnit}px`;
    if (engTextRef.current) {
      engTextRef.current.style.fontSize = `${engVW * vwUnit}px`;
    }

    const boxWidth = boxRef.current.clientWidth;
    const boxHeight = boxRef.current.clientHeight;

    const globalTamilOffset = (settings?.tamilFontOffset || 0) * 0.15;
    const globalEngOffset = (settings?.englishFontOffset || 0) * 0.12;

    if (boxWidth > 0 && boxHeight > 0) {
      // Always auto-shrink to fit screen 
      let safety = 0;
      while (
        (boxRef.current.scrollHeight > boxRef.current.clientHeight ||
          tamilTextRef.current.scrollWidth > boxRef.current.clientWidth ||
          (engTextRef.current && engTextRef.current.scrollWidth > boxRef.current.clientWidth)) &&
        tamilVW > preset.min &&
        safety < 120
      ) {
        tamilVW -= 0.1;
        engVW -= 0.08;

        tamilTextRef.current.style.fontSize = `${tamilVW * vwUnit}px`;
        if (engTextRef.current) {
          engTextRef.current.style.fontSize = `${engVW * vwUnit}px`;
        }
        safety++;
      }
    }

    // Apply manual sizing offsets AFTER auto-shrink has found the container bounds
    tamilVW += offset * 0.15 + globalTamilOffset;
    engVW += offset * 0.12 + globalEngOffset;

    tamilTextRef.current.style.fontSize = `${tamilVW * vwUnit}px`;
    if (engTextRef.current) {
      engTextRef.current.style.fontSize = `${Math.max(0, engVW) * vwUnit}px`;
    }
  }, [displayTamil, displayEnglish, localFontOffset, preset, settings, isEditing]);

  // Reference sizing logic exactly mirroring presentation_prelist.html
  useLayoutEffect(() => {
    if (!indexTextRef.current) return;
    const refLen = indexStr.length;
    const indexOffset = (settings?.indexFontOffset || 0) * 0.12;

    let vw = (refLen > 38 ? 3.8 : refLen > 26 ? 6.5 : 5.5) + indexOffset;
    if (vw < 2.0) vw = 2.0;

    const vwUnit = VIRTUAL_W / 100;
    indexTextRef.current.style.fontSize = `${vw * vwUnit}px`;
    // Auto-shrink removed to guarantee 1:1 view
  }, [indexStr, settings?.indexFontOffset, isEditing]);

  const handleFontSizeClick = (delta, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const next = Math.max(-15, Math.min(15, localFontOffset + delta));
    setLocalFontOffset(next);
    if (onFontSizeChange) onFontSizeChange(item.id, next);
  };

  const handleFontReset = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setLocalFontOffset(0);
    if (onFontSizeChange) onFontSizeChange(item.id, 0);
  };

  const handlePresentClick = (e) => {
    if (isEditing || editingRefId) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleItemClick(item.id);
    handlePresent(item);
  };


  // Read Custom Slide Layout Overrides (from PPT-like text box adjustment)
  const layout = pendingLayoutOverrides || item.layoutOverrides || {};

  const handleLayoutChange = (key, value) => {
    if (setPendingLayoutOverrides) {
      setPendingLayoutOverrides(prev => ({
        ...(prev || item.layoutOverrides || {}),
        [key]: value
      }));
    }
  };

  const vhUnit = VIRTUAL_H / 100;
  const vwUnit = VIRTUAL_W / 100;

  const isSmallMedium = type === "small" || type === "medium";
  const refAreaHeight = (isSmallMedium && isSingle ? 6 : 5) * vhUnit;

  const primaryIsEnglish = settings?.primaryTranslation === "English";
  const tamilOrder = primaryIsEnglish ? 2 : 1;
  const englishOrder = primaryIsEnglish ? 1 : 2;

  const tamilEnabled = settings?.isTamilEnabled !== false;
  const englishEnabled = settings?.isEnglishEnabled !== false;

  // ─── Layout
  // Verse area padding default
  let verseAreaPaddingTop =
    isSmallMedium && isSingle ? 0.5 * vhUnit : 1 * vhUnit;
  let verseAreaPaddingSides = isSmallMedium && isSingle ? 3 * vwUnit : 1 * vwUnit;
  
  if (layout.versePaddingTop !== undefined) {
    verseAreaPaddingTop = layout.versePaddingTop * vhUnit;
  }
  const verseAreaPadding = `${verseAreaPaddingTop}px ${verseAreaPaddingSides}px 0`;
  const verseBoxJustify = isSingle ? "center" : "flex-start";
  
  const tamilLineHeight = layout.tamilLineHeight !== undefined ? layout.tamilLineHeight : (isSingle ? 1.28 : 1.35);
  const englishLineHeight = layout.englishLineHeight !== undefined ? layout.englishLineHeight : 1.35;

  // Ref area default
  // extra padding above index in preview, unless manually set
  const REF_PAD_TOP = (layout.indexPaddingTop !== undefined ? layout.indexPaddingTop : 2.5) * vhUnit;
  const REF_HEIGHT = "auto"; // let the top padding take over
  const REF_PAD_BOTTOM = 0.8 * vhUnit;

  // ─── Appearance
  const defaultBg = theme === "light" ? "#ffffff" : "#000000";
  const defaultText = theme === "light" ? "#000000" : "#ffffff";

  const bgType = settings?.presentationBgType;
  const bgColor = settings?.presentationBgColor || "#000000";
  const bgImage = settings?.presentationBgImage || "";
  const textColor = settings?.presentationTextColor || defaultText;

  const isImageBg = bgType === "image" && bgImage;

  let slideBg = defaultBg;
  if (isImageBg) {
    // Always quote the URL in case pathways contain backslashes or spaces on Windows
    slideBg = `url("${bgImage.replace(/\\/g, '/')}") center/cover no-repeat`;
  } else if (bgType === "custom") {
    slideBg = bgColor;
  } else if (bgType === "white") {
    slideBg = "#ffffff";
  } else if (bgType === "black") {
    slideBg = "#000000";
  }

  const btnStyle = (extra = {}) => ({
    cursor: "pointer",
    background: "transparent",
    border: `1px solid ${theme === "dark" ? "#444" : "#bbb"}`,
    borderRadius: "4px",
    padding: "3px 6px",
    color: theme === "dark" ? "#00ff99" : "#505050",
    fontWeight: "bold",
    lineHeight: 1,
    ...extra,
  });

  return (
    <div
      ref={(el) => (itemRefs.current[item.id] = el)}
      onClick={() => {
        if (!isEditing && !editingRefId) handleItemClick(item.id);
      }}
      style={{
        background: theme === "dark" ? "#1a1a1a" : "#f8f8f8",
        borderRadius: "10px",
        border: isEditing
          ? "2px solid #007bff"
          : isActive
            ? `2px solid ${theme === "dark" ? "#00ff99" : "#003399"}`
            : `1px solid ${theme === "dark" ? "#2a2a2a" : "#e0e0e0"}`,
        boxShadow: isActive
          ? "0 0 12px rgba(0,255,153,0.15)"
          : "0 2px 6px rgba(0,0,0,0.07)",
        marginBottom: "20px",
        // Make the card take up most of the space
        maxWidth: "98%",
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          borderBottom: `1px solid ${theme === "dark" ? "#2a2a2a" : "#eee"}`,
          background: theme === "dark" ? "#141414" : "#f4f4f4",
          borderRadius: "10px 10px 0 0",
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: theme === "dark" ? "#00ff99" : "#003399",
              opacity: 0.9,
            }}
          >
            {item.book} {item.chapter}:{item.verse}
          </div>
          {/* Issue indicator dot */}
          {(() => {
            const verseKey = String(item.verse);
            const issueData = verseIssues[verseKey];
            if (issueData && issueData.count > 0) {
              const dotColor = ISSUE_DOT_COLORS[issueData.status] || '#ffc107';
              return (
                <span
                  title={`${issueData.count} issue(s) — ${issueData.status}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: dotColor,
                    color: '#000',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  {issueData.count}
                </span>
              );
            }
            return null;
          })()}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Report buttons */}
          {(onReportVerse && !isEditing && user) && (
            <>
              <button
                type="button"
                title="Report issue with Tamil verse"
                onClick={(e) => {
                  e.stopPropagation();
                  onReportVerse(item.book, item.chapter, item.verse, "Tamil (BSI)");
                }}
                style={{
                  cursor: 'pointer', background: 'transparent',
                  border: `1px solid ${theme === 'dark' ? '#444' : '#bbb'}`,
                  borderRadius: '4px', padding: '3px 4px',
                  color: '#ffc107', fontSize: '11px', fontWeight: 'bold',
                  lineHeight: 1, transition: 'opacity 0.15s', opacity: 0.6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
              >
                ⚠ TA
              </button>
              <button
                type="button"
                title="Report issue with English verse"
                onClick={(e) => {
                  e.stopPropagation();
                  onReportVerse(item.book, item.chapter, item.verse, "NKJV");
                }}
                style={{
                  cursor: 'pointer', background: 'transparent',
                  border: `1px solid ${theme === 'dark' ? '#444' : '#bbb'}`,
                  borderRadius: '4px', padding: '3px 4px',
                  color: '#ffc107', fontSize: '11px', fontWeight: 'bold',
                  lineHeight: 1, transition: 'opacity 0.15s', opacity: 0.6,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; }}
              >
                ⚠ EN
              </button>
            </>
          )}
          <button
            type="button"
            onClick={(e) => handleFontSizeClick(-1, e)}
            style={btnStyle({ fontSize: "11px" })}
          >
            a-
          </button>
          <button
            type="button"
            onClick={(e) => handleFontReset(e)}
            style={btnStyle({ fontSize: "12px" })}
          >
            ↺
          </button>
          <button
            type="button"
            onClick={(e) => handleFontSizeClick(1, e)}
            style={btnStyle({ fontSize: "13px" })}
          >
            A+
          </button>
          <div
            style={{
              width: "1px",
              height: "16px",
              background: "#444",
              margin: "0 4px",
            }}
          />
          {!isEditing ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startEditingText(item);
              }}
              style={{
                cursor: "pointer",
                background: "transparent",
                border: "none",
                padding: "4px",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke={theme === "dark" ? "#888" : "#555"}
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          ) : (
            <PrelistEditToolbar
              applyStyle={applyStyle}
              applyCustomFontSize={applyCustomFontSize}
              saveTextEdit={saveTextEdit}
              cancelTextEdit={cancelTextEdit}
              itemId={item.id}
            />
          )}
        </div>
      </div>

      {/* ── Slide Preview ── */}
      {/* 16:9 Aspect Ratio Container */}
      <div
        style={{
          width: "100%",
          paddingTop: "56.25%",
          position: "relative",
          overflow: "hidden",
          borderRadius: "8px",
          boxShadow:
            isActive && !isEditing
              ? "0 0 0 3px #00ff99, 0 4px 15px rgba(0, 255, 153, 0.3)"
              : theme === "dark"
                ? "0 4px 12px rgba(0,0,0,0.5)"
                : "0 4px 12px rgba(0,0,0,0.1)",
          transition: "box-shadow 0.2s ease-in-out",
        }}
        ref={containerRef}
      >
        {/* Transparent click capture overlay (normal mode only) */}
        {!isEditing && (
          <div
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%", height: "100%",
              zIndex: 2,
              cursor: editingRefId ? "default" : "pointer",
            }}
            onClick={!editingRefId ? handlePresentClick : undefined}
          />
        )}

        {/* 1920×1080 Scale Container */}
        <div
          style={{
            position: "absolute",
            top: 0, left: 0,
            width: `${VIRTUAL_W}px`,
            height: `${VIRTUAL_H}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {/* ── WYSIWYG Iframe — always mounted so data stays fresh ── */}
          {iframeSrc ? (
            <iframe
              ref={iframeRef}
              src={iframeSrc}
              title="verse-preview"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
                pointerEvents: "none",
                // Hidden behind edit overlay, but still running & receiving postMessages
                visibility: isEditing ? "hidden" : "visible",
              }}
              onLoad={() => {
                // Brief delay ensures the iframe's inline scripts are fully initialised
                setTimeout(() => setIframeReady(true), 50);
              }}
            />
          ) : !isEditing && (
            /* Loading placeholder while blob URL is being created */
            <div
              style={{
                width: "100%", height: "100%",
                background: "#111",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#555", fontSize: "24px",
              }}
            >
              Loading preview…
            </div>
          )}

          {/* ── Edit Mode Overlay — React virtual slide for contentEditable ── */}
          {isEditing && (
            <div
              style={{
                position: "absolute",
                top: 0, left: 0,
                width: `${VIRTUAL_W}px`,
                height: `${VIRTUAL_H}px`,
                background: slideBg,
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* ── Reference Area ── */}
              <div
                style={{
                  height: `${refAreaHeight}px`,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: `${REF_PAD_TOP}px`,
                  paddingBottom: `${REF_PAD_BOTTOM}px`,
                  boxSizing: "border-box",
                }}
              >
                <div
                  ref={indexTextRef}
                  style={{
                    fontWeight: "bold",
                    fontFamily: '"TamilBibleFont", Arial, sans-serif',
                    color: textColor,
                    textDecoration: "underline",
                    textDecorationColor: "#b4b4b4ec",
                    textUnderlineOffset: "5px",
                    textDecorationSkipInk: "none",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    maxWidth: "96%",
                    overflow: "hidden",
                    lineHeight: 1.1,
                  }}
                >
                  {indexStr}
                </div>
              </div>

              {/* ── Verse Area (Flex Parent) ── */}
              <div
                ref={verseAreaRef}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  padding: verseAreaPadding,
                  boxSizing: "border-box",
                }}
              >
                {/* ── Verse Box (Constrained Container) ── */}
                <div
                  ref={boxRef}
                  style={{
                    width: "100%",
                    maxHeight: "94%",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: verseBoxJustify,
                    gap: "0",
                    textAlign: "center",
                  }}
                >
                  {displayTamil && (
                    <div
                      ref={(node) => {
                        tamilTextRef.current = node;
                        if (isEditing) tamilContentRef.current = node;
                      }}
                      contentEditable={isEditing}
                      suppressContentEditableWarning={true}
                      dangerouslySetInnerHTML={{ __html: displayTamil }}
                      style={{
                        display: tamilEnabled ? "block" : "none",
                        order: tamilOrder,
                        fontFamily: '"TamilBibleFont", Arial, sans-serif',
                        fontWeight: 900,
                        lineHeight: tamilLineHeight,
                        color: textColor,
                        whiteSpace: "pre-wrap",
                        width: "100%",
                        outline: "none",
                        border: isEditing ? "2px dashed #007bff" : "none",
                        padding: isEditing ? "10px" : "0",
                        textDecorationSkipInk: "none",
                        WebkitTextDecorationSkipInk: "none",
                        wordBreak: "keep-all",
                        overflowWrap: "anywhere",
                      }}
                    />
                  )}
                  {preset.eng > 0 && (
                    <div
                      ref={(node) => {
                        engTextRef.current = node;
                        if (isEditing) englishContentRef.current = node;
                      }}
                      contentEditable={isEditing}
                      suppressContentEditableWarning={true}
                      dangerouslySetInnerHTML={{ __html: displayEnglish }}
                      style={{
                        display: englishEnabled ? "block" : "none",
                        order: englishOrder,
                        fontWeight: 600,
                        lineHeight: englishLineHeight,
                        color: textColor,
                        whiteSpace: "pre-wrap",
                        width: "100%",
                        opacity: 0.95,
                        outline: "none",
                        border: isEditing ? "2px dashed #007bff" : "none",
                        padding: isEditing ? "10px" : "0",
                        textDecorationSkipInk: "none",
                        WebkitTextDecorationSkipInk: "none",
                        wordBreak: "keep-all",
                        overflowWrap: "anywhere",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Watermark (edit mode) */}
              {settings?.customWatermark && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "25px",
                    right: "40px",
                    fontSize: "18px",
                    color: textColor,
                    opacity: 0.35,
                  }}
                >
                  {settings.customWatermark}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Slide Properties Panel (Edit Mode Only) ── */}

      {isEditing && (
        <div style={{
          padding: '12px 15px',
          background: theme === 'dark' ? '#0f0e0eff' : '#fff',
          borderTop: theme === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
          borderRadius: '0 0 8px 8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '15px',
          fontSize: '13px',
          color: theme === 'dark' ? '#ccc' : '#444'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontWeight: 'bold' }}>Ref Top Padding (vh)</label>
            <input 
              type="number" 
              step="0.5" 
              value={layout.indexPaddingTop !== undefined ? layout.indexPaddingTop : 4} 
              onChange={e => handleLayoutChange('indexPaddingTop', Number(e.target.value))}
              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #555', background: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#fff' : '#000', width: '80px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontWeight: 'bold' }}>Verse Top Padding (vh)</label>
            <input 
              type="number" 
              step="0.5" 
              value={layout.versePaddingTop !== undefined ? layout.versePaddingTop : (isSmallMedium && isSingle ? 0.5 : 1)} 
              onChange={e => handleLayoutChange('versePaddingTop', Number(e.target.value))}
              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #555', background: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#fff' : '#000', width: '80px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontWeight: 'bold' }}>Tamil Line Height</label>
            <input 
              type="number" 
              step="0.05" 
              value={layout.tamilLineHeight !== undefined ? layout.tamilLineHeight : (isSingle ? 1.28 : 1.35)} 
              onChange={e => handleLayoutChange('tamilLineHeight', Number(e.target.value))}
              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #555', background: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#fff' : '#000', width: '80px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontWeight: 'bold' }}>English Line Height</label>
            <input 
              type="number" 
              step="0.05" 
              value={layout.englishLineHeight !== undefined ? layout.englishLineHeight : 1.35} 
              onChange={e => handleLayoutChange('englishLineHeight', Number(e.target.value))}
              style={{ padding: '4px', borderRadius: '4px', border: '1px solid #555', background: theme === 'dark' ? '#222' : '#fff', color: theme === 'dark' ? '#fff' : '#000', width: '80px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PrelistVerseCard;
