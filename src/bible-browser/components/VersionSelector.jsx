import React from 'react';
import { BIBLE_VERSIONS } from '../bibleVersions';

export default function VersionSelector({ versionId, onSelect, isMobile }) {
  return (
    <div className={`bb-version-select-wrap ${isMobile ? 'mobile' : ''}`}>
      <select
        className="bb-version-select"
        value={versionId}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Select Bible Version"
      >
        {BIBLE_VERSIONS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
      <svg className="bb-version-select-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  );
}
