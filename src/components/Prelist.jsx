import React, { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import "./prelist/Prelist.css";
import { parseReferenceIncludeRange } from "../utils/referenceParser";
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
    setActiveId    // Lifted State
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

  // Scroll the active item into view when activeId changes
  useEffect(() => {
    // Stagger scrolls to prevent browser conflict
    
    // 1. Scroll SIDEBAR (Priority 1)
    const sidebarTimer = setTimeout(() => {
      if (activeId && sidebarItemRefs.current && sidebarItemRefs.current[activeId]) {
        const activeElement = sidebarItemRefs.current[activeId];
        activeElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 100);

    // 2. Scroll MAIN VIEW (Priority 2, slightly delayed)
    const mainTimer = setTimeout(() => {
      if (activeId && itemRefs.current && itemRefs.current[activeId]) {
        const mainElement = itemRefs.current[activeId];
        mainElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);

    return () => {
      clearTimeout(sidebarTimer);
      clearTimeout(mainTimer);
    };
  }, [activeId]);

  const handleItemClick = (id) => {
    setActiveId(id);
  };

  // Keyboard navigation (arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingRefId || editingTextId) return; // Don't navigate if editing

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();

        if (prelistedItems.length === 0) return;

        // If no active item, start with first/last
        if (!activeId) {
          setActiveId(
            e.key === "ArrowDown"
              ? prelistedItems[0].id
              : prelistedItems[prelistedItems.length - 1].id
          );
          return;
        }

        // Find current index
        const currentIndex = prelistedItems.findIndex(
          (item) => item.id === activeId
        );
        if (currentIndex === -1) return;

        // Navigate
        let nextIndex;
        if (e.key === "ArrowDown") {
          nextIndex =
            currentIndex + 1 < prelistedItems.length
              ? currentIndex + 1
              : prelistedItems.length - 1;
        } else {
          nextIndex = currentIndex - 1 >= 0 ? currentIndex - 1 : 0;
        }

        setActiveId(prelistedItems[nextIndex].id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId, prelistedItems, editingRefId, editingTextId]);

  /* ---------- HANDLERS ---------- */

  const handlePresent = async (item) => {
    // Block presentation if editing
    if (editingRefId || editingTextId) return;

    if (!sendToPresentation) return;

    // Handle "File" type or other legacy types
    if (item.type === "file") {
      // Prefer File Path (file://) for performance/IPC, fallback to Base64
      let mediaSrc = item.url;

      if (item.path) {
        const fixedPath = item.path.replace(/\\/g, "/");
        mediaSrc = `file:///${fixedPath}`;
      }

      const payload = {
        viewMode: "prelist",
        type: "file",
        fileData: {
          url: mediaSrc,
          fileType: item.fileType,
          name: item.name,
        },
        settings,
      };
      console.log("[PRELIST.JSX] Sending file payload:", payload);
      sendToPresentation(payload);
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
          .join("<br/><br/>");
      }

      // English is empty for multi-verse as per requirement to fit screen,
      // UNLESS Tamil is missing/failed, then show English as fallback.
      let finalEnglish = "";
      if (!finalTamil || finalTamil.trim() === "") {
        if (item.englishHtml) {
          finalEnglish = item.englishHtml;
        } else {
          finalEnglish = item.versesPayload
            .map((i) => `${i.v}. ${i.eng}`)
            .join("<br/><br/>");
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
        viewMode: "prelist",
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
    if (!tamilText) {
      try {
        // We can't use existing 'tamilBook' state as that might correspond to Bible tab
        // We must fetch independent of everything else
        const res = await fetch(
          `./bible/tamil/${encodeURIComponent(item.book)}.json`
        );
        if (res.ok) {
          const data = await res.json();
          // Confirm book name again to be paranoid
          if (
            data?.book?.english?.toLowerCase() === item.book.toLowerCase()
          ) {
            // Extract verse
            let foundVerse = null;
            if (Array.isArray(data.chapters)) {
              const ch = data.chapters.find(
                (c) => Number(c.chapter) === Number(item.chapter)
              );
              foundVerse = ch?.verses?.find(
                (v) => Number(v.verse) === Number(item.verse)
              );
            } else if (data[item.chapter] && data[item.chapter].verses) {
              foundVerse = data[item.chapter].verses.find(
                (v) => Number(v.verse) === Number(item.verse)
              );
            }
            if (foundVerse) tamilText = foundVerse.text;
          }
        }
      } catch (e) {
        console.error("Ad-hoc fetch failed in handlePresent", e);
      }
    }

    sendToPresentation({
      selectedBook: item.book,
      selectedChapter: item.chapter,
      selectedVerse: item.verse,
      tamilText, // EXPLICIT PASS
      englishText, // EXPLICIT PASS
      settings,
      index: `${item.book} ${item.chapter}:${item.verse}`,
      viewMode: "prelist",
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

  // Expose navigation to parent
  React.useImperativeHandle(ref, () => ({
    goNext: () => navigateList("next"),
    goPrev: () => navigateList("prev"),
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
        navigateList("next");
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        navigateList("prev");
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

    // Fetch Tamil Content (Async)
    let tamilBook = null;
    try {
      const res = await fetch(
        `./bible/tamil/${encodeURIComponent(bookName)}.json`
      );
      if (res.ok) {
        const data = await res.json();
        const loadedName = data?.book?.english;
        if (loadedName && loadedName.toLowerCase() === bookName.toLowerCase()) {
          tamilBook = data;
        }
      }
    } catch (e) {
      console.error("Tamil fetch failed in edit", e);
    }

    const versesPayload = [];
    let isValid = true;

    for (const v of versesToFetch) {
      const engBook = bibleData?.books?.find((b) => b.name === bookName);
      if (!engBook) { isValid = false; break; }

      const engChap = engBook?.chapters?.find(
        (c) => Number(c.chapter) === parsed.chapter
      );
      if (!engChap) {
        toast.error(`Chapter ${parsed.chapter} not found in ${bookName}`);
        isValid = false; break;
      }

      const engVerseFunc = engChap?.verses?.find((vv) => Number(vv.verse) === v);
      if (!engVerseFunc) {
        toast.error(`Verse ${v} not found`);
        isValid = false; break;
      }

      const engText = engVerseFunc.text;
      let tamText = "";
      
      if (tamilBook) {
        if (Array.isArray(tamilBook.chapters)) {
           const c = tamilBook.chapters.find(ch => Number(ch.chapter) === parsed.chapter);
           const ve = c?.verses?.find(vv => Number(vv.verse) === v);
           if (ve) tamText = ve.text;
        } else if (tamilBook[parsed.chapter]?.verses) {
           const ve = tamilBook[parsed.chapter].verses.find(vv => Number(vv.verse) === v);
           if (ve) tamText = ve.text;
        }
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
    if (e) e.stopPropagation();
    setEditingTextId(null);
  };

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

    // Fetch Tamil Content
    let tamilBook = null;
    try {
      const res = await fetch(
        `./bible/tamil/${encodeURIComponent(bookName)}.json`
      );
      if (res.ok) {
        const data = await res.json();
        // Validate data matches bookName to prevent "Genesis default" bug
        const loadedName = data?.book?.english;
        if (loadedName && loadedName.toLowerCase() === bookName.toLowerCase()) {
          tamilBook = data;
        } else {
          console.warn(
            `Tamil content mismatch: Requested '${bookName}' but got '${loadedName}'`
          );
          // If mismatch, try fetching without encoding or exact match?
          // Validating prevents showing wrong text.
        }
      }
    } catch (e) {
      console.error("Tamil fetch failed", e);
    }

    const versesPayload = [];
    // Validation Flag
    let isValid = true;

    for (const v of versesToFetch) {
      // Get English (from prop) to validate existence
      const engBook = bibleData?.books?.find((b) => b.name === bookName);
      // We already checked bookName, but double check
      if (!engBook) {
        isValid = false;
        break;
      }

      const engChap = engBook?.chapters?.find(
        (c) => Number(c.chapter) === parsed.chapter
      );
      if (!engChap) {
        toast.error(`Chapter ${parsed.chapter} not found in ${bookName}`);
        isValid = false;
        break;
      }

      const engVerseFunc = engChap?.verses?.find((vv) => Number(vv.verse) === v);
      if (!engVerseFunc) {
        toast.error(`Verse ${v} not found in ${bookName} ${parsed.chapter}`);
        isValid = false;
        break;
      }

      const engText = engVerseFunc.text;

      // Get Tamil
      let tamText = "";
      if (tamilBook) {
        if (Array.isArray(tamilBook.chapters)) {
          const c = tamilBook.chapters.find(
            (ch) => Number(ch.chapter) === parsed.chapter
          );
          const ve = c?.verses?.find((vv) => Number(vv.verse) === v);
          if (ve) tamText = ve.text;
        } else if (tamilBook[parsed.chapter] && tamilBook[parsed.chapter].verses) {
          const ve = tamilBook[parsed.chapter].verses.find(
            (vv) => Number(vv.verse) === v
          );
          if (ve) tamText = ve.text;
        }
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

  const applyStyle = (command) => {
    document.execCommand(command, false, null);
    // Keep focus
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
        tamilContentRef={tamilContentRef}
        englishContentRef={englishContentRef}
        handleItemClick={handleItemClick}
        handlePresent={handlePresent}
        itemRefs={itemRefs}
      />
    </div>
  );
});

export default Prelist;