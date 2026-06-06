import { useState, useEffect, useCallback } from 'react';
import { fetchChapterIssues, buildVerseIssueMap } from '../services/issueReportService';

/**
 * Custom hook to manage verse issue data for a specific book+chapter.
 * Returns a map of { [verseNum]: { status, count, reports } }
 * and a refresh function to force reload.
 */
export default function useVerseIssues(book, chapter) {
  const [verseIssueMap, setVerseIssueMap] = useState({});
  const [loading, setLoading] = useState(false);

  const loadIssues = useCallback(async () => {
    if (!book || !chapter) {
      setVerseIssueMap({});
      return;
    }

    setLoading(true);
    try {
      const reports = await fetchChapterIssues(book, chapter);
      const map = buildVerseIssueMap(reports);
      setVerseIssueMap(map);
    } catch (err) {
      console.error('[useVerseIssues] Failed to load issues:', err);
      setVerseIssueMap({});
    } finally {
      setLoading(false);
    }
  }, [book, chapter]);

  // Auto-load when book/chapter changes
  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  return {
    verseIssueMap,
    issuesLoading: loading,
    refreshIssues: loadIssues,
  };
}
