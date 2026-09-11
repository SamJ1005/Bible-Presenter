import { db } from '../firebase';
import {
  collection,
  collectionGroup,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';

/**
 * Submit a new verse issue report.
 * Stored at: issueReports/{reporterName}/reports/{autoId}
 */
export async function submitIssueReport({
  uid,
  bibleVersion,
  book,
  chapter,
  verse,
  issueType,
  comment,
  reporter, // this is the username
}) {
  if (!uid) throw new Error('User must be authenticated to report issues');
  if (!reporter || reporter === 'Unknown') throw new Error('Reporter username missing');

  const reportsRef = collection(db, 'issueReports', reporter, 'reports');
  const docData = {
    version: bibleVersion || 'NKJV',
    book,
    chapter: Number(chapter),
    verse: Number(verse),
    issueType,
    description: comment || '',
    comment: comment || '',
    reportedBy: reporter,
    reportedAt: serverTimestamp(),
    status: 'pending',
    source: 'Electron App',
  };

  const docRef = await addDoc(reportsRef, docData);
  return docRef.id;
}

/**
 * Fetch all issue reports for a specific book + chapter.
 */
export async function fetchChapterIssues(book, chapter) {
  try {
    const q = query(
      collectionGroup(db, 'reports'),
      where('book', '==', book),
      where('chapter', '==', Number(chapter))
    );
    const snapshot = await getDocs(q);

    const reports = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      reports.push({
        id: docSnap.id,
        path: docSnap.ref.path,
        ...data,
        comment: data.comment || data.description || '',
      });
    });

    return reports;
  } catch (err) {
    console.error('[IssueReportService] fetchChapterIssues failed:', err);
    return [];
  }
}

/**
 * Subscribe to issue reports for a specific book + chapter in real-time.
 * Returns an unsubscribe function.
 */
export function subscribeChapterIssues(book, chapter, callback) {
  const q = query(
    collectionGroup(db, 'reports'),
    where('book', '==', book),
    where('chapter', '==', Number(chapter))
  );

  return onSnapshot(q, (snapshot) => {
    const reports = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      reports.push({
        id: docSnap.id,
        path: docSnap.ref.path,
        ...data,
        comment: data.comment || data.description || '',
      });
    });
    callback(reports);
  }, (err) => {
    console.error('[IssueReportService] subscribeChapterIssues failed:', err);
    callback([]);
  });
}

/**
 * Fetch all issue reports for a specific verse.
 */
export async function fetchVerseIssues(book, chapter, verse) {
  try {
    const q = query(
      collectionGroup(db, 'reports'),
      where('book', '==', book),
      where('chapter', '==', Number(chapter)),
      where('verse', '==', Number(verse))
    );
    const snapshot = await getDocs(q);

    const reports = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      reports.push({
        id: docSnap.id,
        path: docSnap.ref.path,
        ...data,
        comment: data.comment || data.description || '',
      });
    });

    return reports;
  } catch (err) {
    console.error('[IssueReportService] fetchVerseIssues failed:', err);
    return [];
  }
}

/**
 * Fetch ALL issue reports (for maintenance page).
 */
export async function fetchAllIssueReports(statusFilter = null) {
  try {
    // The UI uses 'reported', map to 'pending'
    const actualStatusFilter = statusFilter === 'reported' ? 'pending' : statusFilter;
    
    // Using collectionGroup(db, 'reports') without where clause prevents the Firestore index error:
    // "The query requires a COLLECTION_GROUP_ASC index for collection reports and field status"
    // Client-side filtering allows immediate querying without requiring manual Firestore console index creation.
    const q = query(collectionGroup(db, 'reports'));
    const snapshot = await getDocs(q);

    const reports = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.status || 'pending';

      if (!actualStatusFilter || actualStatusFilter === 'all' || status === actualStatusFilter) {
        reports.push({
          id: docSnap.id,
          path: docSnap.ref.path, // Full path needed for updating
          ...data,
          status,
          comment: data.comment || data.description || '',
          description: data.description || data.comment || '',
        });
      }
    });

    // Sort client-side by reportedAt descending
    reports.sort((a, b) => {
      const timeA = a.reportedAt || a.createdAt;
      const timeB = b.reportedAt || b.createdAt;
      
      const tA = timeA?.toMillis?.() || (timeA ? new Date(timeA).getTime() : 0);
      const tB = timeB?.toMillis?.() || (timeB ? new Date(timeB).getTime() : 0);
      return tB - tA;
    });

    return reports;
  } catch (err) {
    console.error('[IssueReportService] fetchAllIssueReports failed:', err);
    throw err; // Re-throw to let UI handle the error
  }
}

/**
 * Update the status of a specific issue report.
 */
export async function updateIssueStatus(reportPath, newStatus) {
  try {
    // We must use the full path because it's in a collection group
    const reportRef = doc(db, reportPath);
    await updateDoc(reportRef, {
      status: newStatus === 'reported' ? 'pending' : newStatus,
    });
  } catch (err) {
    console.error('[IssueReportService] updateIssueStatus failed:', err);
    throw err;
  }
}

/**
 * Build a verse→issue status map from chapter reports.
 */
export function buildVerseIssueMap(reports) {
  const map = {};
  const STATUS_PRIORITY = { pending: 2, reported: 2, resolved: 1 };

  for (const report of reports) {
    const vn = String(report.verse);
    if (!map[vn]) {
      map[vn] = {
        status: report.status || 'pending',
        count: 0,
        reports: [],
      };
    }
    map[vn].count++;
    map[vn].reports.push(report);

    // Worst status wins (pending > reviewing > resolved)
    const currentPriority = STATUS_PRIORITY[map[vn].status] || 0;
    const newPriority = STATUS_PRIORITY[report.status] || 0;
    if (newPriority > currentPriority) {
      map[vn].status = report.status;
    }
  }

  return map;
}


