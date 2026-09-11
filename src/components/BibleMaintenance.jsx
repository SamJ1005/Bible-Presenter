import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllIssueReports, updateIssueStatus } from '../services/issueReportService';
import './BibleMaintenance.css';

const STATUS_CONFIG = {
  pending: { label: 'Reported', color: '#856404', bg: '#fff3cd' },
  reported: { label: 'Reported', color: '#856404', bg: '#fff3cd' },
  resolved: { label: 'Resolved', color: '#155724', bg: '#d4edda' },
};

export default function BibleMaintenance({ theme, user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookFilter, setBookFilter] = useState('');
  const [selectedReport, setSelectedReport] = useState(null); // For viewing full comment / details modal

  const isDark = theme === 'dark';
  const accent = isDark ? '#00ff99' : '#003399';

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const filter = statusFilter === 'all' ? null : statusFilter;
      const data = await fetchAllIssueReports(filter);
      setReports(data);
    } catch (err) {
      console.error('[BibleMaintenance] Load failed:', err);
      alert('Failed to load reports: ' + err.message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    if (!bookFilter.trim()) return reports;
    const q = bookFilter.toLowerCase();
    return reports.filter((r) => r.book?.toLowerCase().includes(q));
  }, [reports, bookFilter]);

  // Handle status change
  const handleStatusChange = async (reportPath, newStatus) => {
    try {
      await updateIssueStatus(reportPath, newStatus);
      // Optimistically update the local state
      setReports((prev) =>
        prev.map((r) => (r.path === reportPath ? { ...r, status: newStatus } : r))
      );
      if (selectedReport && selectedReport.path === reportPath) {
        setSelectedReport((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      alert('Failed to update status. Check permissions.');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const date = timestamp?.toDate?.() || new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  };

  return (
    <div className={`bm-container ${isDark ? 'dark' : 'light'}`}>
      <div className="bm-header">
        <div className="bm-header-left">
          <h2 className="bm-title">
            <span className="bm-title-icon">🛠️</span>
            Bible Maintenance
          </h2>
          <p className="bm-subtitle">
            Review and manage verse issue reports from users.
          </p>
        </div>
        <button
          className={`bm-refresh-btn ${isDark ? 'dark' : 'light'}`}
          onClick={loadReports}
          disabled={loading}
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      <div className="bm-filter-bar">
        <div className="bm-filter-tabs">
          {['all', 'reported', 'resolved'].map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                className={`bm-filter-tab ${isActive ? 'active' : ''} ${isDark ? 'dark' : 'light'}`}
                style={{
                  color: isActive ? accent : undefined,
                  borderColor: isActive ? accent : undefined,
                }}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? '📋 All' : STATUS_CONFIG[status]?.label}
              </button>
            );
          })}
        </div>
        <input
          className={`bm-search-input ${isDark ? 'dark' : 'light'}`}
          type="text"
          placeholder="🔍 Filter by book name..."
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
        />
      </div>

      <div className="bm-table-container">
        {loading && <div className="bm-loading">Loading reports...</div>}
        
        {!loading && filteredReports.length === 0 && (
          <div className="bm-empty">No reports found</div>
        )}

        {!loading && filteredReports.length > 0 && (
          <table className={`bm-table ${isDark ? 'dark' : 'light'}`}>
            <thead>
              <tr>
                <th style={{ width: '55px', textAlign: 'center' }}>SL No</th>
                <th style={{ width: '130px' }}>Username</th>
                <th style={{ width: '140px' }}>Verse</th>
                <th style={{ width: '140px' }}>Issue Type</th>
                <th>Comment</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, index) => {
                const commentText = report.comment || report.description || '';
                const isLong = commentText.length > 90;
                const statusKey = report.status === 'pending' ? 'reported' : (report.status || 'reported');

                return (
                  <tr key={report.id}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                    <td>{report.reportedBy || report.reporter || 'Anonymous'}</td>
                    <td style={{ color: accent, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {report.book} {report.chapter}:{report.verse}
                    </td>
                    <td>
                      <span className="bm-issue-badge">{report.issueType || 'Other'}</span>
                    </td>
                    <td>
                      {commentText ? (
                        <div className="bm-comment-cell">
                          <span className="bm-comment-text">
                            {isLong ? `${commentText.slice(0, 90)}...` : commentText}
                          </span>
                          <button
                            className="bm-view-comment-btn"
                            onClick={() => setSelectedReport(report)}
                            title="Click to view full comment"
                          >
                            👁️ View
                          </button>
                        </div>
                      ) : (
                        <span style={{ opacity: 0.4 }}>—</span>
                      )}
                    </td>
                    <td>
                      <select
                        className={`bm-status-select ${isDark ? 'dark' : 'light'}`}
                        value={statusKey}
                        onChange={(e) => handleStatusChange(report.path, e.target.value)}
                        style={{
                          backgroundColor: STATUS_CONFIG[statusKey]?.bg || '#f0f0f0',
                          color: STATUS_CONFIG[statusKey]?.color || '#333',
                          fontWeight: 'bold',
                        }}
                      >
                        <option value="reported">Reported</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Full Comment / Issue Details Modal */}
      {selectedReport && (
        <div className="bm-modal-overlay" onClick={() => setSelectedReport(null)}>
          <div
            className={`bm-modal-content ${isDark ? 'dark' : 'light'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bm-modal-header">
              <h3 className="bm-modal-title">
                📋 Issue Report Details
              </h3>
              <button
                className="bm-modal-close-btn"
                onClick={() => setSelectedReport(null)}
              >
                ✕
              </button>
            </div>

            <div className="bm-modal-body">
              <div className="bm-modal-meta-grid">
                <div className="bm-modal-meta-item">
                  <span className="bm-modal-meta-label">Verse</span>
                  <span className="bm-modal-meta-value" style={{ color: accent, fontWeight: 'bold' }}>
                    {selectedReport.book} {selectedReport.chapter}:{selectedReport.verse}
                  </span>
                </div>
                <div className="bm-modal-meta-item">
                  <span className="bm-modal-meta-label">Version</span>
                  <span className="bm-modal-meta-value">{selectedReport.version || 'NKJV'}</span>
                </div>
                <div className="bm-modal-meta-item">
                  <span className="bm-modal-meta-label">Reported By</span>
                  <span className="bm-modal-meta-value">
                    {selectedReport.reportedBy || selectedReport.reporter || 'Anonymous'}
                  </span>
                </div>
                <div className="bm-modal-meta-item">
                  <span className="bm-modal-meta-label">Date</span>
                  <span className="bm-modal-meta-value">
                    {formatDate(selectedReport.reportedAt || selectedReport.createdAt)}
                  </span>
                </div>
                <div className="bm-modal-meta-item">
                  <span className="bm-modal-meta-label">Issue Type</span>
                  <span className="bm-modal-meta-value">{selectedReport.issueType || 'Other'}</span>
                </div>
                <div className="bm-modal-meta-item">
                  <span className="bm-modal-meta-label">Current Status</span>
                  <select
                    className={`bm-status-select ${isDark ? 'dark' : 'light'}`}
                    value={selectedReport.status === 'pending' ? 'reported' : (selectedReport.status || 'reported')}
                    onChange={(e) => handleStatusChange(selectedReport.path, e.target.value)}
                    style={{
                      backgroundColor: STATUS_CONFIG[selectedReport.status === 'pending' ? 'reported' : selectedReport.status]?.bg,
                      color: STATUS_CONFIG[selectedReport.status === 'pending' ? 'reported' : selectedReport.status]?.color,
                      fontWeight: 'bold',
                      maxWidth: '130px',
                    }}
                  >
                    <option value="reported">Reported</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
              </div>

              <div className="bm-modal-comment-section">
                <span className="bm-modal-meta-label">User Comment</span>
                <div className={`bm-modal-comment-box ${isDark ? 'dark' : 'light'}`}>
                  {selectedReport.comment || selectedReport.description || 'No additional comment provided.'}
                </div>
              </div>
            </div>

            <div className="bm-modal-footer">
              <button
                className={`bm-modal-action-btn ${isDark ? 'dark' : 'light'}`}
                onClick={() => setSelectedReport(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
