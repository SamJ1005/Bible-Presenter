import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { Reorder, useDragControls } from "framer-motion";
import "./Prelist.css";
import { parseReferenceIncludeRange } from "../utils/referenceParser";

const Prelist = React.forwardRef(({
  theme,
  handleSearch,
  handleNext, // From parent (unused or override?)
  handlePrev,
  searchInputRef,
  prelistedItems = [],
  bibleData,
  settings,
  removeFromQueue,
  clearQueue,
  updateQueueReference,
  moveQueueItem,
  updateQueueItem,
  addFileToQueue,
  findBook,
  parseReference,
  setPrelistedItems,
  sendToPresentation
  }, ref) => {
  // Local state for sidebar editing (reference only)
  const [editingRefId, setEditingRefId] = useState(null);
  const [editRefValue, setEditRefValue] = useState("");
  const [isManageMode, setIsManageMode] = useState(false); // Global toggle for edit controls
  const fileInputRef = useRef(null);
  
  // Local state for verse text editing (HTML)
  const [editingTextId, setEditingTextId] = useState(null);
  
  // Selection & Auto-scroll State
  const [activeId, setActiveId] = useState(null);
  const itemRefs = useRef({}); // Map of main content refs

  const handleItemClick = (id) => {
    setActiveId(id);
    // Auto-scroll logic
    if (itemRefs.current[id]) {
      itemRefs.current[id].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  /* ---------- HANDLERS ---------- */
  
  // Use unique ID generator to prevent key collision if user adds same verse twice?
  // Ideally ID is handled at creation. 
  
  const handlePresent = async (item) => {
    // Block presentation if editing
    if (editingRefId || editingTextId) return;

    if(!sendToPresentation) return;

    // Handle "File" type or other legacy types
    if(item.type === 'file') { 
        // Prefer File Path (file://) for performance/IPC, fallback to Base64
        let mediaSrc = item.url;

        if (item.path) {
          const fixedPath = item.path.replace(/\\/g, "/");
          mediaSrc = `file:///${fixedPath}`;
        }

        const payload = {
            viewMode: 'prelist',
            type: 'file',
            fileData: {
                url: mediaSrc,
                fileType: item.fileType,
                name: item.name
            },
            settings
        };
        console.log('[PRELIST.JSX] Sending file payload:', payload);
        sendToPresentation(payload);
        return;
    }

    // MULTI-VERSE Logic (from Queue)
    if(item.isMulti && item.versesPayload && item.versesPayload.length > 0) {
         // >1 Verses: Show ONLY Tamil (joined)
         // Check for Override (Edited HTML) first
         let finalTamil = item.tamilHtml;
         
         if (!finalTamil) {
             // Fallback to generated content
             // FIX: Use <br/> instead of \n because presentation uses innerHTML
             finalTamil = item.versesPayload.map(i => `${i.v}. ${i.tam}`).join("<br/><br/>");
         }
         
         // English is empty for multi-verse as per requirement to fit screen,
         // UNLESS Tamil is missing/failed, then show English as fallback.
         let finalEnglish = ""; 
         if (!finalTamil || finalTamil.trim() === "") {
             if (item.englishHtml) {
                 finalEnglish = item.englishHtml;
             } else {
                 finalEnglish = item.versesPayload.map(i => `${i.v}. ${i.eng}`).join("<br/><br/>");
             }
         }

         const indexStr = `${item.book} ${item.chapter}:${item.verse}`; // verse is "1,2" string here

         sendToPresentation({
             selectedBook: item.book,
             selectedChapter: item.chapter,
             selectedVerse: item.verse, 
             tamilText: finalTamil,
             englishText: finalEnglish,
             settings,
             index: indexStr,
             viewMode: 'prelist' 
         });
         return;
    }

    let englishText = "";
    if (item.englishHtml) {
        englishText = item.englishHtml;
    } else {
        const b = bibleData?.books?.find(b => b.name === item.book);
        const c = b?.chapters?.find(c => Number(c.chapter) === Number(item.chapter));
        const v = c?.verses?.find(v => Number(v.verse) === Number(item.verse));
        englishText = v ? v.text : "";
    }

    let tamilText = item.tamilHtml || item.tamilText || "";

    // FAILSAFE: If Tamil Text is missing (e.g. data corruption or legacy item), fetch it NOW
    if (!tamilText) {
        try {
             // We can't use existing 'tamilBook' state as that might correspond to Bible tab
             // We must fetch independent of everything else
             const res = await fetch(`./bible/tamil/${encodeURIComponent(item.book)}.json`);
             if (res.ok) {
                 const data = await res.json();
                 // Confirm book name again to be paranoid
                 if (data?.book?.english?.toLowerCase() === item.book.toLowerCase()) {
                     // Extract verse
                     let foundVerse = null;
                     if(Array.isArray(data.chapters)) {
                         const ch = data.chapters.find(c => Number(c.chapter) === Number(item.chapter));
                         foundVerse = ch?.verses?.find(v => Number(v.verse) === Number(item.verse));
                     } else if (data[item.chapter] && data[item.chapter].verses) {
                         foundVerse = data[item.chapter].verses.find(v => Number(v.verse) === Number(item.verse));
                     }
                     if (foundVerse) tamilText = foundVerse.text;
                 }
             }
        } catch(e) {
            console.error("Ad-hoc fetch failed in handlePresent", e);
        }
    }

    sendToPresentation({
         selectedBook: item.book,
         selectedChapter: item.chapter,
         selectedVerse: item.verse,
         tamilText,   // EXPLICIT PASS
         englishText, // EXPLICIT PASS
         settings,
         index: `${item.book} ${item.chapter}:${item.verse}`,
         viewMode: 'prelist'
    });
  };

  const navigateList = (direction) => {
    if (editingRefId || editingTextId) return;
    if (prelistedItems.length === 0) return;
    
    let nextIndex = 0;
    if (activeId === null) {
      nextIndex = 0;
    } else {
      const currentIndex = prelistedItems.findIndex(item => item.id === activeId);
      if (currentIndex === -1) {
          nextIndex = 0;
      } else {
          if (direction === 'next') nextIndex = currentIndex + 1;
          else nextIndex = currentIndex - 1;
      }
    }

    // Bounds check
    if (nextIndex < 0) nextIndex = 0; 
    if (nextIndex >= prelistedItems.length) nextIndex = prelistedItems.length - 1;

    const nextItem = prelistedItems[nextIndex];
    if (nextItem) {
        handleItemClick(nextItem.id);
        handlePresent(nextItem); // Auto-present on navigation
    }
  };

  // Expose navigation to parent
  React.useImperativeHandle(ref, () => ({
      goNext: () => navigateList('next'),
      goPrev: () => navigateList('prev')
  }));

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if editing text or ref
      if (editingRefId || editingTextId) return;
      // Ignore if focus is in search input (handled in input's onKeyDown, but good to check activeElement)
      if (document.activeElement === searchInputRef.current) return;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        navigateList('next');
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        navigateList('prev');
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [prelistedItems, activeId, editingRefId, editingTextId]);

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFileToQueue(e.target.files[0]);
    }
    // Clear input so same file can be selected again if needed
    e.target.value = "";
  };


  // --- DnD Handlers Replaced by Framer Motion ---

  const startEditingRef = (item) => {
    setEditingRefId(item.id);
    setEditRefValue(`${item.book} ${item.chapter} ${item.verse}`);
  };

  const saveRefEdit = (id) => {
    // Smart parse logic
    if (!parseReference || !findBook) {
      toast.error("Parsing unavailable");
      return;
    }
    const parsed = parseReference(editRefValue);
    if (!parsed) {
      toast.error("Invalid format");
      return;
    }
    const bookName = findBook(parsed.rawBook);
    if (!bookName) {
      toast.error("Unknown book");
      return;
    }
    
    // Check Max Chapter/Verse quickly if possible using passed bibleData
    // Ideally we duplicate the deep check, but for now basic existence:
    if (bibleData && bibleData.books) {
       const b = bibleData.books.find(x => x.name === bookName);
       if (!b) { toast.error("Book not found in data"); return; }
       // Rough check
       const maxCh = Math.max(...b.chapters.map(c=>Number(c.chapter)));
       if (parsed.chapter > maxCh) { toast.error("Chapter too high"); return; }
    }

    // Call async handler (passed from App) to update Ref + Tamil text
    if (updateQueueReference) {
        updateQueueReference(id, bookName, parsed.chapter, parsed.verse);
    } else {
        // Fallback (shouldn't happen if props correct)
        updateQueueItem(id, {
          book: bookName,
          chapter: parsed.chapter,
          verse: parsed.verse,
        });
    }

    setEditingRefId(null);
  };

  const cancelRefEdit = () => {
    setEditingRefId(null);
  };

  // --- HTML / Rich Text Logic ---
  const tamilContentRef = useRef(null);
  const englishContentRef = useRef(null);

  const startEditingText = (item) => {
    setEditingTextId(item.id);
  };

  const saveTextEdit = (id) => {
    const updates = {};
    
    // Only grab content if the element was actually active/rendered
    if (tamilContentRef.current) {
        updates.tamilHtml = tamilContentRef.current.innerHTML;
    }
    if (englishContentRef.current) {
        updates.englishHtml = englishContentRef.current.innerHTML;
    }

    if (Object.keys(updates).length > 0) {
        updateQueueItem(id, updates);
        toast.success("Text saved successfully");
    }
    
    setEditingTextId(null);
  };

  const cancelTextEdit = (e) => {
    if(e) e.stopPropagation();
    setEditingTextId(null);
  }

  // Local Search State (independent of Bible Tab)
  const [localSearch, setLocalSearch] = useState("");

  const handleSearchOverride = async () => {
       const parsed = parseReferenceIncludeRange(localSearch);
       
       if(!parsed) {
           return toast.error("Invalid Reference. Try 'Gen 1:1', 'Gen 1:1-3', or 'Gen 1:1,3'");
       }

       const bookName = findBook(parsed.book);
       if(!bookName) return toast.error("Book not found");

       // --- SINGLE CHAPTER LOGIC ---
       // Check if book has only 1 chapter (e.g. Jude, Philemon)
       // If user typed "Jude 5", parser sees Chapter 5. We must swap to Ch 1, Verse 5.
       let engBook = null;
       if (bibleData && bibleData.books) {
            engBook = bibleData.books.find(b => b.name === bookName);
            if (engBook && engBook.chapters.length === 1 && parsed.chapter > 1) {
                 const oldCh = parsed.chapter;
                 parsed.chapter = 1;
                 parsed.verse = oldCh;
                 
                 // Fix verse list: "Jude 5" -> vList was empty. "Jude 5,7" -> vList was [7].
                 // We prepend the old chapter (now verse) to the list.
                 const existing = parsed.verseList || [];
                 // Filter out duplicates just in case
                 parsed.verseList = [...new Set([oldCh, ...existing])].sort((a,b)=>a-b);
            }
       }
       // ----------------------------

       if(!parsed.verseList || parsed.verseList.length === 0) {
           parsed.verseList = [1];
       }

       const versesToFetch = parsed.verseList;
       if(versesToFetch.length > 5) return toast.error("Max 5 verses allowed"); 

       // Fetch Tamil Content
       let tamilBook = null;
       try {
           const res = await fetch(`./bible/tamil/${encodeURIComponent(bookName)}.json`);
           if(res.ok) {
               const data = await res.json();
               // Validate data matches bookName to prevent "Genesis default" bug
               const loadedName = data?.book?.english;
               if(loadedName && loadedName.toLowerCase() === bookName.toLowerCase()) {
                   tamilBook = data;
               } else {
                   console.warn(`Tamil content mismatch: Requested '${bookName}' but got '${loadedName}'`);
                   // If mismatch, try fetching without encoding or exact match? 
                   // Validating prevents showing wrong text.
               }
           }
       } catch(e) { console.error("Tamil fetch failed", e); }

       const versesPayload = [];
       // Validation Flag
       let isValid = true;

       for(const v of versesToFetch) {
           // Get English (from prop) to validate existence
           const engBook = bibleData?.books?.find(b=>b.name === bookName);
           // We already checked bookName, but double check
           if(!engBook) { isValid = false; break; }

           const engChap = engBook?.chapters?.find(c=>Number(c.chapter) === parsed.chapter);
           if(!engChap) {
               toast.error(`Chapter ${parsed.chapter} not found in ${bookName}`);
               isValid = false; break;
           }

           const engVerseFunc = engChap?.verses?.find(vv=>Number(vv.verse) === v);
           if(!engVerseFunc) {
               toast.error(`Verse ${v} not found in ${bookName} ${parsed.chapter}`);
               isValid = false; break;
           }
           
           const engText = engVerseFunc.text;

           // Get Tamil
           let tamText = "";
           if(tamilBook) {
               if(Array.isArray(tamilBook.chapters)) {
                   const c = tamilBook.chapters.find(ch=>Number(ch.chapter) === parsed.chapter);
                   const ve = c?.verses?.find(vv=>Number(vv.verse) === v);
                   if(ve) tamText = ve.text;
               } else if(tamilBook[parsed.chapter] && tamilBook[parsed.chapter].verses) {
                   const ve = tamilBook[parsed.chapter].verses.find(vv=>Number(vv.verse) === v);
                   if(ve) tamText = ve.text;
               }
           }
           versesPayload.push({ v, eng: engText, tam: tamText });
       }
       
       if(!isValid) return; // Stop if validation failed

       // Create Queue Item
       const isMulti = versesToFetch.length > 1;
       const firstVersePayload = versesPayload[0];

       const newItem = {
           id: Date.now() + Math.random(),
           book: bookName,
           chapter: parsed.chapter,
           verse: versesToFetch.length === 1 ? versesToFetch[0] : versesToFetch.join(","), // Display string
           // Store extended data for multi-verse presentation
           isMulti: isMulti,
           versesPayload: versesPayload, // Store full payload for later use
           // Compatibility fields for single verse logic (will use first verse as primary for sorting/filters)
           verseNum: versesToFetch[0], 
           
           // FIX: Explicitly store text for single verse view (so "English only" bug is fixed)
           // For multi-verse, renderer uses payload, but good to have fallback
           tamilText: firstVersePayload ? firstVersePayload.tam : "",
           // English text not usually stored in item for single verse logic (it uses lookup), 
           // but let's store it to be safe or if we change renderer to use this property.
           text: firstVersePayload ? firstVersePayload.eng : "", 

           type: 'bible'
       };

       // Add to Queue
       // Add to Queue (Below active item if exists)
       setPrelistedItems(prev => {
           if (activeId) {
               const idx = prev.findIndex(item => item.id === activeId);
               if (idx !== -1) {
                   const newArr = [...prev];
                   newArr.splice(idx + 1, 0, newItem);
                   return newArr;
               }
           }
           return [...prev, newItem];
       });
       
       toast.success(`Added: ${bookName} ${parsed.chapter}:${newItem.verse}`);
       setLocalSearch(""); // Clear for next
       
       // Keep focus
       setTimeout(() => {
          searchInputRef.current?.focus();
       }, 50);
  };



  const applyStyle = (command) => {
    document.execCommand(command, false, null);
    // Keep focus
  };

  // Helper to lookup verse text
  const getVerseText = (bookName, chapter, verse) => {
    if (!bibleData || !bibleData.books) return "Loading...";
    const book = bibleData.books.find((b) => b.name === bookName);
    if (!book) return "Book not found";
    const ch = book.chapters.find((c) => Number(c.chapter) === Number(chapter));
    if (!ch) return "Chapter not found";
    const v = ch.verses.find((v) => Number(v.verse) === Number(verse));
    return v ? v.text : "Verse not found";
  };

  return (
    <div className="playlist-container">
      {/* MAIN LAYOUT: Sidebar + content */}
      <div className="playlist-sidebar" style={{
         background: theme === "dark" ? "#0f0e0eff" : "#fff",
         borderRight: theme === "dark" ? "1px solid #555" : "1px solid #999",
         color: theme === "dark" ? "white" : "black"
      }}>
          {/* Search input + previous/next buttons */}
          <div
            style={{
              display: "flex", // Keep single row
              gap: "8px", // Reduced gap slightly
              alignItems: "center",
              width: "100%",
              overflow: "hidden" // Prevent overall spill
            }}
          >
            {/* Search bar container with focus styling */}
            <div
              style={{
                flex: 1, 
                minWidth: "0", // Allow container to shrink below content size if needed
                display: "flex",
                alignItems: "center",
                padding: "8px 10px", // Slightly tighter padding
                borderRadius: "6px",
                transition:
                  "background 0.25s ease-in-out, color 0.25s ease-in-out, border-color 0.25s ease-in-out, box-shadow 0.25s ease-in-out",
                background: theme === "dark" ? "#0f0e0eff" : "#fff",
                cursor: "text",
              }}
              className="search-container"
            >
              <input
                ref={searchInputRef}
                className="search-input"
                placeholder="Reference 1chr 33 12" // Shortened placeholder
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                // Remove default outline to avoid double focus visual
                onKeyDown={(e) => {
                  if (
                    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
                      e.key
                    )
                  ) {
                    e.stopPropagation();
                  }
                  if (e.key === "Enter") handleSearchOverride();
                }}
                style={{
                  flex: 1,
                  minWidth: "0", // CRITICAL: Allow input to shrink indefinitely
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: theme === "dark" ? "white" : "#000",
                  fontSize: "14px",
                  fontFamily: "inherit",
                }}
              />
              {/* Search Icon Button */}
              <span
                title="Search Verse"
                style={{ display: "flex", alignItems: "center" }}
              >
                <svg
                  onClick={handleSearchOverride}
                  width="17"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={theme === "dark" ? "#888" : "#666"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    flexShrink: 0,
                    marginLeft: "1px",
                    cursor: "pointer",
                    transition: "stroke 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.stroke =
                      theme === "dark" ? "#00ff99" : "#003399";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.stroke =
                      theme === "dark" ? "#888" : "#666";
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </span>
            </div>

            {/* Prev / Next buttons */}
            <button
              title="Previous Item"
              onClick={() => navigateList('prev')}
              style={{
                width: "20px",
                height: "20px",
                minWidth: "35px",
                minHeight: "35px",
                padding: "0",
                borderRadius: "50%",
                fontSize: "15px",
                background: theme === "dark" ? "#0f0e0eff" : "#eee",
                color: theme === "dark" ? "white" : "black",
                border: theme === "dark" ? "1px solid #555" : "1px solid #999",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  theme === "dark" ? "#1a1a1a" : "#d3d3d3";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  theme === "dark" ? "#0f0e0eff" : "#eee";
              }}
            >
              🡨
            </button>

            <button
              title="Next Item"
              onClick={() => navigateList('next')}
              style={{
                width: "35px",
                height: "35px",
                minWidth: "35px",
                minHeight: "35px",
                padding: "0",
                borderRadius: "50%",
                fontSize: "15px",
                background: theme === "dark" ? "#0f0e0eff" : "#eee",
                color: theme === "dark" ? "white" : "black",
                border: theme === "dark" ? "1px solid #555" : "1px solid #999",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background =
                  theme === "dark" ? "#1a1a1a" : "#d3d3d3";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background =
                  theme === "dark" ? "#0f0e0eff" : "#eee";
              }}
            >
              🡪
            </button>
          </div>

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
                justifyContent: 'flex-start' /* Default flex start, let margin-left:auto handle right alignment */
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

              <div style={{display:'flex', gap:'8px', alignItems:'center', marginLeft: 'auto'}}>
                   {/* ADD FILE */}
                   <button
                     style={{color: theme === 'dark' ? 'white' : 'black'}}
                     className="action-btn"
                     onClick={() => fileInputRef.current && fileInputRef.current.click()}
                   >
                     + 
                   </button>
                   <input 
                      type="file" 
                      ref={fileInputRef} 
                      style={{display:'none'}} 
                      accept="image/png, image/jpeg, image/jpg, image/webp, video/*"
                      onChange={onFileSelect}
                   />

                   {/* EDIT MODE TOGGLE */}
                  <button
                     style={{color: theme === 'dark' ? 'white' : 'black'}}
                     className={`action-btn ${isManageMode ? 'active' : ''}`}
                     onClick={() => setIsManageMode(!isManageMode)}
                  >
                        {isManageMode ? "✓ Done" : "Edit ✎"}
                  </button>
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
                  <div style={{fontSize: '24px', opacity: 0.5}}>🗋</div>
                 <span><strong>Your Playlist is Empty</strong></span>
                 <span style={{fontSize:'13px'}}>Search verses or add files.</span>
              </div>
            ) : (
              <Reorder.Group 
                  axis="y" 
                  values={prelistedItems} 
                  onReorder={setPrelistedItems} 
                  style={{listStyle:'none', padding:0, margin:0, flex:1, overflowY:'auto'}}
              >
                {prelistedItems.map((item) => {
                  const isActive = activeId === item.id;
                  const isEditing = editingRefId === item.id;

                  return (
                    <Reorder.Item
                      key={item.id}
                      value={item}
                      onClick={() => !isEditing && handlePresent(item)}
                      dragListener={!isEditing} /* Disable drag while typing */
                      className={`queue-item ${isActive ? 'active' : ''}`}
                      style={{
                          background: isActive 
                            ? (theme === "dark" ? "#252525" : "#e0e0e0") 
                            : "transparent",
                          borderLeft: isActive 
                            ? `4px solid ${theme==='dark'?'#00ff99':'#003399'}` 
                            : "4px solid transparent",
                      }}
                      onPointerDown={() => handleItemClick(item.id)}
                    >
                        {isEditing ? (
                            <div style={{width:'100%', display:'flex', flexDirection:'column', gap:'5px'}}>
                                <input 
                                  value={editRefValue}
                                  onChange={(e) => setEditRefValue(e.target.value)}
                                  onKeyDown={(e) => {
                                      if(e.key === 'Enter') saveRefEdit(item.id);
                                      if(e.key === 'Escape') cancelRefEdit();
                                  }}
                                  autoFocus
                                  onBlur={() => setTimeout(cancelRefEdit, 200)} // Delay to allow click on save if we had one
                                  className="search-input"
                                  style={{
                                      borderBottom: '1px solid #007bff',
                                      padding: '4px'
                                  }}
                                />
                                <div style={{fontSize:'10px', opacity:0.7}}>Press Enter to save</div>
                            </div>
                        ) : (
                            <>
                                <div style={{display:'flex', alignItems:'center', gap:'10px', overflow:'hidden', flex:1}}>
                                    {/* Drag Handle Icon - subtle hint, only in manage mode */}
                                    {isManageMode && (
                                      <div className="drag-handle" title="Drag to reorder">
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
                                          <span style={{opacity:0.7}}>📄</span> {item.name}
                                       </span>
                                    ) : (
                                       <span className="text-ellipsis">
                                          <strong>{item.book}</strong> {item.chapter}:{item.verse}
                                       </span>
                                    )}
                                </div>

                                {/* Controls (Visible ONLY in Manage Mode) */}
                                <div className="item-controls" style={{opacity: isManageMode ? 1 : 0, pointerEvents: isManageMode ? 'auto' : 'none'}}>
                                     {item.type !== 'file' && (
                                          <button
                                            className="icon-btn"
                                            onClick={(e) => { e.stopPropagation(); startEditingRef(item); }}
                                            title="Edit Reference"
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
                            </>
                        )}
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            )}
          </div>
        </div>

        {/* Main table area: Displays Verses corresponding to Queue */}
        <div style={{ flex: 1, padding: "5px" }}>
          <div
            style={{
              height: "calc(100vh - 100px)",
              overflowY: "auto",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
          >
            {prelistedItems.map((item, i) => {
              // --- FILE RENDERING ---
              if (item.type === 'file') {
                  const isImage = item.fileType && item.fileType.startsWith('image');
                  const isVideo = item.fileType && item.fileType.startsWith('video');

                  return (
                    <div
                      key={item.id || i}
                      ref={el => itemRefs.current[item.id] = el}
                      onClick={() => handlePresent(item)}
                      style={{
                        cursor: "pointer",
                        background: theme === "dark" ? "#1e1e1e" : "#fff",
                        padding: "10px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        border: theme === "dark" ? "1px solid #333" : "1px solid #eee",
                        textAlign: 'center',
                        // Highlight border if active in main view too? (Optional, but user asked for highlight 'selected verse/list')
                        outline: activeId === item.id ? `2px solid ${theme==='dark'?'#00ff99':'#003399'}` : 'none'
                      }}
                    >
                         <div style={{marginBottom:'10px', fontSize:'14px', fontWeight:'bold', textAlign:'left'}}>
                            {item.name}
                         </div>
                         {isImage && (
                            <img 
                                src={item.url} 
                                alt={item.name} 
                                style={{maxWidth:'100%', maxHeight:'200px', borderRadius:'4px', objectFit:'contain'}} 
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML += '<div style="padding:10px;color:red;font-size:12px;">Image not found (Reloaded?)</div>';
                                }}
                            />
                         )}
                         {isVideo && <video src={item.url} controls style={{maxWidth:'100%', maxHeight:'200px', borderRadius:'4px'}} />}
                         {!isImage && !isVideo && <div style={{padding:'20px'}}>Unsupported File Type</div>}
                    </div>
                  );
              }

              // --- VERSE RENDERING ---
              // Determine content to show: Prefer HTML overrides, fallback to plain text
              // --- VERSE RENDERING ---
              // Determine content to show: Prefer HTML overrides, fallback to plain text
              let rawEnglish = "";
              let rawTamil = "";

              if (item.isMulti && item.versesPayload) {
                 // Combined text for multi-verse
                 // For display list, we probably want:
                 // 1. Text ...
                 // 2. Text ...
                 // Or just joined. User said "same div container".
                 
                 // Let's join them with verse numbers for clarity in the list view?
                 // Or just raw text. Previous instruction said "only one language" for presentation, 
                 // but for the LIST VIEW, user probably wants to see what's there.
                 // "failed to load bible verse" implies they saw nothing.
                 
                 // Let's show Tamil joined (as that's the primary for multi)
                 // And English joined?
                 // The user complained "If there loads more than 1 verse, put it in same div container".
                 
                 rawTamil = item.versesPayload.map(v => 
                    item.versesPayload.length > 1 ? `${v.v}. ${v.tam}` : v.tam
                 ).join("\n");

                 rawEnglish = item.versesPayload.map(v => 
                    item.versesPayload.length > 1 ? `${v.v}. ${v.eng}` : v.eng
                 ).join("\n");
                 
                 // Override: Presentation only shows Tamil for multi. 
                 // But in the list/preview, viewing both is helpful?
                 // Let's keep both in preview manifest.
              } else {
                 // Single verse standard lookup
                 rawEnglish = getVerseText(item.book, item.chapter, item.verse);
                 rawTamil = item.tamilText || "";
              }

              const displayEnglish = item.englishHtml || rawEnglish;
              const displayTamil = item.tamilHtml || rawTamil;

              const isEditing = editingTextId === item.id;

              return (
                <div
                  key={item.id || i}
                  onClick={() => { if(!isEditing) { handleItemClick(item.id); handlePresent(item); } }}
                  ref={el => itemRefs.current[item.id] = el}
                  style={{
                    background: theme === "dark" ? "#1e1e1e" : "#fff",
                    padding: "10px", // Reduced padding
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border:
                       isEditing ? "2px solid #007bff" : (theme === "dark" ? "1px solid #333" : "1px solid #eee"),
                    position: "relative", // For absolute positioning if needed (we use flex currently)
                    outline: (!isEditing && activeId === item.id) ? `2px solid ${theme==='dark'?'#00ff99':'#003399'}` : 'none'
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
                    </span>
                    
                    {/* Edit Button or Toolbar */}
                    {!isEditing ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditingText(item); }}
                          title="Edit Formatting"
                          style={{
                              cursor: 'pointer',
                              background: 'transparent',
                              border: 'none',
                              padding: '2px'
                          }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme==='dark'?'#888':'#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                    ) : (
                        <div className="formatting-toolbar">
                             {/* Formatting Toolbar */}
                             <button className="format-btn" onMouseDown={(e)=>{e.preventDefault(); applyStyle('bold')}} title="Bold"><span style={{fontWeight:'bold'}}>B</span></button>
                             <button className="format-btn" onMouseDown={(e)=>{e.preventDefault(); applyStyle('italic')}} title="Italic"><span style={{fontStyle:'italic'}}>I</span></button>
                             <button className="format-btn" onMouseDown={(e)=>{e.preventDefault(); applyStyle('underline')}} title="Underline"><span style={{textDecoration:'underline'}}>U</span></button>
                             
                             <div className="separator"></div>

                             <button onClick={(e) => { e.stopPropagation(); saveTextEdit(item.id); }} className="save-btn">Save</button>
                             <button onClick={cancelTextEdit} className="cancel-btn">Cancel</button>
                        </div>
                    )}
                  </div>
                  
                  {/* Tamil Content */}
                  {displayTamil && (
                    <div
                      key={isEditing ? "tamil-edit" : "tamil-view"} // Force remount to discard dirty DOM on Cancel
                      ref={isEditing ? tamilContentRef : null}
                      contentEditable={isEditing}
                      suppressContentEditableWarning={true}
                      // Allow full editing
                      onKeyDown={(e) => {
                          if(!isEditing) return;
                          e.stopPropagation(); // Prevent list navigation
                      }}
                      dangerouslySetInnerHTML={{ __html: displayTamil }}
                      style={{
                        fontSize: "20px", 
                        marginBottom: "10px",
                        color: theme === "dark" ? "#ddd" : "#333",
                        outline: 'none',
                        border: isEditing ? '1px dashed #555' : 'none',
                        padding: isEditing ? '4px' : '0',
                        cursor: isEditing ? 'text' : 'default'
                      }}
                    />
                  )}

                  {/* English Content */}
                  <div
                    key={isEditing ? "eng-edit" : "eng-view"} // Force remount to discard dirty DOM on Cancel
                    ref={isEditing ? englishContentRef : null}
                    contentEditable={isEditing}
                    suppressContentEditableWarning={true}
                    onKeyDown={(e) => {
                        if(!isEditing) return;
                        e.stopPropagation(); // Prevent list navigation
                    }}
                    dangerouslySetInnerHTML={{ __html: displayEnglish }}
                    style={{
                       fontSize: "18px",
                       lineHeight: "1.4",
                       color: theme === "dark" ? "#bbb" : "#444",
                       outline: 'none',
                       border: isEditing ? '1px dashed #555' : 'none',
                       padding: isEditing ? '4px' : '0',
                       cursor: isEditing ? 'text' : 'default'
                    }}
                  />
                  
                  {isEditing && (
                      <div style={{fontSize:'12px', color:'#777', marginTop:'5px'}}>
                          * Editing text enabled.
                      </div>
                  )}
                </div>
              );
            })}
            
            {prelistedItems.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  marginTop: "100px",
                  color: "#888",
                  fontSize: "18px",
                }}
              >
                Search for a verse to add it to the list.
              </div>
            )}
          </div>
        </div>
      </div>
  );
});

export default Prelist;
