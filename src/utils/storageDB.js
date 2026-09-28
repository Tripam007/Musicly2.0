// IndexedDB & Cloud Firestore storage utility for persisting custom uploaded audio files & YouTube link songs permanently
// Supports user-account associations (e.g. Gmail / Google Login) so tracks remain forever under the user's account until removed

import { extractYouTubeId } from './youtubePlayer';
import { generateInstantAudioBlob } from './audioDownloader';
import { resolveOriginalTrack } from './originalTrackResolver';
import { firestore } from '../firebase';
import { doc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { addStudioNotification } from './studioNotificationsDB';

const DB_NAME = 'MusiclyAppDB';
const DB_VERSION = 2;
const STORE_NAME = 'custom_audio_tracks';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
      } else {
        const store = e.target.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('userId')) {
          store.createIndex('userId', 'userId', { unique: false });
        }
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Helper to sanitize genre/sections
function extractCleanSections(genres, genre, fallbackTitle = '', fallbackArtist = '') {
  let cleanList = [];
  if (Array.isArray(genres)) {
    cleanList = genres.filter(g => g && typeof g === 'string' && g.trim().toLowerCase() !== 'custom').map(s => s.trim());
  }
  if (cleanList.length === 0 && genre && typeof genre === 'string') {
    cleanList = genre.split(',').map(s => s.trim()).filter(g => g && g.toLowerCase() !== 'custom');
  }

  if (cleanList.length === 0) {
    const combined = `${fallbackTitle} ${fallbackArtist}`.toLowerCase();
    if (combined.includes('piano man') || combined.includes('american pie') || combined.includes('billy joel') || combined.includes('mclean') || combined.includes('queen') || combined.includes('beatles')) {
      cleanList = ['Retro'];
    } else if (combined.includes('lofi') || combined.includes('lo-fi') || combined.includes('chillhop')) {
      cleanList = ['Lo-Fi'];
    } else if (combined.includes('synth') || combined.includes('retro wave') || combined.includes('synthwave')) {
      cleanList = ['Synthwave'];
    } else if (combined.includes('sleep') || combined.includes('rain') || combined.includes('calm')) {
      cleanList = ['Chill/Sleep'];
    } else if (combined.includes('meditation') || combined.includes('peace') || combined.includes('nature')) {
      cleanList = ['Peace'];
    } else {
      cleanList = ['Lo-Fi'];
    }
  }

  return {
    genres: cleanList,
    genre: cleanList.join(', ')
  };
}

// LocalStorage helpers for secondary instant redundancy
function saveToLocalCache(userId, record) {
  try {
    const safeRecord = { ...record };
    delete safeRecord.blob; // LocalStorage only accepts strings
    // Ephemeral blob: URLs become dead on reload; save YouTube URL or empty string instead
    if (safeRecord.audioUrl && safeRecord.audioUrl.startsWith('blob:')) {
      const ytId = safeRecord.youtubeId || extractYouTubeId(safeRecord.audioUrl);
      safeRecord.audioUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : '';
    }
    localStorage.setItem(`musicly_track_rec_${record.id}`, JSON.stringify(safeRecord));

    // Master list of all custom tracks on this device
    const masterRaw = localStorage.getItem('musicly_master_custom_tracks');
    const masterList = masterRaw ? JSON.parse(masterRaw) : [];
    const existingIndex = masterList.findIndex(t => t.id === record.id);
    if (existingIndex >= 0) {
      masterList[existingIndex] = safeRecord;
    } else {
      masterList.push(safeRecord);
    }
    localStorage.setItem('musicly_master_custom_tracks', JSON.stringify(masterList));

    if (userId) {
      const userKey = `musicly_user_tracks_${userId}`;
      const userRaw = localStorage.getItem(userKey);
      const userList = userRaw ? JSON.parse(userRaw) : [];
      if (!userList.some(t => t.id === record.id)) {
        userList.push(safeRecord);
        localStorage.setItem(userKey, JSON.stringify(userList));
      }
    }
  } catch (e) {}
}

function removeFromLocalCache(userId, trackId) {
  try {
    localStorage.removeItem(`musicly_track_rec_${trackId}`);

    // Clean master list
    const masterRaw = localStorage.getItem('musicly_master_custom_tracks');
    if (masterRaw) {
      const masterList = JSON.parse(masterRaw);
      const filtered = masterList.filter(t => t.id !== trackId);
      localStorage.setItem('musicly_master_custom_tracks', JSON.stringify(filtered));
    }

    if (userId) {
      const userKey = `musicly_user_tracks_${userId}`;
      const userRaw = localStorage.getItem(userKey);
      if (userRaw) {
        const userList = JSON.parse(userRaw);
        localStorage.setItem(userKey, JSON.stringify(userList.filter(t => t.id !== trackId)));
      }
    }

    // Clean any legacy keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('musicly_track_ids_') || key.startsWith('musicly_yt_') || key.startsWith('musicly_user_tracks_'))) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            if (Array.isArray(data)) {
              localStorage.setItem(key, JSON.stringify(data.filter(item => (typeof item === 'string' ? item !== trackId : item.id !== trackId))));
            }
          }
        } catch (e) {}
      }
    }
  } catch (e) {}
}

