import React from "react";
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
  sidebarItemRefs
}) => {
  // Auto-scroll during drag
  React.useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !isManageMode) return;

    let animationFrameId = null;
    let isDragging = false;
    let currentMouseY = 0;
    let containerRect = null;

    const handleDragStart = () => {
      isDragging = true;
      containerRect = scrollContainer.getBoundingClientRect();
    };

    const handleDragEnd = () => {
      isDragging = false;
      containerRect = null;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      currentMouseY = e.clientY;
      
      // Update container rect
      containerRect = scrollContainer.getBoundingClientRect();
      
      // Check limits
      const isWithinHorizontalBounds = e.clientX >= containerRect.left && e.clientX <= containerRect.right;
      const maxDistanceFromContainer = 100;
      const isWithinVerticalRange = 
        e.clientY >= (containerRect.top - maxDistanceFromContainer) &&
        e.clientY <= (containerRect.bottom + maxDistanceFromContainer);
      
      if (!isWithinHorizontalBounds || !isWithinVerticalRange) {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        return;
      }

      const scrollZone = 60;
      const maxScrollSpeed = 6;

      const distanceFromTop = currentMouseY - containerRect.top;
      const distanceFromBottom = containerRect.bottom - currentMouseY;

      const scroll = () => {
        if (!isDragging || !containerRect) {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
          }
          return;
        }

        containerRect = scrollContainer.getBoundingClientRect();
        const currentDistanceFromTop = currentMouseY - containerRect.top;
        const currentDistanceFromBottom = containerRect.bottom - currentMouseY;

        let shouldContinue = false;

        if (currentDistanceFromTop < scrollZone && currentDistanceFromTop > 0) {
          const speedFactor = Math.pow(1 - (currentDistanceFromTop / scrollZone), 2);
          const speed = maxScrollSpeed * speedFactor;
          scrollContainer.scrollTop -= speed;
          shouldContinue = true;
        } else if (currentDistanceFromBottom < scrollZone && currentDistanceFromBottom > 0) {
          const speedFactor = Math.pow(1 - (currentDistanceFromBottom / scrollZone), 2);
          const speed = maxScrollSpeed * speedFactor;
          scrollContainer.scrollTop += speed;
          shouldContinue = true;
        }

        if (shouldContinue) {
          animationFrameId = requestAnimationFrame(scroll);
        } else {
          animationFrameId = null;
        }
      };

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      scroll();
    };

    scrollContainer.addEventListener('pointerdown', handleDragStart);
    window.addEventListener('pointerup', handleDragEnd);
    window.addEventListener('pointermove', handleMouseMove);

    return () => {
      scrollContainer.removeEventListener('pointerdown', handleDragStart);
      window.removeEventListener('pointerup', handleDragEnd);
      window.removeEventListener('pointermove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isManageMode, scrollContainerRef]);

  return (
    <div className="playlist-sidebar" style={{
      background: theme === "dark" ? "#0f0e0eff" : "#fff",
      borderRight: theme === "dark" ? "1px solid #555" : "1px solid #999",
      color: theme === "dark" ? "white" : "black"
    }}>
      {/* Search input + previous/next buttons */}
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

      {/* Reorderable Queue List */}
      <div
        className="queue-list-container"
        style={{
          background: theme === "dark" ? "#161616" : "#f9f9f9",
          border: theme === "dark" ? "1px solid #333" : "1px solid #ddd",
        }}
      >
        {/* Header / Actions */}
        <div
          className="playlist-header"
          style={{
            background: theme === "dark" ? "#222" : "#f0f0f0",
            borderBottom:
              theme === "dark" ? "1px solid #333" : "1px solid #eee",
            display: 'flex',
            height: '1.5%',
            alignItems: 'center',
            justifyContent: 'flex-start'
          }}
        >
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
            {/* ADD FILE */}
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

            {/* EDIT MODE BUTTONS */}
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
            <span><strong>Your Playlist is Empty</strong></span>
            <span style={{ fontSize: '13px' }}>Search verses or add files.</span>
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={prelistedItems}
            onReorder={setPrelistedItems}
            ref={scrollContainerRef}
            layoutScroll
            style={{ 
              listStyle: 'none', 
              padding: 0, 
              margin: 0, 
              flex: 1, 
              overflowY: 'auto',
              overflowX: 'hidden',
              scrollBehavior: isManageMode ? 'auto' : 'smooth',
              position: 'relative',
              willChange: isManageMode ? 'scroll-position' : 'auto'
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
                />
              );
            })}
          </Reorder.Group>
        )}
      </div>
    </div>
  );
};

export default PrelistSidebar;
