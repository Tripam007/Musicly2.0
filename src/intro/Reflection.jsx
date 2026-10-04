import React, { forwardRef } from 'react';

/**
 * Reflection.jsx
 * Realistic dark matte/glossy floor reflection & dynamic directional shadow:
 * - NO water, NO ripples, NO puddles.
 * - Understated floor reflection (15-25% opacity) with soft vertical fading.
 * - Dynamic contact shadow and directional cast shadow responding to virtual light/mouse.
 * - Driven directly via ref at 60 FPS without React re-renders.
 */
const Reflection = forwardRef(function Reflection(props, ref) {
  return (
    <div
      ref={ref}
      className="intro-reflection-stage"
      aria-hidden="true"
    >
      {/* 1. Dynamic Directional Cast Shadow (Physically moves opposite to mouse light) */}
      <div className="intro-directional-shadow" />

      {/* 2. Soft Contact Shadow (Directly at the baseline of the wordmark) */}
      <div className="intro-contact-shadow" />

      {/* 3. Subtle Floor Specular Sheen (Softly shifts with virtual light) */}
      <div className="intro-floor-specular-light" />

      {/* 4. Mirrored Wordmark (15-25% opacity, vertical gradient fade into dark floor) */}
      <div className="intro-reflection-body">
        <div className="intro-reflection-text">
          MUSICLY
        </div>
      </div>
    </div>
  );
});

export default Reflection;