export function loadFromLocalCache(userId = null, userEmail = null) {
  try {
    const results = [];
    const seen = new Set();

    const addRecord = (item) => {
      if (!item || !item.id || seen.has(item.id)) return;
      if (userId) {
        const isMine = item.userId === userId || 
          (userEmail && item.userEmail && item.userEmail.toLowerCase() === userEmail.toLowerCase()) ||
          !item.userId || item.userId === 'guest';
        if (!isMine) return;
      }
      seen.add(item.id);

      const ytId = item.youtubeId || extractYouTubeId(item.audioUrl || '');
      const isYt = !!item.isYouTube || !!ytId;

      // Ephemeral blob: URLs become dead on reload; fallback to YouTube URL or empty string until hydrated from IndexedDB
      let cleanAudioUrl = item.audioUrl || '';
      if (cleanAudioUrl.startsWith('blob:')) {
        cleanAudioUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : '';
      }

      results.push({
        ...item,
        isCustom: true,
        isYouTube: isYt,
        youtubeId: ytId || null,
        language: item.language || 'English',
        genres: Array.isArray(item.genres) && item.genres.length > 0 ? item.genres : (item.genre ? item.genre.split(', ').map(s => s.trim()) : ['Lo-Fi']),
        genre: item.genre || 'Lo-Fi',
        audioUrl: cleanAudioUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : '')
      });
    };

    // 1. User-specific tracks key
    if (userId) {
      const userKey = `musicly_user_tracks_${userId}`;
      const userRaw = localStorage.getItem(userKey);
      if (userRaw) {
        try {
          const list = JSON.parse(userRaw);
          if (Array.isArray(list)) list.forEach(addRecord);
        } catch (e) {}
      }
    }

    // 2. Master custom tracks list
    const masterRaw = localStorage.getItem('musicly_master_custom_tracks');
    if (masterRaw) {
      try {
        const masterList = JSON.parse(masterRaw);
        if (Array.isArray(masterList)) masterList.forEach(addRecord);
      } catch (e) {}
    }

    // 3. Any individual records in local storage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('musicly_track_rec_')) {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          addRecord(item);
        } catch (e) {}
      }
    }

    return results;
  } catch (e) {
    return [];
  }
}

// Save a custom track (YouTube link song or uploaded audio file) with user credentials permanently
export async function saveTrackToDB(track, audioBlob = null, user = null) {
  try {
    const userId = (user && !user.isAnonymous) ? user.uid : 'guest';
    const userEmail = user?.email || null;

    const { genres: cleanGenres, genre: cleanGenre } = extractCleanSections(
      track.genres, 
      track.genre, 
      track.title, 
      track.artist
    );

    let ytId = track.youtubeId;
    if (!ytId && track.audioUrl) {
      ytId = extractYouTubeId(track.audioUrl);
    }
    const isYt = !!track.isYouTube || !!ytId;

    const isOffline = !!audioBlob || !!track.hasOfflineAudio || !!track.isOfflineDownloaded;
    let finalBlob = audioBlob || track.blob || null;
    if (isOffline && (!finalBlob || !(finalBlob instanceof Blob))) {
      finalBlob = generateInstantAudioBlob(cleanGenre, track.duration || 180);
    }

    const record = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      genre: cleanGenre,
      genres: cleanGenres,
      duration: track.duration || (isYt ? 240 : 180),
      cover: track.cover || (isYt ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'),
      isCustom: true,
      isYouTube: isYt,
      youtubeId: ytId || null,
      audioUrl: track.audioUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ''),
      userId: userId,
      userEmail: userEmail,
      language: track.language || 'English',
      createdAt: track.createdAt || Date.now(),
      blob: finalBlob,
      hasOfflineAudio: isOffline,
      isOfflineDownloaded: isOffline
    };

    // 1. Save to IndexedDB
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(record);
        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (dbErr) {
      console.warn("IndexedDB save notice:", dbErr);
    }

    // 2. Secondary Local Storage Cache (ensures instant persistence across sessions)
    saveToLocalCache(userId, record);

    // 3. Cloud Firestore sync for authenticated user accounts (runs in background, non-blocking)
    if (user && !user.isAnonymous && firestore) {
      try {
        const { blob: _, ...cloudRecord } = record;
        const trackDocRef = doc(firestore, 'users', user.uid, 'custom_tracks', String(record.id));
        setDoc(trackDocRef, cloudRecord, { merge: true }).catch(cloudErr => {
          console.warn("Firestore custom track cloud sync notice:", cloudErr);
        });
      } catch (cloudErr) {
        console.warn("Firestore custom track cloud sync notice:", cloudErr);
      }
    }

    try {
      addStudioNotification({
        type: 'song',
        title: 'New Song Added',
        message: `"${record.title}" by ${record.artist || 'Artist'} has been added to your studio catalog.`,
        meta: { songTitle: record.title, artist: record.artist, genre: record.genre, id: record.id }
      });
    } catch (e) {}

    return true;
  } catch (err) {
    console.error("Storage save error:", err);
    return false;
  }
}

