import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import toast from "react-hot-toast";
import PrelistEditToolbar from "./PrelistEditToolbar";
import { getTamilBookName } from "../../utils/bibleBooks";

// Virtual slide: 1920×1080 — matches presentation_prelist.html vw/vh base
const VIRTUAL_W = 1920;
const VIRTUAL_H = 1080;

const ISSUE_DOT_COLORS = {
  reported:  '#ffc107',
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
  updateQueueItem,
  pasteContent,
  hasCopiedItem,
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
  const tamilEditorRef = useRef(null);
  const englishEditorRef = useRef(null);

  // 3D Flip Card State & Back-Face Settings
  const [isFlipped, setIsFlipped] = useState(false);
  const [editTextTamil, setEditTextTamil] = useState(displayTamil || "");
  const [editTextEnglish, setEditTextEnglish] = useState(displayEnglish || "");

  // Verse count calculation
  const getVerseCount = () => {
    if (item.versesPayload && item.versesPayload.length > 0) return item.versesPayload.length;
    if (displayTamil) {
      const brLines = displayTamil.split(/<br\s*\/?>/i).filter((l) => l.trim()).length;
      if (brLines > 1) return brLines;
    }
    const rangeMatch = String(item.verse || "").match(/^(\d+)-(\d+)$/);
    if (rangeMatch) return parseInt(rangeMatch[2], 10) - parseInt(rangeMatch[1], 10) + 1;
    const commaCount = String(item.verse || "").split(",").length;
    if (commaCount > 1) return commaCount;
    return 1;
  };
  const verseCount = getVerseCount();

  const initialLangMode = item.languageMode || (verseCount >= 3 ? "tamil" : "both");
  const [cardLangMode, setCardLangMode] = useState(initialLangMode);

  useEffect(() => {
    setLocalFontOffset(item.fontSizeOffset || 0);
  }, [item.fontSizeOffset]);

  useEffect(() => {
    setEditTextTamil(displayTamil || "");
  }, [displayTamil]);

  useEffect(() => {
    setEditTextEnglish(displayEnglish || "");
  }, [displayEnglish]);

  useEffect(() => {
    if (item.languageMode) {
      setCardLangMode(item.languageMode);
    }
  }, [item.languageMode]);

  // Track actual container width for 1920x1080 virtual scaling
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const measure = () => {
      const w = el.offsetWidth;
      if (w > 0) setScale(w / VIRTUAL_W);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Reference string
  const isCustomSlide = item.type === "custom";
  const bookName = item.book || (isCustomSlide ? "Custom Slide" : "");
  const tamilBook = isCustomSlide ? "" : getTamilBookName(bookName);
  const indexStr = isCustomSlide
    ? (item.title || item.name || "Custom Slide")
    : (item.chapter || item.verse ? `${tamilBook} (${bookName}) ${item.chapter}:${item.verse}` : (bookName || "Slide"));

  const isSingle = verseCount === 1 && !indexStr.includes(",") && !indexStr.includes("-");

  // ─── Per-card language configuration
  const currentLangMode = cardLangMode;
  const showTamilOnCard = currentLangMode === "both" || currentLangMode === "tamil";
  const showEnglishOnCard = currentLangMode === "both" || currentLangMode === "english";

  const tamilEnabled = settings?.isTamilEnabled !== false && showTamilOnCard;
  const englishEnabled = settings?.isEnglishEnabled !== false && showEnglishOnCard;

  // ─── Verse type
  const cleanText = (html) => (html || "").replace(/<[^>]*>/g, "");
  const getVerseType = (tamil, english) => {
    const len = (tamil?.length || 0) * 1.2 + (english?.length || 0);
    if (len < 80) return "small";
    if (len > 250) return "large";
    return "medium";
  };

  const type = getVerseType(cleanText(displayTamil), cleanText(displayEnglish));

  // ─── FONT_PRESETS — specifically optimized for verse card readability
  const FONT_PRESETS = {
    small: { tamil: 8.2, eng: 6.5, min: 0.0 },
    medium: { tamil: 6.2, eng: 5.2, min: 3.5 },
    large: { tamil: 4.7, eng: 3.9, min: 2.8 },
    huge: { tamil: 9.8, eng: 7.8, min: 3.0 },
    multi2: { tamil: 5.5, eng: 4.5, min: 3.0 },
    multi3: { tamil: 5.4, eng: 0, min: 2.8 },
    multi: { tamil: 4.6, eng: 0, min: 2.0 },
  };

  let effectiveType = type;
  if (isSingle && (type === "small" || type === "medium")) {
    effectiveType = "huge";
  } else if (!isSingle) {
    if (verseCount === 2) {
      effectiveType = "multi2";
    } else if (verseCount === 3) {
      effectiveType = "multi3";
    } else {
      effectiveType = "multi";
    }
  }
  const preset = FONT_PRESETS[effectiveType] || FONT_PRESETS.medium;

  useLayoutEffect(() => {
    if (!boxRef.current || !verseAreaRef.current) return;
    if (tamilEnabled && !tamilTextRef.current) return;
    if (englishEnabled && !engTextRef.current) return;

    const offset = localFontOffset;
    let tamilVW = preset.tamil;
    let engVW = preset.eng;

    // Scale up Tamil when English is hidden/disabled
    if (!englishEnabled && tamilEnabled) {
      if (isSingle) {
        tamilVW = 9.8;
      } else if (verseCount === 2) {
        tamilVW = 6.2;
      } else if (verseCount === 3) {
        tamilVW = 5.8;
      } else {
        tamilVW = 5.0;
      }
    }

    // Scale up English when Tamil is hidden/disabled (English Only!)
    if (!tamilEnabled && englishEnabled) {
      if (isSingle) {
        engVW = 8.5; // Beautiful, clear English font
      } else if (verseCount === 2) {
        engVW = 5.6;
      } else if (verseCount === 3) {
        engVW = 5.0;
      } else {
        engVW = 4.4;
      }
    }

    if (tamilVW < 1.5) tamilVW = 1.5;
    if (engVW < 1.2) engVW = 1.2;

    const vwUnit = VIRTUAL_W / 100;

    // Apply initial sizes
    if (tamilTextRef.current && tamilEnabled) {
      tamilTextRef.current.style.fontSize = `${tamilVW * vwUnit}px`;
    }
    if (engTextRef.current && englishEnabled) {
      engTextRef.current.style.fontSize = `${engVW * vwUnit}px`;
    }

    const boxWidth = boxRef.current.clientWidth;
    const boxHeight = boxRef.current.clientHeight;

    const globalTamilOffset = (settings?.tamilFontOffset || 0) * 0.15;
    const globalEngOffset = (settings?.englishFontOffset || 0) * 0.12;

    if (boxWidth > 0 && boxHeight > 0) {
      let safety = 0;
      const minTamil = verseCount >= 2 ? 1.8 : preset.min;
      const minEng = verseCount >= 2 ? 1.6 : (preset.min * 0.85);

      while (
        (boxRef.current.scrollHeight > boxRef.current.clientHeight ||
          (tamilTextRef.current && tamilEnabled && tamilTextRef.current.scrollWidth > boxRef.current.clientWidth) ||
          (engTextRef.current && englishEnabled && engTextRef.current.scrollWidth > boxRef.current.clientWidth)) &&
        ((tamilEnabled && tamilVW > minTamil) || (englishEnabled && engVW > minEng)) &&
        safety < 120
      ) {
        if (tamilEnabled && tamilVW > minTamil) tamilVW -= 0.1;
        if (englishEnabled && engVW > minEng) engVW -= 0.08;

        if (tamilTextRef.current && tamilEnabled) {
          tamilTextRef.current.style.fontSize = `${tamilVW * vwUnit}px`;
        }
        if (engTextRef.current && englishEnabled) {
          engTextRef.current.style.fontSize = `${engVW * vwUnit}px`;
        }
        safety++;
      }
    }

    // Apply manual sizing offsets AFTER auto-shrink
    tamilVW += offset * 0.15 + globalTamilOffset;
    engVW += offset * 0.12 + globalEngOffset;

    if (tamilTextRef.current && tamilEnabled) {
      tamilTextRef.current.style.fontSize = `${tamilVW * vwUnit}px`;
    }
    if (engTextRef.current && englishEnabled) {
      engTextRef.current.style.fontSize = `${Math.max(0, engVW) * vwUnit}px`;
    }
  }, [displayTamil, displayEnglish, localFontOffset, preset, settings, isEditing, tamilEnabled, englishEnabled, verseCount, isSingle]);

  // Reference sizing logic — NOT affected by verse font resize button
  useLayoutEffect(() => {
    if (!indexTextRef.current) return;
    const refLen = indexStr.length;
    const indexOffset = (settings?.indexFontOffset || 0) * 0.12;

    let vw = (refLen > 38 ? 2.5 : refLen > 26 ? 3.2 : 3.8) + indexOffset;
    if (vw < 2.0) vw = 2.0;

    const vwUnit = VIRTUAL_W / 100;
    indexTextRef.current.style.fontSize = `${vw * vwUnit}px`;
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
    if (isEditing || editingRefId || isFlipped) return;
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (hasCopiedItem) {
      pasteContent?.(item.id);
      return;
    }
    handleItemClick(item.id);
    handlePresent(item);
  };

  const handleLanguageChange = (mode) => {
    setCardLangMode(mode);
    if (updateQueueItem) {
      updateQueueItem(item.id, {
        languageMode: mode,
        showEnglish: mode === "both" || mode === "english",
        showTamil: mode === "both" || mode === "tamil",
      });
    }
  };

  const handleSaveCardSettings = () => {
    if (updateQueueItem) {
      updateQueueItem(item.id, {
        tamilHtml: editTextTamil,
        englishHtml: editTextEnglish,
        tamilText: editTextTamil.replace(/<[^>]*>/g, ""),
        fontSizeOffset: localFontOffset,
        languageMode: cardLangMode,
        showEnglish: cardLangMode === "both" || cardLangMode === "english",
        showTamil: cardLangMode === "both" || cardLangMode === "tamil",
      });
    }
    toast.success("Card settings saved!");
    setIsFlipped(false);
  };

  const handleResetCardText = () => {
    const defaultMode = verseCount >= 3 ? "tamil" : "both";
    setCardLangMode(defaultMode);
    if (updateQueueItem) {
      updateQueueItem(item.id, {
        tamilHtml: null,
        englishHtml: null,
        languageMode: defaultMode,
        showEnglish: defaultMode !== "tamil",
        showTamil: true,
        fontSizeOffset: 0,
      });
    }
    setLocalFontOffset(0);
    toast.success("Reset to default scripture!");
    setIsFlipped(false);
  };

  const formatCardText = (editorRef, command) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    document.execCommand(command, false, null);
    const html = editor.innerHTML;
    if (editor === tamilEditorRef.current) setEditTextTamil(html);
    if (editor === englishEditorRef.current) setEditTextEnglish(html);
  };

  // Read Custom Slide Layout Overrides
  const layout = pendingLayoutOverrides || item.layoutOverrides || {};

  const handleLayoutChange = (key, value) => {
    if (setPendingLayoutOverrides) {
      setPendingLayoutOverrides((prev) => ({
        ...(prev || item.layoutOverrides || {}),
        [key]: value,
      }));
    }
  };

  const vhUnit = VIRTUAL_H / 100;
  const vwUnit = VIRTUAL_W / 100;

  const isSmallMedium = type === "small" || type === "medium";
  // Match the presentation window: this is a minimum, not a fixed height.
  // The reference text plus its padding can grow beyond it before verse layout starts.
  const refAreaMinHeight = (isSmallMedium && isSingle ? 6 : 5) * vhUnit;

  const primaryIsEnglish = settings?.primaryTranslation === "English";
  const tamilOrder = primaryIsEnglish ? 2 : 1;
  const englishOrder = primaryIsEnglish ? 1 : 2;

  // Layout calculations
  let verseAreaPaddingTop =
    isSmallMedium && isSingle ? 0.5 * vhUnit : 1 * vhUnit;
  let verseAreaPaddingSides = isSmallMedium && isSingle ? 3 * vwUnit : 1 * vwUnit;

  if (layout.versePaddingTop !== undefined) {
    verseAreaPaddingTop = layout.versePaddingTop * vhUnit;
  }
  // Keep scripture above the watermark exactly as a safe lower boundary.
  // This prevents long verses from running through the watermark in the card preview.
  const watermarkReserve = (settings?.customWatermark ? 11 : 9) * vhUnit;
  const verseAreaPadding = `${verseAreaPaddingTop}px ${verseAreaPaddingSides}px ${watermarkReserve}px`;
  const verseBoxJustify = isSingle ? "center" : "flex-start";

  const tamilLineHeight = layout.tamilLineHeight !== undefined ? layout.tamilLineHeight : (isSingle ? 1.28 : 1.35);
  const englishLineHeight = layout.englishLineHeight !== undefined ? layout.englishLineHeight : 1.35;

  const REF_PAD_TOP = (layout.indexPaddingTop !== undefined ? layout.indexPaddingTop : 2.5) * vhUnit;
  const REF_PAD_BOTTOM = 0.8 * vhUnit;

  // Appearance
  const defaultBg = theme === "dark" ? "#000000" : "#ffffff";
  const defaultText = theme === "dark" ? "#ffffff" : "#000000";

  const bgType = settings?.presentationBgType;
  const bgColor = settings?.presentationBgColor || "#000000";
  const bgImage = settings?.presentationBgImage || "";
  const textColor = settings?.presentationTextColor || defaultText;

  const isImageBg = bgType === "image" && bgImage;

  let slideBg = defaultBg;
  if (isImageBg) {
    slideBg = `url("${bgImage.replace(/\\/g, "/")}") center/cover no-repeat`;
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
      style={{
        perspective: "1200px",
        marginBottom: "20px",
        maxWidth: "98%",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          transformStyle: "preserve-3d",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          borderRadius: "10px",
          border: isEditing
            ? "2px solid #007bff"
            : isActive
              ? `2px solid ${theme === "dark" ? "#00ff99" : "#003399"}`
              : `1px solid ${theme === "dark" ? "#2a2a2a" : "#e0e0e0"}`,
          boxShadow: isActive
            ? "0 0 12px rgba(0,255,153,0.15)"
            : "0 2px 6px rgba(0,0,0,0.07)",
          background: theme === "dark" ? "#1a1a1a" : "#f8f8f8",
        }}
        onClick={() => {
          if (!isEditing && !editingRefId && !isFlipped) handleItemClick(item.id);
        }}
      >
        {/* ═══════════════════════════════════════════════════════════════════
            FRONT FACE: Toolbar + Native Virtual Slide Preview
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            width: "100%",
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: theme === "dark" ? "#00ff99" : "#003399",
                  opacity: 0.9,
                }}
              >
                {isCustomSlide ? (item.title || "Custom Slide") : `${item.book} ${item.chapter}:${item.verse}`}
              </div>

              {/* Multi-verse language badge indicator */}
              {cardLangMode !== "both" && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: theme === "dark" ? "#222" : "#e0e0e0",
                    color: theme === "dark" ? "#00ff99" : "#003399",
                    border: `1px solid ${theme === "dark" ? "#333" : "#ccc"}`,
                  }}
                >
                  {cardLangMode === "tamil" ? "Tamil Only" : "English Only"}
                </span>
              )}

              {/* Issue indicator dot */}
              {(() => {
                const verseKey = String(item.verse);
                const issueData = verseIssues[verseKey];
                if (issueData && issueData.count > 0) {
                  const dotColor = ISSUE_DOT_COLORS[issueData.status] || "#ffc107";
                  return (
                    <span
                      title={`${issueData.count} issue(s) — ${issueData.status}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        background: dotColor,
                        color: "#000",
                        fontSize: "10px",
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
              {onReportVerse && !isEditing && user && (
                <>
                  <button
                    type="button"
                    title="Report issue with Tamil verse"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReportVerse(item.book, item.chapter, item.verse, "Tamil (BSI)");
                    }}
                    style={{
                      cursor: "pointer",
                      background: "transparent",
                      border: `1px solid ${theme === "dark" ? "#444" : "#bbb"}`,
                      borderRadius: "4px",
                      padding: "3px 4px",
                      color: "#ffc107",
                      fontSize: "11px",
                      fontWeight: "bold",
                      lineHeight: 1,
                      transition: "opacity 0.15s",
                      opacity: 0.6,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
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
                      cursor: "pointer",
                      background: "transparent",
                      border: `1px solid ${theme === "dark" ? "#444" : "#bbb"}`,
                      borderRadius: "4px",
                      padding: "3px 4px",
                      color: "#ffc107",
                      fontSize: "11px",
                      fontWeight: "bold",
                      lineHeight: 1,
                      transition: "opacity 0.15s",
                      opacity: 0.6,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
                  >
                    ⚠ EN
                  </button>
                </>
              )}

              {/* Font Sizing Buttons */}
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

              {/* 3D Flip Card Button */}
              {!isEditing && (
                <button
                  type="button"
                  title="Flip card for language & custom settings"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  style={btnStyle({
                    fontSize: "11px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 7px",
                    background: theme === "dark" ? "rgba(0, 255, 153, 0.1)" : "rgba(0, 51, 153, 0.08)",
                    border: `1px solid ${theme === "dark" ? "#00ff99" : "#003399"}`,
                    color: theme === "dark" ? "#00ff99" : "#003399",
                  })}
                >
                  <span>🔄</span>
                  <span>Flip / Settings</span>
                </button>
              )}

              {/* In-place Text Edit Toggle */}
              {!isEditing ? (
                <button
                  type="button"
                  title="Edit text directly on slide"
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

          {/* ── Slide Preview: 16:9 Aspect Ratio Container ── */}
          <div
            style={{
              width: "100%",
              paddingTop: "56.25%",
              position: "relative",
              overflow: "hidden",
              borderRadius: "0 0 8px 8px",
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
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  zIndex: 2,
                  cursor: editingRefId ? "default" : "pointer",
                }}
                onClick={!editingRefId ? handlePresentClick : undefined}
              />
            )}

            {/* 1920×1080 Native Virtual Slide Container (Instant rendering, no iframe lag!) */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${VIRTUAL_W}px`,
                height: `${VIRTUAL_H}px`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                background: slideBg,
                display: "flex",
                flexDirection: "column",
                userSelect: isEditing ? "text" : "none",
              }}
            >
              {/* ── Reference Area ── */}
              <div
                style={{
                  minHeight: `${refAreaMinHeight}px`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  paddingTop: `${REF_PAD_TOP}px`,
                  paddingBottom: `${REF_PAD_BOTTOM}px`,
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
                  alignItems: "center",
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
                    maxHeight: "95%",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: verseBoxJustify,
                    gap: "0",
                    textAlign: "center",
                  }}
                >
                  {showTamilOnCard && displayTamil && (
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
                        outline: isEditing ? "2px dashed #007bff" : "none",
                        outlineOffset: "4px",
                        border: "none",
                        padding: "0 0 0.35em 0",
                        textDecorationSkipInk: "none",
                        WebkitTextDecorationSkipInk: "none",
                        wordBreak: "keep-all",
                        overflowWrap: "anywhere",
                      }}
                    />
                  )}
                  {englishEnabled && displayEnglish && (
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
                        outline: isEditing ? "2px dashed #007bff" : "none",
                        outlineOffset: "4px",
                        border: "none",
                        padding: "0 0 0.35em 0",
                        textDecorationSkipInk: "none",
                        WebkitTextDecorationSkipInk: "none",
                        wordBreak: "keep-all",
                        overflowWrap: "anywhere",
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Watermark */}
              {settings?.customWatermark && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "15px",
                    right: "25px",
                    fontSize: `${1.5 * vwUnit}px`,
                    color: textColor,
                    opacity: 0.35,
                    zIndex: 100,
                  }}
                >
                  {settings.customWatermark}
                </div>
              )}
            </div>
          </div>

          {/* ── Slide Properties Panel (In-place Edit Mode Only) ── */}
          {isEditing && (
            <div
              style={{
                padding: "12px 15px",
                background: theme === "dark" ? "#0f0e0eff" : "#fff",
                borderTop: theme === "dark" ? "1px solid #333" : "1px solid #e0e0e0",
                borderRadius: "0 0 8px 8px",
                display: "flex",
                flexWrap: "wrap",
                gap: "15px",
                fontSize: "13px",
                color: theme === "dark" ? "#ccc" : "#444",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontWeight: "bold" }}>Ref Top Padding (vh)</label>
                <input
                  type="number"
                  step="0.5"
                  value={layout.indexPaddingTop !== undefined ? layout.indexPaddingTop : 4}
                  onChange={(e) => handleLayoutChange("indexPaddingTop", Number(e.target.value))}
                  style={{
                    padding: "4px",
                    borderRadius: "4px",
                    border: "1px solid #555",
                    background: theme === "dark" ? "#222" : "#fff",
                    color: theme === "dark" ? "#fff" : "#000",
                    width: "80px",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontWeight: "bold" }}>Verse Top Padding (vh)</label>
                <input
                  type="number"
                  step="0.5"
                  value={
                    layout.versePaddingTop !== undefined
                      ? layout.versePaddingTop
                      : isSmallMedium && isSingle
                        ? 0.5
                        : 1
                  }
                  onChange={(e) => handleLayoutChange("versePaddingTop", Number(e.target.value))}
                  style={{
                    padding: "4px",
                    borderRadius: "4px",
                    border: "1px solid #555",
                    background: theme === "dark" ? "#222" : "#fff",
                    color: theme === "dark" ? "#fff" : "#000",
                    width: "80px",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontWeight: "bold" }}>Tamil Line Height</label>
                <input
                  type="number"
                  step="0.05"
                  value={
                    layout.tamilLineHeight !== undefined
                      ? layout.tamilLineHeight
                      : isSingle
                        ? 1.28
                        : 1.35
                  }
                  onChange={(e) => handleLayoutChange("tamilLineHeight", Number(e.target.value))}
                  style={{
                    padding: "4px",
                    borderRadius: "4px",
                    border: "1px solid #555",
                    background: theme === "dark" ? "#222" : "#fff",
                    color: theme === "dark" ? "#fff" : "#000",
                    width: "80px",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <label style={{ fontWeight: "bold" }}>English Line Height</label>
                <input
                  type="number"
                  step="0.05"
                  value={
                    layout.englishLineHeight !== undefined
                      ? layout.englishLineHeight
                      : 1.35
                  }
                  onChange={(e) => handleLayoutChange("englishLineHeight", Number(e.target.value))}
                  style={{
                    padding: "4px",
                    borderRadius: "4px",
                    border: "1px solid #555",
                    background: theme === "dark" ? "#222" : "#fff",
                    color: theme === "dark" ? "#fff" : "#000",
                    width: "80px",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            BACK FACE: Per-Card Settings (Language, Font Size, Editable Text)
           ═══════════════════════════════════════════════════════════════════ */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            background: theme === "dark" ? "#161616" : "#ffffff",
            borderRadius: "10px",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            zIndex: isFlipped ? 10 : -1,
            pointerEvents: isFlipped ? "auto" : "none",
            boxShadow: theme === "dark" ? "inset 0 0 15px rgba(0,0,0,0.6)" : "inset 0 0 10px rgba(0,0,0,0.05)",
          }}
        >
          {/* Back Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderBottom: `1px solid ${theme === "dark" ? "#2a2a2a" : "#eee"}`,
              background: theme === "dark" ? "#121212" : "#f5f5f5",
              position: "sticky",
              top: 0,
              zIndex: 3,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px" }}>⚙️</span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "13px",
                  color: theme === "dark" ? "#00ff99" : "#003399",
                }}
              >
                Card Customization — {item.book} {item.chapter}:{item.verse}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFlipped(false)}
              style={btnStyle({
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "12px",
                padding: "4px 10px",
                background: theme === "dark" ? "rgba(0, 255, 153, 0.15)" : "#e6f0ff",
                border: `1px solid ${theme === "dark" ? "#00ff99" : "#003399"}`,
                color: theme === "dark" ? "#00ff99" : "#003399",
              })}
            >
              <span>↩</span>
              <span>Flip Back</span>
            </button>
          </div>

          {/* Back Content Body */}
          <div
            style={{
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              fontSize: "13px",
              color: theme === "dark" ? "#e0e0e0" : "#333",
            }}
          >
            {/* Section 1: Language Selection */}
            <div>
              <div
                style={{
                  fontWeight: 700,
                  marginBottom: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>Display Language / Translation:</span>
                {verseCount > 1 && (
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: theme === "dark" ? "#888" : "#666",
                    }}
                  >
                    ({verseCount} verses)
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {[
                  { id: "both", label: "Both (Tamil + NKJV)" },
                  { id: "tamil", label: "Tamil Only (BSI)" },
                  { id: "english", label: "English Only (NKJV)" },
                ].map((opt) => {
                  const isSelected = cardLangMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleLanguageChange(opt.id)}
                      style={{
                        cursor: "pointer",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected
                          ? `2px solid ${theme === "dark" ? "#00ff99" : "#003399"}`
                          : `1px solid ${theme === "dark" ? "#333" : "#ccc"}`,
                        background: isSelected
                          ? theme === "dark"
                            ? "#00ff99"
                            : "#003399"
                          : theme === "dark"
                            ? "#222"
                            : "#fafafa",
                        color: isSelected
                          ? theme === "dark"
                            ? "#000"
                            : "#fff"
                          : theme === "dark"
                            ? "#ddd"
                            : "#444",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {verseCount > 1 && (
                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "11px",
                    color: theme === "dark" ? "#9ed8bb" : "#2e7d32",
                    background: theme === "dark" ? "rgba(0, 255, 153, 0.08)" : "rgba(46, 125, 50, 0.08)",
                    padding: "6px 10px",
                    borderRadius: "4px",
                    borderLeft: "3px solid #66bb6a",
                  }}
                >
                  💡 <strong>Tip:</strong> English verse for multi-verse is optional. Selecting <strong>Tamil Only</strong> allows multiple verses to fill the slide with a larger, highly readable font.
                </div>
              )}
            </div>

            {/* Section 3: Editable Verse Content */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <span style={{ fontWeight: 700 }}>Edit Verse Content (Overrides Default):</span>
              <span style={{ fontSize: "11px", opacity: 0.75 }}>Select text, then use Bold or Italic. The formatting is preserved on the presentation.</span>

              {showTamilOnCard && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: theme === "dark" ? "#aaa" : "#555" }}>Tamil Text:</label>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button type="button" onClick={() => formatCardText(tamilEditorRef, "bold")} style={btnStyle({ fontWeight: 800 })}>B</button>
                      <button type="button" onClick={() => formatCardText(tamilEditorRef, "italic")} style={btnStyle({ fontStyle: "italic" })}>I</button>
                    </div>
                  </div>
                  <div
                    ref={tamilEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: editTextTamil }}
                    onInput={(e) => setEditTextTamil(e.currentTarget.innerHTML)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      minHeight: "150px",
                      padding: "12px",
                      borderRadius: "6px",
                      border: `1px solid ${theme === "dark" ? "#444" : "#ccc"}`,
                      background: theme === "dark" ? "#222" : "#fff",
                      color: theme === "dark" ? "#fff" : "#000",
                      fontFamily: '"TamilBibleFont", Arial, sans-serif',
                      fontSize: "17px",
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      overflowY: "auto",
                      outline: "none",
                    }}
                  />
                </div>
              )}

              {showEnglishOnCard && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ fontSize: "12px", fontWeight: 600, color: theme === "dark" ? "#aaa" : "#555" }}>English Text (NKJV):</label>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <button type="button" onClick={() => formatCardText(englishEditorRef, "bold")} style={btnStyle({ fontWeight: 800 })}>B</button>
                      <button type="button" onClick={() => formatCardText(englishEditorRef, "italic")} style={btnStyle({ fontStyle: "italic" })}>I</button>
                    </div>
                  </div>
                  <div
                    ref={englishEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: editTextEnglish }}
                    onInput={(e) => setEditTextEnglish(e.currentTarget.innerHTML)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      minHeight: "150px",
                      padding: "12px",
                      borderRadius: "6px",
                      border: `1px solid ${theme === "dark" ? "#444" : "#ccc"}`,
                      background: theme === "dark" ? "#222" : "#fff",
                      color: theme === "dark" ? "#fff" : "#000",
                      fontSize: "16px",
                      lineHeight: 1.55,
                      whiteSpace: "pre-wrap",
                      overflowY: "auto",
                      outline: "none",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Section 4: Action Footer */}
            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "flex-end",
                marginTop: "4px",
                paddingTop: "10px",
                borderTop: `1px solid ${theme === "dark" ? "#2a2a2a" : "#eee"}`,
              }}
            >
              <button
                type="button"
                onClick={handleResetCardText}
                style={btnStyle({
                  padding: "6px 12px",
                  color: "#ff5252",
                  borderColor: "#ff5252",
                  fontSize: "12px",
                })}
              >
                Reset to Default
              </button>
              <button
                type="button"
                onClick={handleSaveCardSettings}
                style={{
                  cursor: "pointer",
                  padding: "6px 16px",
                  borderRadius: "4px",
                  background: theme === "dark" ? "#00ff99" : "#003399",
                  color: theme === "dark" ? "#000" : "#fff",
                  fontWeight: 700,
                  fontSize: "12px",
                  border: "none",
                }}
              >
                Save & Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrelistVerseCard;
