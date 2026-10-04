import React, { forwardRef } from 'react';

/**
 * MusiclyLogo.jsx
 * High-end editorial typography for the MUSICLY hero wordmark:
 * - Crisp, thin-to-medium weight (400), wide letter spacing (0.22em)
 * - Soft warm white tone (#F0EFEA) with pristine clarity
 * - Extremely subtle microcopy underneath ("an immersive way to listen")
 * - Driven directly via ref at 60 FPS
 */
const MusiclyLogo = forwardRef(function MusiclyLogo(props, ref) {
  return (
    <div
      ref={ref}
      className="intro-logo-wrapper"
      style={{
        opacity: 0,
        transform: 'translate3d(0, 8px, 0)'
      }}
    >
      <h1 className="intro-musicly-serif-text" aria-label="Musicly">
        MUSICLY
      </h1>
      <span className="intro-microcopy">an immersive way to listen</span>
    </div>
  );
});

export default MusiclyLogo;
