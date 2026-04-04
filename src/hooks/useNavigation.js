import { useEffect, useRef } from "react";

export default function useNavigation({
  selectedBook,
  selectedChapter,
  selectedVerse,
  setSelectedChapter,
  setSelectedVerse,
  getBibleSource,
  activeTab,
  onNext,
  onPrev,
}) {
  // Store latest callbacks in refs so the keyboard handler never has a stale closure
  const onNextRef = useRef(onNext);
  const onPrevRef = useRef(onPrev);
  useEffect(() => { onNextRef.current = onNext; }, [onNext]);
  useEffect(() => { onPrevRef.current = onPrev; }, [onPrev]);

  // --------- LOCAL KEYBOARD HANDLING (Keep this) ----------
  useEffect(() => {
    function handleArrowKeys(e) {
      if (activeTab !== "bible") return; // Only run in Bible tab
      
      const tag = document.activeElement?.tagName;
      const isCE = document.activeElement?.contentEditable === "true";
      if (tag === "INPUT" || tag === "TEXTAREA" || isCE) {
        if (e.key === "Escape") document.activeElement.blur();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        onPrevRef.current ? onPrevRef.current() : goPrev();
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        onNextRef.current ? onNextRef.current() : goNext();
      }
      if (e.key === "Escape") {
        window.api?.closePresentation?.();
      }
    }

    function goPrev() {
      const src = getBibleSource();
      if (!src) return;

      const book = src.books.find((b) => b.name === selectedBook);
      if (!book) return;

      const chIndex = book.chapters.findIndex((c) => +c.chapter === +selectedChapter);
      
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
  }, [selectedBook, selectedChapter, selectedVerse, activeTab]); // onNext/onPrev accessed via ref — no stale closure
}