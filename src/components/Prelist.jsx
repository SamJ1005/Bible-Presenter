import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import "./prelist/Prelist.css";
import { parseReferenceIncludeRange } from "../utils/referenceParser";
import { getTamilBookName } from "../utils/bibleBooks";
import PrelistSidebar from "./prelist/PrelistSidebar";
import PrelistMainView from "./prelist/PrelistMainView";

const Prelist = React.forwardRef((
  {
    theme,
    handleSearch,
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
    sendToPresentation,
    activeId,      // Lifted State
    setActiveId,   // Lifted State
    tamilBookData, // newly added
    getTamilVerse, // newly added
    getEnglishVerse, // newly added
    // Queue Management
    queueMeta,
    activeQueueInfo,
    user,
    createQueue,
    copyQueue,
    switchQueue,
    deleteQueue,
    renameQueue,
    toggleQueueSync,
    // Cloud Playlist Management
    cloudPlaylists,
    cloudLoading,
    syncStatus,
    loadCloudPlaylist,
    fetchCloudPlaylists,
    syncQueueNow,
    // Issue Reporting
    verseIssues = {},
    onReportVerse,
  },
  ref
) => {
  // Local state for sidebar editing (reference only)
  const [editingRefId, setEditingRefId] = useState(null);
  const [editRefValue, setEditRefValue] = useState("");
  const [isManageMode, setIsManageMode] = useState(false); // Global toggle for edit controls
  const [originalQueueOrder, setOriginalQueueOrder] = useState(null); // Store original order before editing
  const fileInputRef = useRef(null);

  // Local state for verse text editing (HTML)
  const [editingTextId, setEditingTextId] = useState(null);
  // Track pending font size offset during editing (before save)
  const [pendingFontOffset, setPendingFontOffset] = useState(null);
  // Track layout overrides during editing
  const [pendingLayoutOverrides, setPendingLayoutOverrides] = useState(null);

  // Auto-scroll Refs
  const itemRefs = useRef({}); // Map of main content refs (Main View)
  const sidebarItemRefs = useRef({}); // Map of sidebar item refs (Queue List)
  const scrollContainerRef = useRef(null); // Ref for the sidebar container

  // Save original queue order when entering edit mode
  const enterManageMode = () => {
    setOriginalQueueOrder([...prelistedItems]); // Deep copy of current order
    setIsManageMode(true);
  };

  // Save changes and exit edit mode
  const saveManageMode = () => {
    setOriginalQueueOrder(null);
    setIsManageMode(false);
  };

  // Cancel changes and restore original order
  const cancelManageMode = () => {
    if (originalQueueOrder) {
      setPrelistedItems(originalQueueOrder); // Restore original order
    }
    setOriginalQueueOrder(null);
    setIsManageMode(false);
  };

  // Scroll the active item into view immediately when activeId changes (no slow animations)
  useEffect(() => {
    if (activeId) {
      if (sidebarItemRefs.current && sidebarItemRefs.current[activeId]) {
        sidebarItemRefs.current[activeId].scrollIntoView({ behavior: "instant", block: "nearest" });
      }
      if (itemRefs.current && itemRefs.current[activeId]) {
        itemRefs.current[activeId].scrollIntoView({ behavior: "instant", block: "nearest" });
      }
    }
  }, [activeId]);

  const handleItemClick = (id) => {
    setActiveId(id);
  };

  /* ---------- HANDLERS ---------- */

  const handlePresent = async (item) => {
    // Block presentation if editing
    if (editingRefId || editingTextId) return;

    if (!sendToPresentation) return;

    // Handle "File" type or other legacy types
    if (item.type === "file") {
      const isInvalidUrl = (u) => !u || ["[uploading]", "[upload-failed]", "[offline-or-failed-upload]", "[local-file]"].includes(u);
      let mediaSrc = !isInvalidUrl(item.imageUrl)
        ? item.imageUrl
        : (!isInvalidUrl(item.url)
          ? item.url
          : (item.localUrl || item.localPreview || null));

      if (!mediaSrc && item.path) {
        const fixedPath = item.path.replace(/\\/g, "/");
        mediaSrc = `file:///${fixedPath}`;
      }

      sendToPresentation({
        viewMode: "prelist",
        type: "file",
        fileData: {
          url: mediaSrc,
          fileType: item.fileType,
          name: item.name,
          localPreview: item.localPreview || item.imageUrl || item.url,
        },
        settings,
      });
      return;
    }

    // MULTI-VERSE Logic (from Queue)
    if (item.isMulti && item.versesPayload && item.versesPayload.length > 0) {
      // >1 Verses: Show ONLY Tamil (joined)
      // Check for Override (Edited HTML) first
      let finalTamil = item.tamilHtml;

      if (!finalTamil) {
        // Fallback to generated content
        // FIX: Use <br/> instead of \n because presentation uses innerHTML
        finalTamil = item.versesPayload
          .map((i) => `${i.v}. ${i.tam}`)
          .join("<br/>");
      }

      // Include English text if available for multi-verse
      let finalEnglish = item.englishHtml || "";
      if (!finalEnglish && item.versesPayload && item.versesPayload.length > 0) {
        finalEnglish = item.versesPayload
          .map((i) => `${i.v}. ${i.eng}`)
          .join("<br/>");
      }

      const tamilName = getTamilBookName(item.book);
      const indexStr = `${tamilName} (${item.book}) ${item.chapter}:${item.verse}`;

      sendToPresentation({
        selectedBook: item.book,
        selectedChapter: item.chapter,
        selectedVerse: item.verse,
        tamilText: finalTamil,
        englishText: finalEnglish,
        settings,
        index: indexStr,
        viewMode: "prelist",
        fontSizeOffset: item.fontSizeOffset || 0,
      });
      return;
    }

    let englishText = "";
    if (item.englishHtml) {
      englishText = item.englishHtml;
    } else {
      const b = bibleData?.books?.find((b) => b.name === item.book);
      const c = b?.chapters?.find(
        (c) => Number(c.chapter) === Number(item.chapter)
      );
      const v = c?.verses?.find((v) => Number(v.verse) === Number(item.verse));
      englishText = v ? v.text : "";
    }

    let tamilText = item.tamilHtml || item.tamilText || "";

    // FAILSAFE: If Tamil Text is missing (e.g. data corruption or legacy item), fetch it NOW
    if (!tamilText && getTamilVerse) {
        tamilText = getTamilVerse(item.book, item.chapter, item.verse);
    }

    sendToPresentation({
      selectedBook: item.book,
      selectedChapter: item.chapter,
      selectedVerse: item.verse,
      tamilText, // EXPLICIT PASS
      englishText, // EXPLICIT PASS
      settings,
      index: `${getTamilBookName(item.book)} (${item.book}) ${item.chapter}:${item.verse}`,
      viewMode: "prelist",
      fontSizeOffset: item.fontSizeOffset || 0,
    });
  };

  const navigateList = (direction) => {
    if (editingRefId || editingTextId) return;
    if (prelistedItems.length === 0) return;

    let nextIndex = 0;
    if (activeId === null) {
      nextIndex = 0;
    } else {
      const currentIndex = prelistedItems.findIndex(
        (item) => item.id === activeId
      );
      if (currentIndex === -1) {
        nextIndex = 0;
      } else {
        if (direction === "next") nextIndex = currentIndex + 1;
        else nextIndex = currentIndex - 1;
      }
    }

    // Bounds check
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= prelistedItems.length)
      nextIndex = prelistedItems.length - 1;

    const nextItem = prelistedItems[nextIndex];
    if (nextItem) {
      handleItemClick(nextItem.id);
      handlePresent(nextItem); // Auto-present on navigation
    }
  };

  // Expose navigation and presentation to parent
  React.useImperativeHandle(ref, () => ({
    goNext: () => navigateList("next"),
    goPrev: () => navigateList("prev"),
    presentActive: () => {
      const activeItem = prelistedItems.find(i => i.id === activeId);
      if (activeItem) handlePresent(activeItem);
    },
    presentItem: (item) => {
      if (item) handlePresent(item);
    }
  }), [prelistedItems, activeId, editingRefId, editingTextId, handlePresent, navigateList]);

  const onFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFileToQueue(e.target.files[0], activeId);
    }
    // Clear input so same file can be selected again if needed
    e.target.value = "";
  };

  const startEditingRef = (item) => {
    setEditingRefId(item.id);
    // Move reference to search bar for editing
    setLocalSearch(`${item.book} ${item.chapter} ${item.verse}`);
    setEditRefValue(""); // Clear inline value as we won't use it
    
    // Focus search input
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const saveRefEdit = async (idOrOverrideValue) => {
    // If idOrOverrideValue is string, it's confusing, so let's rely on 'localSearch' state
    // but the caller might be passing the id.
    // Actually, we process 'localSearch' as the new value.
    const id = editingRefId;
    if (!id) return;

    const valueToParse = typeof idOrOverrideValue === 'string' ? idOrOverrideValue : localSearch;

    // Use the powerful parser that supports ranges
    const parsed = parseReferenceIncludeRange(valueToParse);

    if (!parsed) {
      toast.error(
        "Invalid Reference. Try 'Gen 1:1', 'Gen 1:1-3', or 'Gen 1:1,3'"
      );
      return;
    }

    const bookName = findBook(parsed.book);
    if (!bookName) {
      toast.error("Unknown book");
      return;
    }

    // --- SINGLE CHAPTER LOGIC REUSE ---
    if (bibleData && bibleData.books) {
      const engBook = bibleData.books.find((b) => b.name === bookName);
      if (engBook && engBook.chapters.length === 1 && parsed.chapter > 1) {
        const oldCh = parsed.chapter;
        parsed.chapter = 1;
        parsed.verse = oldCh;
        const existing = parsed.verseList || [];
        parsed.verseList = [...new Set([oldCh, ...existing])].sort(
          (a, b) => a - b
        );
      }
    }
    // ----------------------------

    if (!parsed.verseList || parsed.verseList.length === 0) {
      parsed.verseList = [1];
    }

    const versesToFetch = parsed.verseList;
    if (versesToFetch.length > 5) {
      toast.error("Max 5 verses allowed");
      return;
    }

    const versesPayload = [];
    let isValid = true;

    for (const v of versesToFetch) {
      const engText = getEnglishVerse ? getEnglishVerse(bookName, parsed.chapter, v) : "";
      const tamText = getTamilVerse ? getTamilVerse(bookName, parsed.chapter, v) : "";
      if (!engText && !tamText) {
        toast.error(`Verse ${v} not found`);
        isValid = false; break;
      }
      versesPayload.push({ v, eng: engText, tam: tamText });
    }

    if (!isValid) return;

    const isMulti = versesToFetch.length > 1;
    const firstVersePayload = versesPayload[0];

    const updates = {
        book: bookName,
        chapter: parsed.chapter,
        verse: versesToFetch.length === 1 ? versesToFetch[0] : versesToFetch.join(","),
        isMulti: isMulti,
        versesPayload: versesPayload,
        verseNum: versesToFetch[0],
        tamilText: firstVersePayload ? firstVersePayload.tam : "",
        text: firstVersePayload ? firstVersePayload.eng : "",
        // Clear manual HTML edits when reference changes
        tamilHtml: null,
        englishHtml: null
    };

    updateQueueItem(id, updates);
    toast.success("Updated successfully");

    setEditingRefId(null);
    setLocalSearch(""); 
  };

  const cancelRefEdit = () => {
    setEditingRefId(null);
    setLocalSearch(""); // Clear search bar
  };

  // --- HTML / Rich Text Logic ---
  const tamilContentRef = useRef(null);
  const englishContentRef = useRef(null);

  const startEditingText = (item) => {
    setEditingTextId(item.id);
    setPendingFontOffset(item.fontSizeOffset || 0);
    setPendingLayoutOverrides(item.layoutOverrides || {
      indexPaddingTop: undefined,
      versePaddingTop: undefined,
      tamilLineHeight: undefined,
      englishLineHeight: undefined
    });
    // Close the presentation window when entering edit mode
    // to prevent live edits from being shown on the projected screen
    window.api?.closePresentation?.();
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

    // Save font size offset
    if (pendingFontOffset !== null) {
      updates.fontSizeOffset = pendingFontOffset;
    }
    // Save layout overrides
    if (pendingLayoutOverrides !== null) {
      updates.layoutOverrides = pendingLayoutOverrides;
    }

    if (Object.keys(updates).length > 0) {
      updateQueueItem(id, updates);
      toast.success("Text saved successfully");
    }

    setEditingTextId(null);
    setPendingFontOffset(null);
    setPendingLayoutOverrides(null);
  };

  const cancelTextEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingTextId(null);
    setPendingFontOffset(null);
    setPendingLayoutOverrides(null);
  };

  // Font size change handler - saves immediately to queue item
  const handleFontSizeChange = (itemId, newOffset) => {
    setPendingFontOffset(newOffset);
    // Also save immediately to the queue item so it persists without needing Save
    updateQueueItem(itemId, { fontSizeOffset: newOffset });
    // Send live update to presentation if this item is currently active
    const item = prelistedItems.find(i => i.id === itemId);
    if (item && activeId === itemId) {
      handleLivePreviewUpdate({ ...item, fontSizeOffset: newOffset }, newOffset);
    }
  };

  // Live preview update - sends to presentation window in real-time
  const handleLivePreviewUpdate = (item, fontOffset) => {
    if (!sendToPresentation) return;
    // Build and send a live preview payload (same as handlePresent but with the current offset)
    let finalTamil = '';
    let finalEnglish = '';

    if (item.isMulti && item.versesPayload && item.versesPayload.length > 0) {
      finalTamil = tamilContentRef.current?.innerHTML || item.tamilHtml || item.versesPayload.map(i => `${i.v}. ${i.tam}`).join('<br/>');
      finalEnglish = '';
    } else {
      finalTamil = tamilContentRef.current?.innerHTML || item.tamilHtml || item.tamilText || '';
      finalEnglish = englishContentRef.current?.innerHTML || item.englishHtml || '';
      if (!finalEnglish) {
        const b = bibleData?.books?.find(b => b.name === item.book);
        const c = b?.chapters?.find(c => Number(c.chapter) === Number(item.chapter));
        const v = c?.verses?.find(v => Number(v.verse) === Number(item.verse));
        finalEnglish = v ? v.text : '';
      }
    }

    const tamilName = getTamilBookName(item.book);
    const indexStr = `${tamilName} (${item.book}) ${item.chapter}:${item.verse}`;

    // Send directly to presentation (fire-and-forget for live update)
    try {
      window.electron?.sendPresentation?.({
        viewMode: 'prelist',
        type: 'bible',
        tamilText: finalTamil,
        englishText: finalEnglish,
        index: indexStr,
        fontSizeOffset: fontOffset,
        tamilEnabled: settings?.isTamilEnabled ?? true,
        englishEnabled: settings?.isEnglishEnabled ?? true,
        presentationBgType: settings?.presentationBgType ?? 'color',
        presentationBgImage: settings?.presentationBgImage ?? '',
        presentationBgColor: settings?.presentationBgColor ?? 'black',
        presentationTextColor: settings?.presentationTextColor ?? 'white',
        enableTransition: settings?.enableTransition ?? false,
        customWatermark: settings?.customWatermark ?? '',
        showFullscreenWindow: settings?.showFullscreenWindow !== false,
        showLowerThirdWindow: settings?.showLowerThirdWindow === true,
        lowerThirdLanguage: settings?.lowerThirdLanguage ?? "tamil",
        lowerThirdBgImage: settings?.lowerThirdBgImage ?? "",
        lowerThirdTextColor: settings?.lowerThirdTextColor ?? "",
        tamilFontOffset: settings?.tamilFontOffset ?? 0,
        englishFontOffset: settings?.englishFontOffset ?? 0,
        indexFontOffset: settings?.indexFontOffset ?? 0,
        layoutOverrides: pendingLayoutOverrides || item.layoutOverrides || {},
      });
    } catch (e) {
      console.error('Live preview update failed', e);
    }
  };

  // --- Backfill missing Tamil text for legacy/loaded items ---
  useEffect(() => {
    // Find single-verse items missing Tamil text
    const singleMissing = prelistedItems.filter(
      (item) =>
        item.type !== 'file' &&
        !item.isMulti &&
        !item.tamilText &&
        !item.tamilHtml &&
        item.book &&
        item.chapter &&
        item.verse
    );

    // Find multi-verse items where versesPayload entries have empty Tamil
    const multiMissing = prelistedItems.filter(
      (item) =>
        item.type !== 'file' &&
        item.isMulti &&
        item.versesPayload &&
        !item.tamilHtml &&
        item.versesPayload.some((vp) => !vp.tam)
    );

    if (singleMissing.length === 0 && multiMissing.length === 0) return;

    // Group all items needing Tamil by book
    const bookGroups = {};
    for (const item of [...singleMissing, ...multiMissing]) {
      if (!bookGroups[item.book]) bookGroups[item.book] = [];
      bookGroups[item.book].push(item);
    }

    // Fetch Tamil data for each unique book and backfill
    (async () => {
      const singleUpdates = []; // { id, tamilText }
      const multiUpdates = [];  // { id, versesPayload }

      for (const [bookName, items] of Object.entries(bookGroups)) {
          for (const item of items) {
            if (item.isMulti && item.versesPayload) {
              // Multi-verse: fill in missing tam fields
              const updatedPayload = item.versesPayload.map((vp) => {
                if (!vp.tam) {
                  const tamText = getTamilVerse ? getTamilVerse(bookName, item.chapter, vp.v) : "";
                  return { ...vp, tam: tamText };
                }
                return vp;
              });
              // Also update tamilText (first verse)
              const firstTam = updatedPayload[0]?.tam || "";
              multiUpdates.push({ id: item.id, versesPayload: updatedPayload, tamilText: firstTam });
            } else {
              // Single verse
              const tamilText = getTamilVerse ? getTamilVerse(bookName, item.chapter, item.verse) : "";
              if (tamilText) {
                singleUpdates.push({ id: item.id, tamilText });
              }
            }
          }
      }

      // Apply all updates at once
      const allUpdates = [...singleUpdates, ...multiUpdates];
      if (allUpdates.length > 0) {
        setPrelistedItems((prev) =>
          prev.map((item) => {
            const update = allUpdates.find((u) => u.id === item.id);
            if (update) {
              return { ...item, ...update };
            }
            return item;
          })
        );
      }
    })();
    // Run whenever tamilBookData changes (e.g. initial load finished)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tamilBookData]);

  // Local Search State (independent of Bible Tab)
  const [localSearch, setLocalSearch] = useState("");

  const handleSearchOverride = async () => {
    const parsed = parseReferenceIncludeRange(localSearch);

    if (!parsed) {
      return toast.error(
        "Invalid Reference. Try 'Gen 1:1', 'Gen 1:1-3', or 'Gen 1:1,3'"
      );
    }

    const bookName = findBook(parsed.book);
    if (!bookName) return toast.error("Book not found");

    // --- SINGLE CHAPTER LOGIC ---
    // Check if book has only 1 chapter (e.g. Jude, Philemon)
    // If user typed "Jude 5", parser sees Chapter 5. We must swap to Ch 1, Verse 5.
    let engBook = null;
    if (bibleData && bibleData.books) {
      engBook = bibleData.books.find((b) => b.name === bookName);
      if (engBook && engBook.chapters.length === 1 && parsed.chapter > 1) {
        const oldCh = parsed.chapter;
        parsed.chapter = 1;
        parsed.verse = oldCh;

        // Fix verse list: "Jude 5" -> vList was empty. "Jude 5,7" -> vList was [7].
        // We prepend the old chapter (now verse) to the list.
        const existing = parsed.verseList || [];
        // Filter out duplicates just in case
        parsed.verseList = [...new Set([oldCh, ...existing])].sort(
          (a, b) => a - b
        );
      }
    }
    // ----------------------------

    if (!parsed.verseList || parsed.verseList.length === 0) {
      parsed.verseList = [1];
    }

    const versesToFetch = parsed.verseList;
    if (versesToFetch.length > 5) return toast.error("Max 5 verses allowed");

    const versesPayload = [];
    // Validation Flag
    let isValid = true;

    for (const v of versesToFetch) {
      const engText = getEnglishVerse ? getEnglishVerse(bookName, parsed.chapter, v) : "";
      const tamText = getTamilVerse ? getTamilVerse(bookName, parsed.chapter, v) : "";
      if (!engText && !tamText) {
        toast.error(`Verse ${v} not found in ${bookName} ${parsed.chapter}`);
        isValid = false;
        break;
      }
      versesPayload.push({ v, eng: engText, tam: tamText });
    }

    if (!isValid) return; // Stop if validation failed

    // Create Queue Item
    const isMulti = versesToFetch.length > 1;
    const firstVersePayload = versesPayload[0];

    const newItem = {
      id: Date.now() + Math.random(),
      book: bookName,
      chapter: parsed.chapter,
      verse:
        versesToFetch.length === 1
          ? versesToFetch[0]
          : versesToFetch.join(","), // Display string
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

      type: "bible",
    };

    // Add to Queue (Below active item if exists)
    setPrelistedItems((prev) => {
      if (activeId) {
        const idx = prev.findIndex((item) => item.id === activeId);
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

  const applyStyle = (command, value = null) => {
    document.execCommand(command, false, value);
    // Keep focus
  };

  const applyCustomFontSize = (vwSize) => {
    // Use native execCommand to cleanly handle cross-boundary selections
    document.execCommand("fontSize", false, "7");
    
    // Replace the generated <font size="7"> tags with our custom vw styled spans
    // This allows robust rich text sizing that natively scales with the window
    const fonts = document.querySelectorAll('font[size="7"]');
    fonts.forEach(font => {
      const span = document.createElement('span');
      span.style.fontSize = `${vwSize}vw`;
      // carry over any inherent styling if needed, though typically it's just raw HTML
      span.innerHTML = font.innerHTML;
      font.replaceWith(span);
    });
  };

  return (
    <div className="playlist-container">
      {/* MAIN LAYOUT: Sidebar + content */}
      <PrelistSidebar
        theme={theme}
        prelistedItems={prelistedItems}
        setPrelistedItems={setPrelistedItems}
        localSearch={localSearch}
        setLocalSearch={setLocalSearch}
        handleSearchOverride={handleSearchOverride}
        navigateList={navigateList}
        searchInputRef={searchInputRef}
        isManageMode={isManageMode}
        enterManageMode={enterManageMode}
        saveManageMode={saveManageMode}
        cancelManageMode={cancelManageMode}
        clearQueue={clearQueue}
        removeFromQueue={removeFromQueue}
        addFileToQueue={addFileToQueue}
        fileInputRef={fileInputRef}
        onFileSelect={onFileSelect}
        activeId={activeId}
        editingRefId={editingRefId}
        editRefValue={editRefValue}
        setEditRefValue={setEditRefValue}
        startEditingRef={startEditingRef}
        saveRefEdit={saveRefEdit}
        cancelRefEdit={cancelRefEdit}
        handleItemClick={handleItemClick}
        scrollContainerRef={scrollContainerRef}
        sidebarItemRefs={sidebarItemRefs}
        queueMeta={queueMeta}
        activeQueueInfo={activeQueueInfo}
        user={user}
        createQueue={createQueue}
        copyQueue={copyQueue}
        switchQueue={switchQueue}
        deleteQueue={deleteQueue}
        renameQueue={renameQueue}
        toggleQueueSync={toggleQueueSync}
        cloudPlaylists={cloudPlaylists}
        cloudLoading={cloudLoading}
        syncStatus={syncStatus}
        loadCloudPlaylist={loadCloudPlaylist}
        fetchCloudPlaylists={fetchCloudPlaylists}
        syncQueueNow={syncQueueNow}
      />

      {/* Main table area: Displays Verses corresponding to Queue */}
      <PrelistMainView
        prelistedItems={prelistedItems}
        theme={theme}
        bibleData={bibleData}
        activeId={activeId}
        editingTextId={editingTextId}
        editingRefId={editingRefId}
        startEditingText={startEditingText}
        saveTextEdit={saveTextEdit}
        cancelTextEdit={cancelTextEdit}
        applyStyle={applyStyle}
        applyCustomFontSize={applyCustomFontSize}
        tamilContentRef={tamilContentRef}
        englishContentRef={englishContentRef}
        handleItemClick={handleItemClick}
        handlePresent={handlePresent}
        itemRefs={itemRefs}
        onFontSizeChange={handleFontSizeChange}
        onLivePreviewUpdate={handleLivePreviewUpdate}
        activeQueueName={activeQueueInfo?.name}
        settings={settings}
        verseIssues={verseIssues}
        onReportVerse={onReportVerse}
        user={user}
      />
    </div>
  );
});

export default Prelist;