/**
 * Audio System Manager for Musicly
 * Ensures audio playback routes strictly through the browser/OS default output device
 * (built-in speakers, wired headphones, USB/HDMI, Bluetooth) without device-locking.
 */

/**
 * Purge any legacy device IDs or mode flags that may have been stored in past sessions
 * to guarantee that stale Bluetooth IDs or sink overrides never hijack the output.
 */
export function purgeLegacyAudioSettings() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('musicly_audio_output_mode');
      localStorage.removeItem('musicly_audio_output_device_id');
      localStorage.removeItem('musicly_audio_device');
    }
  } catch (e) {}
}

/**
 * Log standard diagnostic information
 */
export function logAudioOutputDiagnostics() {
  console.log('[Musicly Audio] Output: default');
  console.log('[Musicly Audio] Playback device: browser default');
}

/**
 * Clean normalized volume clamped between 0.0 and 1.0
 */
export function normalizeVolume(vol) {
  if (vol === undefined || vol === null || isNaN(vol)) return 0.85;
  return Math.max(0, Math.min(1, Number(vol)));
}
