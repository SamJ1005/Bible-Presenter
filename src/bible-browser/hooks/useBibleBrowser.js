import { useState, useEffect, useCallback } from 'react';
import { bibleBooks } from '../../utils/bibleBooks';

// ─── Module-level cache: versionId → parsed data ──────────────────────────────
// Survives re-renders so each Bible file is only fetched once per session.
const dataCache = {};
const pendingFetches = {};

// ─── NKJV normaliser (same approach as existing useBible.js) ─────────────────
function normalizeNKJV(raw) {
  const canonicalNames = bibleBooks.map((b) => b.english);
  return {
    type: 'json-books',
    books: (raw.Book || []).map((book, i) => ({
      name: canonicalNames[i] || `Book ${i + 1}`,
      chapters: (book.Chapter || []).map((ch, ci) => ({
        chapter: ci + 1,
        verses: (ch.Verse || []).map((v, vi) => ({
          verse: vi + 1,
          text: v.Verse || '',
        })),
      })),
    })),
  };
}

// ─── Loader: fetch + parse a Bible version (cached) ──────────────────────────
async function loadBibleVersion(version) {
  if (dataCache[version.id]) return dataCache[version.id];
  if (pendingFetches[version.id]) return pendingFetches[version.id];

  const promise = (async () => {
    const res = await fetch(version.file);
    if (!res.ok) throw new Error(`Failed to load ${version.label}: ${res.status}`);

    let data;
    if (version.format === 'xml-zefania') {
      const text = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      // Check for parser errors
      const parserErr = xmlDoc.querySelector('parsererror');
      if (parserErr) throw new Error('XML parse error in Tamil BSI');
      data = { type: 'xml-zefania', xmlDoc };
    } else if (version.format === 'json-nkjv') {
      const raw = await res.json();
      data = normalizeNKJV(raw);
    } else {
      // json-books (KJV)
      const raw = await res.json();
      data = { type: 'json-books', ...raw };
    }

    dataCache[version.id] = data;
    delete pendingFetches[version.id];
    return data;
  })();

  pendingFetches[version.id] = promise;
  return promise;
}

// ─── Verse parsers ────────────────────────────────────────────────────────────
function parseXmlZefaniaChapter(xmlDoc, bookName, chapterNum) {
  const bookIdx = bibleBooks.findIndex(
    (b) => b.english.toLowerCase() === bookName.toLowerCase()
  ) + 1;
  if (bookIdx === 0) return [];

  const bookNode =
    xmlDoc.querySelector(`BIBLEBOOK[bnumber="${bookIdx}"]`) ||
    xmlDoc.querySelector(`BIBLEBOOK[number="${bookIdx}"]`);
  if (!bookNode) return [];

  const chNode =
    bookNode.querySelector(`CHAPTER[cnumber="${chapterNum}"]`) ||
    bookNode.querySelector(`CHAPTER[number="${chapterNum}"]`);
  if (!chNode) return [];

  const nodes = chNode.querySelectorAll('VERS, VERSE');
  return Array.from(nodes)
    .map((v, i) => ({
      verse: parseInt(
        v.getAttribute('vnumber') || v.getAttribute('number') || i + 1,
        10
      ),
      text: v.textContent.trim(),
    }))
    .filter((v) => v.text);
}

function parseJsonBooksChapter(data, bookName, chapterNum) {
  if (!data.books) return [];
  const book = data.books.find(
    (b) => b.name.toLowerCase() === bookName.toLowerCase()
  );
  if (!book) return [];
  const ch = book.chapters.find(
    (c) => Number(c.chapter) === Number(chapterNum)
  );
  if (!ch) return [];
  return (ch.verses || []).map((v) => ({
    verse: Number(v.verse),
    text: (v.text || '').trim(),
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useBibleBrowser(version) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(() => dataCache[version?.id] || null);

  useEffect(() => {
    if (!version) return;
    if (dataCache[version.id]) {
      setData(dataCache[version.id]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    loadBibleVersion(version)
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load Bible');
        setLoading(false);
      });
  }, [version?.id]); // eslint-disable-line

  /** Returns [{verse, text}] for the given book+chapter */
  const getChapterVerses = useCallback(
    (bookName, chapterNum) => {
      if (!data) return [];
      if (data.type === 'xml-zefania') {
        return parseXmlZefaniaChapter(data.xmlDoc, bookName, chapterNum);
      }
      if (data.type === 'json-books') {
        return parseJsonBooksChapter(data, bookName, chapterNum);
      }
      return [];
    },
    [data]
  );

  return { loading, error, getChapterVerses };
}
