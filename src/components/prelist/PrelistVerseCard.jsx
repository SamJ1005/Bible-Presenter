import React, { useState, useEffect } from "react";
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
  itemRefs,
  onFontSizeChange,
  onLivePreviewUpdate
}) => {
  // Local font size offset (synced with item)
  const [localFontOffset, setLocalFontOffset] = useState(item.fontSizeOffset || 0);

  // Sync local offset with item prop
  useEffect(() => {
    setLocalFontOffset(item.fontSizeOffset || 0);
  }, [item.fontSizeOffset]);

  // Send live preview update when font offset changes during editing
  useEffect(() => {
    if (isEditing && onLivePreviewUpdate) {
      onLivePreviewUpdate(item, localFontOffset);
    }
  }, [localFontOffset, isEditing]);

  // Get selected HTML content (preserving formatting)
  const getSelectionHtml = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return '';
    const range = sel.getRangeAt(0);
    const div = document.createElement('div');
    div.appendChild(range.cloneContents());
    return div.innerHTML;
  };

  // Apply font size to selected text in contentEditable using relative %
  const applyFontSizeToSelection = (increase) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return false;

    const range = sel.getRangeAt(0);
    if (!range.toString()) return false;

    // Check if selection is inside one of our editable areas
    const ancestor = range.commonAncestorContainer;
    const parentEl = ancestor.nodeType === 3 ? ancestor.parentElement : ancestor;
    const editableParent = parentEl?.closest?.('[contenteditable="true"]');
    if (!editableParent) return false;

    // Use relative sizing: 120% to increase, 80% to decrease
    // This compounds with repeated clicks and works in both playlist and presentation
    const scale = increase ? '105%' : '95%';
    const selectedHtml = getSelectionHtml();
    if (!selectedHtml) return false;

    const wrappedHtml = `<span style="font-size: ${scale}">${selectedHtml}</span>`;
    document.execCommand('insertHTML', false, wrappedHtml);

    return true;
  };

  // Handle A+/a- click: if text selected in edit mode → apply to selection, otherwise → global offset
  const handleFontSizeClick = (delta, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // If in edit mode, check for text selection first
    if (isEditing) {
      const applied = applyFontSizeToSelection(delta > 0);
      if (applied) return; // Applied to selection, done
    }

    // No selection or not editing → adjust global font offset
    const next = Math.max(-10, Math.min(10, localFontOffset + delta));
    setLocalFontOffset(next);
    if (onFontSizeChange) {
      onFontSizeChange(item.id, next);
    }
  };

  // Reset all font sizes to default
  const handleFontReset = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Reset global offset to 0
    setLocalFontOffset(0);
    if (onFontSizeChange) {
      onFontSizeChange(item.id, 0);
    }

    // If editing, strip all inline font-size spans from the content
    if (isEditing) {
      [tamilContentRef, englishContentRef].forEach(ref => {
        if (ref?.current) {
          // Remove all font-size styling from spans
          const spans = ref.current.querySelectorAll('span[style*="font-size"]');
          spans.forEach(span => {
            // Replace the span with its text content (unwrap it)
            const parent = span.parentNode;
            while (span.firstChild) {
              parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
          });
          // Also remove any <font> tags from execCommand
          const fonts = ref.current.querySelectorAll('font[size]');
          fonts.forEach(font => {
            const parent = font.parentNode;
            while (font.firstChild) {
              parent.insertBefore(font.firstChild, font);
            }
            parent.removeChild(font);
          });
        }
      });
    }
  };

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
          {/* Show font offset badge */}
          {(localFontOffset != null && localFontOffset !== 0) && (
            <span style={{
              fontSize: '11px',
              color: localFontOffset > 0 ? '#4caf50' : '#ff9800',
              marginLeft: '8px',
              fontWeight: 'normal',
              opacity: 0.8
            }}>
              Font {localFontOffset > 0 ? `+${localFontOffset}` : localFontOffset}
            </span>
          )}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {/* Font size buttons - ALWAYS visible */}
          <button
            className="format-btn font-size-btn"
            onClick={(e) => handleFontSizeClick(-1, e)}
            title="Decrease Font Size (or shrink selected text)"
            style={{
              cursor: 'pointer',
              background: 'transparent',
              border: `1px solid ${theme === 'dark' ? '#555' : '#ccc'}`,
              borderRadius: '4px',
              padding: '2px 5px',
              color: theme === 'dark' ? '#bbb' : '#555',
              fontSize: '11px',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            a-
          </button>
          <button
            className="format-btn font-size-btn"
            onClick={(e) => handleFontReset(e)}
            title="Reset all font sizes to default"
            style={{
              cursor: 'pointer',
              background: localFontOffset !== 0 ? (theme === 'dark' ? '#333' : '#eee') : 'transparent',
              border: `1px solid ${theme === 'dark' ? '#555' : '#ccc'}`,
              borderRadius: '4px',
              padding: '2px 4px',
              color: localFontOffset !== 0 ? '#ff9800' : (theme === 'dark' ? '#666' : '#999'),
              fontSize: '11px',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            ↺
          </button>
          <button
            className="format-btn font-size-btn"
            onClick={(e) => handleFontSizeClick(1, e)}
            title="Increase Font Size (or enlarge selected text)"
            style={{
              cursor: 'pointer',
              background: 'transparent',
              border: `1px solid ${theme === 'dark' ? '#555' : '#ccc'}`,
              borderRadius: '4px',
              padding: '2px 5px',
              color: theme === 'dark' ? '#bbb' : '#555',
              fontSize: '13px',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
          >
            A+
          </button>

          {/* Edit button / Toolbar */}
          {!isEditing ? (
            <button
              onClick={(e) => { e.stopPropagation(); startEditingText(item); }}
              title="Edit Formatting"
              style={{
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                padding: '2px',
                marginLeft: '4px',
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
            fontFamily: "TamilBibleFont, Arial, sans-serif",
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
          * A+/a- adjusts presentation font. Select text first to resize only that part.
        </div>
      )}
    </div>
  );
};

export default PrelistVerseCard;
