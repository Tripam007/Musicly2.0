import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Copy, 
  CheckCheck, 
  ChevronRight,
  RefreshCw,
  Pipette
} from 'lucide-react';
import { STUDIO_THEMES } from '../data/studioThemes';

const QUICK_ACCENT_PRESETS = [
  { hex: '#F59E0B', label: 'Solar Amber' },
  { hex: '#10B981', label: 'Emerald Jade' },
  { hex: '#06B6D4', label: 'Cyan Wave' },
  { hex: '#8B5CF6', label: 'Cosmic Violet' },
  { hex: '#F43F5E', label: 'Crimson Dusk' },
  { hex: '#71717A', label: 'Titanium' }
];

export default function StudioThemePaletteModal({
  isOpen,
  onClose,
  currentTheme,
  onSelectTheme,
  autoTheme = null,
  isAutoTheme = false,
  onToggleAutoTheme = () => {},
  onSelectCustomHex = () => {}
}) {
  const [copiedHex, setCopiedHex] = useState(null);
  const [hoveredSwatchIndex, setHoveredSwatchIndex] = useState(null);
  const [customHexInput, setCustomHexInput] = useState(currentTheme?.accent || '#F59E0B');
  const modalRef = useRef(null);

  // Keep customHexInput in sync when theme changes
  useEffect(() => {
    if (currentTheme?.accent) {
      setCustomHexInput(currentTheme.accent);
    }
  }, [currentTheme]);

  // Close on Escape key or handle Left/Right arrow navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const curIdx = STUDIO_THEMES.findIndex(t => t.id === currentTheme.id);
        if (curIdx >= 0) {
          const nextIdx = (curIdx + 1) % STUDIO_THEMES.length;
          onSelectTheme(STUDIO_THEMES[nextIdx]);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const curIdx = STUDIO_THEMES.findIndex(t => t.id === currentTheme.id);
        if (curIdx >= 0) {
          const prevIdx = (curIdx - 1 + STUDIO_THEMES.length) % STUDIO_THEMES.length;
          onSelectTheme(STUDIO_THEMES[prevIdx]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentTheme, onSelectTheme, onClose]);

  // Handle copy hex code
  const handleCopyHex = (hex, e) => {
    if (e) e.stopPropagation();
    navigator.clipboard?.writeText(hex).then(() => {
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 2200);
    }).catch(() => {});
  };

  const handleCustomColorChange = (hex) => {
    setCustomHexInput(hex);
    onSelectCustomHex(hex);
  };

  if (!isOpen) return null;

  const currentThemeIdx = STUDIO_THEMES.findIndex(t => t.id === currentTheme.id);
  const displayNumber = isAutoTheme 
    ? 'AUTO' 
    : (currentTheme.id?.startsWith('custom_') 
        ? 'HEX' 
        : (currentThemeIdx >= 0 
            ? (currentThemeIdx + 1 < 10 ? `0${currentThemeIdx + 1}` : currentThemeIdx + 1) 
            : '01'));

  return (
    <div 
      className="palette-modal-backdrop" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="palette-modal-title"
    >
      <div className="palette-modal-container" ref={modalRef}>
        {/* Clean Top Header Bar */}
        <header className="palette-modal-header">
          <h2 id="palette-modal-title" className="palette-modal-title">
            Studio Color Themes
          </h2>

          <button 
            type="button" 
            className="palette-modal-close-btn"
            onClick={onClose}
            title="Close theme selector (Esc)"
          >
            <X size={18} />
          </button>
        </header>

        {/* Main 2-Column Split: Picture 2 Card Showcase (Left) + Palette Gallery List (Right) */}
        <div className="palette-modal-body">
          {/* =================================================================
              COLUMN 1: THE ACCURATE PIC-2 CASCADING SWATCH CARD SHOWCASE
             ================================================================= */}
          <div className="palette-showcase-column">
            <div 
              className="palette-reference-card"
              style={{ background: currentTheme.cardGradient }}
            >
              {/* Top Card Details */}
              <div className="palette-card-top-meta">
                <div className="palette-card-number-badge">
                  {displayNumber}
                </div>
                <div className={`palette-card-active-pill ${isAutoTheme ? 'pill-is-auto' : ''}`}>
                  <span className={`palette-live-pulse-dot ${isAutoTheme ? 'is-auto-pulse' : ''}`} />
                  <span>{isAutoTheme ? 'ACTIVE (AUTO-SYNC)' : 'ACTIVE ATMOSPHERE'}</span>
                </div>
              </div>

              {/* The Cascading Overlapping Pill Deck */}
              <div className="palette-cascading-deck" aria-label="Cascading color pills">
                {(currentTheme.swatches || []).map((hex, idx) => {
                  const isHovered = hoveredSwatchIndex === idx;
                  const isDark = idx < (currentTheme.darkSwatchesCount || 4);
                  const isLast = idx === (currentTheme.swatches?.length || 6) - 1;
                  const shadeName = currentTheme.shadeNames?.[idx] || `Shade 0${idx + 1}`;

                  return (
                    <div
                      key={hex + idx}
                      className={`palette-stacked-pill ${isHovered ? 'pill-is-hovered' : ''} ${isLast ? 'pill-is-front' : ''}`}
                      style={{
                        backgroundColor: hex,
                        zIndex: idx + 2,
                        top: `${idx * 40}px`
                      }}
                      onMouseEnter={() => setHoveredSwatchIndex(idx)}
                      onMouseLeave={() => setHoveredSwatchIndex(null)}
                      onClick={(e) => handleCopyHex(hex, e)}
                      title={`Click to copy ${hex} (${shadeName})`}
                    >
                      <div className="palette-pill-inner">
                        <div className="palette-pill-left">
                          <span 
                            className="palette-pill-hex"
                            style={{ color: isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(10, 20, 20, 0.95)' }}
                          >
                            {hex.toUpperCase()}
                          </span>
                          {isHovered && (
                            <span 
                              className="palette-pill-shade-tag"
                              style={{ 
                                color: isDark ? 'rgba(255, 255, 255, 0.75)' : 'rgba(10, 20, 20, 0.75)',
                                background: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                              }}
                            >
                              {shadeName}
                            </span>
                          )}
                        </div>

                        <div className="palette-pill-right">
                          <span 
                            className="palette-pill-copy-badge"
                            style={{ 
                              color: isDark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(10, 20, 20, 0.85)',
                              borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.2)'
                            }}
                          >
                            {copiedHex === hex ? <CheckCheck size={12} /> : <Copy size={11} />}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Details */}
              <div className="palette-card-bottom-signature">
                <span className="palette-cursive-signature">{currentTheme.name}</span>
                <span className="palette-sub-vibe">{currentTheme.subtitle}</span>
              </div>
            </div>
          </div>

          {/* =================================================================
              COLUMN 2: CURATED PALETTES LIST / GRID + AUTO THEME & CUSTOM COLOR
             ================================================================= */}
          <div className="palette-catalog-column">
            {/* FEATURED: Real-time Adaptive Atmosphere from Active Background Visual */}
            {autoTheme && (
              <div 
                className={`palette-item-card palette-auto-backdrop-card ${isAutoTheme ? 'is-active-theme is-auto-focused' : ''}`}
                onClick={() => onToggleAutoTheme(true)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleAutoTheme(true);
                  }
                }}
              >
                <div className="palette-item-header">
                  <div className="palette-item-title-wrap">
                    <div className="palette-auto-badge">
                      <Sparkles size={11} />
                      <span>BACKGROUND ADAPTIVE</span>
                    </div>
                    <h4 className="palette-item-name">{autoTheme.name}</h4>
                    <p className="palette-item-sub">Extracted in real-time from active background</p>
                  </div>

                  {isAutoTheme ? (
                    <div className="palette-active-check" title="Currently active & synced with background">
                      <Check size={14} strokeWidth={2.5} />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="palette-auto-sync-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAutoTheme(true);
                      }}
                    >
                      <RefreshCw size={11} />
                      <span>Sync</span>
                    </button>
                  )}
                </div>

                {/* Miniature Cascading Swatch Pills Deck */}
                <div 
                  className="palette-mini-deck-wrap"
                  style={{ background: autoTheme.cardGradient }}
                >
                  <div className="palette-mini-stacked-pills">
                    {autoTheme.swatches.map((hex, sIdx) => {
                      const isLast = sIdx === autoTheme.swatches.length - 1;
                      const isDark = sIdx < (autoTheme.darkSwatchesCount || 4);

                      return (
                        <div
                          key={hex + sIdx}
                          className={`palette-mini-pill ${isLast ? 'mini-pill-front' : ''}`}
                          style={{
                            backgroundColor: hex,
                            zIndex: sIdx + 1,
                            top: `${sIdx * 12}px`
                          }}
                        >
                          <span 
                            className="palette-mini-hex"
                            style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}
                          >
                            {hex}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Accent Highlights */}
                <div className="palette-item-footer">
                  <div className="palette-swatch-circles">
                    {autoTheme.swatches.map((hex, cIdx) => (
                      <span 
                        key={hex + cIdx}
                        className="palette-color-circle"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                  <span className="palette-apply-tag">
                    {isAutoTheme ? 'ACTIVE (AUTO)' : 'SYNC WITH BG'}
                  </span>
                </div>
              </div>
            )}

            {/* CUSTOM TINT COLOR PICKER BAR */}
            <div className="palette-custom-tint-bar">
              <div className="palette-custom-tint-left">
                <label className="palette-custom-picker-wrap" title="Pick any custom color for atmosphere">
                  <input 
                    type="color" 
                    value={customHexInput.startsWith('#') ? customHexInput : '#F59E0B'} 
                    onChange={(e) => handleCustomColorChange(e.target.value)}
                    className="palette-native-color-input"
                  />
                  <span 
                    className="palette-color-preview-circle" 
                    style={{ backgroundColor: customHexInput }}
                  >
                    <Pipette size={12} color={customHexInput > '#888888' ? '#000' : '#fff'} />
                  </span>
                  <div className="palette-custom-meta">
                    <span className="palette-custom-title">Custom Accent</span>
                    <span className="palette-custom-hex">{customHexInput.toUpperCase()}</span>
                  </div>
                </label>
              </div>

              <div className="palette-quick-chips">
                {QUICK_ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    className={`palette-preset-chip ${customHexInput.toUpperCase() === preset.hex.toUpperCase() ? 'chip-active' : ''}`}
                    style={{ backgroundColor: preset.hex }}
                    onClick={() => handleCustomColorChange(preset.hex)}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            {/* CATALOG HEADER FOR CURATED THEMES */}
            <div className="palette-catalog-header">
              <span className="palette-catalog-count">
                {STUDIO_THEMES.length} CURATED THEMES
              </span>
              <span className="palette-catalog-hint">
                Select any theme to override or customize
              </span>
            </div>

            <div className="palette-cards-grid">
              {STUDIO_THEMES.map((theme) => {
                const isActive = !isAutoTheme && theme.id === currentTheme.id;

                return (
                  <div
                    key={theme.id}
                    className={`palette-item-card ${isActive ? 'is-active-theme' : ''}`}
                    onClick={() => onSelectTheme(theme)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectTheme(theme);
                      }
                    }}
                  >
                    <div className="palette-item-header">
                      <div className="palette-item-title-wrap">
                        <h4 className="palette-item-name">{theme.name}</h4>
                        <p className="palette-item-sub">{theme.subtitle}</p>
                      </div>

                      {isActive ? (
                        <div className="palette-active-check" title="Currently active theme">
                          <Check size={14} strokeWidth={2.5} />
                        </div>
                      ) : (
                        <div className="palette-select-arrow">
                          <ChevronRight size={14} />
                        </div>
                      )}
                    </div>

                    {/* Miniature Cascading Swatch Pills Deck */}
                    <div 
                      className="palette-mini-deck-wrap"
                      style={{ background: theme.cardGradient }}
                    >
                      <div className="palette-mini-stacked-pills">
                        {theme.swatches.map((hex, sIdx) => {
                          const isLast = sIdx === theme.swatches.length - 1;
                          const isDark = sIdx < (theme.darkSwatchesCount || 4);

                          return (
                            <div
                              key={hex + sIdx}
                              className={`palette-mini-pill ${isLast ? 'mini-pill-front' : ''}`}
                              style={{
                                backgroundColor: hex,
                                zIndex: sIdx + 1,
                                top: `${sIdx * 12}px`
                              }}
                            >
                              <span 
                                className="palette-mini-hex"
                                style={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}
                              >
                                {hex}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer Accent Highlights */}
                    <div className="palette-item-footer">
                      <div className="palette-swatch-circles">
                        {theme.swatches.map((hex, cIdx) => (
                          <span 
                            key={hex + cIdx}
                            className="palette-color-circle"
                            style={{ backgroundColor: hex }}
                            title={hex}
                          />
                        ))}
                      </div>
                      <span className="palette-apply-tag">
                        {isActive ? 'ACTIVE' : 'APPLY'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}
