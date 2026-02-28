import React, { useRef, useEffect, useState, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
import { saveMemory, loadMemory } from "./hooks/useLocalMemory";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc, deleteDoc, collection, getDocs, getDoc } from "firebase/firestore";
import "./index.css";
import Settings from "./components/Settings";
import Header from "./components/Header";

import useTheme from "./hooks/useTheme";
import useBible from "./hooks/useBible";
import usePresentation from "./hooks/usePresentation";
import useNavigation from "./hooks/useNavigation";
import useSearch from "./hooks/useSearch";

import BookList from "./components/BookList";
import ChapterList from "./components/ChapterList";
import VerseList from "./components/VerseList";
import RecentList from "./components/RecentList";
import ChapterTable from "./components/ChapterTable";
import Prelist from "./components/Prelist";

export default function App() {
  const [settings, setSettings] = useState(() =>
    loadMemory("settings", {
      presentationBgType: "solid",
      presentationSolidColor: "#000000",
      presentationBgImage: null,
      tamilFontOffset: 0,
      englishFontOffset: 0,
      indexFontOffset: 0,
      isTamilEnabled: true,
      isEnglishEnabled: true,
      preferredDisplayId: 'auto',
    })
  );

  useEffect(() => {
    saveMemory("settings", settings);
  }, [settings]);

  // Sync display settings to Electron
  useEffect(() => {
    if (settings.preferredDisplayId && window.api?.setPreferredDisplay) {
      window.api.setPreferredDisplay(settings.preferredDisplayId);
    }
  }, [settings.preferredDisplayId]);

  // Utility to get user-specific memory keys for isolation
  const getMemKey = useCallback((key) => {
    const uid = auth.currentUser?.uid || 'guest';
    return `user_${uid}_${key}`;
  }, []);

  // ---- Queue Manager State ----
  const [queueMeta, setQueueMeta] = useState(() => {
    const key = auth.currentUser ? `user_${auth.currentUser.uid}_queueMeta` : `user_guest_queueMeta`;
    const saved = loadMemory(key, null);
    if (saved && saved.queues && saved.queues.length > 0) return saved;
    // Migration: create default queue
    return {
      activeId: "default",
      queues: [{ id: "default", name: "Default Queue", syncEnabled: false }]
    };
  });

  useEffect(() => {
    saveMemory(getMemKey("queueMeta"), queueMeta);
  }, [queueMeta, getMemKey]);

  const activeQueueInfo = queueMeta.queues.find(q => q.id === queueMeta.activeId) || queueMeta.queues[0];

  // Cloud playlists state: { [queueId]: { name, lastModified, itemCount } }
  const [cloudPlaylists, setCloudPlaylists] = useState({});
  const [cloudLoading, setCloudLoading] = useState(false);
  // Sync status map: { [queueId]: 'synced' | 'local' | 'unsynced' | 'cloud-only' }
  const [syncStatus, setSyncStatus] = useState({});

  // ---- theme + UI state
  const { theme, toggleTheme, applyThemeGlobals, scrollbarStyle } = useTheme();
  const [activeTab, setActiveTab] = useState("bible");
  const [isBlankMode, setIsBlankMode] = useState(false); // Track if presentation is in blank mode
  const [recent, setRecent] = useState([]); // Session-only recent list

  /* ITEM STATE — loaded per active queue */
  const [prelistedItems, setPrelistedItems] = useState(() => {
    const key = auth.currentUser ? `user_${auth.currentUser.uid}_queueMeta` : `user_guest_queueMeta`;
    const tempMeta = loadMemory(key, { activeId: 'default' });
    const qKey = auth.currentUser 
      ? `user_${auth.currentUser.uid}_queue_items_${tempMeta.activeId}`
      : `user_guest_queue_items_${tempMeta.activeId}`;
    
    // Try queue-specific key first
    let loaded = loadMemory(qKey, null);
    // Migration: if no queue-specific items but old "prelistedItems" exists
    if (!loaded && tempMeta.activeId === "default") {
      loaded = loadMemory("prelistedItems", []);
    }
    if (!loaded) loaded = [];
    // Filter out stale blob URLs (they expire on reload)
    return loaded.filter(item => {
      if (item.type === 'file' && item.url && item.url.startsWith('blob:')) {
        return false;
      }
      return true;
    });
  });

  const [prelistActiveId, setPrelistActiveId] = useState(null); // Active item selection

  // Auth & User State
  const [user, setUser] = useState(null);
  const isRemoteUpdate = useRef(false);

  // Listen for auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      const previousUser = user;
      setUser(currentUser);

      if (currentUser) {
        console.log('[AUTH] User logged in:', { uid: currentUser.uid, email: currentUser.email });
        
        // If switching from a different user (or from guest), reset local state
        if (!previousUser || previousUser.uid !== currentUser.uid) {
          // Load this specific user's meta from storage, or use default
          const userMeta = loadMemory(`user_${currentUser.uid}_queueMeta`, {
            activeId: "default",
            queues: [{ id: "default", name: "Default Queue", syncEnabled: true }]
          });
          
          setQueueMeta(userMeta);

          // Load items for the active queue of this user
          const loadedItems = loadMemory(`user_${currentUser.uid}_queue_items_${userMeta.activeId}`, []);
          setPrelistedItems(loadedItems);
          setPrelistActiveId(null);
          setSyncStatus({});
        }
        
        // Fetch this user's playlists from Firestore
        fetchCloudPlaylists(currentUser.uid);
      } else {
        console.log('[AUTH] Logged out / Guest mode');
        // Clear all cloud data
        setCloudPlaylists({});
        setSyncStatus({});
        
        // Reset to a fresh default queue (no leftover data from previous user)
        if (previousUser) {
          const freshMeta = {
            activeId: "default",
            queues: [{ id: "default", name: "Default Queue", syncEnabled: false }]
          };
          setQueueMeta(freshMeta);
          setPrelistedItems([]);
          setPrelistActiveId(null);
          // Clear the cached cloud data
          saveMemory(getMemKey('cloudPlaylistsCache'), {});
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Helper: Strip large data from items before syncing to cloud
  // Firestore has a 1 MB document size limit. File items with base64 data URLs
  // are too large — we strip them and keep files local-only.
  const sanitizeItemsForCloud = (items) => {
    return items.map(item => {
      if (item.type === 'file') {
        // Strip the large base64 URL — keep metadata only
        const { url, ...rest } = item;
        return { ...rest, url: '[local-file]', localOnly: true };
      }
      // For verse items, strip any very large custom text (safety net)
      const sanitized = { ...item };
      if (sanitized.customTamil && sanitized.customTamil.length > 5000) {
        sanitized.customTamil = sanitized.customTamil.substring(0, 5000);
      }
      if (sanitized.customEnglish && sanitized.customEnglish.length > 5000) {
        sanitized.customEnglish = sanitized.customEnglish.substring(0, 5000);
      }
      return sanitized;
    });
  };

  // Fetch all cloud playlists for the user (with offline cache)
  const fetchCloudPlaylists = useCallback(async (uid) => {
    if (!uid) return;
    setCloudLoading(true);
    try {
      const queuesRef = collection(db, "users", uid, "queues");
      const snapshot = await getDocs(queuesRef);
      const playlists = {};
      const newSyncStatus = {};

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        playlists[docSnap.id] = {
          name: data.name || 'Untitled',
          lastModified: data.lastModified || null,
          itemCount: data.items ? data.items.length : 0,
        };
        // Cache the full playlist items locally for offline access
        saveMemory(getMemKey(`queue_items_${docSnap.id}`), data.items || []);
        if (data.lastModified) {
          saveMemory(getMemKey(`queue_modified_${docSnap.id}`), data.lastModified);
        }
      });

      // Cache the cloud playlists metadata for offline use
      saveMemory(getMemKey('cloudPlaylistsCache'), playlists);

      setCloudPlaylists(playlists);

      // Auto-import cloud playlists as local queues if not already present
      // This ensures they are available in the queue selector even offline
      let metaUpdated = false;
      const newQueues = [...queueMeta.queues];
      Object.entries(playlists).forEach(([cloudId, info]) => {
        if (!newQueues.find((q) => q.id === cloudId)) {
          newQueues.push({ id: cloudId, name: info.name, syncEnabled: true });
          metaUpdated = true;
        }
      });
      if (metaUpdated) {
        setQueueMeta((prev) => ({ ...prev, queues: newQueues }));
      }

      // Calculate sync status for each local queue
      queueMeta.queues.forEach((q) => {
        if (!q.syncEnabled) {
          newSyncStatus[q.id] = 'local'; // Not synced by choice
        } else if (playlists[q.id]) {
          // Compare timestamps
          const localModified = loadMemory(getMemKey(`queue_modified_${q.id}`), null);
          const cloudModified = playlists[q.id].lastModified;
          if (localModified && cloudModified && localModified === cloudModified) {
            newSyncStatus[q.id] = 'synced';
          } else {
            newSyncStatus[q.id] = 'unsynced';
          }
        } else {
          newSyncStatus[q.id] = 'local'; // Only on this device
        }
      });

      // Mark cloud-only playlists (ones not yet in local queues — shouldn't happen after auto-import above)
      Object.keys(playlists).forEach((cloudId) => {
        if (!newQueues.find((q) => q.id === cloudId)) {
          newSyncStatus[cloudId] = 'cloud-only';
        }
      });

      setSyncStatus(newSyncStatus);
    } catch (err) {
      if (err.code !== 'permission-denied') {
        console.error('Failed to fetch cloud playlists:', err);
      }
      // OFFLINE FALLBACK: Load cached cloud playlists metadata
      const cached = loadMemory(getMemKey('cloudPlaylistsCache'), null);
      if (cached && Object.keys(cached).length > 0) {
        setCloudPlaylists(cached);
        // All cached playlists items are already in localStorage (queue_items_<id>)
        // so they are accessible even offline
        const offlineStatus = {};
        Object.keys(cached).forEach((id) => {
          offlineStatus[id] = 'local'; // Show as local when offline
        });
        queueMeta.queues.forEach((q) => {
          if (!offlineStatus[q.id]) {
            offlineStatus[q.id] = 'local';
          }
        });
        setSyncStatus(offlineStatus);
      }
    } finally {
      setCloudLoading(false);
    }
  }, [queueMeta.queues, getMemKey]);

  // Load a cloud playlist into local queue
  const loadCloudPlaylist = useCallback(async (cloudQueueId) => {
    if (!user) return;
    try {
      const queueRef = doc(db, "users", user.uid, "queues", cloudQueueId);
      const docSnap = await getDoc(queueRef);
      if (!docSnap.exists()) {
        toast.error('Playlist not found in cloud');
        return;
      }
      const data = docSnap.data();
      const items = data.items || [];
      const name = data.name || 'Cloud Playlist';
      const lastModified = data.lastModified || new Date().toISOString();

      // Check if this queue already exists locally
      const existingQueue = queueMeta.queues.find((q) => q.id === cloudQueueId);
      if (existingQueue) {
        // Replace items in existing queue
        if (cloudQueueId === queueMeta.activeId) {
          isRemoteUpdate.current = true;
          setPrelistedItems(items);
        } else {
          saveMemory(getMemKey(`queue_items_${cloudQueueId}`), items);
        }
        saveMemory(getMemKey(`queue_modified_${cloudQueueId}`), lastModified);
        // Update sync status
        setSyncStatus((prev) => ({ ...prev, [cloudQueueId]: 'synced' }));
        toast.success(`Loaded "${name}" from cloud`);
      } else {
        // Create new local queue from cloud
        saveMemory(getMemKey(`queue_items_${cloudQueueId}`), items);
        saveMemory(getMemKey(`queue_modified_${cloudQueueId}`), lastModified);
        // Save current items before switching
        saveMemory(getMemKey(`queue_items_${queueMeta.activeId}`), prelistedItems);
        setQueueMeta((prev) => ({
          activeId: cloudQueueId,
          queues: [...prev.queues, { id: cloudQueueId, name, syncEnabled: true }],
        }));
        setPrelistedItems(items);
        setPrelistActiveId(null);
        setSyncStatus((prev) => ({ ...prev, [cloudQueueId]: 'synced' }));
        toast.success(`Imported "${name}" from cloud`);
      }
    } catch (err) {
      console.error('Failed to load cloud playlist:', err);
      toast.error('Failed to load playlist from cloud');
    }
  }, [user, queueMeta, prelistedItems, getMemKey]);

  // Force sync current queue to cloud
  const syncQueueNow = useCallback(async () => {
    if (!user || !activeQueueInfo) return;
    try {
      const queueRef = doc(db, "users", user.uid, "queues", queueMeta.activeId);
      const now = new Date().toISOString();
      const cloudItems = sanitizeItemsForCloud(prelistedItems);
      await setDoc(queueRef, {
        name: activeQueueInfo.name,
        items: cloudItems,
        lastModified: now,
      }, { merge: true });
      saveMemory(getMemKey(`queue_modified_${queueMeta.activeId}`), now);
      setSyncStatus((prev) => ({ ...prev, [queueMeta.activeId]: 'synced' }));
      toast.success('☁ Playlist synced to cloud');
      console.log('[SYNC] Manual sync success:', activeQueueInfo.name, `(${cloudItems.length} items)`);
      // Refresh cloud list
      fetchCloudPlaylists(user.uid);
    } catch (err) {
      console.error('[SYNC] Manual sync failed:', err);
      if (err.message && err.message.includes('maximum allowed size')) {
        toast.error('Playlist too large for cloud. Try removing some file items.');
      } else {
        toast.error('Sync failed: ' + (err.message || 'Unknown error'));
      }
    }
  }, [user, activeQueueInfo, queueMeta.activeId, prelistedItems, fetchCloudPlaylists, getMemKey]);

  // Sync Queue with Firestore (auto-sync when user is logged in)
  useEffect(() => {
    if (user && settings.cloudSyncEnabled !== false) {
      // Subscribe to Firestore subcollection for this queue
      const queueRef = doc(db, "users", user.uid, "queues", queueMeta.activeId);
      const unsubscribeSnapshot = onSnapshot(queueRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.items) {
            // Merge cloud items with local items to preserve file URLs
            // Cloud items may have '[local-file]' for file items since base64 is too large for Firestore
            const localItems = loadMemory(getMemKey(`queue_items_${queueMeta.activeId}`), []);
            const mergedItems = data.items.map(cloudItem => {
              // For ALL file items from cloud, restore the local base64 URL
              if (cloudItem.type === 'file') {
                const localMatch = localItems.find(li => li.id === cloudItem.id);
                if (localMatch && localMatch.url && localMatch.url !== '[local-file]') {
                  return { ...cloudItem, url: localMatch.url };
                }
              }
              return cloudItem;
            });

            isRemoteUpdate.current = true;
            setPrelistedItems(mergedItems);
            // Update local timestamp
            if (data.lastModified) {
              saveMemory(getMemKey(`queue_modified_${queueMeta.activeId}`), data.lastModified);
              setSyncStatus((prev) => ({ ...prev, [queueMeta.activeId]: 'synced' }));
            }
          }
        }
      }, (err) => {
        if (err.code !== 'permission-denied') {
          console.error('[SYNC] Snapshot listener error:', err);
        }
      });
      return () => unsubscribeSnapshot();
    }
  }, [user, queueMeta.activeId, getMemKey]);

  // Persistence Effect — always save locally, auto-sync to Firestore
  useEffect(() => {
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    // Always save to localStorage (backup + offline)
    saveMemory(getMemKey(`queue_items_${queueMeta.activeId}`), prelistedItems);

    // Auto-sync to Firestore when user is logged in and cloud sync is enabled
    if (user && settings.cloudSyncEnabled !== false) {
      const now = new Date().toISOString();
      const queueRef = doc(db, "users", user.uid, "queues", queueMeta.activeId);
      const cloudItems = sanitizeItemsForCloud(prelistedItems);
      setDoc(queueRef, {
        name: activeQueueInfo?.name || 'Untitled',
        items: cloudItems,
        lastModified: now,
      }, { merge: true })
        .then(() => {
          saveMemory(getMemKey(`queue_modified_${queueMeta.activeId}`), now);
          setSyncStatus((prev) => ({ ...prev, [queueMeta.activeId]: 'synced' }));
          console.log('[SYNC] Auto-synced:', activeQueueInfo?.name, `(${cloudItems.length} items)`);
        })
        .catch((err) => {
          if (err.code !== 'permission-denied') {
            console.error('[SYNC] Auto-sync failed:', err);
          }
          setSyncStatus((prev) => ({ ...prev, [queueMeta.activeId]: 'unsynced' }));
          if (err.message && err.message.includes('maximum allowed size')) {
            toast.error('☁ Playlist too large to sync. Remove some file items.', { id: 'sync-size-error' });
          }
        });
    } else {
      // Not logged in or sync disabled, mark as local
      setSyncStatus((prev) => ({ ...prev, [queueMeta.activeId]: 'local' }));
    }
  }, [prelistedItems, user, queueMeta.activeId, getMemKey]);

  // ---- Queue Management Functions ----
  const getUniqueQueueName = useCallback((baseName, existingQueues) => {
    let finalName = baseName || 'New Queue';
    if (!existingQueues.some(q => q.name.toLowerCase() === finalName.toLowerCase())) {
      return finalName;
    }
    
    let counter = 1;
    let testName = `${finalName}_${counter}`;
    while (existingQueues.some(q => q.name.toLowerCase() === testName.toLowerCase())) {
      counter++;
      testName = `${finalName}_${counter}`;
    }
    return testName;
  }, []);

  const createQueue = useCallback((name, syncEnabled = false) => {
    const uniqueName = getUniqueQueueName(name, queueMeta.queues);
    const newId = `q_${Date.now()}`;
    // Save current items before switching
    saveMemory(getMemKey(`queue_items_${queueMeta.activeId}`), prelistedItems);
    // Auto-enable sync when user is logged in
    const shouldSync = user ? true : syncEnabled;
    // Update meta
    setQueueMeta(prev => ({
      activeId: newId,
      queues: [...prev.queues, { id: newId, name: uniqueName, syncEnabled: shouldSync }]
    }));
    // Load empty queue
    setPrelistedItems([]);
    setPrelistActiveId(null);
  }, [queueMeta, prelistedItems, user, getMemKey, getUniqueQueueName]);

  const copyQueue = useCallback((id) => {
    const queueToCopy = queueMeta.queues.find(q => q.id === id);
    if (!queueToCopy) return;

    const newId = `q_${Date.now() + 1}`;
    const baseCopyName = `${queueToCopy.name}_copy`;
    const uniqueName = getUniqueQueueName(baseCopyName, queueMeta.queues);

    // Load items of the queue to copy
    // If it's the active queue, use current prelistedItems, otherwise load from memory
    const itemsToCopy = id === queueMeta.activeId 
      ? prelistedItems 
      : loadMemory(getMemKey(`queue_items_${id}`), []).filter(item => {
          if (item.type === 'file' && item.url && item.url.startsWith('blob:')) return false;
          return true;
        });

    // Save items to the new queue ID
    saveMemory(getMemKey(`queue_items_${newId}`), itemsToCopy);

    setQueueMeta(prev => ({
      ...prev,
      queues: [...prev.queues, { 
        id: newId, 
        name: uniqueName, 
        syncEnabled: user ? true : (queueToCopy.syncEnabled || false)
      }]
    }));

    toast.success(`Copied: ${uniqueName}`);
  }, [queueMeta, prelistedItems, getMemKey, getUniqueQueueName, user]);

  const switchQueue = useCallback((id) => {
    if (id === queueMeta.activeId) return;
    // Save current items
    saveMemory(getMemKey(`queue_items_${queueMeta.activeId}`), prelistedItems);
    // Load target queue items
    const loaded = loadMemory(getMemKey(`queue_items_${id}`), []).filter(item => {
      if (item.type === 'file' && item.url && item.url.startsWith('blob:')) return false;
      return true;
    });
    setPrelistedItems(loaded);
    setQueueMeta(prev => ({ ...prev, activeId: id }));
    setPrelistActiveId(null);
  }, [queueMeta.activeId, prelistedItems, getMemKey]);

  const deleteQueue = useCallback((id) => {
    if (queueMeta.queues.length <= 1) return; // Can't delete last queue
    const remaining = queueMeta.queues.filter(q => q.id !== id);
    const newActiveId = id === queueMeta.activeId ? remaining[0].id : queueMeta.activeId;

    // If deleting active queue, load the new active queue's items
    if (id === queueMeta.activeId) {
      const loaded = loadMemory(getMemKey(`queue_items_${newActiveId}`), []);
      setPrelistedItems(loaded);
      setPrelistActiveId(null);
    }

    // Remove from localStorage
    try { localStorage.removeItem(getMemKey(`queue_items_${id}`)); } catch(e) {}

    // Remove from Firestore if user is logged in
    if (user) {
      const queueRef = doc(db, "users", user.uid, "queues", id);
      deleteDoc(queueRef).catch(() => {});
    }

    setQueueMeta({ activeId: newActiveId, queues: remaining });
  }, [queueMeta, prelistedItems, user, getMemKey]);

  const renameQueue = useCallback((id, newName) => {
    setQueueMeta(prev => ({
      ...prev,
      queues: prev.queues.map(q => q.id === id ? { ...q, name: newName } : q)
    }));
  }, []);

  const toggleQueueSync = useCallback((id) => {
    setQueueMeta(prev => ({
      ...prev,
      queues: prev.queues.map(q => q.id === id ? { ...q, syncEnabled: !q.syncEnabled } : q)
    }));
  }, []);

  const addToRecent = useCallback((book, chapter, verse) => {
    setRecent((prev) => {
      const ref = `${book} ${chapter}:${verse}`;
      // Remove existing duplication (move to top)
      const filtered = prev.filter((r) => r !== ref);
      return [ref, ...filtered].slice(0, 20);
    });
  }, []);

  // ---- bible data + selection state + loaders
  const {
    kjvData,
    englishBible,
    tamilBookData,
    booksList,
    selectedBook,
    setSelectedBook,
    selectedChapter,
    setSelectedChapter,
    selectedVerse,
    setSelectedVerse,
    getEnglishVerse,
    getTamilVerse,
    chapterCountForSelectedBook,
    verseCountForSelectedChapter,
    versesLoading,
    versesError,
    loadInitialKJV, // called on mount
    loadTamilForBook,
  } = useBible();

  // ---- presentation (IPC) helpers
  const { sendToPresentation, sendPresentationPayload, openBlankPresentation } =
    usePresentation({
      getTamilVerse,
      getEnglishVerse,
    });



  // ---- search helpers
  const {
    search,
    setSearch,
    handleSearch,
    parseReference,
    findBook, // from useSearch
    showInputError,
  } = useSearch({
    getBibleSource: () => kjvData || englishBible,
    setSelectedBook,
    setSelectedChapter,
    setSelectedVerse,
    sendToPresentation,
    loadTamilForBook,
    selectedBook,
    addToRecent, // pass callback
    settings,
  });

  // Refs used for scroll-to-selected behavior (kept same names)
  const bookScrollRef = useRef(null);
  const chapterScrollRef = useRef(null);
  const verseScrollRef = useRef(null);
  const recentScrollRef = useRef(null);
  const verseTableRef = useRef(null);
  const searchInputRef = useRef(null); // Ref for search input to maintain focus
  const prelistRef = useRef(null);

  // load initial data on mount (same behaviour)
  useEffect(() => {
    loadInitialKJV();
    applyThemeGlobals(); // apply initial theme CSS etc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (selectedBook) {
      loadTamilForBook(selectedBook);
    }
  }, [selectedBook]);

  // smoothing scroll handlers are still inside App (they use refs)
  function smoothScrollToSelected(ref, selector) {
    if (!ref.current) return;
    const container = ref.current;
    const target = container.querySelector(selector);
    if (!target) return;

    container.scrollTo({
      top:
        target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    smoothScrollToSelected(bookScrollRef, `.book-item.selected`);
  }, [selectedBook]);

  // ---- GLOBAL KEYBOARD NAVIGATION FOR PLAYLIST ----
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (activeTab !== "prelisted") return;
      
      const tag = document.activeElement?.tagName;
      const isCE = document.activeElement?.contentEditable === "true";
      if (tag === "INPUT" || tag === "TEXTAREA" || isCE) {
        return;
      }

      const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "Enter", " ", "Escape"];
      if (keys.includes(e.key)) {
        if (e.key !== "Escape") e.preventDefault();
        
        if (["ArrowDown", "ArrowRight"].includes(e.key)) {
          prelistRef.current?.goNext();
        } else if (["ArrowUp", "ArrowLeft"].includes(e.key)) {
          prelistRef.current?.goPrev();
        } else if (e.key === "Enter" || e.key === " ") {
          prelistRef.current?.presentActive();
        } else if (e.key === "Escape") {
          handleClosePresentation();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeTab]);

  useEffect(() => {
    smoothScrollToSelected(chapterScrollRef, `.chapter-item.selected`);
  }, [selectedChapter]);

  useEffect(() => {
    smoothScrollToSelected(verseScrollRef, `.verse-item.selected`);
  }, [selectedVerse]);

  useEffect(() => {
    smoothScrollToSelected(verseTableRef, `tr[data-vn="${selectedVerse}"]`);
  }, [selectedBook, selectedChapter, selectedVerse]);

  // Focus search input when switching to bible tab
  useEffect(() => {
    if (activeTab === 'bible') {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [activeTab]);

  // Handle live preview: auto-update presentation when visual settings change
  const fontOffsets = [settings.tamilFontOffset, settings.englishFontOffset, settings.indexFontOffset].join();
  useEffect(() => {
    // Only auto-update if we are NOT in prelisted tab (they have independent cards) 
    // and not in blank mode, and we have a valid selection
    if (activeTab !== "prelisted" && !isBlankMode && selectedBook && selectedChapter && selectedVerse) {
      sendToPresentation({
        selectedBook,
        selectedChapter,
        selectedVerse,
        settings
      });
    }
  }, [fontOffsets, settings.presentationBgType, settings.presentationBgColor, settings.presentationBgImage, settings.presentationTextColor]);

  // Handle blank presentation toggle
  const handleBlankPresentation = useCallback(async () => {
    setIsBlankMode(true);
    // Open presentation window first
    if (window.api.openPresentation) {
      await window.api.openPresentation();
    }
    // Send null payload after a short delay to ensure the window is ready
    setTimeout(() => {
      window.electron.sendPresentation?.(null);
    }, 150);
  }, []);

  const handleClosePresentation = useCallback(() => {
    setIsBlankMode(false);
    window.api.closePresentation?.();
  }, []);

  // Navigation handlers as callbacks so they can be reused by buttons and IPC
  const handleNext = useCallback(() => {
    if (activeTab === 'prelisted' && prelistRef.current) {
      prelistRef.current.goNext();
      return;
    }
    if (isBlankMode) return;
    
    const source = kjvData || englishBible;
    if (!source) return;
    const book = source.books.find((b) => b.name === selectedBook);
    if (!book) return;
    const chIndex = book.chapters.findIndex((c) => +c.chapter === +selectedChapter);
    const chObj = book.chapters[chIndex];
    if (!chObj) return;

    let nextV = Number(selectedVerse) + 1;
    let nextC = selectedChapter;

    if (nextV > chObj.verses.length) {
      if (chIndex < book.chapters.length - 1) {
        nextC = +book.chapters[chIndex + 1].chapter;
        nextV = 1;
      } else {
        return; // stay at end
      }
    }

    setSelectedChapter(nextC);
    setSelectedVerse(nextV);
    sendToPresentation({
      selectedBook,
      selectedChapter: nextC,
      selectedVerse: nextV,
      settings,
    });
    addToRecent(selectedBook, nextC, nextV);
  }, [
    activeTab,
    isBlankMode,
    selectedBook,
    selectedChapter,
    selectedVerse,
    kjvData,
    englishBible,
    sendToPresentation,
    settings,
    addToRecent,
  ]);

  const handlePrev = useCallback(() => {
    if (activeTab === 'prelisted' && prelistRef.current) {
      prelistRef.current.goPrev();
      return;
    }
    if (isBlankMode) return;

    const source = kjvData || englishBible;
    if (!source) return;
    const book = source.books.find((b) => b.name === selectedBook);
    if (!book) return;
    const chIndex = book.chapters.findIndex((c) => +c.chapter === +selectedChapter);
    
    let prevV = Number(selectedVerse) - 1;
    let prevC = selectedChapter;

    if (prevV < 1) {
      if (chIndex > 0) {
        const prevCh = book.chapters[chIndex - 1];
        prevC = +prevCh.chapter;
        prevV = prevCh.verses.length || 1;
      } else {
        return; // stay at start
      }
    }

    setSelectedChapter(prevC);
    setSelectedVerse(prevV);
    sendToPresentation({
      selectedBook,
      selectedChapter: prevC,
      selectedVerse: prevV,
      settings,
    });
    addToRecent(selectedBook, prevC, prevV);
  }, [
    activeTab,
    isBlankMode,
    selectedBook,
    selectedChapter,
    selectedVerse,
    kjvData,
    englishBible,
    sendToPresentation,
    settings,
    addToRecent,
  ]);

  // ---- navigation (arrow keys, external prev/next)
  useNavigation({
    selectedBook,
    selectedChapter,
    selectedVerse,
    setSelectedChapter,
    setSelectedVerse,
    getBibleSource: () => kjvData || englishBible,
    activeTab,
    onNext: handleNext,
    onPrev: handlePrev,
  });

  // Wrapped handleSearch to maintain focus
  const handleSearchWithFocus = useCallback(() => {
    handleSearch();
    setIsBlankMode(false); // Exit blank mode when searching
    // Keep focus on search input after search
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [handleSearch]);

  // Handler for adding to prelist queue (passed to useSearch's handleSearch)
  const addToQueue = useCallback(async (book, chapter, verse) => {
    // 1. Fetch Tamil text for this verse specifically
    let tamilText = "";
    try {
      const filename = encodeURIComponent(book) + ".json";
      const res = await fetch(`./bible/tamil/${filename}`);
      if (res.ok) {
        const data = await res.json();
        // data structure match useBible's getTamilVerse logic
        if (Array.isArray(data.chapters)) {
          const ch = data.chapters.find((c) => Number(c.chapter) === Number(chapter));
          const v = ch?.verses?.find((vv) => Number(vv.verse) === Number(verse));
          if (v) tamilText = v.text;
        } else if (data[chapter] && Array.isArray(data[chapter].verses)) {
          const v = data[chapter].verses.find((vv) => Number(vv.verse) === Number(verse));
          if (v) tamilText = v.text;
        }
      }
    } catch (err) {
      console.error("Failed to fetch Tamil for queue:", err);
    }

    setPrelistedItems((prev) => [
      ...prev,
      { book, chapter, verse, id: Date.now() + Math.random(), tamilText },
    ]);
    toast.success(`Added ${book} ${chapter}:${verse} to queue`);
  }, []);

  const removeFromQueue = useCallback((id) => {
    setPrelistedItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    if (window.confirm("Are you sure you want to clear the queue?")) {
      setPrelistedItems([]);
    }
  }, []);

  const updateQueueItem = useCallback((id, updates) => {
    setPrelistedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      })
    );
  }, []);

  // Update reference and re-fetch Tamil
  const updateQueueReference = useCallback(async (id, book, chapter, verse) => {
    let tamilText = "";
    try {
      const filename = encodeURIComponent(book) + ".json";
      const res = await fetch(`./bible/tamil/${filename}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.chapters)) {
          const ch = data.chapters.find((c) => Number(c.chapter) === Number(chapter));
          const v = ch?.verses?.find((vv) => Number(vv.verse) === Number(verse));
          if (v) tamilText = v.text;
        } else if (data[chapter] && Array.isArray(data[chapter].verses)) {
          const v = data[chapter].verses.find((vv) => Number(vv.verse) === Number(verse));
          if (v) tamilText = v.text;
        }
      }
    } catch (err) {
      console.error("Failed to fetch Tamil for queue update:", err);
    }

    setPrelistedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // Update ref AND Tamil, clear manual overrides if any (optional, but safer to assume ref change resets content)
          // But we might want to keep highlighting? "Style Only" highlighting depends on content matching?
          // If text changes, highlighting marks might be misaligned. Resetting HTML is safer.
          return {
            ...item,
            book, chapter, verse, tamilText,
            tamilHtml: undefined, englishHtml: undefined
          };
        }
        return item;
      })
    );
  }, []);

  const moveQueueItem = useCallback((fromIndex, toIndex) => {
    setPrelistedItems((prev) => {
      const newItems = [...prev];
      if (fromIndex < 0 || fromIndex >= newItems.length || toIndex < 0 || toIndex >= newItems.length) return prev;

      const [movedItem] = newItems.splice(fromIndex, 1);
      newItems.splice(toIndex, 0, movedItem);
      return newItems;
    });
  }, []);

  const addFileToQueue = useCallback(async (fileObj, insertAfterId = null) => {
    // 1. Attempt to persist the file to the app's local media folder
    let localUrl = null;
    if (fileObj.path && window.electron?.saveMediaFile) {
      try {
        localUrl = await window.electron.saveMediaFile(fileObj.path);
      } catch (err) {
        console.error("Failed to persist file locally:", err);
      }
    }

    // 2. Also keep a preview URL (base64) for immediate/offline display in the playlist
    const reader = new FileReader();

    reader.onload = (e) => {
      const newItem = {
        id: Date.now() + Math.random(),
        type: 'file',
        name: fileObj.name,
        fileType: fileObj.type,
        url: e.target.result, // BASE64 DATA URL (Temporary/Session)
        localUrl: localUrl,   // Persistent Local URL (local-media://...)
        path: fileObj.path || ""
      };
      setPrelistedItems((prev) => {
        // Insert below active item if provided
        if (insertAfterId) {
          const idx = prev.findIndex((item) => item.id === insertAfterId);
          if (idx !== -1) {
            const newArr = [...prev];
            newArr.splice(idx + 1, 0, newItem);
            return newArr;
          }
        }
        // Fallback: append to end
        return [...prev, newItem];
      });
    };

    reader.onerror = (err) => {
      console.error("Failed to read file", err);
    };

    if (fileObj) {
      reader.readAsDataURL(fileObj);
    }
  }, []);

  const handlePrelistSearch = useCallback(() => {
    handleSearch(addToQueue);
    // Keep focus
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, [handleSearch, addToQueue]);


  // Register IPC listeners for keyboard shortcuts
  useEffect(() => {
    const cleanupNext = window.api?.onNavigateNext?.(handleNext);
    const cleanupPrev = window.api?.onNavigatePrev?.(handlePrev);

    return () => {
      cleanupNext?.();
      cleanupPrev?.();
    };
  }, [handleNext, handlePrev]);

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "arial rounded mt",
      }}
    >
      <Toaster position="top-right" />
      {/* HEADER BAR */}
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        openBlankPresentation={handleBlankPresentation}
        closePresentation={handleClosePresentation}
      />

      {/* MAIN CONTENT */}
      {activeTab === "bible" && (
        <div
          style={{
            display: "flex",
            gap: "20px",
            width: "100%",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* MAIN LAYOUT: Sidebar + content */}
          <div
            style={{
              display: "flex", // Nested flex to ensure full height?
              gap: "20px",
              width: "100%",
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Left Sidebar */}
            <div
              style={{
                width: "24%",
                minWidth: "280px",
                maxWidth: "420px",
                background: theme === "dark" ? "#0f0e0eff" : "#fff",
                color: theme === "dark" ? "white" : "black",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                overflow: "hidden",
                boxSizing: "border-box",
                borderRight:
                  theme === "dark" ? "1px solid #555" : "1px solid #999",
              }}
            >
              {/* Search input + previous/next buttons */}
              <div
                style={{
                  display: "flex", // Keep single row
                  gap: "8px", // Reduced gap
                  alignItems: "center",
                  width: "100%",
                  overflow: "hidden"
                }}
              >
                {/* Search bar with icon */}
                {/* Search bar container with focus styling */}
                <div
                  style={{
                    flex: 1,
                    minWidth: "0", // CRITICAL: Allow container to shrink
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 10px", // Compact padding
                    borderRadius: "6px",
                    transition:
                      "background 0.25s ease-in-out, color 0.25s ease-in-out, border-color 0.25s ease-in-out, box-shadow 0.25s ease-in-out",
                    background: theme === "dark" ? "#0f0e0eff" : "#fff",
                    cursor: "text",
                    border: theme === "dark" ? "1px solid #333" : "1px solid #ddd",
                  }}
                  className="search-container"
                  onClick={() => searchInputRef.current?.focus()}
                >
                  <input
                    ref={searchInputRef}
                    className="search-input"
                    placeholder="Reference 2sam 21 1" // Shortened placeholder
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    // Remove default outline to avoid double focus visual
                    onKeyDown={(e) => {
                      if (
                        [
                          "ArrowUp",
                          "ArrowDown",
                          "ArrowLeft",
                          "ArrowRight",
                        ].includes(e.key)
                      ) {
                        e.stopPropagation();
                      }
                      if (e.key === "Enter") handleSearchWithFocus();
                    }}
                    style={{
                      flex: 1,
                      minWidth: "0", // CRITICAL: Allow input to shrink
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: theme === "dark" ? "white" : "#000",
                      fontSize: "14px",
                      fontFamily: "inherit",
                    }}
                  />
                  {/* Search Icon Button */}
                  <span title="Search Verse" style={{ display: "flex", alignItems: "center" }}>
                    <svg
                      onClick={handleSearchWithFocus}
                      width="17"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={theme === "dark" ? "#888" : "#666"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        flexShrink: 0,
                        marginLeft: "1px",
                        cursor: "pointer",
                        transition: "stroke 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.stroke =
                          theme === "dark" ? "#00ff99" : "#003399";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.stroke =
                          theme === "dark" ? "#888" : "#666";
                      }}
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </span>
                </div>

                {/* Prev / Next buttons */}
                <button
                  title="Previous Verse"
                  onClick={handlePrev}
                  style={{
                    width: "35px", /* Increased touch target */
                    height: "35px",
                    minWidth: "35px",
                    minHeight: "35px",
                    padding: "0",
                    borderRadius: "50%",
                    fontSize: "15px",
                    background: theme === "dark" ? "#0f0e0eff" : "#eee",
                    color: theme === "dark" ? "white" : "black",
                    border:
                      theme === "dark" ? "1px solid #555" : "1px solid #999",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      theme === "dark" ? "#1a1a1a" : "#d3d3d3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      theme === "dark" ? "#0f0e0eff" : "#eee";
                  }}
                >
                  🡨
                </button>

                <button
                  title="Next Verse"
                  onClick={handleNext}
                  style={{
                    width: "35px", /* Increased touch target */
                    height: "35px",
                    minWidth: "35px",
                    minHeight: "35px",
                    padding: "0",
                    borderRadius: "50%",
                    fontSize: "15px",
                    background: theme === "dark" ? "#0f0e0eff" : "#eee",
                    color: theme === "dark" ? "white" : "black",
                    border:
                      theme === "dark" ? "1px solid #555" : "1px solid #999",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      theme === "dark" ? "#1a1a1a" : "#d3d3d3";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      theme === "dark" ? "#0f0e0eff" : "#eee";
                  }}
                >
                  🡪
                </button>
              </div>

              {/* Books / Chapters / Verses lists */}
              <div
                style={{ display: "flex", gap: "10px", flex: 1, minHeight: 0 }}
              >
                <BookList
                  booksList={booksList}
                  selectedBook={selectedBook}
                  setSelectedBook={(b) => {
                    setIsBlankMode(false); // Exit blank mode
                    setSelectedBook(b);
                    setSelectedChapter(1);
                    setSelectedVerse(1);
                  }}
                  bookScrollRef={bookScrollRef}
                  theme={theme}
                />

                <ChapterList
                  count={chapterCountForSelectedBook()}
                  selectedChapter={selectedChapter}
                  setSelectedChapter={(c) => {
                    setIsBlankMode(false); // Exit blank mode
                    setSelectedChapter(c);
                    setSelectedVerse(1);
                  }}
                  chapterScrollRef={chapterScrollRef}
                  theme={theme}
                />

                <VerseList
                  count={verseCountForSelectedChapter()}
                  selectedVerse={selectedVerse}
                  setSelectedVerse={(v) => {
                    setIsBlankMode(false); // Exit blank mode when selecting a verse
                    setSelectedVerse(v);
                    addToRecent(selectedBook, selectedChapter, v);
                  }}
                  verseScrollRef={verseScrollRef}
                  theme={theme}
                  selectedBook={selectedBook}
                  selectedChapter={selectedChapter}
                  sendToPresentation={sendToPresentation}
                  settings={settings}
                />
              </div>

              {/* Recent list */}
              <div style={{ marginTop: 20 }}>
                <RecentList
                  recent={recent}
                  onSelect={(ref) => {
                    setIsBlankMode(false); // Exit blank mode
                    const parsed = parseReference(ref);
                    if (!parsed) return;
                    const bookName = findBook(parsed.rawBook || parsed.book); // Try both
                    if (!bookName) return;

                    // 1. Update Local State (Scroll to verify) but DO NOT SEND to presentation
                    setSelectedBook(bookName);
                    setSelectedChapter(parsed.chapter);
                    setSelectedVerse(parsed.verse);
                    // No sendToPresentation()
                  }}
                  recentScrollRef={recentScrollRef}
                  theme={theme}
                />
              </div>
            </div>

            {/* Main table area (chapter table) */}
            <div style={{ flex: 1, padding: "5px" }}>
              <div
                ref={verseTableRef}
                style={{
                  height: "calc(100vh - 100px)",
                  overflowY: "auto",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: "12px",
                }}
              >
                <ChapterTable
                  kjvSource={kjvData || englishBible}
                  tamilBookData={tamilBookData}
                  selectedBook={selectedBook}
                  selectedChapter={selectedChapter}
                  selectedVerse={selectedVerse}
                  setSelectedVerse={(v) => {
                    setIsBlankMode(false); // Exit blank mode
                    setSelectedVerse(v);
                    addToRecent(selectedBook, selectedChapter, v);
                  }}
                  theme={theme}
                  sendToPresentation={sendToPresentation}
                  verseTableRef={verseTableRef}
                  settings={settings}
                />
              </div>
            </div>
          </div>
        </div>
      )}

{activeTab === "settings" && (
        <div style={{ background: theme === "dark" ? "#0f0e0eff" : "#fff" }}>
          <Settings settings={settings} setSettings={setSettings} user={user} />
        </div>
      )}

      {activeTab === "prelisted" && (
        <Prelist
          ref={prelistRef}
          theme={theme}
          handleSearch={handlePrelistSearch}
          handleNext={handleNext}
          handlePrev={handlePrev}
          searchInputRef={searchInputRef}
          prelistedItems={prelistedItems}
          bibleData={kjvData || englishBible}
          settings={settings}
          removeFromQueue={removeFromQueue}
          clearQueue={clearQueue}
          updateQueueItem={updateQueueItem}
          updateQueueReference={updateQueueReference}
          moveQueueItem={moveQueueItem}
          setPrelistedItems={setPrelistedItems}
          addFileToQueue={addFileToQueue}
          findBook={findBook}
          parseReference={parseReference}
          sendToPresentation={sendToPresentation}
          activeId={prelistActiveId}
          setActiveId={setPrelistActiveId}
          queueMeta={queueMeta}
          activeQueueInfo={activeQueueInfo}
          user={user}
          createQueue={createQueue}
          copyQueue={copyQueue}
          switchQueue={switchQueue}
          deleteQueue={deleteQueue}
          renameQueue={renameQueue}
          toggleQueueSync={toggleQueueSync}
          cloudPlaylists={cloudPlaylists}
          cloudLoading={cloudLoading}
          syncStatus={syncStatus}
          loadCloudPlaylist={loadCloudPlaylist}
          fetchCloudPlaylists={() => user && fetchCloudPlaylists(user.uid)}
          syncQueueNow={syncQueueNow}
        />
      )}
    </div>
  );
}