// Load all saved custom & YouTube tracks from IndexedDB + LocalStorage + Cloud Firestore
export async function loadSavedTracksFromDB(user = null) {
  // If user is logged out or anonymous, DO NOT show any uploaded tracks
  if (!user || user.isAnonymous) {
    return [];
  }

  try {
    const db = await openDB();
    const currentUserId = user.uid;

    // 1. Fetch from IndexedDB
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });

    // 2. Fetch from LocalStorage cache & merge any missing records into IndexedDB
    const localCached = loadFromLocalCache(currentUserId, user.email);
    localCached.forEach(localRec => {
      if (!records.some(r => r.id === localRec.id)) {
        records.push(localRec);
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(localRec);
        } catch (e) {}
      }
    });

    // 3. Fetch from Cloud Firestore for this authenticated user account
    if (firestore) {
      try {
        const colRef = collection(firestore, 'users', user.uid, 'custom_tracks');
        const snap = await getDocs(colRef);
        snap.forEach(docSnap => {
          const cloudData = docSnap.data();
          if (cloudData && cloudData.id) {
            const existingIdx = records.findIndex(r => r.id === cloudData.id);
            if (existingIdx >= 0) {
              records[existingIdx] = { ...cloudData, ...records[existingIdx] };
            } else {
              records.push(cloudData);
            }
            saveToLocalCache(user.uid, cloudData);
            try {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).put(cloudData);
            } catch (e) {}
          }
        });
      } catch (cloudErr) {
        console.warn("Firestore load custom tracks notice:", cloudErr);
      }
    }

    // 4. Automatically claim any unassigned or guest local tracks on this device for the logged-in account, and sync to Cloud
    records.forEach(rec => {
      if (!rec) return;
      const isMine = rec.userId === user.uid || 
        (user.email && rec.userEmail && rec.userEmail.toLowerCase() === user.email.toLowerCase()) ||
        !rec.userId || rec.userId === 'guest';

      if (isMine) {
        rec.userId = user.uid;
        if (user.email) rec.userEmail = user.email;
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(rec);
        } catch (e) {}
        saveToLocalCache(user.uid, rec);
        if (firestore) {
          try {
            const { blob: _, ...cloudRecord } = rec;
            const trackDocRef = doc(firestore, 'users', user.uid, 'custom_tracks', String(rec.id));
            setDoc(trackDocRef, cloudRecord, { merge: true });
          } catch (e) {}
        }
      }
    });

    // 5. Filter strictly for this logged-in account (by UID or Email)
    const userAccountRecords = records.filter(rec => {
      if (!rec) return false;
      if (rec.userId === user.uid) return true;
      if (user.email && rec.userEmail && rec.userEmail.toLowerCase() === user.email.toLowerCase()) return true;
      return false;
    });

    // 6. Deduplicate by ID
    const seenIds = new Set();
    const uniqueRecords = [];
    for (const rec of userAccountRecords) {
      if (rec && rec.id && !seenIds.has(rec.id)) {
        seenIds.add(rec.id);
        uniqueRecords.push(rec);
      }
    }

    const tracks = uniqueRecords.map((rec) => {
      const { genres: cleanGenres, genre: cleanGenre } = extractCleanSections(
        rec.genres,
        rec.genre,
        rec.title,
        rec.artist
      );

      let ytId = rec.youtubeId;
      if (!ytId && rec.audioUrl && !rec.audioUrl.startsWith('blob:')) {
        ytId = extractYouTubeId(rec.audioUrl);
      }
      let cleanUrl = rec.audioUrl || '';
      if (cleanUrl && (cleanUrl.includes('itunes') || cleanUrl.includes('AudioPreview'))) {
        cleanUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : '';
      }
      const isYt = !!rec.isYouTube || !!ytId || (cleanUrl && !!extractYouTubeId(cleanUrl));

      let finalBlob = rec.blob;
      if (finalBlob && !(finalBlob instanceof Blob) && finalBlob.byteLength !== undefined) {
        finalBlob = new Blob([finalBlob], { type: 'audio/wav' });
      }

      // Offline blobs are only for uploaded files without a YouTube stream
      const isOffline = !isYt && (!!finalBlob || !!rec.hasOfflineAudio || !!rec.isOfflineDownloaded);

      if (isOffline && (!finalBlob || !(finalBlob instanceof Blob))) {
        finalBlob = generateInstantAudioBlob(cleanGenre, rec.duration || 180);
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put({
            ...rec,
            blob: finalBlob,
            hasOfflineAudio: true,
            isOfflineDownloaded: true
          });
        } catch (e) {}
      }

      let audioUrl = '';
      if (isYt && ytId) {
        audioUrl = `https://www.youtube.com/watch?v=${ytId}`;
      } else if (finalBlob instanceof Blob) {
        audioUrl = URL.createObjectURL(finalBlob);
      } else if (cleanUrl && !cleanUrl.startsWith('blob:') && !cleanUrl.startsWith('data:')) {
        audioUrl = cleanUrl;
      }

      return {
        id: rec.id,
        title: rec.title,
        artist: rec.artist,
        genre: cleanGenre,
        genres: cleanGenres,
        duration: rec.duration || (isYt ? 240 : 180),
        cover: rec.cover || (isYt ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80'),
        audioUrl: audioUrl || (ytId ? `https://www.youtube.com/watch?v=${ytId}` : ''),
        isCustom: true,
        isYouTube: isYt,
        youtubeId: ytId || null,
        language: rec.language || 'English',
        userId: rec.userId || currentUserId || 'guest',
        userEmail: rec.userEmail || user?.email || null,
        hasOfflineAudio: isOffline,
        isOfflineDownloaded: isOffline,
        blob: finalBlob || null
      };
    });

    return tracks.map(t => resolveOriginalTrack(t));
  } catch (err) {
    console.error("Storage load error:", err);
    if (!user || user.isAnonymous) return [];
    const fallbackLocal = loadFromLocalCache(user.uid);
    const userFallback = fallbackLocal.filter(rec => {
      if (rec.userId === user.uid) return true;
      if (user.email && rec.userEmail && rec.userEmail.toLowerCase() === user.email.toLowerCase()) return true;
      return false;
    });
    return userFallback.map(rec => resolveOriginalTrack({
      ...rec,
      isCustom: true,
      audioUrl: rec.audioUrl || (rec.youtubeId ? `https://www.youtube.com/watch?v=${rec.youtubeId}` : '')
    }));
  }
}

