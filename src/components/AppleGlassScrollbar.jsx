import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * AppleGlassScrollbar
 * A futuristic Apple VisionOS-inspired floating glass capsule scrollbar
 * with cylindrical glass pill, amber glow thumb, glowing white center bead,
 * and top/bottom micro-chevrons.
 * Optimized with direct DOM GPU transforms for 120fps stutter-free performance.
 */
export default function AppleGlassScrollbar({
  targetRef,
  className = '',
  showChevrons = true,
  labels = false,
  autoHide = false
}) {
  const trackRef = useRef(null);
  const thumbRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const metricsRef = useRef({
    thumbHeight: 40,
    maxTop: 100,
    availableScroll: 0
  });

  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  // Sync scroll position directly to DOM without causing React re-renders
  const updateThumb = useCallback(() => {
    const el = targetRef?.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!el || !track || !thumb) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const trackHeight = track.clientHeight;

    if (scrollHeight <= clientHeight || trackHeight <= 0) {
      if (isVisible) setIsVisible(false);
      thumb.style.opacity = '0';
      return;
    }

    if (!isVisible) setIsVisible(true);
    thumb.style.opacity = '1';

    const availableScroll = scrollHeight - clientHeight;
    const scrollRatio = Math.max(0, Math.min(1, scrollTop / availableScroll));

    const rawThumbHeight = (clientHeight / scrollHeight) * trackHeight;
    const thumbHeight = Math.max(36, Math.min(trackHeight * 0.65, rawThumbHeight));
    const maxTop = trackHeight - thumbHeight;
    const thumbTop = scrollRatio * maxTop;

    metricsRef.current = {
      thumbHeight,
      maxTop,
      availableScroll
    };

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translate3d(0, ${thumbTop.toFixed(2)}px, 0)`;
  }, [targetRef, isVisible]);

  // Set up listeners for scroll and size changes
  useEffect(() => {
    const el = targetRef?.current;
    if (!el) return;

    updateThumb();

    let rAFId = null;
    const handleScroll = () => {
      if (rAFId) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(updateThumb);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });

    const ro = new ResizeObserver(() => {
      if (rAFId) cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(updateThumb);
    });
    ro.observe(el);

    return () => {
      if (rAFId) cancelAnimationFrame(rAFId);
      el.removeEventListener('scroll', handleScroll);
      ro.disconnect();
    };
  }, [targetRef, updateThumb]);

  // Dragging logic
  const handlePointerDownThumb = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const el = targetRef?.current;
    if (!el) return;

    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = el.scrollTop;

    const handlePointerMove = (moveEvent) => {
      const deltaY = moveEvent.clientY - dragStartY.current;
      const { maxTop, availableScroll } = metricsRef.current;
      if (maxTop <= 0) return;

      const scrollDelta = (deltaY / maxTop) * availableScroll;
      el.scrollTop = dragStartScrollTop.current + scrollDelta;
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Click on track to jump
  const handleTrackClick = (e) => {
    const track = trackRef.current;
    const el = targetRef?.current;
    if (!track || !el || e.target.closest('.apple-glass-scroll-thumb')) return;

    const rect = track.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const trackHeight = track.clientHeight;
    const { thumbHeight, maxTop, availableScroll } = metricsRef.current;
    if (maxTop <= 0) return;

    const targetTop = clickY - thumbHeight / 2;
    const ratio = Math.max(0, Math.min(1, targetTop / maxTop));
    const targetScroll = ratio * availableScroll;

    el.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  };

  // Chevron step scroll
  const handleStep = (direction) => {
    const el = targetRef?.current;
    if (!el) return;
    const step = 150;
    el.scrollBy({
      top: direction === 'up' ? -step : step,
      behavior: 'smooth'
    });
  };

  if (!isVisible && autoHide) {
    return null;
  }

  return (
    <div
      className={`apple-glass-scrollbar-wrapper vibe-modal-no-wheel ${className} ${isDragging ? 'is-dragging' : ''} ${isHovered ? 'is-hovered' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={(e) => {
        const el = targetRef?.current;
        if (el) {
          el.scrollTop += e.deltaY;
        }
      }}
    >
      {/* Main Glass Pill Capsule */}
      <div className="apple-glass-scrollbar-pill">
        {/* Top Chevron Button */}
        {showChevrons && (
          <button
            type="button"
            className="apple-glass-chevron-btn chevron-up"
            onClick={() => handleStep('up')}
            title="Scroll Up"
            tabIndex={-1}
          >
            <ChevronUp size={11} strokeWidth={2.8} />
          </button>
        )}

        {/* Interior Track Groove */}
        <div
          ref={trackRef}
          className="apple-glass-track-groove"
          onClick={handleTrackClick}
        >
          {/* Active Glowing Thumb Bar */}
          <div
            ref={thumbRef}
            className="apple-glass-scroll-thumb"
            onPointerDown={handlePointerDownThumb}
          >
            {/* Glowing amber bar body */}
            <div className="thumb-amber-core" />

            {/* Glowing White Center Sphere Bead */}
            <div className="thumb-white-bead" />
          </div>
        </div>

        {/* Bottom Chevron Button */}
        {showChevrons && (
          <button
            type="button"
            className="apple-glass-chevron-btn chevron-down"
            onClick={() => handleStep('down')}
            title="Scroll Down"
            tabIndex={-1}
          >
            <ChevronDown size={11} strokeWidth={2.8} />
          </button>
        )}
      </div>
    </div>
  );
}
