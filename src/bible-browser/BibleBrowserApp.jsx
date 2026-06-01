import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getVersionById } from './bibleVersions';
import { useBibleBrowser } from './hooks/useBibleBrowser';
import useTheme from '../hooks/useTheme';
import { bibleBooks } from '../utils/bibleBooks';
import { bibleStructure } from '../utils/bibleChapters';
import { bibleVerses } from '../utils/bibleVerses';

import VersionSelector from './components/VersionSelector';
import SearchBar from './components/SearchBar';
import NavBar from './components/NavBar';
import BookDrawer from './components/BookDrawer';
import VerseDisplay from './components/VerseDisplay';

// ─── Persistence helpers ──────────────────────────────────────────────────────
const LS_KEY = 'bb_state';
function loadState() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch { return {}; }
}
function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

// ─── Book name fuzzy matcher (reuses book list) ───────────────────────────────
function findBookByQuery(query) {
  if (!query) return null;
  const q = query.trim().toLowerCase();

  // Exact English match
  const exact = bibleBooks.find((b) => b.english.toLowerCase() === q);
  if (exact) return exact.english;

  // Exact Tamil match
  const exactTa = bibleBooks.find((b) => b.tamil === q);
  if (exactTa) return exactTa.english;

  // Starts-with English
  const startEn = bibleBooks.find((b) => b.english.toLowerCase().startsWith(q));
  if (startEn) return startEn.english;

  // Common abbreviations
  const abbrevMap = {
    gen: 'Genesis', ex: 'Exodus', exo: 'Exodus', lev: 'Leviticus',
    num: 'Numbers', deut: 'Deuteronomy', deu: 'Deuteronomy',
    josh: 'Joshua', jos: 'Joshua', judg: 'Judges', jdg: 'Judges',
    '1sam': '1 Samuel', '2sam': '2 Samuel',
    '1kgs': '1 Kings', '2kgs': '2 Kings', '1ki': '1 Kings', '2ki': '2 Kings',
    '1chr': '1 Chronicles', '2chr': '2 Chronicles',
    ezr: 'Ezra', neh: 'Nehemiah', est: 'Esther', esth: 'Esther',
    ps: 'Psalm', psa: 'Psalm', prov: 'Proverbs', pro: 'Proverbs',
    eccl: 'Ecclesiastes', ecc: 'Ecclesiastes',
    song: 'Song of Songs', sos: 'Song of Songs',
    'song of songs': 'Song of Songs', 'songofsolomon': 'Song of Songs',
    isa: 'Isaiah', jer: 'Jeremiah', lam: 'Lamentations', ezek: 'Ezekiel', eze: 'Ezekiel',
    dan: 'Daniel', hos: 'Hosea', joel: 'Joel', amos: 'Amos',
    obad: 'Obadiah', jon: 'Jonah', mic: 'Micah',
    nah: 'Nahum', hab: 'Habakkuk', zeph: 'Zephaniah', zep: 'Zephaniah',
    hag: 'Haggai', zech: 'Zechariah', zec: 'Zechariah', mal: 'Malachi',
    matt: 'Matthew', mat: 'Matthew', mk: 'Mark', mar: 'Mark',
    lk: 'Luke', luc: 'Luke', jn: 'John', joh: 'John',
    acts: 'Acts', act: 'Acts', rom: 'Romans',
    '1cor': '1 Corinthians', '2cor': '2 Corinthians',
    gal: 'Galatians', eph: 'Ephesians', phil: 'Philippians', php: 'Philippians',
    col: 'Colossians', '1thess': '1 Thessalonians', '1th': '1 Thessalonians',
    '2thess': '2 Thessalonians', '2th': '2 Thessalonians',
    '1tim': '1 Timothy', '1ti': '1 Timothy', '2tim': '2 Timothy', '2ti': '2 Timothy',
    tit: 'Titus', philem: 'Philemon', phm: 'Philemon',
    heb: 'Hebrews', jas: 'James', jam: 'James',
    '1pet': '1 Peter', '1pe': '1 Peter', '2pet': '2 Peter', '2pe': '2 Peter',
    '1jn': '1 John', '2jn': '2 John', '3jn': '3 John',
    jude: 'Jude', rev: 'Revelation', reve: 'Revelation',
  };
  // Normalise: remove spaces around numbers like "1 cor" → "1cor"
  const normalised = q.replace(/\s+/g, '').replace(/(\d+)\s*/g, '$1');
  if (abbrevMap[normalised]) return abbrevMap[normalised];
  if (abbrevMap[q.replace(/\s+/g, '')]) return abbrevMap[q.replace(/\s+/g, '')];

  // Substring match in English names
  const sub = bibleBooks.find((b) => b.english.toLowerCase().includes(q));
  if (sub) return sub.english;

  return null;
}

