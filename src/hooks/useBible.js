import { useState, useCallback } from "react";

export default function useBible() {
  const [kjvData, setKjvData] = useState(null);
  const [englishBible, setEnglishBible] = useState(null);
  const [tamilBookData, setTamilBookData] = useState(null);

  const [booksList, setBooksList] = useState([]);
  const [selectedBook, setSelectedBook] = useState("Genesis");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState(1);

  const [versesLoading, setVersesLoading] = useState(false);
  const [versesError, setVersesError] = useState("");

  const loadInitialKJV = useCallback(async () => {
    try {
      const res = await fetch("./bible/kjv.json");
      if (!res.ok) throw new Error("Failed to fetch KJV");
      const data = await res.json();
      setKjvData((prev) => prev || data);
      setEnglishBible((prev) => prev || data);
      const books = (data.books || []).map((b) => b.name);
      setBooksList((prev) => (prev.length ? prev : books));
      if (!books.includes(selectedBook)) {
        setSelectedBook(books[0] || "");
        setSelectedChapter(1);
        setSelectedVerse(1);
      }
    } catch (err) {
      console.error("Error loading KJV JSON:", err);
      setVersesError("Failed to load English Bible (KJV).");
    }
  }, [selectedBook]);

  // load tamil book when selectedBook changes
  async function loadTamilForBook(bookName) {
    if (!bookName) {
      setTamilBookData(null);
      return;
    }
    setVersesLoading(true);
    setVersesError("");
    const filename = encodeURIComponent(bookName) + ".json";
    try {
      const r = await fetch(`./bible/tamil/${filename}`);
      if (!r.ok) throw new Error("Tamil file not found");
      const d = await r.json();
      setTamilBookData(d);
      return d;
    } catch (err) {
      console.warn(err);
      setTamilBookData(null);
      setVersesError("Tamil file not available for " + bookName);
    }
    setVersesLoading(false);
  }

  // watch selectedBook change - minimal side effect approach: consumer should call loadTamilForBook
  // (App can call loadTamilForBook via useEffect when selectedBook changes)

  function bibleSource() {
    return kjvData || englishBible;
  }

  function getEnglishVerse(bookName, chapterNum, verseNum) {
    const src = bibleSource();
    if (!src) return "";
    const book = (src.books || []).find((b) => b.name === bookName);
    if (!book || !book.chapters) return "";
    const ch = book.chapters.find((c) => Number(c.chapter) === Number(chapterNum));
    if (!ch || !ch.verses) return "";
    const vd = ch.verses.find((v) => Number(v.verse) === Number(verseNum));
    return vd ? vd.text : "";
  }

  function getTamilVerse(chapterNum, verseNum, dataOverride = null) {
    const data = dataOverride || tamilBookData;
    if (!data) return "";
    if (Array.isArray(data.chapters)) {
      const ch = data.chapters.find(
        (c) => Number(c.chapter) === Number(chapterNum)
      );
      if (!ch) return "";
      const v = (ch.verses || []).find((vv) => Number(vv.verse) === Number(verseNum));
      return v ? v.text : "";
    }
    if (data[chapterNum] && Array.isArray(data[chapterNum].verses)) {
      const v = data[chapterNum].verses.find((vv) => Number(vv.verse) === Number(verseNum));
      return v ? v.text : "";
    }
    return "";
  }

  function chapterCountForSelectedBook() {
    const src = bibleSource();
    if (!src || !selectedBook) return 0;
    const book = src.books.find((b) => b.name === selectedBook);
    if (!book) return 0;
    return book.chapters.length;
  }

  function verseCountForSelectedChapter() {
    const src = bibleSource();
    if (!src || !selectedBook || !selectedChapter) return 0;
    const book = src.books.find((b) => b.name === selectedBook);
    if (!book) return 0;
    const ch = book.chapters.find((c) => Number(c.chapter) === Number(selectedChapter));
    return ch ? ch.verses.length : 0;
  }

  return {
    kjvData,
    englishBible,
    tamilBookData,
    setTamilBookData,
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
    loadInitialKJV,
    loadTamilForBook,
  };
}
