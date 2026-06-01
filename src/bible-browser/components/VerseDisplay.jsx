import React, { useEffect, useRef } from 'react';

export default function VerseDisplay({ verses, book, chapter, highlightVerse, loading, error, lang }) {
  const highlightRef = useRef(null);
  const scrollRef = useRef(null);

  // Scroll to top when book/chapter changes, unless a verse is highlighted
  useEffect(() => {
    if (!highlightVerse && scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [book, chapter, highlightVerse]);

  // Auto-scroll to highlighted verse
  useEffect(() => {
    if (highlightVerse && highlightRef.current) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [highlightVerse, verses]);

  if (loading) {
    return (
      <div className="bb-loading">
        <div className="bb-spinner" />
        <div style={{ fontSize: 14 }}>Loading Bible…</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          {lang === 'ta' ? 'This may take a moment for large Bible files.' : ''}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bb-loading" style={{ color: 'var(--bb-danger)' }}>
        <div className="bb-empty-icon">⚠️</div>
        <div style={{ fontSize: 14 }}>{error}</div>
      </div>
    );
  }

  if (!verses || verses.length === 0) {
    return (
      <div className="bb-empty">
        <div className="bb-empty-icon">📖</div>
        <div style={{ fontSize: 14 }}>No verses found</div>
        <div style={{ fontSize: 12, opacity: 0.6 }}>
          {book} Chapter {chapter}
        </div>
      </div>
    );
  }

  const isEnglish = lang === 'en';

  return (
    <div className="bb-verse-scroll" ref={scrollRef}>
      <div className="bb-chapter-title">
        {book} — Chapter {chapter}
      </div>
      <div className="bb-verse-list">
        {verses.map(({ verse, text }) => {
          const isHighlighted = highlightVerse === verse;
          return (
            <div
              key={verse}
              ref={isHighlighted ? highlightRef : null}
              className={`bb-verse-item${isHighlighted ? ' highlighted' : ''}`}
            >
              <span className="bb-verse-num">{verse}</span>
              <span className={`bb-verse-text${isEnglish ? ' en' : ''}`}>
                {text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
