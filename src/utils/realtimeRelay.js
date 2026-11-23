// Real-time Cross-Device Sync Relay Service for Musicly
// Operates via ultra-fast Server-Sent Events (SSE) and HTTP pub-sub
// Guarantees real-time state synchronization across all devices even if Firebase Firestore is offline/unconfigured.

const RELAY_TOPIC = 'musicly_sync_relay_2026_9fb78';
const RELAY_BASE = `https://ntfy.sh/${RELAY_TOPIC}`;

/**
 * Converts a data URL to a binary Blob for uploading
 */
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Uploads a base64 data URL to the relay CDN and returns the direct public CDN URL
 */
async function uploadDataUrlToRelay(dataUrl, filename = 'visual.jpg') {
  try {
    const blob = dataUrlToBlob(dataUrl);
    const resp = await fetch(RELAY_BASE, {
      method: 'POST',
      headers: {
        'Filename': filename
      },
      body: blob
    });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
    const data = await resp.json();
    return data.attachment?.url || dataUrl;
  } catch (err) {
    console.warn("Relay attachment upload notice:", err);
    return dataUrl;
  }
}

/**
 * Broadcasts a scene theme image override to all other connected devices
 */
export async function broadcastSceneOverride(sceneId, imageUrl) {
  if (!sceneId || !imageUrl) return;

  let finalUrl = imageUrl;
  if (imageUrl.startsWith('data:')) {
    finalUrl = await uploadDataUrlToRelay(imageUrl, `scene_${sceneId}.jpg`);
  }

  const payload = {
    action: 'SCENE_OVERRIDE',
    sceneId,
    image: finalUrl,
    timestamp: Date.now()
  };

  try {
    await fetch(RELAY_BASE, {
      method: 'POST',
      headers: {
        'Title': 'Scene Theme Update',
        'Tags': 'art,refresh'
      },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn("Relay broadcast scene override notice:", err);
  }

  return finalUrl;
}

/**
 * Broadcasts a scene reset to default across all devices
 */
export async function broadcastSceneReset(sceneId) {
  if (!sceneId) return;
  const payload = {
    action: 'RESET_SCENE_OVERRIDE',
    sceneId,
    timestamp: Date.now()
  };

  try {
    await fetch(RELAY_BASE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (err) {}
}

/**
 * Broadcasts Minimal Studio visual changes (active selection and/or gallery)
 */
export async function broadcastStudioVisual(activeIndex, backgrounds = null) {
  const payload = {
    action: 'STUDIO_VISUAL_UPDATE',
    activeIndex,
    backgrounds: Array.isArray(backgrounds) ? backgrounds.slice(0, 15) : null,
    timestamp: Date.now()
  };

  try {
    await fetch(RELAY_BASE, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  } catch (err) {}
}

/**
 * Subscribes to real-time events via EventSource (SSE) + startup poll
 * Runs on every device so that any change on device A instantly updates device B.
 */
export function initRealtimeRelay(handlers = {}) {
  if (typeof window === 'undefined') return () => {};

  let eventSource = null;
  let isClosed = false;

  const processMessage = (rawMsg) => {
    try {
      let data = rawMsg;
      if (typeof rawMsg === 'string') {
        data = JSON.parse(rawMsg);
      }
      if (!data || !data.action) return;

      if (data.action === 'SCENE_OVERRIDE' && data.sceneId && data.image) {
        handlers.onSceneOverride?.(data.sceneId, data.image);
      } else if (data.action === 'RESET_SCENE_OVERRIDE' && data.sceneId) {
        handlers.onSceneReset?.(data.sceneId);
      } else if (data.action === 'STUDIO_VISUAL_UPDATE') {
        handlers.onStudioVisual?.(data.activeIndex, data.backgrounds);
      }
    } catch {}
  };

  // 1. Initial catch-up poll (fetches latest cached messages on startup)
  fetch(`${RELAY_BASE}/json?poll=1`)
    .then(r => r.text())
    .then(text => {
      if (isClosed || !text) return;
      const lines = text.trim().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          if (item?.message) {
            processMessage(item.message);
          }
        } catch {}
      }
    })
    .catch(() => {});

  // 2. Persistent Real-time EventSource connection
  try {
    eventSource = new EventSource(`${RELAY_BASE}/sse`);
    eventSource.onmessage = (event) => {
      if (isClosed || !event?.data) return;
      try {
        const item = JSON.parse(event.data);
        if (item?.message) {
          processMessage(item.message);
        }
      } catch {}
    };

    eventSource.onerror = () => {
      // Automatic reconnection is handled natively by EventSource
    };
  } catch (err) {
    console.warn("EventSource setup notice:", err);
  }

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
