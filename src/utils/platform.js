// Platform detection utilities for Musicly
export const isMac = typeof navigator !== 'undefined' && 
  (navigator.platform?.toUpperCase().indexOf('MAC') >= 0 || 
   navigator.userAgent?.toUpperCase().indexOf('MAC') >= 0);

export const modKeyName = isMac ? '⌘' : 'Ctrl';
export const modKeySymbol = isMac ? '⌘' : 'Ctrl';
export const modKeyFull = isMac ? 'Cmd' : 'Ctrl';

/**
 * Format a keyboard shortcut for display based on user OS
 */
export function formatShortcut(shortcut) {
  if (!shortcut) return '';
  return shortcut
    .replace(/\bMod\b/g, modKeyName)
    .replace(/\bCmdOrCtrl\b/g, modKeyName)
    .replace(/\bCtrlOrCmd\b/g, modKeyName);
}
