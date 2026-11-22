import { GENRES, GENRE_BACKDROPS, SCENES, TRACKS } from '../data/tracks';
import { DEFAULT_STUDIO_VISUALS, loadSceneVisuals } from './publicScenesDB';
import { loadSavedTracksFromDB } from './storageDB';
import { loadUserPlaylists } from './userPlaylistsDB';
import { getSharedAudioContext } from './audioSynth';

// Track cached URLs to prevent duplicate network requests
const cachedImageUrls = new Set();
let preloadPromise = null;
let preloadStatus = {
  total: 0,
  loaded: 0,
  percent: 0,
  phase: 'idle',
  done: false
};

const listeners = new Set();

function emitProgress() {
  listeners.forEach(cb => {
    try {
      cb({ ...preloadStatus });
    } catch {}
  });
}

/**
 * Preload and asynchronously decode an image directly into GPU memory
 */
export function preloadImage(url) {
  if (!url || typeof url !== 'string') return Promise.resolve(false);
  const cleanUrl = url.trim();
  if (!cleanUrl || cleanUrl.startsWith('data:video/') || cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm')) {
    return Promise.resolve(false);
  }

  if (cachedImageUrls.has(cleanUrl)) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';

    const onFinish = () => {
      cachedImageUrls.add(cleanUrl);
      resolve(true);
    };

    img.onload = () => {
      // Decode image off main thread into bitmap/texture memory if supported
      if (typeof img.decode === 'function') {
        img.decode().then(onFinish).catch(onFinish);
      } else {
        onFinish();
      }
    };

    img.onerror = () => {
      // Mark resolved to not block pipeline on unreachable external URLs
      resolve(false);
    };

    img.src = cleanUrl;
  });
}

/**
 * Concurrency-limited worker pool for parallel downloading
 */
async function runWithConcurrency(items, limit, workerFn, onProgressItem) {
  let index = 0;
  const executing = new Set();

  async function next() {
    if (index >= items.length) return;
    const item = items[index++];
    const p = Promise.resolve().then(() => workerFn(item));
    executing.add(p);

    p.then(() => {
      executing.delete(p);
      if (onProgressItem) onProgressItem(item);
    }).catch(() => {
      executing.delete(p);
      if (onProgressItem) onProgressItem(item);
    });

    if (executing.size < limit && index < items.length) {
      await next();
    }
  }

  const starters = [];
  const initialBatch = Math.min(limit, items.length);
  for (let i = 0; i < initialBatch; i++) {
    starters.push(next());
  }

  await Promise.all(starters);

  while (executing.size > 0) {
    await Promise.race(executing);
    if (index < items.length) {
      await next();
    }
  }
}

/**
 * Preloads all genre backdrops, scene previews, studio visuals, top track covers,
 * and warms up IndexedDB stores during the loading/opening animation scene.
 */
export function preloadMusiclyAssets(onProgress) {
  if (onProgress && typeof onProgress === 'function') {
    listeners.add(onProgress);
    // Emit immediate current state
    onProgress({ ...preloadStatus });
  }

  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = (async () => {
    preloadStatus.phase = 'gathering';
    emitProgress();

    // 1. Gather all high-priority genre backdrops
    const genreBackdropUrls = Object.values(GENRE_BACKDROPS).filter(Boolean);

    // 2. Gather scene preview & theme backgrounds
    const sceneUrls = (SCENES || []).map(s => s.image).filter(Boolean);

    // 3. Gather curated studio wallpapers (Gojo, Astronaut, Zenitsu, etc.)
    const visualUrls = (DEFAULT_STUDIO_VISUALS || [])
      .filter(v => v.type === 'image' && v.url)
      .map(v => v.url);

    // 4. Gather train intro scenery chapters
    const introUrls = [
      '/assets/images/train_meadow.jpg',
      '/assets/images/train_city.jpg',
      '/assets/images/train_mountains.jpg',
      '/assets/images/train_night.jpg',
      '/assets/images/train_arrival.jpg',
      '/assets/images/train_window_frame.png'
    ];

    // 5. Gather top track covers for EACH genre
    const trackCoverUrls = [];
    const addedCoverUrls = new Set();

    // Add first 15 default tracks
    (TRACKS || []).slice(0, 15).forEach(t => {
      if (t.cover && !addedCoverUrls.has(t.cover)) {
        addedCoverUrls.add(t.cover);
        trackCoverUrls.push(t.cover);
      }
    });

    // Add top 5 tracks for each individual genre
    (GENRES || []).forEach(genre => {
      if (genre === 'All') return;
      const target = genre.toLowerCase();
      const genreMatches = (TRACKS || []).filter(t => {
        const matchGenre = t.genre?.toLowerCase() === target;
        const matchArray = Array.isArray(t.genres) && t.genres.some(g => g && g.toLowerCase() === target);
        const matchSplit = typeof t.genre === 'string' && t.genre.split(',').map(s => s.trim().toLowerCase()).includes(target);
        return matchGenre || matchArray || matchSplit;
      });

      genreMatches.slice(0, 5).forEach(t => {
        if (t.cover && !addedCoverUrls.has(t.cover)) {
          addedCoverUrls.add(t.cover);
          trackCoverUrls.push(t.cover);
        }
      });
    });

    // Combine and deduplicate all URLs in prioritized order:
    // P1: Genre Backdrops + Intro Landscapes
    // P2: Scene backdrops & Studio Visuals
    // P3: Top Genre Track Covers
    const prioritizedUrls = [
      ...new Set([
        ...introUrls,
        ...genreBackdropUrls,
        ...sceneUrls,
        ...visualUrls,
        ...trackCoverUrls
      ])
    ].filter(url => url && typeof url === 'string' && !url.endsWith('.mp4'));

    preloadStatus.total = prioritizedUrls.length;
    preloadStatus.loaded = 0;
    preloadStatus.percent = 0;
    preloadStatus.phase = 'preloading';
    emitProgress();

    // 6. Warm up background IndexedDB databases concurrently
    try {
      Promise.allSettled([
        loadSceneVisuals('minimal_studio'),
        loadSavedTracksFromDB(),
        loadUserPlaylists()
      ]).catch(() => {});
    } catch {}

    // 7. Warm up Web Audio context
    try {
      getSharedAudioContext();
    } catch {}

    // 8. Download & decode images with concurrency of 6 parallel requests
    const concurrency = 6;
    await runWithConcurrency(prioritizedUrls, concurrency, preloadImage, () => {
      preloadStatus.loaded += 1;
      preloadStatus.percent = Math.min(100, Math.round((preloadStatus.loaded / preloadStatus.total) * 100));
      emitProgress();
    });

    preloadStatus.done = true;
    preloadStatus.percent = 100;
    preloadStatus.phase = 'ready';
    emitProgress();

    if (typeof window !== 'undefined') {
      window.__musiclyPreloaded = true;
      window.__musiclyPreloadStats = {
        total: preloadStatus.total,
        cached: cachedImageUrls.size
      };
    }

    return true;
  })();

  return preloadPromise;
}

export function getPreloadStatus() {
  return { ...preloadStatus };
}
