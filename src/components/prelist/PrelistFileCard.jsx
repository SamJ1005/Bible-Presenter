import React from "react";

const PrelistFileCard = ({ item, theme, isActive, handlePresent, handleItemClick, itemRefs }) => {
  const isImage = item.fileType && item.fileType.startsWith('image');
  const isVideo = item.fileType && item.fileType.startsWith('video');

  return (
    <div
      key={item.id}
      ref={el => itemRefs.current[item.id] = el}
      onClick={() => { handleItemClick(item.id); handlePresent(item); }}
      style={{
        cursor: "pointer",
        background: theme === "dark" ? "#1e1e1e" : "#fff",
        padding: "10px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        border: theme === "dark" ? "1px solid #333" : "1px solid #eee",
        textAlign: 'center',
        outline: isActive ? `2px solid ${theme === 'dark' ? '#00ff99' : '#003399'}` : 'none'
      }}
    >
      <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', textAlign: 'left' }}>
        {item.name}
      </div>
      {isImage && (
        <img
          src={item.url}
          alt={item.name}
          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', objectFit: 'contain' }}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML += '<div style="padding:10px;color:red;font-size:12px;">Image not found (Reloaded?)</div>';
          }}
        />
      )}
      {isVideo && <video src={item.url} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />}
      {!isImage && !isVideo && <div style={{ padding: '20px' }}>Unsupported File Type</div>}
    </div>
  );
};

export default PrelistFileCard;
