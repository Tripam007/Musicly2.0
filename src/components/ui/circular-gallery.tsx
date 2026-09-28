import React, { useState, useEffect, useRef, HTMLAttributes } from 'react';

// A simple utility for conditional class names
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(' ');
}

// Define the type for a single gallery item
export interface GalleryItem {
  common: string;
  binomial: string;
  photo: {
    url: string; 
    text: string;
    pos?: string;
    by: string;
  };
  track?: any;
  isPlaying?: boolean;
  onClick?: () => void;
}

// Define the props for the CircularGallery component
export interface CircularGalleryProps extends HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[];
  /** Controls how far the items are from the center. */
  radius?: number;
  /** Controls the speed of auto-rotation when not scrolling. */
  autoRotateSpeed?: number;
  /** Allow manual mouse drag / touch rotation */
  enableDrag?: boolean;
  /** Custom click handler on an item */
  onItemClick?: (item: GalleryItem, index: number) => void;
}

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius = 600, autoRotateSpeed = 0.02, enableDrag = true, onItemClick, ...props }, ref) => {
    const [rotation, setRotation] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Pointer drag state
    const isDraggingRef = useRef(false);
    const dragStartXRef = useRef(0);
    const dragStartRotationRef = useRef(0);
    const dragMovedRef = useRef(false);

    // Effect to handle scroll-based rotation (for tall pages / demo)
    useEffect(() => {
      const handleScroll = () => {
        setIsScrolling(true);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollProgress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
        const scrollRotation = scrollProgress * 360;
        setRotation(scrollRotation);

        scrollTimeoutRef.current = setTimeout(() => {
          setIsScrolling(false);
        }, 150);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    // Effect for auto-rotation when not scrolling or dragging
    useEffect(() => {
      const autoRotate = () => {
        if (!isScrolling && !isDraggingRef.current && autoRotateSpeed !== 0) {
          setRotation(prev => (prev + autoRotateSpeed) % 360);
        }
        animationFrameRef.current = requestAnimationFrame(autoRotate);
      };

      animationFrameRef.current = requestAnimationFrame(autoRotate);

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [isScrolling, autoRotateSpeed]);

    // Handle mouse wheel on gallery container
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      const delta = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * 0.12;
      setRotation(prev => (prev + delta) % 360);

      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 250);
    };

    // Pointer drag handlers
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!enableDrag) return;
      isDraggingRef.current = true;
      dragStartXRef.current = e.clientX;
      dragStartRotationRef.current = rotation;
      dragMovedRef.current = false;
      setIsScrolling(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartXRef.current;
      if (Math.abs(dx) > 4) {
        dragMovedRef.current = true;
      }
      // Rotate proportionally to horizontal drag distance
      const sensitivity = 0.22;
      setRotation((dragStartRotationRef.current + dx * sensitivity) % 360);
    };

    const handlePointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 300);
    };

    const anglePerItem = items.length > 0 ? 360 / items.length : 360;
    
    return (
      <div
        ref={ref}
        role="region"
        aria-label="Circular 3D Gallery"
        className={cn("relative w-full h-full flex items-center justify-center select-none cursor-grab active:cursor-grabbing", className)}
        style={{ perspective: '2000px', touchAction: 'pan-y' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        {...props}
      >
        <div
          className="relative w-full h-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
            transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const totalRotation = ((rotation % 360) + 360) % 360;
            const relativeAngle = (itemAngle + totalRotation + 360) % 360;
            const normalizedAngle = Math.abs(relativeAngle > 180 ? 360 - relativeAngle : relativeAngle);
            const opacity = Math.max(0.25, 1 - (normalizedAngle / 180));
            const isFrontCard = normalizedAngle < 40;
            const isCurrentlyPlaying = !!(item.isPlaying || item.track?.isPlaying);

            return (
              <div
                key={(item.photo?.url || i) + '-' + i} 
                role="group"
                aria-label={item.common}
                className={cn(
                  "absolute w-[300px] h-[400px] cursor-pointer transition-transform duration-300",
                  isFrontCard ? "hover:scale-105 z-20" : "z-10"
                )}
                style={{
                  transform: `rotateY(${itemAngle}deg) translateZ(${radius}px)`,
                  left: '50%',
                  top: '50%',
                  marginLeft: '-150px',
                  marginTop: '-200px',
                  opacity: opacity,
                  transition: 'opacity 0.3s linear, transform 0.25s ease-out'
                }}
                onClick={(e) => {
                  // Only click if didn't drag extensively
                  if (!dragMovedRef.current) {
                    if (item.onClick) item.onClick();
                    if (onItemClick) onItemClick(item, i);
                  }
                }}
              >
                <div className={cn(
                  "relative w-full h-full rounded-2xl shadow-2xl overflow-hidden group backdrop-blur-xl border transition-all duration-300",
                  isCurrentlyPlaying 
                    ? "border-amber-400 ring-4 ring-amber-400/40 shadow-[0_0_35px_rgba(251,191,36,0.6)] bg-card/90" 
                    : "border-white/20 hover:border-white/50 bg-card/70 dark:bg-card/30"
                )}>
                  <img
                    src={item.photo.url}
                    alt={item.photo.text}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    style={{ objectPosition: item.photo.pos || 'center' }}
                  />

                  {/* Top Status Badges: Playing Indicator & Genre */}
                  <div className="absolute top-3 inset-x-3 flex items-center justify-between z-10 pointer-events-none">
                    {item.photo.by ? (
                      <span className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-black/60 backdrop-blur-md text-amber-300 border border-white/15">
                        {item.photo.by}
                      </span>
                    ) : <span />}

                    {isCurrentlyPlaying ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-black font-bold text-xs shadow-lg animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-black" />
                        <span>PLAYING</span>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90 group-hover:bg-amber-400 group-hover:text-black transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="translate-x-0.5">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Gradient Card Overlay with Title and Artist */}
                  <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent text-white">
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold truncate group-hover:text-amber-300 transition-colors">
                          {item.common}
                        </h2>
                        <em className="text-xs not-italic text-slate-300 block truncate mt-0.5">
                          {item.binomial}
                        </em>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

CircularGallery.displayName = 'CircularGallery';

export { CircularGallery };
