import React from "react";

const PrelistEditToolbar = ({ applyStyle, saveTextEdit, cancelTextEdit, itemId }) => {
  return (
    <div className="formatting-toolbar">
      {/* Formatting Toolbar */}
      <button 
        className="format-btn" 
        onMouseDown={(e) => { e.preventDefault(); applyStyle('bold'); }} 
        title="Bold"
      >
        <span style={{ fontWeight: 'bold' }}>B</span>
      </button>
      <button 
        className="format-btn" 
        onMouseDown={(e) => { e.preventDefault(); applyStyle('italic'); }} 
        title="Italic"
      >
        <span style={{ fontStyle: 'italic' }}>I</span>
      </button>
      <button 
        className="format-btn" 
        onMouseDown={(e) => { e.preventDefault(); applyStyle('underline'); }} 
        title="Underline"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </button>

      <div className="separator"></div>

      <button 
        onClick={(e) => { e.stopPropagation(); saveTextEdit(itemId); }} 
        className="save-btn"
      >
        ✓ Save
      </button>
      <button 
        onClick={cancelTextEdit} 
        className="cancel-btn"
      >
        ✕ Cancel
      </button>
    </div>
  );
};

export default PrelistEditToolbar;
