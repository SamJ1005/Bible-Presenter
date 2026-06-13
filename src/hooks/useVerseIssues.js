import { useState, useEffect } from 'react';
import { subscribeChapterIssues, buildVerseIssueMap } from '../services/issueReportService';

/**
 * Custom hook to manage verse issue data for a specific book+chapter.
 * Returns a map of { [verseNum]: { status, count, reports } }
 * and a refresh function (no-op since it's real-time).
 */
export default function useVerseIssues(book, chapter) {
  const [verseIssueMap, setVerseIssueMap] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!book || !chapter) {
      setVerseIssueMap({});
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeChapterIssues(book, chapter, (reports) => {
      const map = buildVerseIssueMap(reports);
      setVerseIssueMap(map);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [book, chapter]);

  return {
    verseIssueMap,
    issuesLoading: loading,
    refreshIssues: () => {}, // No-op, data is real-time
  };
}
