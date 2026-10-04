import { useEffect, useRef } from 'react';
import { playTactileClickSound } from '../utils/audioSynth';

/**
 * Universal Button Tactile Feedback Hook
 * Intercepts button and clickable control interactions globally across the app
 * and triggers a crisp, modern Apple/Taptic-style tactile sound and physical haptic vibration.
 */
export function useButtonTactileFeedback() {
  const lastTactileRef = useRef(0);

  useEffect(() => {
    const isInteractiveButton = (target) => {
      if (!target || !(target instanceof Element)) return null;

      // Find nearest button or clickable element
      const btn = target.closest(
        'button, [role="button"], a[role="button"], .clickable-btn, .genre-pill, .glass-action-btn, .ctrl-icon-btn, .primary-play-btn, [class*="-btn"], [class*="btn-"], input[type="button"], input[type="submit"]'
      );

      if (!btn) return null;

      // Ignore disabled or explicitly muted buttons
      if (btn.disabled || btn.getAttribute('aria-disabled') === 'true') return null;
      if (btn.dataset.noTactile === 'true' || btn.dataset.noSound === 'true') return null;

      return btn;
    };

    const triggerFeedback = (target) => {
      const now = performance.now();
      // Debounce slightly to prevent double-firing between pointerdown and click
      if (now - lastTactileRef.current < 80) return;

      const btn = isInteractiveButton(target);
      if (!btn) return;

      lastTactileRef.current = now;

      const isAccent = 
        btn.classList.contains('primary-play-btn') || 
        btn.id === 'btn-play-pause' ||
        btn.classList.contains('active') ||
        btn.classList.contains('is-fav');

      playTactileClickSound(isAccent ? 'accent' : 'normal');
    };

    // Instant pointerdown: zero-latency response on mouse click or mobile touch
    const handlePointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      triggerFeedback(e.target);
    };

    // Click handler: catches keyboard triggers (Enter / Space) or any clicks not caught by pointerdown
    const handleClick = (e) => {
      triggerFeedback(e.target);
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });
    window.addEventListener('click', handleClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);
}
