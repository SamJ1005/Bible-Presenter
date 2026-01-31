import React from "react";
import PrelistEditToolbar from "./PrelistEditToolbar";

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
  itemRefs
}) => {
  return (
    <div
      key={item.id}
      onClick={() => { if (!isEditing && !editingRefId) { handleItemClick(item.id); handlePresent(item); } }}
      ref={el => itemRefs.current[item.id] = el}
      style={{
        background: theme === "dark" ? "#1e1e1e" : "#fff",
        padding: "10px",
        cursor: "pointer",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        border:
          isEditing ? "2px solid #007bff" : (theme === "dark" ? "1px solid #333" : "1px solid #eee"),
        position: "relative",
        outline: (!isEditing && isActive) ? `2px solid ${theme === 'dark' ? '#00ff99' : '#003399'}` : 'none'
      }}
    >
      <div
        style={{
          fontSize: "18px",
          fontWeight: "bold",
          marginBottom: "10px",
          color: theme === "dark" ? "#00ff99" : "#003399",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <span>
          {item.book} {item.chapter}:{item.verse}
        </span>

        {/* Edit Button or Toolbar */}
        {!isEditing ? (
          <button
            onClick={(e) => { e.stopPropagation(); startEditingText(item); }}
            title="Edit Formatting"
            style={{
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              padding: '2px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme === 'dark' ? '#888' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
        ) : (
          <PrelistEditToolbar 
            applyStyle={applyStyle}
            saveTextEdit={saveTextEdit}
            cancelTextEdit={cancelTextEdit}
            itemId={item.id}
          />
        )}
      </div>

      {/* Tamil Content */}
      {displayTamil && (
        <div
          key={isEditing ? "tamil-edit" : "tamil-view"}
          ref={isEditing ? tamilContentRef : null}
          contentEditable={isEditing}
          suppressContentEditableWarning={true}
          onKeyDown={(e) => {
            if (!isEditing) return;
            e.stopPropagation();
          }}
          dangerouslySetInnerHTML={{ __html: displayTamil }}
          style={{
            fontSize: "20px",
            marginBottom: "10px",
            color: theme === "dark" ? "#ddd" : "#333",
            outline: 'none',
            border: isEditing ? '1px dashed #555' : 'none',
            padding: isEditing ? '4px' : '0',
            cursor: isEditing ? 'text' : 'default',
            textDecorationSkipInk: 'none',
            WebkitTextDecorationSkipInk: 'none'
          }}
        />
      )}

      {/* English Content */}
      <div
        key={isEditing ? "eng-edit" : "eng-view"}
        ref={isEditing ? englishContentRef : null}
        contentEditable={isEditing}
        suppressContentEditableWarning={true}
        onKeyDown={(e) => {
          if (!isEditing) return;
          e.stopPropagation();
        }}
        dangerouslySetInnerHTML={{ __html: displayEnglish }}
        style={{
          fontSize: "18px",
          lineHeight: "1.4",
          color: theme === "dark" ? "#bbb" : "#444",
          outline: 'none',
          border: isEditing ? '1px dashed #555' : 'none',
          padding: isEditing ? '4px' : '0',
          cursor: isEditing ? 'text' : 'default',
          textDecorationSkipInk: 'none',
          WebkitTextDecorationSkipInk: 'none'
        }}
      />

      {isEditing && (
        <div style={{ fontSize: '12px', color: '#777', marginTop: '5px' }}>
          * Editing text enabled.
        </div>
      )}
    </div>
  );
};

export default PrelistVerseCard;
