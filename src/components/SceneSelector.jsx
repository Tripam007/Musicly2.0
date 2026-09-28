import { useRef } from 'react';
import { X, Image as ImageIcon, Sun, Moon, Sparkles, Check, Crown } from 'lucide-react';
import { SCENES } from '../data/tracks';
import AppleGlassScrollbar from './AppleGlassScrollbar';

export default function SceneSelector({
  isOpen,
  onClose,
  currentScene,
  onSelectScene,
  overlayOpacity,
  onChangeOpacity,
  scenes = SCENES
}) {
  const scenesGridRef = useRef(null);

  if (!isOpen) return null;

  // Calculate intuitive brightness percentage (10% dim -> 100% bright)
  const currentBrightness = Math.round((1 - overlayOpacity) * 100);

  const minVal = 10;
  const maxVal = 100;
  // Precise track fill percentage matching the range thumb position exactly
  const fillPercent = Math.max(0, Math.min(100, ((currentBrightness - minVal) / (maxVal - minVal)) * 100));

  const handleBrightnessChange = (e) => {
    const brightnessPct = parseFloat(e.target.value);
    const newOpacity = 1 - (brightnessPct / 100);
    onChangeOpacity(newOpacity);
  };

  return (
    <div 
      className="modal-overlay vibe-modal-no-wheel" 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      <div 
        className="glass-modal-panel scene-panel vibe-modal-no-wheel" 
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <ImageIcon className="panel-title-icon" size={22} />
            <div>
              <h3>Room Themes & Backdrops</h3>
              <p>Customize your visual atmosphere, themes & interactive scenes</p>
            </div>
          </div>
          <button id="btn-close-scene" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Ambient Dark Dim / Brightness Slider (Left = Dim, Right = Bright) */}
        <div className="scene-dim-control">
          <div className="dim-labels">
            <span><Sun size={15} style={{ color: '#ffb703' }} /> Room Brightness</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#ffb703' }}>{currentBrightness}%</span>
          </div>
          <input
            type="range"
            min={minVal}
            max={maxVal}
            step="1"
            value={currentBrightness}
            onChange={handleBrightnessChange}
            className="dim-slider"
            style={{
              background: `linear-gradient(to right, #fb8500 0%, #ffb703 ${fillPercent}%, rgba(255,255,255,0.15) ${fillPercent}%, rgba(255,255,255,0.15) 100%)`
            }}
          />
        </div>

        {/* Scenes Scroll Container with Apple VisionOS Glass Scrollbar */}
        <div className="scenes-scroll-container vibe-modal-no-wheel" onWheel={(e) => e.stopPropagation()}>
          <div className="scenes-grid vibe-modal-no-wheel" ref={scenesGridRef} onWheel={(e) => e.stopPropagation()}>
            {scenes.map((scene) => {
              const isSelected = currentScene?.id === scene.id;

              return (
                <div
                  key={scene.id}
                  className={`scene-card apple-glass-scene-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectScene(scene)}
                >
                  {/* Full-bleed background image */}
                  <img src={scene.image} alt={scene.name} className="scene-bg-cover-img" />

                  {/* Subtle dark gradient scrim for contrast */}
                  <div className="scene-card-gradient-overlay" />

                  {/* Premium Bookmark Ribbon Badge (Crown logo only) */}
                  {(scene.isPremium || scene.id === 'vibe_carousel') && (
                    <div className="scene-premium-bookmark" title="Premium 3D Experience">
                      <Crown size={13} strokeWidth={2.4} className="scene-premium-crown" />
                    </div>
                  )}
                  
                  {/* Selection checkmark */}
                  {isSelected && (
                    <div className={`scene-check-badge ${(scene.isPremium || scene.id === 'vibe_carousel') ? 'pos-left' : ''}`}>
                      <Check size={13} strokeWidth={2.8} color="#000" />
                    </div>
                  )}

                  {/* Apple-style floating frosted glass title bar */}
                  <div className="scene-apple-glass-titlebar">
                    <span className="scene-apple-title">{scene.name}</span>
                  </div>
                </div>
              );
            })}

            {/* Coming Soon Vibes Banner at the end of scene box */}
            <div className="scenes-coming-soon-banner">
              <Sparkles size={14} className="scenes-coming-soon-icon" />
              <span className="scenes-coming-soon-text">More vibes coming soon. Stay tuned....</span>
            </div>
          </div>

          {/* Futuristic Apple Glass Pill Capsule Scrollbar */}
          <AppleGlassScrollbar targetRef={scenesGridRef} />
        </div>
      </div>
    </div>
  );
}

