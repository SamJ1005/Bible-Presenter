import React, { useState, useRef, useEffect } from 'react';

export default function SearchBar({ onSearch, placeholder = 'Search… e.g. John 3:16' }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) onSearch(q);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSubmit(e);
  };

  const clear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <form className="bb-search-wrap" onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Search icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>

      <input
        ref={inputRef}
        className="bb-search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        inputMode="text"
      />

      {query && (
        <button type="button" className="bb-search-clear" onClick={clear} aria-label="Clear">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </form>
  );
}
