// src/hooks/useSearch.js
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function useSearch({
  getBibleSource,
  setSelectedBook,
  setSelectedChapter,
  setSelectedVerse,

  sendToPresentation: sendVerse,
  loadTamilForBook, // New prop
  selectedBook,     // New prop
  addToRecent,      // New prop: callback to add to recent list
}) {
  const [search, setSearch] = useState("");

  function error(msg) {
    toast.error(msg, { duration: 3500 });
  }

  // small map of common short abbreviations -> canonical book name (lowercase keys)
  // Add more if you use other abbreviations
  const commonAbbr = {
<<<<<<< HEAD
    pp: "Philippians",
    phil: "Philemon",
    jd: "Jude",
=======
>>>>>>> df6ff92576ed2d760c32421564f8a0b07e8e9d22
    jn: "John",
    mt: "Matthew",
    mk: "Mark",
    lk: "Luke",
    ps: "Psalms",
    "1cor": "1 Corinthians",
    "2cor": "2 Corinthians",
    "1chr": "1 Chronicles",
    "2chr": "2 Chronicles",
    "1pt": "1 Peter",
    "2pt": "2 Peter",
    "1jn": "1 John",
    "2jn": "2 John",
    "3jn": "3 John",
    // you can extend this map as you like
  };

  // ---------- helpers ----------
  function cleanBookName(str) {
    return String(str || "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ""); // remove spaces/punctuation for matching
  }

  function getNormalizedBooks() {
    const src = getBibleSource();
    if (!src || !src.books) return [];
    return src.books.map((b) => ({
      name: b.name,
      clean: cleanBookName(b.name),
    }));
  }

  // ---------- smarter book finder ----------
  function findBook(input) {
    if (!input) return null;
    const raw = String(input).trim().toLowerCase();

    // try common abbreviation map first (exact)
    const key = raw.replace(/[^a-z0-9]/g, "");
    if (commonAbbr[key]) return commonAbbr[key];

    // normalized list from source
    const books = getNormalizedBooks();
    if (!books.length) return null;

    const cleaned = cleanBookName(raw);

    // exact match
    const exact = books.find((b) => b.clean === cleaned);
    if (exact) return exact.name;

    // if cleaned length < 2, bail
    if (cleaned.length < 2) return null;

    // starts-with (abbrev) — prefer the one with shortest match to reduce false positives
    const starts = books.filter((b) => b.clean.startsWith(cleaned));
    if (starts.length === 1) return starts[0].name;
    if (starts.length > 1) {
      // if multiple matches, try to prefer full-word match (e.g., "song" -> Song of Songs)
      const fullWord = starts.find((s) => s.clean === cleaned);
      if (fullWord) return fullWord.name;
      // otherwise ambiguous -> return first reasonable candidate
      return starts[0].name;
    }

    // numbered books like "1sam", "2king" where cleaned starts with digit
    const numMatch = cleaned.match(/^([1-3])(.+)$/);
    if (numMatch) {
      const num = numMatch[1];
      const rest = cleanBookName(numMatch[2]);
      const candidate = books.find((b) => b.clean === num + rest);
      if (candidate) return candidate.name;
      // fallback: match books where clean endsWith rest and starts with num
      const fallback = books.find(
        (b) => b.clean.startsWith(num) && b.clean.includes(rest)
      );
      if (fallback) return fallback.name;
    }

    // last resort: substring match (but only if not too short)
    const substr = books.find(
      (b) => b.clean.includes(cleaned) && cleaned.length >= 3
    );
    if (substr) return substr.name;

    return null;
  }

  // ---------- robust parser ----------
  function parseReference(input) {
    if (!input || !String(input).trim()) return null;
    let t = String(input).trim().toLowerCase();

    // normalize multiple spaces and some punctuation
    t = t
      .replace(/[^\w\s:]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Try explicit patterns in order (covers gen3 16, gen3:16, gen 3 16, gen 3:16, gen316, 1sam34, etc.)

    // 1) Numbered book with colon: "1sam3:4" or "1 sam 3:4" or "1sam 3:4"
    let m = t.match(/^([1-3])\s*([a-z]+)\s*(\d+)\s*:\s*(\d+)$/i);
    if (m)
      return {
        rawBook: `${m[1]}${m[2]}`,
        chapter: Number(m[3]),
        verse: Number(m[4]),
      };

    // 2) Numbered book with space separated numbers: "1sam 3 4" or "1 sam 3 4" or "1sam34" (handled later)
    m = t.match(/^([1-3])\s*([a-z]+)\s+(\d+)\s+(\d+)$/i);
    if (m)
      return {
        rawBook: `${m[1]}${m[2]}`,
        chapter: Number(m[3]),
        verse: Number(m[4]),
      };

    // 3) Numbered book with contiguous chapter and verse but space between chapter and verse: "1sam3 4" or "1sam34"
    m = t.match(/^([1-3])\s*([a-z]+)\s*(\d+)\s+(\d+)$/i);
    if (m)
      return {
        rawBook: `${m[1]}${m[2]}`,
        chapter: Number(m[3]),
        verse: Number(m[4]),
      };

    // 4) Simple book chapter:verse (allows no space between book and chapter e.g. "gen3:16" or "gen 3:16" or "jn3:16")
    m = t.match(/^([a-z]+)\s*(\d+)\s*:\s*(\d+)$/i);
    if (m) return { rawBook: m[1], chapter: Number(m[2]), verse: Number(m[3]) };

    // 5) One-word book with two numbers contiguous or spaced "gen3 16" or "gen316" or "gen 3 16"
    m = t.match(/^([a-z]+)\s+(\d+)\s+(\d+)$/i);
    if (m) return { rawBook: m[1], chapter: Number(m[2]), verse: Number(m[3]) };

    // 6) Compact book+numbers like gen316 or jn316 or 1sam34
    m = t.match(/^([1-3]?[a-z]+)(\d{1,})$/i);
    if (m) {
      const bookPart = m[1]; // e.g., "gen" or "1sam"
      const nums = m[2]; // e.g., "316" or "34"
      if (nums.length === 1) {
        // treat as chapter only
        return { rawBook: bookPart, chapter: Number(nums), verse: 1 };
      }
      if (nums.length === 2) {
        // ambiguous: treat as chapter=first digit, verse=second
        return {
          rawBook: bookPart,
          chapter: Number(nums[0]),
          verse: Number(nums.slice(1)),
        };
      }
      // general: last two digits -> verse, rest -> chapter
      const verse = Number(nums.slice(-2));
      const chapter = Number(nums.slice(0, -2));
      return { rawBook: bookPart, chapter, verse };
    }

    // X) Numbered book + single number: "3jn 4" → verse 4
    m = t.match(/^([1-3])\s*([a-z]+)\s+(\d+)$/i);
    if (m) {
      return {
        rawBook: `${m[1]}${m[2]}`,
        chapter: Number(m[3]), // temporary, will be fixed later
        verse: 1,
      };
    }

    // 7) book + chapter only: "gen 3" or "jn 3"
    m = t.match(/^([a-z]+)\s+(\d+)$/i);
    if (m) return { rawBook: m[1], chapter: Number(m[2]), verse: 1 };

    // fallback: try to extract numbers anywhere (very permissive)
    const nums = t.match(/(\d+)/g);
    if (nums && nums.length >= 1) {
      // attempt to pick last two as chapter/verse
      if (nums.length === 1) {
        // find book substring by removing that number
        const rawBook = t.replace(nums[0], "").trim();
        return { rawBook, chapter: Number(nums[0]), verse: 1 };
      }
      const verse = Number(nums.pop());
      const chapter = Number(nums.pop());
      const rawBook = t.replace(/\d/g, "").trim();
      return { rawBook, chapter, verse };
    }

    return null;
  }

  // ---------- main handler ----------
  async function handleSearch(customSuccessAction = null) {
    const parsed = parseReference(search);
    if (!parsed)
      return error("Invalid format — try: Genesis 1:1 or Gen3 16 or 1sam3 4");

    const bookName = findBook(parsed.rawBook);
    if (!bookName) return error("Unknown book name.");

    const src = getBibleSource();
    if (!src || !src.books) return error("English Bible data not loaded yet.");

    const bookObj = src.books.find((b) => b.name === bookName);
    if (!bookObj) return error("Book data not loaded yet.");

    // ✅ SINGLE-CHAPTER BOOK FIX
    if (bookObj.chapters.length === 1) {
      // "3jn 1" → verse 1 (not chapter 1)
      parsed.verse = parsed.chapter;
      parsed.chapter = 1;
    }

    const maxCh = Math.max(...bookObj.chapters.map((c) => Number(c.chapter)));
    if (parsed.chapter < 1 || parsed.chapter > maxCh)
      return error("Invalid chapter number.");

    const chObj = bookObj.chapters.find(
      (c) => Number(c.chapter) === Number(parsed.chapter)
    );
    if (!chObj) return error("Chapter data not found.");

    const maxVs = Math.max(...(chObj.verses || []).map((v) => Number(v.verse)));
    if (parsed.verse < 1 || parsed.verse > maxVs)
      return error("Invalid verse number.");

    // If a custom action is provided (e.g. adding to queue), run it and skip default navigation
    if (typeof customSuccessAction === "function") {
      customSuccessAction(bookName, parsed.chapter, parsed.verse);
      setSearch(""); // Explicitly clear search on queue add unique behavior
      return;
    }

    setSelectedBook(bookName);
    setSelectedChapter(parsed.chapter);
    setSelectedVerse(parsed.verse);

    // If book changed, we must wait for data to load before sending to presentation
    let tamilDataOverride = null;
    if (bookName !== selectedBook && loadTamilForBook) {
      try {
        tamilDataOverride = await loadTamilForBook(bookName);
      } catch (err) {
        console.error("Failed to preload tamil data for search:", err);
      }
    }

    sendVerse({
      selectedBook: bookName,
      selectedChapter: parsed.chapter,
      selectedVerse: parsed.verse,
      tamilDataOverride,
    });

    // Add to recent list on success
    if (addToRecent) {
      addToRecent(bookName, parsed.chapter, parsed.verse);
    }
  }

  return {
    search,
    setSearch,
    handleSearch,
    parseReference,
    findBook,
  };
}
