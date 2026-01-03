import React, { useRef, useEffect, useState, useCallback } from "react";
import { Toaster } from "react-hot-toast";
import { saveMemory, loadMemory } from "./hooks/useLocalMemory";
import "./index.css";
import Settings from "./components/Settings"; // existing
import Header from "./components/Header"; // if you have Header.jsx under components

import useTheme from "./hooks/useTheme";
import useBible from "./hooks/useBible";
import usePresentation from "./hooks/usePresentation";
import useNavigation from "./hooks/useNavigation";
import useSearch from "./hooks/useSearch";

import BookList from "./components/BookList";
import ChapterList from "./components/ChapterList";
import VerseList from "./components/VerseList";
import RecentList from "./components/RecentList";
import ChapterTable from "./components/ChapterTable";

export default function App() {
  const [settings, setSettings] = useState(() =>
    loadMemory("settings", {
      presentationBgType: "solid",
      presentationSolidColor: "#000000",
      presentationBgImage: null,
      tamilFontSize: 60,
      englishFontSize: 60,
      isTamilEnabled: true,
      isEnglishEnabled: true,
    })
  );

  useEffect(() => {
    saveMemory("settings", settings);
  }, [settings]);

  // ---- theme + UI state
  const { theme, toggleTheme, applyThemeGlobals, scrollbarStyle } = useTheme();
  const [activeTab, setActiveTab] = useState("bible");
  const [isBlankMode, setIsBlankMode] = useState(false); // Track if presentation is in blank mode
  const [recent, setRecent] = useState([]); // Session-only recent list

  const addToRecent = useCallback((book, chapter, verse) => {
    setRecent((prev) => {
      const ref = `${book} ${chapter}:${verse}`;
      // Remove existing duplication (move to top)
      const filtered = prev.filter((r) => r !== ref);
      return [ref, ...filtered].slice(0, 20);
    });
  }, []);

  // ---- bible data + selection state + loaders
  const {
    kjvData,
    englishBible,
    tamilBookData,
    booksList,
    selectedBook,
    setSelectedBook,
    selectedChapter,
    setSelectedChapter,
    selectedVerse,
    setSelectedVerse,
    getEnglishVerse,
    getTamilVerse,
    chapterCountForSelectedBook,
    verseCountForSelectedChapter,
    versesLoading,
    versesError,
    loadInitialKJV, // called on mount
    loadTamilForBook,
  } = useBible();

  // ---- presentation (IPC) helpers
  const { sendToPresentation, sendPresentationPayload, openBlankPresentation } =
    usePresentation({
      getTamilVerse,
      getEnglishVerse,
    });

  // ---- navigation (arrow keys, external prev/next)
  useNavigation({
    selectedBook,
    selectedChapter,
    selectedVerse,
    setSelectedChapter,
    setSelectedVerse,
    getBibleSource: () => kjvData || englishBible,
  });

  // ---- search helpers
  const {
    search,
    setSearch,
    handleSearch,
    parseReference,
    findBook, // from useSearch
    showInputError,
  } = useSearch({
    getBibleSource: () => kjvData || englishBible,
    setSelectedBook,
    setSelectedChapter,
    setSelectedVerse,
    sendToPresentation,
    loadTamilForBook,
    selectedBook,
    addToRecent, // pass callback
  });

  // Refs used for scroll-to-selected behavior (kept same names)
  const bookScrollRef = useRef(null);
  const chapterScrollRef = useRef(null);
  const verseScrollRef = useRef(null);
  const recentScrollRef = useRef(null);
  const verseTableRef = useRef(null);
  const searchInputRef = useRef(null); // Ref for search input to maintain focus

  // load initial data on mount (same behaviour)
  useEffect(() => {
    loadInitialKJV();
    applyThemeGlobals(); // apply initial theme CSS etc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (selectedBook) {
      loadTamilForBook(selectedBook);
    }
  }, [selectedBook]);

  // smoothing scroll handlers are still inside App (they use refs)
  function smoothScrollToSelected(ref, selector) {
    if (!ref.current) return;
    const container = ref.current;
    const target = container.querySelector(selector);
    if (!target) return;

    container.scrollTo({
      top:
        target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    smoothScrollToSelected(bookScrollRef, `.book-item.selected`);
  }, [selectedBook]);

  useEffect(() => {
    smoothScrollToSelected(chapterScrollRef, `.chapter-item.selected`);
  }, [selectedChapter]);

  useEffect(() => {
    smoothScrollToSelected(verseScrollRef, `.verse-item.selected`);
  }, [selectedVerse]);

  useEffect(() => {
    if (!verseTableRef.current) return;

    // verseTableRef is on the scrollable container div, find the table inside it
    const table = verseTableRef.current.querySelector('table');
    if (!table) return;

    const row = table.querySelector(`tr[data-vn="${selectedVerse}"]`);
    if (!row) return;

    // Calculate scroll position relative to the container
    const container = verseTableRef.current;
    const rowTop = row.offsetTop;
    const containerHeight = container.clientHeight;
    const scrollPosition = rowTop - containerHeight / 3;

    container.scrollTo({
      top: Math.max(0, scrollPosition),
      behavior: "smooth",
    });
  }, [selectedBook, selectedChapter, selectedVerse]);

  // Handle blank presentation toggle
  const handleBlankPresentation = useCallback(async () => {
    setIsBlankMode(true);
    // Open presentation window first
    if (window.api.openPresentation) {
      await window.api.openPresentation();
    }
    // Send null payload after a short delay to ensure the window is ready
    setTimeout(() => {
      window.electron.sendPresentation?.(null);
    }, 150);
  }, []);

  const handleClosePresentation = useCallback(() => {
    setIsBlankMode(false);
    window.api.closePresentation?.();
  }, []);

  // Navigation handlers as callbacks so they can be reused by buttons and IPC
  const handleNext = useCallback(() => {
    // Don't navigate if in blank mode
    if (isBlankMode) return;

    const versesInChapter = verseCountForSelectedChapter();
    let next = Number(selectedVerse) + 1;
    if (next > versesInChapter) next = 1;
    setSelectedVerse(next);
    sendToPresentation({
      selectedBook,
      selectedChapter,
      selectedVerse: next,
      settings,
    });
  }, [
    isBlankMode,
    selectedBook,
    selectedChapter,
    selectedVerse,
    verseCountForSelectedChapter,
    sendToPresentation,
    settings,
  ]);

  const handlePrev = useCallback(() => {
    // Don't navigate if in blank mode
    if (isBlankMode) return;

    const versesInChapter = verseCountForSelectedChapter();
    let prev = Number(selectedVerse) - 1;
    if (prev < 1) prev = versesInChapter || 1;
    setSelectedVerse(prev);
    sendToPresentation({
      selectedBook,
      selectedChapter,
      selectedVerse: prev,
      settings,
    });
  }, [
    isBlankMode,
    selectedBook,
    selectedChapter,
    selectedVerse,
    verseCountForSelectedChapter,
    sendToPresentation,
    settings,
  ]);

  // Wrapped handleSearch to maintain focus
  const handleSearchWithFocus = useCallback(() => {
    handleSearch();
    setIsBlankMode(false); // Exit blank mode when searching
    // Keep focus on search input after search
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [handleSearch]);

  // Register IPC listeners for keyboard shortcuts
  useEffect(() => {
    const cleanupNext = window.api?.onNavigateNext?.(handleNext);
    const cleanupPrev = window.api?.onNavigatePrev?.(handlePrev);

    return () => {
      cleanupNext?.();
      cleanupPrev?.();
    };
  }, [handleNext, handlePrev]);
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "arial rounded mt",
      }}
    >
      <Toaster position="top-right" />
      {/* HEADER BAR */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openBlankPresentation={handleBlankPresentation}
        closePresentation={handleClosePresentation}
      />

      {/* MAIN CONTENT */}
      {activeTab === "bible" && (
        <div
          style={{
            display: "flex",
            gap: "20px",
            width: "100%",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* MAIN LAYOUT: Sidebar + content */}
          <div
            style={{
              display: "flex",
              gap: "20px",
              width: "100%",
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Left Sidebar */}
            <div
              style={{
                width: "24%",
                minWidth: "280px",
                maxWidth: "420px",
                background: theme === "dark" ? "#0f0e0eff" : "#fff",
                color: theme === "dark" ? "white" : "black",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                overflow: "hidden",
                boxSizing: "border-box",
                borderRight:
                  theme === "dark" ? "1px solid #555" : "1px solid #999",
              }}
            >
              {/* Search input + previous/next buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  alignItems: "center",
                  width: "100%",
                }}
              >
                {/* Search bar with icon */}
                {/* Search bar container with focus styling */}
                <div
                  style={{
                    width: "65%",
                    display: "flex",
                    alignItems: "center",
                    padding: "10px 12px",
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
                    placeholder="Reference 1Chr 3 2"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    // Remove default outline to avoid double focus visual
                    onKeyDown={(e) => {
                      if (
                        [
                          "ArrowUp",
                          "ArrowDown",
                          "ArrowLeft",
                          "ArrowRight",
                        ].includes(e.key)
                      ) {
                        e.stopPropagation();
                      }
                      if (e.key === "Enter") handleSearchWithFocus();
                    }}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: theme === "dark" ? "white" : "#000",
                      fontSize: "14px",
                      fontFamily: "inherit",
                    }}
                  />
                  {/* Search Icon Button */}
                  <span title="Search Verse" style={{ display: "flex", alignItems: "center" }}>
                    <svg
                      onClick={handleSearchWithFocus}
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
                  title="Previous Verse"
                  onClick={handlePrev}
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
                    border:
                      theme === "dark" ? "1px solid #555" : "1px solid #999",
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
                  title="Next Verse"
                  onClick={handleNext}
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
                    border:
                      theme === "dark" ? "1px solid #555" : "1px solid #999",
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

              {/* Books / Chapters / Verses lists */}
              <div
                style={{ display: "flex", gap: "10px", flex: 1, minHeight: 0 }}
              >
                <BookList
                  booksList={booksList}
                  selectedBook={selectedBook}
                  setSelectedBook={(b) => {
                    setIsBlankMode(false); // Exit blank mode
                    setSelectedBook(b);
                    setSelectedChapter(1);
                    setSelectedVerse(1);
                  }}
                  bookScrollRef={bookScrollRef}
                  theme={theme}
                />

                <ChapterList
                  count={chapterCountForSelectedBook()}
                  selectedChapter={selectedChapter}
                  setSelectedChapter={(c) => {
                    setIsBlankMode(false); // Exit blank mode
                    setSelectedChapter(c);
                    setSelectedVerse(1);
                  }}
                  chapterScrollRef={chapterScrollRef}
                  theme={theme}
                />

                <VerseList
                  count={verseCountForSelectedChapter()}
                  selectedVerse={selectedVerse}
                  setSelectedVerse={(v) => {
                    setIsBlankMode(false); // Exit blank mode when selecting a verse
                    setSelectedVerse(v);
                    addToRecent(selectedBook, selectedChapter, v);
                  }}
                  verseScrollRef={verseScrollRef}
                  theme={theme}
                  selectedBook={selectedBook}
                  selectedChapter={selectedChapter}
                  sendToPresentation={sendToPresentation}
                  settings={settings}
                />
              </div>

              {/* Recent list */}
              <div style={{ marginTop: 20 }}>
                <RecentList
                  recent={recent}
                  onSelect={(ref) => {
                    setIsBlankMode(false); // Exit blank mode
                    const parsed = parseReference(ref);
                    if (!parsed) return;
                    const bookName = findBook(parsed.rawBook || parsed.book); // Try both
                    if (!bookName) return;

                    // 1. Update Local State (Scroll to verify) but DO NOT SEND to presentation
                    setSelectedBook(bookName);
                    setSelectedChapter(parsed.chapter);
                    setSelectedVerse(parsed.verse);
                    // No sendToPresentation()
                  }}
                  recentScrollRef={recentScrollRef}
                  theme={theme}
                />
              </div>
            </div>

            {/* Main table area (chapter table) */}
            <div style={{ flex: 1, padding: "5px" }}>
              <div
                ref={verseTableRef}
                style={{
                  height: "calc(100vh - 100px)",
                  overflowY: "auto",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: "12px",
                }}
              >
                <ChapterTable
                  kjvSource={kjvData || englishBible}
                  tamilBookData={tamilBookData}
                  selectedBook={selectedBook}
                  selectedChapter={selectedChapter}
                  selectedVerse={selectedVerse}
                  setSelectedVerse={(v) => {
                    setIsBlankMode(false); // Exit blank mode
                    setSelectedVerse(v);
                    addToRecent(selectedBook, selectedChapter, v);
                  }}
                  theme={theme}
                  sendToPresentation={sendToPresentation}
                  verseTableRef={verseTableRef}
                  settings={settings}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div style={{ background: theme === "dark" ? "#0f0e0eff" : "#fff" }}>
          <Settings settings={settings} setSettings={setSettings} />
        </div>
      )}

      {activeTab === "prelisted" && (
        <div
          style={{
            padding: "20px",
            fontSize: "22px",
            color: theme === "dark" ? "white" : "black",
          }}
        >
          Pre-Listed items coming soon…
        </div>
      )}
    </div>
  );
}
