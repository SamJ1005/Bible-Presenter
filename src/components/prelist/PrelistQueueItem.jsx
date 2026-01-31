import React from "react";
import { Reorder } from "framer-motion";
import { useDragControls } from "framer-motion";

const PrelistQueueItem = ({ 
  item, 
  theme, 
  isActive, 
  isEditing,
  isManageMode,
  editRefValue,
  setEditRefValue,
  startEditingRef,
  saveRefEdit,
  cancelRefEdit,
  removeFromQueue,
  handleItemClick,
  sidebarItemRefs
}) => {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      key={item.id}
      value={item}
      layout="position"
      onClick={() => !isEditing && handleItemClick(item.id)}
      dragListener={false}
      dragControls={dragControls}
      dragElastic={0}
      dragTransition={{ power: 0, timeConstant: 0 }}
      whileDrag={{
        opacity: 0.8,
        cursor: "grabbing",
        zIndex: 1000
      }}
      className={`queue-item ${isActive ? 'active' : ''}`}
      style={{
        background: isActive
          ? (theme === "dark" ? "#252525" : "#e0e0e0")
          : isEditing 
            ? (theme === "dark" ? "#2a2200" : "#fff8cc") // Highlight when editing
            : "transparent",
        borderLeft: isActive
          ? `4px solid ${theme === 'dark' ? '#00ff99' : '#003399'}`
          : isEditing 
            ? `4px solid ${theme === 'dark' ? '#ffaa00' : '#ffcc00'}` // Orange/Yellow indicator for editing
            : "4px solid transparent",
        cursor: isManageMode && !isEditing ? "grab" : "pointer"
      }}
    >
      <div 
        ref={(el) => {
          if (sidebarItemRefs && sidebarItemRefs.current) {
            sidebarItemRefs.current[item.id] = el;
          }
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', flex: 1 }}
      >
        {/* Drag Handle Icon - subtle hint, only in manage mode */}
        {isManageMode && (
          <div className="drag-handle" onPointerDown={(e) => dragControls.start(e)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
        )}

        {/* Label */}
        {item.type === 'file' ? (
          <span className="text-ellipsis" title={item.name}>
            <span style={{ opacity: 0.7 }}>📄</span> {item.name}
          </span>
        ) : (
          <span className="text-ellipsis">
            <strong>{item.book}</strong> {item.chapter}:{item.verse}
          </span>
        )}
      </div>

      {/* Controls (Visible ONLY in Manage Mode) */}
      <div className="item-controls" style={{ opacity: isManageMode ? 1 : 0, pointerEvents: isManageMode ? 'auto' : 'none' }}>
        {item.type !== 'file' && (
          <button
            className="icon-btn"
            onClick={(e) => { e.stopPropagation(); startEditingRef(item); }}
            title="Edit Reference"
            style={{ color: isEditing ? (theme === 'dark' ? '#ffaa00' : '#cc9900') : 'inherit' }}
          >
            ✎
          </button>
        )}
        <button
          className="icon-btn delete"
          onClick={(e) => { e.stopPropagation(); removeFromQueue(item.id); }}
          title="Remove"
        >
          ✕
        </button>
      </div>
    </Reorder.Item>
  );
};

export default PrelistQueueItem;
