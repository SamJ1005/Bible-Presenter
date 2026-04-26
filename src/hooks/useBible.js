import { useState, useCallback } from "react";

/** Convert nkjv.json { Book:[{Chapter:[{Verse:[{Verseid,Verse}]}]}] }
 *  into the same { books:[{name,chapters:[{chapter,verses:[{verse,text}]}]}] }
 *  shape that kjv.json uses, so the rest of the app only deals with one format.
 */
function normalizeNKJV(nkjvRaw, bookNames) {
  return {
    books: nkjvRaw.Book.map((book, bi) => ({
      name: bookNames[bi] || `Book ${bi + 1}`,
      chapters: book.Chapter.map((ch, ci) => ({
        chapter: ci + 1,
        verses: ch.Verse.map((v, vi) => ({
          verse: vi + 1,
          text: v.Verse,
        })),
      })),
    })),
  };
}

export default function useBible() {
  const [nkjvData, setNkjvData] = useState(null);      // Primary normalized English Bible (NKJV)
  const [englishBible, setEnglishBible] = useState(null); // Keep for backwards compat
  const [tamilBookData, setTamilBookData] = useState(null);

  const [booksList, setBooksList] = useState([]);
  const [selectedBook, setSelectedBook] = useState("Genesis");
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState(1);

  const [versesLoading, setVersesLoading] = useState(false);
  const [versesError, setVersesError] = useState("");

  const loadInitialKJV = useCallback(async () => {
    try {
      // 1. Load KJV purely to get canonical book names (Genesis, Exodus, etc.)
      const kjvRes = await fetch("./bible/kjv.json");
      if (!kjvRes.ok) throw new Error("Failed to fetch KJV");
      const kjvRaw = await kjvRes.json();
      const bookNames = (kjvRaw.books || []).map((b) => b.name);

      // 2. Load & Normalize NKJV as the primary source for the app
      let primaryData = null;
      try {
        const nkjvRes = await fetch("./bible/nkjv.json");
        if (nkjvRes.ok) {
          const nkjvRaw = await nkjvRes.json();
          if (nkjvRaw.Book && Array.isArray(nkjvRaw.Book)) {
            primaryData = normalizeNKJV(nkjvRaw, bookNames);
          }
        }
      } catch (e) {
        console.warn("NKJV load failed, falling back to KJV names:", e);
      }

      // 3. Fallback to KJV only if NKJV is missing
      if (!primaryData) primaryData = kjvRaw;

      // 4. Update states
      setNkjvData(primaryData);
      setEnglishBible(primaryData);

      const books = (primaryData.books || []).map((b) => b.name);
      setBooksList((prev) => (prev.length ? prev : books));
      if (!books.includes(selectedBook)) {
        setSelectedBook(books[0] || "");
        setSelectedChapter(1);
        setSelectedVerse(1);
      }
    } catch (err) {
      console.error("Error loading Bible:", err);
      setVersesError("Failed to load NKJV Bible.");
    }
  }, [selectedBook]);

  async function loadTamilForBook(bookName) {
    if (!bookName) { setTamilBookData(null); return; }
    if (tamilBookData && tamilBookData.type === "xml_bsi") return tamilBookData;

    setVersesLoading(true);
    setVersesError("");
    try {
      const r = await fetch("./bible/tamil_bsi.xml");
      if (!r.ok) throw new Error("Tamil XML file not found");
      const text = await r.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const data = { type: "xml_bsi", xmlDoc };
      setTamilBookData(data);
      setVersesLoading(false);
      return data;
    } catch (err) {
      console.warn(err);
      setTamilBookData(null);
      setVersesError("Tamil file not available");
      setVersesLoading(false);
    }
  }

  /** Unified verse lookup — strictly refers to normalized English Bible */
  function getEnglishVerse(bookName, chapterNum, verseNum) {
    const src = nkjvData || englishBible;
    if (!src || !src.books) return "";
    
    // Find book by name (case insensitive)
    const book = src.books.find((b) => b.name.toLowerCase() === bookName.toLowerCase());
    if (!book) return "";
    
    // Find chapter (prioritize exact match)
    let ch = book.chapters.find((c) => Number(c.chapter) === Number(chapterNum));
    if (!ch) {
      // Fallback: handle potential 0-based storage
      ch = book.chapters.find((c) => Number(c.chapter) === Number(chapterNum) - 1);
    }
    if (!ch) return "";
    
    // Find verse (prioritize exact match)
    let v = ch.verses.find((vv) => Number(vv.verse) === Number(verseNum));
    if (!v) {
      // Fallback: handle potential 0-based storage
      v = ch.verses.find((vv) => Number(vv.verse) === Number(verseNum) - 1);
    }
    return v ? (v.text || v.Verse || "") : "";
  }

  function getTamilVerse(bookName, chapterNum, verseNum, dataOverride = null) {
    const data = dataOverride || tamilBookData;
    if (!data) return "";

    // XML BSI (Zefania)
    if (data.type === "xml_bsi" && data.xmlDoc) {
      const bookIndex = booksList.indexOf(bookName) + 1;
      // Try both bnumber and number attributes
      const bookNode = data.xmlDoc.querySelector(`BIBLEBOOK[bnumber="${bookIndex}"], BIBLEBOOK[number="${bookIndex}"]`);
      if (bookNode) {
        const chapterNode = bookNode.querySelector(`CHAPTER[cnumber="${chapterNum}"], CHAPTER[number="${chapterNum}"]`);
        if (chapterNode) {
          const verseNode = chapterNode.querySelector(`VERS[vnumber="${verseNum}"], VERS[number="${verseNum}"], VERSE[number="${verseNum}"]`);
          if (verseNode) return verseNode.textContent;
        }
      }
      return "";
    }

    // JSON formats (detect structure)
    if (data.books) {
      // Standard normalized shape
      const book = data.books.find(b => b.name.toLowerCase() === bookName.toLowerCase());
      if (!book) return "";
      const ch = book.chapters.find(c => Number(c.chapter) === Number(chapterNum));
      if (!ch) return "";
      const v = ch.verses.find(vv => Number(vv.verse) === Number(verseNum));
      return v ? (v.text || v.Verse || "") : "";
    }

    if (data.verses && Array.isArray(data.verses)) {
      // Flat verses array format
      const bookIndex = booksList.indexOf(bookName) + 1;
      const v = data.verses.find(
        (vv) =>
          (Number(vv.book) === bookIndex || Number(vv.b) === bookIndex) &&
          (Number(vv.chapter) === Number(chapterNum) || Number(vv.c) === Number(chapterNum)) &&
          (Number(vv.verse) === Number(verseNum) || Number(vv.v) === Number(verseNum))
      );
      return v ? (v.text || v.Verse || "") : "";
    }

    return "";
  }

  function chapterCountForSelectedBook() {
    const src = nkjvData || englishBible;
    if (!src || !selectedBook) return 0;
    const book = (src.books || []).find((b) => b.name === selectedBook);
    return book ? book.chapters.length : 0;
  }

  function verseCountForSelectedChapter() {
    const src = nkjvData || englishBible;
    if (!src || !selectedBook || !selectedChapter) return 0;
    const book = (src.books || []).find((b) => b.name === selectedBook);
    if (!book) return 0;
    const ch = book.chapters.find((c) => Number(c.chapter) === Number(selectedChapter));
    return ch ? ch.verses.length : 0;
  }

  return {
    nkjvData,
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
