/**
 * MusiclyActionRegistry.js
 * 
 * Centralized, authoritative execution layer for ALL Musicly interactions:
 * - Keyboard Shortcuts
 * - Mouse / Touch UI
 * - Air Controls (Webcam Hand Gestures)
 * - Voice AI Controls ("Hey Musicly")
 * 
 * Guarantees zero duplicated player logic and strict authorization.
 */

import { MUSICLY_ACTIONS } from './voiceConfig.js';

let defaultRegistryInstance = null;

export class MusiclyActionRegistry {
  constructor() {
    this.handlers = new Map();
    this.contextProvider = () => ({});
  }

  static getInstance() {
    if (!defaultRegistryInstance) {
      defaultRegistryInstance = new MusiclyActionRegistry();
    }
    return defaultRegistryInstance;
  }

  /**
   * Set context provider (provides current state: currentTrack, isPlaying, volume, user, isAdmin, etc.)
   */
  setContextProvider(provider) {
    if (typeof provider === 'function') {
      this.contextProvider = provider;
    }
  }

  /**
   * Register an action handler function
   * @param {string} actionKey - Must be in MUSICLY_ACTIONS
   * @param {Function} handler - (params, context) => Promise<string|void>
   */
  register(actionKey, handler) {
    if (!actionKey) return;
    if (!Object.values(MUSICLY_ACTIONS).includes(actionKey)) {
      console.warn(`[MusiclyActionRegistry] Invalid or unrecognized actionKey: ${actionKey}`);
    }
    this.handlers.set(actionKey, handler);
  }

  /**
   * Resolve canonical action key from input
   */
  _canonicalAction(key) {
    if (!key) return null;
    const str = String(key).trim();
    // Normalize aliases
    if (str === 'PLAY_NEXT') return MUSICLY_ACTIONS.NEXT_TRACK;
    if (str === 'PLAY_PREV' || str === 'PLAY_PREVIOUS') return MUSICLY_ACTIONS.PREVIOUS_TRACK;
    if (str === 'TOGGLE') return MUSICLY_ACTIONS.TOGGLE_PLAY;
    return str;
  }

  /**
   * Execute an action safely across any interaction mode
   * @param {object} actionObj - { action?: string, type?: string, params?: object, [key: string]: any }
   * @returns {Promise<{ success: boolean, responseText?: string, error?: string }>}
   */
  async execute(actionObj) {
    if (!actionObj) {
      return { success: false, error: 'No action specified' };
    }

    const rawAction = actionObj.action || actionObj.type;
    const action = this._canonicalAction(rawAction);

    if (!action) {
      return { success: false, error: 'No valid action specified' };
    }

    // Extract params, supporting both actionObj.params, actionObj.payload, or flattened properties
    const params = {
      ...(actionObj.params || actionObj.payload || {}),
      ...actionObj
    };
    delete params.action;
    delete params.type;
    delete params.params;
    delete params.payload;

    const handler = this.handlers.get(action);
    if (!handler) {
      console.warn(`[MusiclyActionRegistry] No handler registered for ${action}`);
      return { success: false, error: `Handler not registered for ${action}` };
    }

    const context = this.contextProvider() || {};

    // Server-side / context authorization check for admin commands
    if (action.startsWith('ADMIN_')) {
      if (!context.isAdmin) {
        return {
          success: false,
          responseText: 'Admin access required for this command.',
          error: 'Unauthorized'
        };
      }
    }

    try {
      const responseText = await handler(params, context);
      return {
        success: true,
        responseText: responseText || null
      };
    } catch (err) {
      console.error(`[MusiclyActionRegistry] Execution error on ${action}:`, err);
      return {
        success: false,
        error: err?.message || 'Action execution error',
        responseText: "Sorry, I couldn't complete that action."
      };
    }
  }
}
