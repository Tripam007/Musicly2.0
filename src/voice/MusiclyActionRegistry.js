/**
 * MusiclyActionRegistry.js
 *
 * Centralized, validated execution layer for all Musicly actions.
 * Ensures strict security:
 * - No dynamic code execution (eval, Function, arbitrary methods).
 * - Every voice command maps directly to a predefined MUSICLY_ACTIONS enum key.
 * - Handles authentication/authorization checks for sensitive/admin commands.
 */

import { MUSICLY_ACTIONS } from './voiceConfig.js';

export class MusiclyActionRegistry {
  constructor() {
    this.handlers = new Map();
    this.contextProvider = () => ({});
  }

  /**
   * Set context provider (provides current state: currentTrack, isPlaying, user, isAdmin, etc.)
   */
  setContextProvider(provider) {
    if (typeof provider === 'function') {
      this.contextProvider = provider;
    }
  }

  /**
   * Register an action handler function
   * @param {string} actionKey - Must be in MUSICLY_ACTIONS
   * @param {Function} handler - (params, context) => Promise<string|void> (returns optional speech response)
   */
  register(actionKey, handler) {
    if (!Object.values(MUSICLY_ACTIONS).includes(actionKey)) {
      console.error(`[MusiclyActionRegistry] Invalid actionKey: ${actionKey}`);
      return;
    }
    this.handlers.set(actionKey, handler);
  }

  /**
   * Execute an action safely
   * @param {Object} actionObj - { action: MUSICLY_ACTIONS, params: {...}, rawCommand: string }
   * @returns {Promise<{ success: boolean, responseText?: string, error?: string }>}
   */
  async execute(actionObj) {
    if (!actionObj || !actionObj.action) {
      return { success: false, error: 'No action specified' };
    }

    const { action } = actionObj;
    const params = actionObj.params || actionObj.payload || {};

    // Security check: Only allow predefined actions in enum
    if (!Object.values(MUSICLY_ACTIONS).includes(action)) {
      console.warn(`[MusiclyActionRegistry] Blocked illegal action: ${action}`);
      return { success: false, error: 'Action not allowed' };
    }

    const handler = this.handlers.get(action);
    if (!handler) {
      console.warn(`[MusiclyActionRegistry] No handler registered for ${action}`);
      return { success: false, error: `Handler not registered for ${action}` };
    }

    const context = this.contextProvider() || {};

    // Admin authorization check if action requires admin
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
        error: err.message,
        responseText: "Sorry, I couldn't complete that action."
      };
    }
  }
}
