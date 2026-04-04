import React from "react";

const PrelistEditToolbar = ({
  applyStyle,
  applyCustomFontSize,
  saveTextEdit,
  cancelTextEdit,
  itemId,
}) => {
  return (
    <div className="formatting-toolbar" style={{ marginLeft: '4px' }} onClick={(e) => e.stopPropagation()}>
      {/* Formatting Toolbar */}
      <button
        className="format-btn"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          applyStyle("bold");
        }}
        title="Bold"
      >
        <span style={{ fontWeight: "bold" }}>B</span>
      </button>
      <button
        className="format-btn"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          applyStyle("italic");
        }}
        title="Italic"
      >
        <span style={{ fontStyle: "italic" }}>I</span>
      </button>
      <button
        className="format-btn"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          applyStyle("underline");
        }}
        title="Underline"
      >
        <span style={{ textDecoration: "underline" }}>U</span>
      </button>

      <div className="separator"></div>

      <select 
        title="Font Size (vw)"
        onChange={(e) => {
          if (e.target.value && applyCustomFontSize) {
            applyCustomFontSize(e.target.value);
            e.target.value = ""; // reset
          }
        }}
        style={{
          marginLeft: '4px',
          padding: '2px 4px',
          borderRadius: '4px',
          border: '1px solid #555',
          background: '#222',
          color: '#fff',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        <option value="">Size...</option>
        <option value="2">2vw</option>
        <option value="3">3vw</option>
        <option value="4">4vw</option>
        <option value="5">5vw</option>
        <option value="6">6vw</option>
        <option value="7">7vw</option>
        <option value="8">8vw</option>
        <option value="9">9vw</option>
        <option value="12">12vw</option>
        <option value="15">15vw</option>
      </select>

      <div className="separator"></div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          saveTextEdit(itemId);
        }}
        className="save-btn"
      >
        ✓ Save
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          cancelTextEdit();
        }}
        className="cancel-btn"
      >
        ✕ Cancel
      </button>
    </div>
  );
};

export default PrelistEditToolbar;
