import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";

const PrelistSearch = ({ 
  theme, 
  localSearch, 
  setLocalSearch, 
  handleSearchOverride, 
  navigateList,
  searchInputRef,
  editingRefId,
  saveRefEdit,
  cancelRefEdit,
  onPasteMedia,
  activeId,
}) => {
  const isEditing = !!editingRefId;
  const [showPasteHint, setShowPasteHint] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const pasteTimeoutRef = useRef(null);

  const triggerPaste = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isPasting) return false;
    setIsPasting(true);
    try {
      if (onPasteMedia) {
        const ok = await onPasteMedia(activeId);
        if (ok) {
          setShowPasteHint(false);
          return true;
        } else {
          toast("📋 Clipboard does not contain an image or media file. Try copying an image or video first!", {
            icon: "ℹ️",
            duration: 3000,
          });
        }
      }
    } finally {
      setIsPasting(false);
    }
    return false;
  };

  const showHintTemporarily = () => {
    setShowPasteHint(true);
    if (pasteTimeoutRef.current) clearTimeout(pasteTimeoutRef.current);
    pasteTimeoutRef.current = setTimeout(() => setShowPasteHint(false), 4500);
  };

  const handleInputClick = () => {
    showHintTemporarily();
  };

  const handleInputDoubleClick = () => {
    showHintTemporarily();
  };

  const handleInputPaste = async (e) => {
    // Intercept image/video files pasted while focused in search box
    const hasFiles = e.clipboardData?.files?.length > 0;
    const hasImageItem = Array.from(e.clipboardData?.items || []).some(
      (it) => it.kind === "file" && it.type.startsWith("image/")
    );

    if (hasFiles || hasImageItem) {
      e.preventDefault();
      e.stopPropagation();
      if (onPasteMedia) {
        await onPasteMedia(activeId, e);
      }
    }
    // If plain text, normal text paste will happen in the search input
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        width: "100%",
        height: "34px",
        overflow: "visible",
        boxSizing: "border-box",
      }}
    >
      {/* 1. Input box */}
      <div
        style={{
          flex: 1,
          minWidth: "0",
          height: "34px",
          borderRadius: "6px",
          background: isEditing
            ? (theme === "dark" ? "#1e1e0a" : "#fffde7")
            : (theme === "dark" ? "#121212" : "#f8f8f8"),
          border: isEditing
            ? (theme === "dark" ? "1px solid #aa8800" : "1px solid #ddbb00")
            : (theme === "dark" ? "1px solid #444" : "1px solid #ccc"),
          display: "flex",
          alignItems: "center",
          boxSizing: "border-box",
          position: "relative",
          transition: "background 0.25s ease-in-out, border-color 0.25s ease-in-out",
        }}
        className="search-container"
      >
        {/* Floating "Paste here" hint button on left-click / double-click */}
        {showPasteHint && (
          <div
            onMouseDown={(e) => {
              e.preventDefault(); // Retain input focus & blinking cursor!
              e.stopPropagation();
              triggerPaste(e);
            }}
            style={{
              position: "absolute",
              top: "-26px",
              left: "4px",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              gap: "5px",
              background: theme === "dark" ? "#00ff99" : "#003399",
              color: theme === "dark" ? "#000" : "#fff",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
            title="Click to paste copied image or video below selected queue item"
          >
            <span>📋 Paste here</span>
            <span style={{ fontSize: "10px", opacity: 0.8 }}>(Ctrl+V)</span>
          </div>
        )}

        <input
          ref={searchInputRef}
          className="search-input"
          placeholder={isEditing ? "Edit Reference..." : "Reference jn03 16"}
          value={localSearch}
          onChange={(e) => {
            setLocalSearch(e.target.value);
            if (showPasteHint) setShowPasteHint(false);
          }}
          onClick={handleInputClick}
          onDoubleClick={handleInputDoubleClick}
          onFocus={showHintTemporarily}
          onPaste={handleInputPaste}
          onKeyDown={(e) => {
            if (
              ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                e.key
              )
            ) {
              e.stopPropagation();
            }
            if (e.key === "Enter") {
              if (isEditing) saveRefEdit();
              else handleSearchOverride();
            }
            if (e.key === "Escape" && isEditing) {
              cancelRefEdit();
            }
          }}
          style={{
            width: "100%",
            minWidth: "0",
            height: "100%",
            border: "none",
            outline: "none",
            background: "transparent",
            color: theme === "dark" ? "white" : "#000",
            fontSize: "13.5px",
            fontFamily: "inherit",
            padding: "0 10px",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* 2. Action buttons (separate rectangle with unified toolbar matching Bible tab) */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: "34px",
          borderRadius: "6px",
          background: theme === "dark" ? "#121212" : "#f8f8f8",
          border: theme === "dark" ? "1px solid #444" : "1px solid #ccc",
          overflow: "hidden",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {isEditing && (
          <button
            type="button"
            title="Cancel"
            onClick={cancelRefEdit}
            style={getBtnStyle(theme, "#aa5555", "#cc3333")}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
              e.currentTarget.style.color = "#ff6b6b";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = theme === "dark" ? "#aa5555" : "#cc3333";
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}

        {/* Search or Save Action Button */}
        <button
          type="button"
          title={isEditing ? "Save Reference" : "Search Verse"}
          onClick={isEditing ? saveRefEdit : handleSearchOverride}
          style={getBtnStyle(
            theme,
            isEditing ? "#00ee88" : "#bbb",
            isEditing ? "#00aa66" : "#555"
          )}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
            e.currentTarget.style.color =
              theme === "dark" ? "#00ff99" : "#0642bb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = isEditing
              ? (theme === "dark" ? "#00ee88" : "#00aa66")
              : (theme === "dark" ? "#bbb" : "#555");
          }}
        >
          {isEditing ? (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          )}
        </button>

        {/* Prev Button */}
        <button
          type="button"
          title="Previous Item"
          onClick={() => navigateList("prev")}
          style={getBtnStyle(theme, "#ccc", "#333", true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
            e.currentTarget.style.color =
              theme === "dark" ? "#00ff99" : "#0642bb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = theme === "dark" ? "#ccc" : "#333";
          }}
        >
          🡨
        </button>

        {/* Next Button */}
        <button
          type="button"
          title="Next Item"
          onClick={() => navigateList("next")}
          style={getBtnStyle(theme, "#ccc", "#333", true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
            e.currentTarget.style.color =
              theme === "dark" ? "#00ff99" : "#0642bb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = theme === "dark" ? "#ccc" : "#333";
          }}
        >
          🡪
        </button>
      </div>
    </div>
  );
};

const getBtnStyle = (theme, darkColor, lightColor, isNav = false) => ({
  background: "transparent",
  border: "none",
  padding: "0 9px",
  height: "100%",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: theme === "dark" ? darkColor : lightColor,
  fontSize: isNav ? "14px" : "13px",
  fontWeight: isNav ? "bold" : "normal",
  transition: "background 0.2s ease, color 0.2s ease",
  outline: "none",
  flexShrink: 0,
});

export default PrelistSearch;
