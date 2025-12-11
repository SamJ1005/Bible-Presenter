import { useEffect } from "react";

export default function useNavigation({
  selectedBook,
  selectedChapter,
  selectedVerse,
  setSelectedChapter,
  setSelectedVerse,
  getBibleSource,
}) {
  // --------- LOCAL KEYBOARD HANDLING ----------
  useEffect(() => {
    function handleArrowKeys(e) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }

    function goPrev() {
      const src = getBibleSource();
      if (!src) return;

      const book = src.books.find((b) => b.name === selectedBook);
      if (!book) return;

      const chIndex = book.chapters.findIndex((c) => +c.chapter === +selectedChapter);
      const chObj = book.chapters[chIndex];

      let v = selectedVerse - 1;

      if (v < 1) {
        if (chIndex > 0) {
          const prevCh = book.chapters[chIndex - 1];
          setSelectedChapter(+prevCh.chapter);
          setSelectedVerse(prevCh.verses.length || 1);
        }
      } else {
        setSelectedVerse(v);
      }
    }

    function goNext() {
      const src = getBibleSource();
      if (!src) return;

      const book = src.books.find((b) => b.name === selectedBook);
      if (!book) return;

      const chIndex = book.chapters.findIndex((c) => +c.chapter === +selectedChapter);
      const chObj = book.chapters[chIndex];

      let v = selectedVerse + 1;

      if (v > chObj.verses.length) {
        if (chIndex < book.chapters.length - 1) {
          const nextCh = book.chapters[chIndex + 1];
          setSelectedChapter(+nextCh.chapter);
          setSelectedVerse(1);
        }
      } else {
        setSelectedVerse(v);
      }
    }

    window.addEventListener("keydown", handleArrowKeys);
    return () => window.removeEventListener("keydown", handleArrowKeys);
  }, [selectedBook, selectedChapter, selectedVerse]);


  // ---------- ELECTRON PRESENTATION NAVIGATION ----------
  useEffect(() => {
    if (!window.api) return;

    // use correct API
    const removeNext = window.api.onNavigateNext(() => {
      const evt = new KeyboardEvent("keydown", { key: "ArrowRight" });
      window.dispatchEvent(evt);
    });

    const removePrev = window.api.onNavigatePrev(() => {
      const evt = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      window.dispatchEvent(evt);
    });

    return () => {
      removeNext?.();
      removePrev?.();
    };
  }, []); // <-- RUN ONLY ONCE
}
