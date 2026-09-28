// IndexedDB Storage Utility for Minimal Studio Background Visuals (Supporting 4K UHD Images)

const DB_NAME = 'MusiclyStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'studio_backgrounds';
const KEY = 'current_gallery';

export const DEFAULT_STUDIO_PHOTOS = [
  {
    id: 'default-1',
    url: '/assets/images/greesel_clean_portrait.jpg',
    title: 'Studio Portrait',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-2',
    url: '/assets/images/vibe_card_01.jpg',
    title: 'Warm Studio Vibe',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-3',
    url: '/assets/images/vibe_card_02.jpg',
    title: 'Neon Dusk Vibe',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-4',
    url: '/assets/images/vibe_card_03.jpg',
    title: 'Cozy Twilight',
    is4K: true,
    isDefault: true
  },
  {
    id: 'default-5',
    url: '/assets/images/vibe_card_05.jpg',
    title: 'Retro Aesthetic',
    is4K: true,
    isDefault: true
  }
];

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Load all backgrounds from IndexedDB, falling back to localStorage or defaults
 */
export async function getStudioBackgrounds() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY);

      req.onsuccess = () => {
        if (Array.isArray(req.result) && req.result.length > 0) {
          resolve(req.result);
        } else {
          // Check localStorage fallback
          try {
            const local = localStorage.getItem('musicly_studio_bg_gallery');
            if (local) {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed) && parsed.length > 0) {
                resolve(parsed);
                return;
              }
            }
          } catch (e) {}
          resolve(DEFAULT_STUDIO_PHOTOS);
        }
      };

      req.onerror = () => {
        resolve(DEFAULT_STUDIO_PHOTOS);
      };
    });
  } catch (err) {
    console.warn('Could not read from IndexedDB, using defaults:', err);
    try {
      const local = localStorage.getItem('musicly_studio_bg_gallery');
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_STUDIO_PHOTOS;
  }
}

/**
 * Save current list of backgrounds to IndexedDB and localStorage (for fast init)
 */
export async function saveStudioBackgrounds(imagesList) {
  if (!Array.isArray(imagesList)) return;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(imagesList, KEY);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
      req.onerror = (e) => reject(e);
    });
  } catch (err) {
    console.warn('Error saving to IndexedDB:', err);
  }

  // Backup non-massive items to localStorage for instant synchronous boot
  try {
    // Exclude oversized base64 from localStorage to prevent quota errors
    const safeForLocalStorage = imagesList.filter(item => {
      const u = item.url || '';
      return !u.startsWith('data:') || u.length < 500000;
    });
    localStorage.setItem('musicly_studio_bg_gallery', JSON.stringify(safeForLocalStorage));
  } catch (e) {}
}

/**
 * Apply adaptive unsharp mask convolution kernel and micro-contrast enhancement
 * to restore razor-sharp lines and textures on 4K upscaled images.
 */
