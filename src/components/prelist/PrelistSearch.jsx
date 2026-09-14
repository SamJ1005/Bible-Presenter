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
        overflow: "visible",
        padding: "2px 2px",
        boxSizing: "border-box",
      }}
    >
      {/* Search bar container with focus styling */}
      <div
        style={{
          flex: 1,
          minWidth: "0",
          display: "flex",
          alignItems: "center",
          padding: "8px 10px",
          borderRadius: "6px",
          transition:
            "background 0.25s ease-in-out, color 0.25s ease-in-out, border-color 0.25s ease-in-out, box-shadow 0.25s ease-in-out",
          background: isEditing 
            ? (theme === "dark" ? "#1e1e0a" : "#fffde7") // Subtle yellow tint for edit mode
            : (theme === "dark" ? "#0f0e0eff" : "#fff"),
          border: isEditing 
            ? (theme === "dark" ? "1px solid #aa8800" : "1px solid #ddbb00") 
            : undefined,
          cursor: "text",
          position: "relative",
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
            flex: 1,
            minWidth: "0",
            border: "none",
            outline: "none",
            background: "transparent",
            color: theme === "dark" ? "white" : "#000",
            fontSize: "14px",
            fontFamily: "inherit",
          }}
        />
        {/* Action Icon Button */}
        <span
          style={{ display: "flex", alignItems: "center", gap: "5px" }}
        >
          {isEditing && (
            <svg
              onClick={cancelRefEdit}
              title="Cancel"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme === "dark" ? "#aa5555" : "#cc3333"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ cursor: 'pointer', marginRight: '5px' }}
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          )}

          <SearchActionIcon
            theme={theme}
            isEditing={isEditing}
            onClick={isEditing ? saveRefEdit : handleSearchOverride}
          />
        </span>
      </div>

      {/* Prev / Next buttons */}
      <NavRoundButton
        title="Previous Item"
        onClick={() => navigateList('prev')}
        theme={theme}
      >
        🡨
      </NavRoundButton>

      <NavRoundButton
        title="Next Item"
        onClick={() => navigateList('next')}
        theme={theme}
      >
        🡪
      </NavRoundButton>
    </div>
  );
};

function SearchActionIcon({ theme, isEditing, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  const defaultStroke = isEditing 
    ? (theme === "dark" ? "#00ee88" : "#00aa66") 
    : (theme === "dark" ? "#888" : "#666");
  const hoverStroke = theme === "dark" ? "#00ff99" : "#003399";

  return (
    <svg
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      width="17"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={hovered ? hoverStroke : defaultStroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        marginLeft: "1px",
        cursor: "pointer",
        transition: "stroke 0.2s ease",
      }}
    >
      {isEditing ? (
        <polyline points="20 6 9 17 4 12"></polyline>
      ) : (
        <>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </>
      )}
    </svg>
  );
}

function NavRoundButton({ onClick, title, theme, children }) {
  const [hovered, setHovered] = React.useState(false);
  const bg = hovered
    ? (theme === "dark" ? "#1a1a1a" : "#d3d3d3")
    : (theme === "dark" ? "#0f0e0eff" : "#eee");

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "35px",
        height: "35px",
        minWidth: "35px",
        minHeight: "35px",
        maxWidth: "35px",
        maxHeight: "35px",
        flexShrink: 0,
        padding: "0",
        borderRadius: "50%",
        fontSize: "15px",
        background: bg,
        color: theme === "dark" ? "white" : "black",
        border: theme === "dark" ? "1px solid #555" : "1px solid #999",
        cursor: "pointer",
        transition: "background 0.2s ease, border-color 0.2s ease, color 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        overflow: "hidden",
        outline: "none",
      }}
    >
      {children}
    </button>
  );
}

export default PrelistSearch;
