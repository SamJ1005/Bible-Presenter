import React, { useState } from "react";
import PrelistVideoPlayer from "./PrelistVideoPlayer";
import { toStreamableMediaUrl } from "../../utils/mediaUrl";

const PrelistFileCard = ({ item, theme, isActive, handlePresent, handleItemClick, itemRefs, pasteContent, hasCopiedItem }) => {
  const isImage = item.fileType && item.fileType.startsWith('image');
  const isVideo = item.fileType && item.fileType.startsWith('video');
  const [imgError, setImgError] = useState(false);

  // Robust display URL resolution: handles cloud URLs, local paths, and post-sync states
  const displayUrl = toStreamableMediaUrl(
    item.url || item.imageUrl || item.localUrl || item.localPreview,
    item.path
  );

  const isPending = item.url === '[uploading]';
  const isFailed = !displayUrl && (item.url === '[upload-failed]' || item.url === '[offline-or-failed-upload]');

  const triggerPresent = (extra = {}) => {
    handleItemClick(item.id);
    handlePresent({
      ...item,
      url: displayUrl || item.url,
      localUrl: displayUrl || item.localUrl,
      localPreview: displayUrl || item.localPreview,
      isPlaying: false,
      ...extra,
    });
  };

  return (
    <div
      key={item.id}
      ref={el => itemRefs.current[item.id] = el}
      onClick={() => {
        if (hasCopiedItem) {
          pasteContent?.(item.id);
        } else {
          handleItemClick(item.id);
        }
      }}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📄 {item.name}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerPresent({ isPlaying: isVideo ? true : false });
          }}
          title="Present to Screen"
          style={{
            background: isActive ? (theme === 'dark' ? '#00ff99' : '#003399') : (theme === 'dark' ? '#333' : '#e0e0e0'),
            color: isActive ? '#000' : (theme === 'dark' ? '#fff' : '#000'),
            border: 'none',
            borderRadius: '4px',
            padding: '3px 7px',
            fontSize: '12px',
            lineHeight: 1,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.15s ease',
          }}
        >
          📺
        </button>
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
          {isPending ? (
             <>
               <span style={{ fontSize: '24px', opacity: 0.5 }}>⏳</span>
               <span>Uploading Image to Cloud...</span>
               <div style={{ fontSize: '10px', opacity: 0.6 }}>Please wait</div>
             </>
          ) : (
             <>
               <span style={{ fontSize: '24px', opacity: 0.5 }}>🖼</span>
               <span>Image failed to upload or sync properly</span>
               <div style={{ fontSize: '10px', opacity: 0.6 }}>Add this file again to sync it.</div>
             </>
          )}
        </div>
      )}
      {isVideo && displayUrl && (
        <PrelistVideoPlayer
          src={displayUrl}
          name={item.name}
          theme={theme}
          item={item}
          isActive={isActive}
          onPresent={(extra = {}) => triggerPresent(extra)}
        />
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
