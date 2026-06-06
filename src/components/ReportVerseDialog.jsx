import React, { useState } from 'react';
import { submitIssueReport } from '../services/issueReportService';
import toast from 'react-hot-toast';
import './ReportVerseDialog.css';

const ISSUE_TYPES = [
  { id: 'spelling', label: 'Spelling mistake', icon: '✏️' },
  { id: 'wrong_order', label: 'Wrong verse order', icon: '🔀' },
  { id: 'missing_word', label: 'Missing word', icon: '🔍' },
  { id: 'translation', label: 'Translation issue', icon: '🌐' },
  { id: 'other', label: 'Other', icon: '📝' },
];

export default function ReportVerseDialog({
  isOpen,
  onClose,
  book,
  chapter,
  verse,
  bibleVersion,
  user,
  theme,
  onReportSubmitted,
}) {
  const [issueType, setIssueType] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const accent = isDark ? '#00ff99' : '#003399';

  const handleSubmit = async () => {
    if (!issueType) {
      toast.error('Please select an issue type');
      return;
    }
    if (!user) {
      toast.error('You must be logged in to report issues');
      return;
    }

    setSubmitting(true);
    try {
      // Extract a clean username
      let reporterName = user.displayName;
      if (!reporterName && user.email) {
        reporterName = user.email.split('@')[0];
      }
      
      await submitIssueReport({
        uid: user.uid,
        bibleVersion: bibleVersion || 'NKJV',
        book,
        chapter,
        verse,
        issueType,
        comment: comment.trim(),
        reporter: reporterName || 'Unknown',
      });

      toast.success('Issue reported successfully!');
      setIssueType('');
      setComment('');
      onReportSubmitted?.();
      onClose();
    } catch (err) {
      console.error('[ReportVerseDialog] Submit failed:', err);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="rvd-overlay" onClick={handleOverlayClick}>
      <div className={`rvd-dialog ${isDark ? 'dark' : 'light'}`}>
        {/* Header */}
        <div className="rvd-header">
          <div className="rvd-header-icon">⚠️</div>
          <div className="rvd-header-text">
            <h3 className="rvd-title">Report Verse Issue</h3>
            <p className="rvd-subtitle" style={{ color: accent }}>
              {book} {chapter}:{verse}
            </p>
          </div>
          <button className="rvd-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Issue Type Selector */}
        <div className="rvd-section">
          <label className="rvd-label">What's the issue?</label>
          <div className="rvd-issue-grid">
            {ISSUE_TYPES.map((type) => (
              <div
                key={type.id}
                className={`rvd-issue-option ${issueType === type.id ? 'selected' : ''}`}
                onClick={() => setIssueType(type.id)}
                style={{
                  borderColor: issueType === type.id ? accent : undefined,
                  background: issueType === type.id
                    ? (isDark ? 'rgba(0,255,153,0.08)' : 'rgba(0,51,153,0.06)')
                    : undefined,
                }}
              >
                <span className="rvd-issue-icon">{type.icon}</span>
                <span className="rvd-issue-label">{type.label}</span>
                {issueType === type.id && (
                  <span className="rvd-check" style={{ color: accent }}>✓</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="rvd-section">
          <label className="rvd-label">Additional details (optional)</label>
          <textarea
            className={`rvd-textarea ${isDark ? 'dark' : 'light'}`}
            placeholder="Describe the issue in more detail..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="rvd-char-count">{comment.length}/500</div>
        </div>

        {/* Auth Warning */}
        {!user && (
          <div className="rvd-auth-warning">
            🔒 You need to be logged in to submit reports. Go to Settings → Login.
          </div>
        )}

        {/* Actions */}
        <div className="rvd-actions">
          <button
            className={`rvd-btn rvd-btn-cancel ${isDark ? 'dark' : 'light'}`}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rvd-btn rvd-btn-submit"
            style={{ background: accent }}
            onClick={handleSubmit}
            disabled={submitting || !user || !issueType}
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}
