import React from 'react';
import { bibleStructure } from '../../utils/bibleChapters';
import { bibleBooks } from '../../utils/bibleBooks';

export default function NavBar({
  book, chapter,
  onOpenBooks,
  onPrev, onNext,
  isMobile,
  children
}) {
  const globalIdx = bibleBooks.findIndex(b => b.english === book || b.tamil === book);
  const totalChapters = bibleStructure[book] || bibleStructure[bibleBooks[globalIdx]?.english] || 1;
  const canPrev = globalIdx > 0 || chapter > 1;
  const canNext = globalIdx > -1 && (globalIdx < bibleBooks.length - 1 || chapter < totalChapters);

  return (
    <div className="bb-nav">
      {/* Book & Chapter combined button */}
      <button className="bb-nav-book-btn" onClick={onOpenBooks}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0 }}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{book} {chapter}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* Prev / Next */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {/* Prev Chapter */}
        <button
          className="bb-nav-arrow"
          onClick={onPrev}
          disabled={!canPrev}
          title="Previous chapter"
          aria-label="Previous chapter"
        >
          ‹
        </button>

        {/* Next Chapter */}
        <button
          className="bb-nav-arrow"
          onClick={onNext}
          disabled={!canNext}
          title="Next chapter"
          aria-label="Next chapter"
        >
          ›
        </button>
      </div>

      {/* Version Selector (Passed as children) */}
      <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
        {children}
      </div>
    </div>
  );
}
