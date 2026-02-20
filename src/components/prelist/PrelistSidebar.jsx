import React from "react";
import toast from "react-hot-toast";
import { Reorder } from "framer-motion";
import PrelistSearch from "./PrelistSearch";
import PrelistQueueItem from "./PrelistQueueItem";

const PrelistSidebar = ({ 
  theme,
  prelistedItems,
  setPrelistedItems,
  localSearch,
  setLocalSearch,
  handleSearchOverride,
  navigateList,
  searchInputRef,
  isManageMode,
  enterManageMode,
  saveManageMode,
  cancelManageMode,
  clearQueue,
  removeFromQueue,
  addFileToQueue,
  fileInputRef,
  onFileSelect,
  activeId,
  editingRefId,
  editRefValue,
  setEditRefValue,
  startEditingRef,
  saveRefEdit,
  cancelRefEdit,
  handleItemClick,
  scrollContainerRef,
  sidebarItemRefs,
  // Queue Management
  queueMeta,
  activeQueueInfo,
  user,
  createQueue,
  switchQueue,
  deleteQueue,
  renameQueue,
  toggleQueueSync,
  // Cloud Playlist Management
  cloudPlaylists = {},
  cloudLoading = false,
  syncStatus = {},
  loadCloudPlaylist,
  fetchCloudPlaylists,
  syncQueueNow
}) => {
  const [isRenamingQueue, setIsRenamingQueue] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState('');
  const renameInputRef = React.useRef(null);
  const [showCloudPanel, setShowCloudPanel] = React.useState(false);

  // State for creating a new queue (replaces prompt() which is blocked in Electron)
  const [isCreatingQueue, setIsCreatingQueue] = React.useState(false);
  const [newQueueName, setNewQueueName] = React.useState('');
  const createInputRef = React.useRef(null);

  // Focus the create input when it appears (avoids setTimeout race condition)
  React.useEffect(() => {
    if (isCreatingQueue && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreatingQueue]);

  // Auto-scroll logic using Refs to avoid re-renders
  const isDraggingRef = React.useRef(false);
  const animationFrameRef = React.useRef(null);
  const mouseCoordsRef = React.useRef({ x: 0, y: 0 });

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const handleCreateQueue = () => {
    setNewQueueName('');
    setIsCreatingQueue(true);
  };

  const handleFinishCreate = () => {
    if (newQueueName.trim()) {
      createQueue(newQueueName.trim());
      if (user) {
        toast.success(`Created "${newQueueName.trim()}" — will sync to cloud`);
      } else {
        toast.success(`Created "${newQueueName.trim()}" (local only)`);
      }
    }
    setIsCreatingQueue(false);
    setNewQueueName('');
  };

  const handleCancelCreate = () => {
    setIsCreatingQueue(false);
    setNewQueueName('');
  };

  const handleStartRename = () => {
    if (!activeQueueInfo) return;
    setRenameValue(activeQueueInfo.name);
    setIsRenamingQueue(true);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const handleFinishRename = () => {
    if (renameValue.trim() && activeQueueInfo) {
      renameQueue(activeQueueInfo.id, renameValue.trim());
    }
    setIsRenamingQueue(false);
  };

  const handleDeleteQueue = () => {
    if (!queueMeta || queueMeta.queues.length <= 1) return;
    if (confirm(`Delete "${activeQueueInfo?.name}"? This cannot be undone.`)) {
      deleteQueue(queueMeta.activeId);
    }
  };

  // Get sync status label and color
  const getSyncInfo = (queueId) => {
    const status = syncStatus[queueId];
    switch (status) {
      case 'synced':
        return { label: '✓ Synced', color: theme === 'dark' ? '#00ff99' : '#00aa66', icon: '✓' };
      case 'unsynced':
        return { label: '⟳ Out of sync', color: theme === 'dark' ? '#ffaa00' : '#cc8800', icon: '⟳' };
      case 'cloud-only':
        return { label: '☁ Cloud only', color: theme === 'dark' ? '#66aaff' : '#3366cc', icon: '☁' };
      case 'local':
      default:
        return { label: 'Local only', color: theme === 'dark' ? '#666' : '#999', icon: '—' };
    }
  };

  // Format relative time
  const formatTime = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      return `${diffDay}d ago`;
    } catch { return ''; }
  };

  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleMouseMove = (e) => {
      mouseCoordsRef.current = { x: e.clientX, y: e.clientY };
      
      // If dragging and loop NOT running, start it
      if (isDraggingRef.current && !animationFrameRef.current) {
        startScrollLoop();
      }
    };

    const startScrollLoop = () => {
      const scroll = () => {
        const scrollContainer = scrollContainerRef.current;
        if (!isDraggingRef.current || !scrollContainer) {
          animationFrameRef.current = null;
          return;
        }

        const containerRect = scrollContainer.getBoundingClientRect();
        const currentMouseY = mouseCoordsRef.current.y;
        
        const scrollZone = 60;
        const maxScrollSpeed = 12; // Adjusted speed

        const distanceFromTop = currentMouseY - containerRect.top;
        const distanceFromBottom = containerRect.bottom - currentMouseY;

        let shouldContinue = false;

        // Scroll Up
        if (distanceFromTop < scrollZone) {
          // Allow scrolling even if slightly outside to catch fast drags
          const speedFactor = Math.pow(1 - (Math.max(-50, distanceFromTop) / scrollZone), 2);
          const speed = maxScrollSpeed * speedFactor;
          scrollContainer.scrollTop -= speed;
          shouldContinue = true;
        } 
        // Scroll Down
        else if (distanceFromBottom < scrollZone) {
          const speedFactor = Math.pow(1 - (Math.max(-50, distanceFromBottom) / scrollZone), 2);
          const speed = maxScrollSpeed * speedFactor;
          scrollContainer.scrollTop += speed;
          shouldContinue = true;
        }

        if (shouldContinue) {
          animationFrameRef.current = requestAnimationFrame(scroll);
        } else {
          animationFrameRef.current = null;
        }
      };

      scroll();
    };

    window.addEventListener('pointermove', handleMouseMove);
    // Note: 'pointerup' is handled globally to stop drag state

    return () => {
      window.removeEventListener('pointermove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Empty dependency array to attach once (refs don't need re-attach)

  // Cloud-only playlists (exist on cloud but not locally)
  const cloudOnlyPlaylists = Object.entries(cloudPlaylists).filter(
    ([id]) => !queueMeta.queues.find((q) => q.id === id)
  );

  return (
    <div className="playlist-sidebar" style={{
      background: theme === "dark" ? "#0f0e0eff" : "#fff",
      borderRight: theme === "dark" ? "1px solid #555" : "1px solid #999",
      color: theme === "dark" ? "white" : "black"
    }}>
      {/* Queue Manager Bar */}
      {queueMeta && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 8px 6px 8px',
          borderBottom: theme === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
          marginBottom: '0',
          flexWrap: 'nowrap',
          minHeight: '36px'
        }}>
          {/* Queue Selector Dropdown / Rename Input / Create Input */}
          {isCreatingQueue ? (
            <input
              ref={createInputRef}
              value={newQueueName}
              onChange={(e) => setNewQueueName(e.target.value)}
              onBlur={handleFinishCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishCreate();
                if (e.key === 'Escape') handleCancelCreate();
              }}
              placeholder="Enter playlist name..."
              style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 12px',
                borderRadius: '8px',
                border: theme === 'dark' ? '2px solid #00ff99' : '2px solid #003399',
                background: theme === 'dark' ? '#1a1a1a' : '#fff',
                color: theme === 'dark' ? '#fff' : '#000',
                fontSize: '14px',
                fontWeight: 600,
                outline: 'none',
                boxShadow: theme === 'dark' ? '0 0 8px rgba(0, 255, 153, 0.2)' : '0 0 8px rgba(0, 51, 153, 0.15)'
              }}
            />
          ) : isRenamingQueue ? (
            <input
              ref={renameInputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleFinishRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFinishRename();
                if (e.key === 'Escape') setIsRenamingQueue(false);
              }}
              style={{
                flex: 1,
                minWidth: 0,
                padding: '4px 8px',
                borderRadius: '6px',
                border: theme === 'dark' ? '1px solid #555' : '1px solid #999',
                background: theme === 'dark' ? '#1a1a1a' : '#fff',
                color: theme === 'dark' ? '#fff' : '#000',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none'
              }}
              autoFocus
            />
          ) : (
            <select
              value={queueMeta.activeId}
              onChange={(e) => switchQueue(e.target.value)}
              title="Switch Queue"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '4px 6px',
                borderRadius: '6px',
                border: theme === 'dark' ? '1px solid #444' : '1px solid #bbb',
                background: theme === 'dark' ? '#1a1a1a' : '#f5f5f5',
                color: theme === 'dark' ? '#e0e0e0' : '#222',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'auto'
              }}
            >
              {queueMeta.queues.map(q => (
                <option key={q.id} value={q.id}>{q.name}</option>
              ))}
            </select>
          )}

          {/* Create New Queue */}
          <button
            onClick={isCreatingQueue ? handleFinishCreate : handleCreateQueue}
            title={isCreatingQueue ? 'Confirm' : 'Create New Playlist'}
            style={{
              background: isCreatingQueue
                ? (theme === 'dark' ? 'rgba(0, 255, 153, 0.15)' : 'rgba(0, 51, 153, 0.1)')
                : 'transparent',
              border: isCreatingQueue
                ? (theme === 'dark' ? '1px solid #00ff99' : '1px solid #003399')
                : (theme === 'dark' ? '1px solid #444' : '1px solid #bbb'),
              borderRadius: '6px',
              padding: '3px 7px',
              cursor: 'pointer',
              color: isCreatingQueue
                ? (theme === 'dark' ? '#00ff99' : '#003399')
                : (theme === 'dark' ? '#aaa' : '#555'),
              fontSize: '14px',
              fontWeight: 'bold',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = theme === 'dark' ? '#00ff99' : '#003399';
              e.currentTarget.style.borderColor = theme === 'dark' ? '#00ff99' : '#003399';
            }}
            onMouseLeave={(e) => {
              if (!isCreatingQueue) {
                e.currentTarget.style.color = theme === 'dark' ? '#aaa' : '#555';
                e.currentTarget.style.borderColor = theme === 'dark' ? '#444' : '#bbb';
              }
            }}
          >
            {isCreatingQueue ? '✓' : '+'}
          </button>

          {/* Rename Queue */}
          <button
            onClick={handleStartRename}
            title="Rename Queue"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '3px',
              color: theme === 'dark' ? '#888' : '#666',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = theme === 'dark' ? '#fff' : '#000'}
            onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? '#888' : '#666'}
          >
            ✎
          </button>

          {/* Delete Queue (only if more than 1) */}
          {queueMeta.queues.length > 1 && (
            <button
              onClick={handleDeleteQueue}
              title="Delete Queue"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '3px',
                color: theme === 'dark' ? '#666' : '#999',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ff5555'}
              onMouseLeave={(e) => e.currentTarget.style.color = theme === 'dark' ? '#666' : '#999'}
            >
              ✕
            </button>
          )}

        </div>
      )}

      {/* Cloud Playlists Panel (Collapsible) */}
      {!user && (
        <div style={{
          padding: '10px 14px',
          background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          borderRadius: '8px',
          margin: '8px 10px',
          textAlign: 'center',
          border: theme === 'dark' ? '1px dashed #333' : '1px dashed #ccc'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: theme === 'dark' ? '#aaa' : '#666' }}>
            ☁ Cloud Sync Unavailable
          </div>
          <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
            Login to access your playlists from any device.
          </div>
        </div>
      )}

      {user && showCloudPanel && (
        <div style={{
          borderBottom: theme === 'dark' ? '1px solid #333' : '1px solid #e0e0e0',
          background: theme === 'dark' ? '#0a0a0a' : '#fafafa',
          maxHeight: '220px',
          overflowY: 'auto',
          transition: 'max-height 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px 4px',
            borderBottom: theme === 'dark' ? '1px solid #222' : '1px solid #eee'
          }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: theme === 'dark' ? '#aaa' : '#555',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Cloud Playlists
            </span>
            <button
              onClick={() => fetchCloudPlaylists && fetchCloudPlaylists()}
              disabled={cloudLoading}
              title="Refresh cloud playlists"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: cloudLoading ? 'wait' : 'pointer',
                padding: '2px 4px',
                fontSize: '11px',
                color: theme === 'dark' ? '#888' : '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => !cloudLoading && (e.currentTarget.style.color = theme === 'dark' ? '#00ff99' : '#003399')}
              onMouseLeave={(e) => (e.currentTarget.style.color = theme === 'dark' ? '#888' : '#666')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ animation: cloudLoading ? 'spin 1s linear infinite' : 'none' }}>
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              {cloudLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {/* Cloud playlist list */}
          {Object.keys(cloudPlaylists).length === 0 && !cloudLoading && (
            <div style={{
              padding: '14px 10px',
              textAlign: 'center',
              color: theme === 'dark' ? '#555' : '#aaa',
              fontSize: '11px'
            }}>
              No cloud playlists found.
              <br />
              Enable sync on a queue to save it to the cloud.
            </div>
          )}

          {Object.entries(cloudPlaylists).map(([cloudId, info]) => {
            const localQueue = queueMeta.queues.find((q) => q.id === cloudId);
            const isActive = queueMeta.activeId === cloudId;
            const si = getSyncInfo(cloudId);

            return (
              <div
                key={cloudId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 10px',
                  borderBottom: theme === 'dark' ? '1px solid #1a1a1a' : '1px solid #f0f0f0',
                  background: isActive
                    ? (theme === 'dark' ? 'rgba(0, 255, 153, 0.05)' : 'rgba(0, 51, 153, 0.04)')
                    : 'transparent',
                  cursor: localQueue ? 'pointer' : 'default',
                  transition: 'background 0.15s ease'
                }}
                onClick={() => {
                  if (localQueue && !isActive) switchQueue(cloudId);
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = theme === 'dark' ? '#111' : '#f5f5f5';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Sync status dot */}
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: si.color,
                  flexShrink: 0,
                  boxShadow: syncStatus[cloudId] === 'synced' ? `0 0 4px ${si.color}` : 'none'
                }} />

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: isActive ? 700 : 500,
                    color: theme === 'dark' ? '#e0e0e0' : '#222',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {info.name}
                    {isActive && (
                      <span style={{ fontSize: '9px', color: theme === 'dark' ? '#00ff99' : '#003399', marginLeft: '5px' }}>
                        ● active
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: theme === 'dark' ? '#555' : '#aaa',
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <span>{info.itemCount} items</span>
                    {info.lastModified && <span>{formatTime(info.lastModified)}</span>}
                    <span style={{ color: si.color }}>{si.label}</span>
                  </div>
                </div>

                {/* Action button */}
                {!localQueue && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadCloudPlaylist && loadCloudPlaylist(cloudId);
                    }}
                    title="Load this playlist from cloud"
                    style={{
                      background: theme === 'dark' ? 'rgba(0, 255, 153, 0.1)' : 'rgba(0, 51, 153, 0.08)',
                      border: theme === 'dark' ? '1px solid rgba(0, 255, 153, 0.3)' : '1px solid rgba(0, 51, 153, 0.3)',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: theme === 'dark' ? '#00ff99' : '#003399',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme === 'dark' ? 'rgba(0, 255, 153, 0.2)' : 'rgba(0, 51, 153, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = theme === 'dark' ? 'rgba(0, 255, 153, 0.1)' : 'rgba(0, 51, 153, 0.08)';
                    }}
                  >
                    ↓ Load
                  </button>
                )}
                {localQueue && !isActive && syncStatus[cloudId] === 'unsynced' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadCloudPlaylist && loadCloudPlaylist(cloudId);
                    }}
                    title="Pull latest from cloud"
                    style={{
                      background: 'transparent',
                      border: theme === 'dark' ? '1px solid #444' : '1px solid #ccc',
                      borderRadius: '4px',
                      padding: '3px 6px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: theme === 'dark' ? '#ffaa00' : '#cc8800',
                      transition: 'all 0.2s'
                    }}
                  >
                    ↓ Pull
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Search input + previous/next buttons */}
      <div style={{ padding: '6px 0 0 0' }}>
        <PrelistSearch
          theme={theme}
          localSearch={localSearch}
          setLocalSearch={setLocalSearch}
          handleSearchOverride={handleSearchOverride}
          navigateList={navigateList}
          searchInputRef={searchInputRef}
          editingRefId={editingRefId}
          saveRefEdit={saveRefEdit}
          cancelRefEdit={cancelRefEdit}
        />
      </div>

      {/* Reorderable Queue List */}
      {/* Reorderable Queue ListContainer */}
      <div
        className="queue-list-container"
        style={{
          background: theme === "dark" ? "#161616" : "#f7f7f76b",
          border: theme === "dark" ? "1px solid #333" : "1px solid #ddd",
          flex: 1, // Ensure it takes space
          overflowY: 'auto', // It handles the scroll
          overflowX: 'hidden',
          position: 'relative',
          padding: 0
        }}
      >
        {/* Header / Actions - WAIT, Header should be sticky or outside? */}
        {/* The Header was INSIDE the container in previous code? No. 
            Let's check lines 162-249. Header was inside `queue-list-container`. 
            If I make `queue-list-container` scrollable, Header will scroll away.
            User probably wants Header fixed?
            
            Previous Code:
            <div className="queue-list-container" ...>
               <div className="playlist-header" ...> ... </div>
               <Reorder.Group ... style={{ overflowY: 'auto' }} />
            </div>

            So `queue-list-container` was the wrapper. `Reorder.Group` was the scrollable part.
            Header was fixed at top of `queue-list-container`?
            
            Let's look at Step 482 snippet.
            Lines 162-314.
            queue-list-container wraps Header AND Reorder.Group.
            Header has normal position.
            Reorder.Group (lines 271-312) has `flex: 1`, `overflowY: 'auto'`.
            So Header stays at top, List scrolls. THIS IS CORRECT LAYOUT.
            
            ISSUE: Reorder.Group is the scroller.
            
            FIX:
            We need an INTERMEDIATE div for scrolling.
            Header (Fixed)
            ScrollDiv (Scrolls)
              Reorder.Group (Visible)

            So I need to change the structure inside `queue-list-container`.
        */}
        
        {/* Keep Header as is */}
        <div
          className="playlist-header"
          style={{
            background: theme === "dark" ? "#222" : "#f0f0f0",
            borderBottom:
              theme === "dark" ? "1px solid #333" : "1px solid #eee",
            display: 'flex',
            height: '40px', // Fixed height instead of %
            minHeight: '40px',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '0 10px'
          }}
        >
          {/* ... Header Content ... */}
          {isManageMode && prelistedItems.length > 0 && (
            <button
              className="action-btn"
              onClick={clearQueue}
              style={{ color: "#ff5555", borderColor: 'rgba(255,85,85,0.3)', marginRight: '10px' }}
            >
              Clear All
            </button>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
            <button
              style={{ color: theme === 'dark' ? 'white' : 'black' }}
              className="action-btn"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              +
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/png, image/jpeg, image/jpg, image/webp, video/*"
              onChange={onFileSelect}
            />

            {!isManageMode ? (
              <button
                style={{ color: theme === 'dark' ? 'white' : 'black' }}
                className="action-btn"
                onClick={enterManageMode}
              >
                Edit ✎
              </button>
            ) : (
              <>
                <button
                  className="save-btn"
                  onClick={saveManageMode}
                  style={{ 
                    fontSize: '12px', 
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ✓ Save
                </button>
                <button
                  className="cancel-btn"
                  onClick={cancelManageMode}
                  style={{ 
                    fontSize: '12px', 
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Scrollable Area */}
        <div 
           className="sidebar-scroll-area"
           ref={scrollContainerRef}
           style={{
             flex: 1,
             overflowY: 'auto',
             overflowX: 'hidden',
             position: 'relative', // Needed for Reorder context?
           }}
        >
          {prelistedItems.length === 0 ? (
            <div
              style={{
                padding: "20px 10px",
                textAlign: "center",
                color: "#888",
                fontSize: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                alignItems: "center",
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <div style={{ fontSize: '24px', opacity: 0.5 }}>🗋</div>
              <span><strong>{activeQueueInfo?.name || 'Your Playlist'} is Empty</strong></span>
              <span style={{ fontSize: '13px' }}>Search verses or add files.</span>
            </div>
          ) : (
            <Reorder.Group
              axis="y"
              values={prelistedItems}
              onReorder={setPrelistedItems}
              // ref={scrollContainerRef}  <-- MOVED ref to parent div
              layoutScroll
              style={{ 
                listStyle: 'none', 
                padding: 0, 
                margin: 0, 
                // overflowY: 'auto', <-- REMOVE scroll from here
                // flex: 1,          <-- REMOVE flex from here
              }}
            >
              {prelistedItems.map((item) => {
                const isActive = activeId === item.id;
                const isEditing = editingRefId === item.id;

                return (
                  <PrelistQueueItem
                    key={item.id}
                    item={item}
                    theme={theme}
                    isActive={isActive}
                    isEditing={isEditing}
                    isManageMode={isManageMode}
                    editRefValue={editRefValue}
                    setEditRefValue={setEditRefValue}
                    startEditingRef={startEditingRef}
                    saveRefEdit={saveRefEdit}
                    cancelRefEdit={cancelRefEdit}
                    removeFromQueue={removeFromQueue}
                    handleItemClick={handleItemClick}
                    sidebarItemRefs={sidebarItemRefs}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                );
              })}
            </Reorder.Group>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrelistSidebar;
