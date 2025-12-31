import React, { useRef, useEffect, useState } from "react";
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
    findBookName,
    showInputError,
  } = useSearch({
    getBibleSource: () => kjvData || englishBible,
    setSelectedBook,
    setSelectedChapter,
    setSelectedVerse,
    sendToPresentation,
    loadTamilForBook,
    selectedBook,
  });

  // Refs used for scroll-to-selected behavior (kept same names)
  const bookScrollRef = useRef(null);
  const chapterScrollRef = useRef(null);
  const verseScrollRef = useRef(null);
  const recentScrollRef = useRef(null);
  const verseTableRef = useRef(null);

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
  useEffect(() => {
    const onNext = () => {
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
    };

    const onPrev = () => {
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
    };

    // register handlers from preload-exposed api
    const cleanupNext = window.api?.onNavigateNext?.(onNext);
    const cleanupPrev = window.api?.onNavigatePrev?.(onPrev);

    // cleanup function to remove listeners
    return () => {
      cleanupNext?.();
      cleanupPrev?.();
    };
  }, [
    selectedBook,
    selectedChapter,
    selectedVerse,
    verseCountForSelectedChapter,
    sendToPresentation,
    settings,
  ]);
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
        openBlankPresentation={openBlankPresentation}
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
                width: "22%",
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
                <input
                  placeholder="Reference 1 Sam 3:16"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                    if (e.key === "Enter") handleSearch();
                  }}
                  style={{
                    width: "70%",
                    padding: "10px",
                    borderRadius: "6px",
                    transition:
                      "background 0.25s ease-in-out, color 0.25s ease-in-out, border-color 0.25s ease-in-out",
                    background: theme === "dark" ? "#0f0e0eff" : "#fff",
                    color: theme === "dark" ? "white" : "#000",
                    border:
                      theme === "dark" ? "1px solid #555" : "1px solid #999",
                  }}
                />
                {/* Prev / Next buttons kept same */}
                <button
                  title="Previous Verse"
                  onClick={() => window.electron.prev?.()}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    fontSize: "14px",
                    background: theme === "dark" ? "#0f0e0eff" : "#eee",
                    color: theme === "dark" ? "white" : "black",
                    border:
                      theme === "dark" ? "1px solid #555" : "1px solid #999",
                    cursor: "pointer",
                  }}
                >
                  🡨
                </button>

                <button
                  title="Next Verse"
                  onClick={() => window.electron.next?.()}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    fontSize: "14px",
                    background: theme === "dark" ? "#0f0e0eff" : "#eee",
                    color: theme === "dark" ? "white" : "black",
                    border:
                      theme === "dark" ? "1px solid #555" : "1px solid #999",
                    cursor: "pointer",
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
                    setSelectedVerse(v);
                    sendToPresentation({
                      selectedBook,
                      selectedChapter,
                      selectedVerse: v,
                      settings,
                    });
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
                  recent={[]}
                  onSelect={(ref) => {
                    const parsed = parseReference(ref);
                    if (!parsed) return;
                    const bookName = findBookName(parsed.book);
                    if (!bookName) return;

                    // 1. Update Local State
                    setSelectedBook(bookName);
                    setSelectedChapter(parsed.chapter);
                    setSelectedVerse(parsed.verse);

                    sendToPresentation({
                      selectedBook: bookName, // Pass the new variable directly
                      selectedChapter: parsed.chapter, // Pass the new variable directly
                      selectedVerse: parsed.verse, // Pass the new variable directly
                      settings,
                    });
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
                  setSelectedVerse={setSelectedVerse}
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
