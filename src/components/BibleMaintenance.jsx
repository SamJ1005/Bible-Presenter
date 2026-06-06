import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllIssueReports, updateIssueStatus } from '../services/issueReportService';
import './BibleMaintenance.css';

const STATUS_CONFIG = {
  reported: { label: 'Reported', color: '#856404', bg: '#fff3cd' },
  reviewing: { label: 'Reviewing', color: '#004085', bg: '#cce5ff' },
  resolved: { label: 'Resolved', color: '#155724', bg: '#d4edda' },
};

export default function BibleMaintenance({ theme, user }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [bookFilter, setBookFilter] = useState('');

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
    } catch (err) {
      alert('Failed to update status. Check permissions.');
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
            Review and manage verse issue reports from all sources.
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
          {['all', 'reported', 'reviewing', 'resolved'].map((status) => {
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
                <th style={{ width: '60px' }}>SL No</th>
                <th>Username</th>
                <th>Source</th>
                <th>Verse</th>
                <th>Issue Type</th>
                <th>Comment</th>
                <th style={{ width: '140px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.map((report, index) => (
                <tr key={report.id}>
                  <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
                  <td>{report.reportedBy || report.reporter || 'Anonymous'}</td>
                  <td>{report.source || 'Browser'}</td>
                  <td style={{ color: accent, fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {report.book} {report.chapter}:{report.verse}
                  </td>
                  <td>{report.issueType}</td>
                  <td style={{ maxWidth: '200px' }}>
                    <div className="bm-truncate" title={report.comment}>
                      {report.comment || '—'}
                    </div>
                  </td>
                  <td>
                    <select
                      className={`bm-status-select ${isDark ? 'dark' : 'light'}`}
                      value={report.status || 'reported'}
                      onChange={(e) => handleStatusChange(report.path, e.target.value)}
                      style={{
                        backgroundColor: STATUS_CONFIG[report.status || 'reported']?.bg,
                        color: STATUS_CONFIG[report.status || 'reported']?.color,
                        fontWeight: 'bold',
                      }}
                    >
                      <option value="reported">Reported</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
