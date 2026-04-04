import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import PrelistEditToolbar from "./PrelistEditToolbar";
import { getTamilBookName } from "../../utils/bibleBooks";

// Virtual slide: 1920×1080 — matches presentation_prelist.html vw/vh base
const VIRTUAL_W = 1920;
const VIRTUAL_H = 1080;

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
  applyCustomFontSize
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

  useEffect(() => {
    setLocalFontOffset(item.fontSizeOffset || 0);
  }, [item.fontSizeOffset]);

  useEffect(() => {
    if (isEditing && onLivePreviewUpdate) {
      onLivePreviewUpdate(item, localFontOffset);
    }
  }, [localFontOffset, isEditing, item, onLivePreviewUpdate]);

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
    medium: { tamil: 6.2, eng: 5.8, min: 3.5 },
    large: { tamil: 4.5, eng: 3.8, min: 1.8 },
    huge: { tamil: 6.0, eng: 6.8, min: 3.0 },
    multi2: { tamil: 5.5, eng: 0.0, min: 3.0 },
    multi: { tamil: 4.2, eng: 0.0, min: 2.0 },
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

    // Apply manual sizing offsets AFTER auto-shrink has found the container bounds
    const globalTamilOffset = (settings?.tamilFontOffset || 0) * 0.15;
    const globalEngOffset = (settings?.englishFontOffset || 0) * 0.12;
    
    tamilVW += offset * 0.15 + globalTamilOffset;
    engVW += offset * 0.12 + globalEngOffset;

    tamilTextRef.current.style.fontSize = `${tamilVW * vwUnit}px`;
    if (engTextRef.current) {
      engTextRef.current.style.fontSize = `${Math.max(0, engVW) * vwUnit}px`;
    }
  }, [displayTamil, displayEnglish, localFontOffset, preset, settings]);

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
  }, [indexStr, settings?.indexFontOffset]);

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

  // ─── Layout
  const isSmallMedium = type === "small" || type === "medium";
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
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
        {/* The Scaled 1920x1080 "Virtual" Screen */}
        <div
          onClick={!isEditing ? handlePresentClick : undefined}
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
          }}
        >
          {/* ── Reference Area ── */}
          <div
            style={{
              minHeight: "5cqb",
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
                    wordBreak: "break-word",
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
