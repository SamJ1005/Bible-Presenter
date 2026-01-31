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
        overflow: "hidden"
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
          placeholder={isEditing ? "Edit Reference..." : "Reference 1chr 33 12"}
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

          <svg
            onClick={isEditing ? saveRefEdit : handleSearchOverride}
            width="17"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isEditing ? (theme === "dark" ? "#00ee88" : "#00aa66") : (theme === "dark" ? "#888" : "#666")}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              flexShrink: 0,
              marginLeft: "1px",
              cursor: "pointer",
              transition: "stroke 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.stroke =
                theme === "dark" ? "#00ff99" : "#003399";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.stroke =
                 isEditing ? (theme === "dark" ? "#00ee88" : "#00aa66") : (theme === "dark" ? "#888" : "#666");
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
        </span>
      </div>

      {/* Prev / Next buttons */}
      <button
        title="Previous Item"
        onClick={() => navigateList('prev')}
        style={{
          width: "20px",
          height: "20px",
          minWidth: "35px",
          minHeight: "35px",
          padding: "0",
          borderRadius: "50%",
          fontSize: "15px",
          background: theme === "dark" ? "#0f0e0eff" : "#eee",
          color: theme === "dark" ? "white" : "black",
          border: theme === "dark" ? "1px solid #555" : "1px solid #999",
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            theme === "dark" ? "#1a1a1a" : "#d3d3d3";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            theme === "dark" ? "#0f0e0eff" : "#eee";
        }}
      >
        🡨
      </button>

      <button
        title="Next Item"
        onClick={() => navigateList('next')}
        style={{
          width: "35px",
          height: "35px",
          minWidth: "35px",
          minHeight: "35px",
          padding: "0",
          borderRadius: "50%",
          fontSize: "15px",
          background: theme === "dark" ? "#0f0e0eff" : "#eee",
          color: theme === "dark" ? "white" : "black",
          border: theme === "dark" ? "1px solid #555" : "1px solid #999",
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background =
            theme === "dark" ? "#1a1a1a" : "#d3d3d3";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            theme === "dark" ? "#0f0e0eff" : "#eee";
        }}
      >
        🡪
      </button>
    </div>
  );
};

export default PrelistSearch;
