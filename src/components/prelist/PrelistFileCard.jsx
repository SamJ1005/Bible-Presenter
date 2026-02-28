import React, { useState } from "react";

const PrelistFileCard = ({ item, theme, isActive, handlePresent, handleItemClick, itemRefs }) => {
  const isImage = item.fileType && item.fileType.startsWith('image');
  const isVideo = item.fileType && item.fileType.startsWith('video');
  const [imgError, setImgError] = useState(false);

  // Check if the URL is valid for display (support blob:, local-media:, data:, or item.path)
  const rawUrl = (item.url && item.url !== '[local-file]') ? item.url : item.localUrl;
  const hasValidUrl = rawUrl && (
    rawUrl.startsWith('data:') || 
    rawUrl.startsWith('blob:') || 
    rawUrl.startsWith('local-media:') ||
    rawUrl.includes('://') 
  );

  const displayUrl = hasValidUrl ? rawUrl : null;

  return (
    <div
      key={item.id}
      ref={el => itemRefs.current[item.id] = el}
      onClick={() => { handleItemClick(item.id); handlePresent(item); }}
      style={{
        cursor: "pointer",
        background: theme === "dark" ? "#1e1e1e" : "#fafafaff",
        padding: "10px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: theme === "dark" ? "#333" : "#eee",
        textAlign: 'center',
        outline: isActive ? `2px solid ${theme === 'dark' ? '#00ff99' : '#003399'}` : 'none'
      }}
    >
      <div style={{ marginBottom: '10px', fontSize: '14px', fontWeight: 'bold', textAlign: 'left' }}>
        📄 {item.name}
      </div>
      {isImage && displayUrl && !imgError && (
        <img
          src={displayUrl}
          alt={item.name}
          style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', objectFit: 'contain' }}
          onError={() => setImgError(true)}
        />
      )}
      {isImage && displayUrl && imgError && (
        <div style={{
          padding: '16px',
          color: theme === 'dark' ? '#ff6b6b' : '#c0392b',
          fontSize: '12px',
          background: theme === 'dark' ? 'rgba(255,107,107,0.1)' : 'rgba(192,57,43,0.06)',
          borderRadius: '6px'
        }}>
          ⚠ Image failed to load. Try re-adding the file.
        </div>
      )}
      {isImage && !displayUrl && (
        <div style={{
          padding: '20px 16px',
          color: theme === 'dark' ? '#aaa' : '#666',
          fontSize: '12px',
          background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
          border: theme === 'dark' ? '1px dashed #333' : '1px dashed #ccc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '24px', opacity: 0.5 }}>🖼</span>
          <span>Image available on original device only</span>
          <div style={{ fontSize: '10px', opacity: 0.6 }}>Add this file locally to present it.</div>
        </div>
      )}
      {isVideo && displayUrl && (
        <video src={displayUrl} controls style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
      )}
      {isVideo && !displayUrl && (
        <div style={{
          padding: '20px 16px',
          color: theme === 'dark' ? '#aaa' : '#666',
          fontSize: '12px',
          background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
          border: theme === 'dark' ? '1px dashed #333' : '1px dashed #ccc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '24px', opacity: 0.5 }}>🎬</span>
          <span>Video available on original device only</span>
          <div style={{ fontSize: '10px', opacity: 0.6 }}>Add this file locally to present it.</div>
        </div>
      )}
      {!isImage && !isVideo && (
        <div style={{ padding: '20px', fontSize: '12px', opacity: 0.6 }}>
          Unsupported File Type
        </div>
      )}
    </div>
  );
};

export default PrelistFileCard;