// ─── Reference parser ─────────────────────────────────────────────────────────
// Parses: "John 3:16", "Psalm 23", "Gen 1 1", "1 Cor 13:4"
function parseSearchQuery(raw) {
  if (!raw) return null;
  const input = raw.trim();

  // Regex: capture book part (may start with 1/2/3 + optional space + letters)
  // Then optional chapter:verse
  const m = input.match(/^(\d?\s*[A-Za-z\u0B80-\u0BFF ]+?)\s+(\d+)(?:[:\s](\d+))?$/);
  if (!m) {
    // Maybe just a book name
    const book = findBookByQuery(input);
    if (book) return { book, chapter: 1, verse: null };
    return null;
  }

  const bookRaw = m[1].trim();
  const chapter = parseInt(m[2], 10);
  const verse = m[3] ? parseInt(m[3], 10) : null;

  const book = findBookByQuery(bookRaw);
  if (!book) return null;

  return { book, chapter, verse };
}

// ─── Mobile detection hook ────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

// ─── OT / NT split ───────────────────────────────────────────────────────────
const OT_COUNT = 39;
const allBooks = bibleBooks.map((b) => b.english);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function BibleBrowserApp() {
  const saved = useMemo(loadState, []);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  const [versionId, setVersionId] = useState(saved.versionId || 'tamil-bsi');
  const [book, setBook]         = useState(saved.book || 'John');
  const [chapter, setChapter]   = useState(saved.chapter || 1);
  const [highlightVerse, setHighlightVerse] = useState(null);

  const [bookDrawer, setBookDrawer] = useState(false);

  const version = useMemo(() => getVersionById(versionId), [versionId]);
  const { loading, error, getChapterVerses } = useBibleBrowser(version);

  // Compute verses for the current book+chapter
  const verses = useMemo(
    () => getChapterVerses(book, chapter),
    [getChapterVerses, book, chapter]
  );

  // Persist state to localStorage
  useEffect(() => {
    saveState({ versionId, book, chapter });
  }, [versionId, book, chapter]);

  // Clear highlight when changing book/chapter
  useEffect(() => {
    setHighlightVerse(null);
  }, [book, chapter, versionId]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleVersionSelect = (id) => {
    setVersionId(id);
    setHighlightVerse(null);
  };

  const handleBookSelect = (b, ch = 1) => {
    setBook(b);
    setChapter(ch);
    setHighlightVerse(null);
  };

  const handleChapterSelect = (ch) => {
    setChapter(ch);
    setHighlightVerse(null);
  };

  const handlePrev = () => {
    if (chapter > 1) {
      setChapter((c) => c - 1);
    } else {
      // Go to previous book, last chapter
      const idx = allBooks.indexOf(book);
      if (idx > 0) {
        const prevBook = allBooks[idx - 1];
        const prevTotal = bibleStructure[prevBook] || 1;
        setBook(prevBook);
        setChapter(prevTotal);
      }
    }
  };

  const handleNext = () => {
    const total = bibleStructure[book] || 1;
    if (chapter < total) {
      setChapter((c) => c + 1);
    } else {
      // Go to next book, chapter 1
      const idx = allBooks.indexOf(book);
      if (idx < allBooks.length - 1) {
        setBook(allBooks[idx + 1]);
        setChapter(1);
      }
    }
  };

  const handleSearch = useCallback((query) => {
    const parsed = parseSearchQuery(query);
    if (!parsed) {
      // Visual shake — just ignore silently for now
      return;
    }

    // Clamp chapter to valid range
    const total = bibleStructure[parsed.book] || 1;
    const ch = Math.max(1, Math.min(parsed.chapter, total));

    // For single-chapter books (Jude, Obadiah, etc.):
    // if user typed "Jude 5", parsed.chapter=5, treat as verse 5 in ch 1
    let finalChapter = ch;
    let finalVerse   = parsed.verse;
    if (total === 1 && parsed.chapter > 1 && !parsed.verse) {
      finalChapter = 1;
      finalVerse   = parsed.chapter;
    }

    // Clamp verse
    if (finalVerse) {
      const maxVerse = (bibleVerses[parsed.book] || {})[finalChapter] || 999;
      finalVerse = Math.max(1, Math.min(finalVerse, maxVerse));
    }

    setBook(parsed.book);
    setChapter(finalChapter);
    setHighlightVerse(finalVerse || null);

    // Close drawers if open
    setBookDrawer(false);
    setChapterDrawer(false);
  }, []);

  // isTamil — used for book label language
  const isTamil = version.lang === 'ta';
  const bookDisplay = isTamil ? (bibleBooks.find((b) => b.english === book)?.tamil || book) : book;

  // Desktop book list section labels + items
  const otBooks = bibleBooks.slice(0, OT_COUNT);
  const ntBooks = bibleBooks.slice(OT_COUNT);

  const renderSidebarBook = (b) => {
    const isActive = b.english === book;
    const idx = bibleBooks.indexOf(b) + 1;
    return (
      <div
        key={b.english}
        className={`bb-book-item${isActive ? ' active' : ''}`}
        onClick={() => { setBook(b.english); setChapter(1); setHighlightVerse(null); }}
      >
        <span className="bb-book-num">{idx}</span>
        <span>{isTamil ? b.tamil : b.english}</span>
      </div>
    );
  };

  const sidebarSelectedRef = useRef(null);
  useEffect(() => {
    sidebarSelectedRef.current?.scrollIntoView({ block: 'nearest' });
  }, [book]);

  return (
    <div className={`bb-app ${theme}`}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bb-header">
        <span className="bb-logo">
          <img src="/icon.png" alt="logo" className="bb-logo-img" /> Screen Scripture
        </span>

        {/* Mobile: search bar in header */}
        <div className="bb-mobile-only" style={{ flex: 1, padding: '0 8px' }}>
          <SearchBar onSearch={handleSearch} placeholder="Search… e.g. John 3:16" />
        </div>

        <div className="bb-header-nav">
          <button className="bb-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Layout ─────────────────────────────────────────────────────────── */}
      <div className="bb-layout">

        {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
        <aside className="bb-sidebar">
          {/* Search */}
          <div className="bb-sidebar-search">
            <SearchBar onSearch={handleSearch} placeholder="e.g. John 3:16, Psalm 23" />
          </div>

          {/* Version selector */}
          <div className="bb-sidebar-versions">
            <VersionSelector versionId={versionId} onSelect={handleVersionSelect} />
          </div>

          {/* Book list */}
          <div className="bb-sidebar-books">
            <div className="bb-book-section-label">Old Testament</div>
            {otBooks.map(renderSidebarBook)}
            <div className="bb-book-section-label">New Testament</div>
            {ntBooks.map(renderSidebarBook)}
            <div style={{ height: 16 }} />
          </div>
        </aside>

        {/* ── Main Panel ──────────────────────────────────────────────────── */}
        <main className="bb-main">
          {/* Mobile nav bar (book/chapter buttons + arrows) */}
          <NavBar
            book={bookDisplay}
            chapter={chapter}
            onOpenBooks={() => setBookDrawer(true)}
            onPrev={handlePrev}
            onNext={handleNext}
            isMobile={isMobile}
          >
            {isMobile && (
              <VersionSelector versionId={versionId} onSelect={handleVersionSelect} isMobile={isMobile} />
            )}
          </NavBar>

          {/* Desktop: chapter grid inline */}
          {!isMobile && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderBottom: '1px solid var(--bb-border)',
              flexShrink: 0,
              overflowX: 'auto',
            }}>
              {Array.from({ length: bibleStructure[book] || 1 }, (_, i) => i + 1).map((ch) => (
                <div
                  key={ch}
                  className={`bb-ch-num${chapter === ch ? ' active' : ''}`}
                  style={{ minWidth: 40, width: 40, height: 36, borderRadius: 8, fontSize: 13 }}
                  onClick={() => handleChapterSelect(ch)}
                >
                  {ch}
                </div>
              ))}
            </div>
          )}

          {/* Verses */}
          <VerseDisplay
            verses={verses}
            book={bookDisplay}
            chapter={chapter}
            highlightVerse={highlightVerse}
            loading={loading}
            error={error}
            lang={version.lang}
          />
        </main>
      </div>

      {/* Mobile Drawers ──────────────────────────────────────────────────── */}
      {bookDrawer && (
        <BookDrawer
          selectedBook={book}
          onSelect={handleBookSelect}
          onClose={() => setBookDrawer(false)}
          isTamil={isTamil}
        />
      )}
    </div>
  );
}
