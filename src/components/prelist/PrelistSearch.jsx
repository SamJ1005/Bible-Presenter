import React from "react";

const PrelistSearch = ({ 
  theme, 
  localSearch, 
  setLocalSearch, 
  handleSearchOverride, 
  navigateList,
  searchInputRef,
  editingRefId,
  saveRefEdit,
  cancelRefEdit
}) => {
  const isEditing = !!editingRefId;

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
        }}
        className="search-container"
      >
        <input
          ref={searchInputRef}
          className="search-input"
          placeholder={isEditing ? "Edit Reference..." : "Reference jn03 16"}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
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
          title={isEditing ? "Save Changes" : "Search Verse"}
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
