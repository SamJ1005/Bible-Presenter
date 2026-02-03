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
        if (currentDistanceFromTop < scrollZone) {
          // Allow scrolling even if slightly outside to catch fast drags
          const speedFactor = Math.pow(1 - (Math.max(-50, currentDistanceFromTop) / scrollZone), 2);
          const speed = maxScrollSpeed * speedFactor;
          scrollContainer.scrollTop -= speed;
          shouldContinue = true;
        } 
        // Scroll Down
        else if (currentDistanceFromBottom < scrollZone) {
          const speedFactor = Math.pow(1 - (Math.max(-50, currentDistanceFromBottom) / scrollZone), 2);
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
      {/* Reorderable Queue ListContainer */}
      <div
        className="queue-list-container"
        ref={scrollContainerRef} // Attach logic ref here
        style={{
          background: theme === "dark" ? "#161616" : "#f9f9f9",
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
             position: 'relative' // Needed for Reorder context?
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
              <span><strong>Your Playlist is Empty</strong></span>
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
