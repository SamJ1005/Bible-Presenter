import React, { useState, useEffect, useRef } from 'react';
import { bibleBooks } from '../../utils/bibleBooks';
import { bibleStructure } from '../../utils/bibleChapters';

const OT_COUNT = 39;

export default function BookDrawer({ selectedBook, onSelect, onClose, isTamil }) {
  const [filter, setFilter] = useState('');
  const [step, setStep] = useState('book'); // 'book' or 'chapter'
  const [tempBook, setTempBook] = useState(selectedBook);
  
  const selectedRef = useRef(null);
  const inputRef = useRef(null);

  // Focus search on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  // Scroll selected book into view on open
  useEffect(() => {
    setTimeout(() => {
      selectedRef.current?.scrollIntoView({ block: 'center' });
    }, 120);
  }, []);

  const filtered = bibleBooks.filter((b) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      b.english.toLowerCase().includes(q) ||
      b.tamil.toLowerCase().includes(q)
    );
  });

  const otBooks = filtered.filter((_, i) => bibleBooks.indexOf(bibleBooks.find(b => b.english === _.english)) < OT_COUNT);
  const ntBooks = filtered.filter((_, i) => bibleBooks.indexOf(bibleBooks.find(b => b.english === _.english)) >= OT_COUNT);

  const renderBook = (b, idx) => {
    const isActive = b.english === selectedBook;
    const globalIdx = bibleBooks.findIndex(bb => bb.english === b.english) + 1;
    return (
      <div
        key={b.english}
        ref={isActive ? selectedRef : null}
        className={`bb-book-item${isActive ? ' active' : ''}`}
        onClick={() => {
          setTempBook(b.english);
          setStep('chapter');
        }}
      >
        <span className="bb-book-num">{globalIdx}</span>
        <span>{isTamil ? b.tamil : b.english}</span>
        {isTamil && (
          <span style={{ fontSize: 11, color: 'var(--bb-text-3)', marginLeft: 'auto' }}>
            {b.english}
          </span>
        )}
      </div>
    );
  };

  // Chapter rendering
  const renderChapters = () => {
    const total = bibleStructure[tempBook] || 1;
    const chapters = Array.from({ length: total }, (_, i) => i + 1);
    const tempBookDisplay = isTamil ? (bibleBooks.find(b => b.english === tempBook)?.tamil || tempBook) : tempBook;

    return (
      <div className="bb-drawer-body">
        <div style={{ padding: '0 18px 10px', fontSize: 13, color: 'var(--bb-text-2)' }}>
          Select chapter for <strong>{tempBookDisplay}</strong>
        </div>
        <div className="bb-chapter-grid">
          {chapters.map((ch) => (
            <div
              key={ch}
              className="bb-ch-num"
              onClick={() => { onSelect(tempBook, ch); onClose(); }}
            >
              {ch}
            </div>
          ))}
        </div>
        <div style={{ height: 16 }} />
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div className="bb-drawer-overlay" onClick={onClose} />

      {/* Drawer */}
      <div className="bb-drawer">
        <div className="bb-drawer-handle" />
        <div className="bb-drawer-header">
          {step === 'chapter' ? (
            <button className="bb-drawer-back" onClick={() => setStep('book')} aria-label="Back">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
          ) : (
            <span className="bb-drawer-title">Select Book</span>
          )}
          
          {step === 'chapter' && <span className="bb-drawer-title">Chapters</span>}
          
          <button className="bb-drawer-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Search inside drawer (only for books) */}
        {step === 'book' && (
          <div className="bb-drawer-search">
          <div className="bb-search-wrap">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={inputRef}
              className="bb-search-input"
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter books…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            {filter && (
              <button type="button" className="bb-search-clear" onClick={() => setFilter('')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>
        )}

        {step === 'book' ? (
          <div className="bb-drawer-body">
            {otBooks.length > 0 && (
              <>
                <div className="bb-book-section-label">Old Testament</div>
                {otBooks.map(renderBook)}
              </>
            )}
            {ntBooks.length > 0 && (
              <>
                <div className="bb-book-section-label">New Testament</div>
                {ntBooks.map(renderBook)}
              </>
            )}
            {filtered.length === 0 && (
              <div className="bb-empty" style={{ padding: 24 }}>
                <div style={{ fontSize: 13 }}>No books match "{filter}"</div>
              </div>
            )}
            {/* Bottom padding for safe area */}
            <div style={{ height: 16 }} />
          </div>
        ) : (
          renderChapters()
        )}
      </div>
    </>
  );
}