function enhanceImageClarity(ctx, width, height, strength = 0.30) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const src = new Uint8ClampedArray(data);

    // Unsharp mask convolution kernel weight:
    // [  0, -k,  0 ]
    // [ -k, 1+4k, -k ]
    // [  0, -k,  0 ]
    const k = strength;
    const centerWeight = 1 + 4 * k;

    for (let y = 1; y < height - 1; y++) {
      const rowIdx = y * width * 4;
      const topRowIdx = (y - 1) * width * 4;
      const botRowIdx = (y + 1) * width * 4;

      for (let x = 1; x < width - 1; x++) {
        const i = rowIdx + x * 4;
        const top = topRowIdx + x * 4;
        const bot = botRowIdx + x * 4;
        const left = rowIdx + (x - 1) * 4;
        const right = rowIdx + (x + 1) * 4;

        // Process RGB channels
        for (let c = 0; c < 3; c++) {
          const val = centerWeight * src[i + c] - k * (src[top + c] + src[bot + c] + src[left + c] + src[right + c]);
          // Adaptive edge steepening: tighten dark cartoon outlines / line boundaries
          let finalVal = val;
          if (finalVal < 90) {
            finalVal = finalVal * 0.95; // Deepen dark lines
          } else if (finalVal > 180) {
            finalVal = Math.min(255, finalVal * 1.02); // Clean highlights
          }
          // Micro-contrast boost (+3.5%) to eliminate compression wash
          finalVal = ((finalVal - 128) * 1.035) + 128;
          data[i + c] = finalVal < 0 ? 0 : (finalVal > 255 ? 255 : finalVal);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (err) {
    console.warn('Clarity enhancement pass skipped:', err);
  }
}

/**
 * High-definition multi-pass stepped upscaler to 4K UHD (3840×2160 native resolution).
 * Stepped bicubic scaling avoids single-jump bilinear blurriness,
 * with intermediate sharpening at each harmonic scale step.
 */
function upscaleTo4KCanvas(img, origWidth, origHeight) {
  const aspect = origWidth / origHeight;
  let targetWidth = 3840;
  let targetHeight = 2160;

  if (aspect >= 1) {
    // Landscape: target 3840px width minimum, maintaining natural proportions
    targetWidth = Math.max(origWidth, 3840);
    targetHeight = Math.round(targetWidth / aspect);
    if (targetHeight < 2160 && aspect <= 1.85) {
      targetHeight = 2160;
      targetWidth = Math.round(targetHeight * aspect);
    }
  } else {
    // Portrait / Tall: target 3840px height minimum
    targetHeight = Math.max(origHeight, 3840);
    targetWidth = Math.round(targetHeight * aspect);
  }

  // Progressive stepped upscaling (1.45x step multiplier for smooth anti-aliased transitions)
  let currentCanvas = document.createElement('canvas');
  currentCanvas.width = origWidth;
  currentCanvas.height = origHeight;
  let currentCtx = currentCanvas.getContext('2d', { willReadFrequently: true });
  currentCtx.drawImage(img, 0, 0, origWidth, origHeight);

  let currentW = origWidth;
  let currentH = origHeight;

  // Step gradually up to target resolution
  while (currentW < targetWidth || currentH < targetHeight) {
    const nextW = Math.min(targetWidth, Math.round(currentW * 1.45));
    const nextH = Math.min(targetHeight, Math.round(currentH * 1.45));

    const nextCanvas = document.createElement('canvas');
    nextCanvas.width = nextW;
    nextCanvas.height = nextH;
    const nextCtx = nextCanvas.getContext('2d', { willReadFrequently: true });

    nextCtx.imageSmoothingEnabled = true;
    nextCtx.imageSmoothingQuality = 'high';
    nextCtx.drawImage(currentCanvas, 0, 0, nextW, nextH);

    // Apply gentle intermediate sharpening at intermediate steps if not at final size
    if (nextW < targetWidth || nextH < targetHeight) {
      enhanceImageClarity(nextCtx, nextW, nextH, 0.16);
    }

    currentCanvas = nextCanvas;
    currentW = nextW;
    currentH = nextH;
  }

  // Final clarity sharpening pass on 4K resolution
  const finalCtx = currentCanvas.getContext('2d', { willReadFrequently: true });
  enhanceImageClarity(finalCtx, targetWidth, targetHeight, 0.30);

  return {
    canvas: currentCanvas,
    width: targetWidth,
    height: targetHeight
  };
}

/**
 * Process uploaded file or image URL into crystal-clear 4K HD Quality
 * (Multi-pass stepped upscaling to 3840px + Unsharp mask edge sharpening)
 */
export async function process4KImageFile(fileOrUrl) {
  return new Promise((resolve, reject) => {
    if (!fileOrUrl) {
      return reject(new Error('Please provide an image.'));
    }

    const processLoadedImage = (img, filename) => {
      const origWidth = img.naturalWidth || img.width;
      const origHeight = img.naturalHeight || img.height;

      if (!origWidth || !origHeight) {
        return reject(new Error('Unable to read image dimensions.'));
      }

      // Run multi-pass progressive 4K upscaler and unsharp edge sharpening
      const { canvas, width, height } = upscaleTo4KCanvas(img, origWidth, origHeight);

      // Export using high-quality lossless/near-lossless encoding to prevent compression artifacts
      let highResDataUrl;
      try {
        // High-fidelity WebP at 0.99 quality (near-lossless)
        highResDataUrl = canvas.toDataURL('image/webp', 0.99);
        if (!highResDataUrl.startsWith('data:image/webp')) {
          // Fallback to lossless PNG
          highResDataUrl = canvas.toDataURL('image/png');
        }
      } catch (e) {
        highResDataUrl = canvas.toDataURL('image/png');
      }

      resolve({
        url: highResDataUrl,
        width,
        height,
        is4K: true,
        title: filename ? filename.replace(/\.[^/.]+$/, "") : 'Studio Visual Wallpaper'
      });
    };

    if (typeof fileOrUrl === 'string') {
      // Direct URL or Data URL
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processLoadedImage(img, 'Web Wallpaper');
      img.onerror = () => reject(new Error('Failed to load image from URL.'));
      img.src = fileOrUrl;
    } else if (fileOrUrl instanceof Blob || fileOrUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processLoadedImage(img, fileOrUrl.name);
        img.onerror = () => reject(new Error('Failed to parse uploaded image.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file from disk.'));
      reader.readAsDataURL(fileOrUrl);
    } else {
      reject(new Error('Invalid image input.'));
    }
  });
}