// Delete a custom / YouTube track permanently from IndexedDB, LocalStorage, and Cloud Firestore
export async function deleteTrackFromDB(trackId, user = null) {
  try {
    const userId = (user && !user.isAnonymous) ? user.uid : 'guest';

    // 1. Delete from IndexedDB
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(trackId);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });

    // 2. Delete from LocalStorage cache
    removeFromLocalCache(userId, trackId);

    // 3. Delete from Cloud Firestore if authenticated
    if (user && !user.isAnonymous && firestore) {
      try {
        const trackDocRef = doc(firestore, 'users', user.uid, 'custom_tracks', String(trackId));
        await deleteDoc(trackDocRef);
      } catch (cloudErr) {
        console.warn("Firestore delete custom track notice:", cloudErr);
      }
    }

    return true;
  } catch (err) {
    console.error("Storage delete error:", err);
    return false;
  }
}

// Update section/genres for a custom track permanently in IndexedDB, LocalStorage & Cloud
export async function updateTrackGenresInDB(trackId, newGenres, user = null) {
  try {
    const userId = (user && !user.isAnonymous) ? user.uid : 'guest';
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(trackId);

      getReq.onsuccess = async () => {
        const record = getReq.result;
        if (record) {
          const { genres: cleanGenres, genre: cleanGenre } = extractCleanSections(
            newGenres,
            Array.isArray(newGenres) ? newGenres.join(', ') : newGenres,
            record.title,
            record.artist
          );
          record.genres = cleanGenres;
          record.genre = cleanGenre;
          store.put(record);

          saveToLocalCache(userId, record);

          if (user && !user.isAnonymous && firestore) {
            try {
              const trackDocRef = doc(firestore, 'users', user.uid, 'custom_tracks', String(trackId));
              await setDoc(trackDocRef, { genres: cleanGenres, genre: cleanGenre }, { merge: true });
            } catch (e) {}
          }
          resolve(true);
        } else {
          resolve(false);
        }
      };

      getReq.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("Storage update track genres error:", err);
    return false;
  }
}

