import React, { forwardRef } from 'react';

/**
 * IntroTransition.jsx
 * Cinematic camera pass-through into the actual Musicly app (7.5s - 9.5s):
 * - Soft depth-of-field blur & amber light bloom
 * - Seamless physical revelation of the active room backdrop
 * - Zero hard cuts, zero white flashes, continuous studio portal
 */
const IntroTransition = forwardRef(function IntroTransition({ activeBackdrop = '/assets/images/cozy_bedroom.jpg' }, ref) {
  return (
    <div ref={ref} className="intro-transition-layer" aria-hidden="true" style={{ opacity: 0 }}>
      {/* Underlying Musicly Room Backdrop gradually emerging with depth */}
      <div
        className="intro-room-preview"
        style={{
          backgroundImage: `url(${activeBackdrop})`,
          opacity: 0,
          filter: 'blur(24px) brightness(0.72)',
          transform: 'scale(1.08)'
        }}
      />

      {/* Volumetric Studio Portal Bloom (Pass-through light bloom at 7.5s - 8.8s) */}
      <div
        className="intro-portal-light"
        style={{
          opacity: 0,
          transform: 'scale(1.0)'
        }}
      />

      {/* Soft Cinematic Scrim */}
      <div className="intro-transition-vignette" />
    </div>
  );
});

export default IntroTransition;
