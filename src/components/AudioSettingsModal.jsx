import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  RotateCcw, 
  X, 
  Check, 
  Vibrate, 
  Radio, 
  Music
} from 'lucide-react';
import { 
  audioEqualizer, 
  EQ_PRESETS, 
  EQ_BANDS_INFO 
} from '../utils/audioEqualizer';
import { 
  getTactileSettings, 
  updateTactileSettings, 
  subscribeTactileSettings, 
  TACTILE_STYLES 
} from '../utils/tactileSettings';
import { playTactileClickSound } from '../utils/audioSynth';
import '../styles/audioSettingsModal.css';

export default function AudioSettingsModal({
  isOpen,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('eq'); // 'eq' | 'tactile'
  const [eqState, setEqState] = useState(() => audioEqualizer.getState());
  const [tactileState, setTactileState] = useState(() => getTactileSettings());

  // Subscribe to external state changes
  useEffect(() => {
    const unsubEq = audioEqualizer.subscribe((newState) => {
      setEqState(newState);
    });
    const unsubTactile = subscribeTactileSettings((newSettings) => {
      setTactileState(newSettings);
    });
    return () => {
      unsubEq();
      unsubTactile();
    };
  }, []);

  // Keyboard navigation (ESC to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handlers for EQ
  const handleBandChange = (bandKey, value) => {
    audioEqualizer.setBandGain(bandKey, parseFloat(value));
  };

  const handlePresetSelect = (presetId) => {
    audioEqualizer.applyPreset(presetId);
  };

  const handleToggleEq = () => {
    audioEqualizer.setEqualizerEnabled(!eqState.enabled);
  };

  const handleResetFlat = () => {
    audioEqualizer.resetToFlat();
  };

  const handleResetSingleBand = (bandKey) => {
    audioEqualizer.resetBand(bandKey);
  };

  // Handlers for Tactile Sound
  const handleToggleTactile = () => {
    const nextEnabled = !tactileState.enabled;
    updateTactileSettings({ enabled: nextEnabled });
    if (nextEnabled) {
      playTactileClickSound('normal', { ...tactileState, enabled: true });
    }
  };

  const handleTactileVolumeChange = (vol) => {
    const val = parseFloat(vol);
    updateTactileSettings({ volume: val });
  };

  const handleTactileStyleSelect = (styleId) => {
    updateTactileSettings({ style: styleId });
    playTactileClickSound('accent', { ...tactileState, style: styleId, enabled: true });
  };

  const handleTestTactileSound = () => {
    playTactileClickSound('accent', { ...tactileState, enabled: true });
  };

  return (
    <div className="audio-settings-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="audio-settings-modal-container" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="audio-settings-header">
          <div className="audio-settings-title-wrap">
            <div className="audio-settings-icon-bubble">
              <Sliders size={20} className="audio-settings-header-icon" />
            </div>
            <div>
              <h2 className="audio-settings-title">Sound & Equalizer</h2>
              <p className="audio-settings-subtitle">Customize audio acoustics & button tactile feedback</p>
            </div>
          </div>
          <button 
            className="audio-settings-close-btn"
            onClick={onClose}
            title="Close Settings (ESC)"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher - Clean, minimal tabs without status pills */}
        <div className="audio-settings-tabs">
          <button 
            className={`audio-settings-tab-btn ${activeTab === 'eq' ? 'active' : ''}`}
            onClick={() => setActiveTab('eq')}
          >
            <Sliders size={16} />
            <span>Audio Equalizer</span>
          </button>

          <button 
            className={`audio-settings-tab-btn ${activeTab === 'tactile' ? 'active' : ''}`}
            onClick={() => setActiveTab('tactile')}
          >
            <Vibrate size={16} />
            <span>Tactile Feedback</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="audio-settings-body">
          {activeTab === 'eq' ? (
            /* =================== EQUALIZER VIEW =================== */
            <div className="eq-content-section">
              {/* Master EQ toggle & Reset */}
              <div className="eq-master-bar">
                <div className="eq-master-left">
                  <button 
                    className={`eq-toggle-switch ${eqState.enabled ? 'active' : ''}`}
                    onClick={handleToggleEq}
                    role="switch"
                    aria-checked={eqState.enabled}
                  >
                    <span className="eq-toggle-knob" />
                  </button>
                  <div className="eq-master-info">
                    <span className="eq-master-label">Equalizer DSP</span>
                    <span className="eq-master-state-text">
                      {eqState.enabled ? 'Active • Real-time processing' : 'Bypassed (Original Audio)'}
                    </span>
                  </div>
                </div>

                <button 
                  className="eq-reset-btn"
                  onClick={handleResetFlat}
                  title="Reset all bands to 0 dB"
                >
                  <RotateCcw size={14} />
                  <span>Reset to Flat</span>
                </button>
              </div>

              {/* Presets Row */}
              <div className="eq-presets-wrapper">
                <span className="eq-section-label">Acoustic Presets:</span>
                <div className="eq-presets-scroll">
                  {EQ_PRESETS.map((p) => {
                    const isSelected = eqState.preset === p.id;
                    return (
                      <button
                        key={p.id}
                        className={`eq-preset-chip ${isSelected ? 'active' : ''}`}
                        onClick={() => handlePresetSelect(p.id)}
                        title={p.desc}
                      >
                        {isSelected && <Check size={13} className="preset-check-icon" />}
                        <span>{p.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horizontal Equalizer Bars */}
              <div className={`eq-bars-container ${!eqState.enabled ? 'eq-disabled' : ''}`}>
                {EQ_BANDS_INFO.map((band) => {
                  const gainVal = eqState.bands[band.key] ?? 0;
                  const isBoost = gainVal > 0;
                  const isCut = gainVal < 0;
                  // Calculate percent for gradient track fill from center (0dB is 50%)
                  const percentFromLeft = ((gainVal + 12) / 24) * 100;

                  return (
                    <div 
                      key={band.key} 
                      className="eq-horizontal-bar-row"
                      onDoubleClick={() => handleResetSingleBand(band.key)}
                      title="Double-click to reset this band to 0 dB"
                    >
                      {/* Left: Band Info */}
                      <div 
                        className="eq-band-meta"
                        onDoubleClick={(e) => { e.stopPropagation(); handleResetSingleBand(band.key); }}
                      >
                        <div className="eq-band-header">
                          <span className="eq-band-title">{band.label}</span>
                          <span className="eq-band-freq-tag">{band.freq}</span>
                        </div>
                        <span className="eq-band-sublabel">{band.sublabel}</span>
                      </div>

                      {/* Center: Horizontal Slider Bar with Center Detent */}
                      <div className="eq-slider-track-wrapper">
                        {/* Background track guide marks */}
                        <div className="eq-slider-guide-marks">
                          <span className="eq-guide-mark mark-min">-12dB</span>
                          <span 
                            className="eq-guide-mark mark-center"
                            onClick={() => handleResetSingleBand(band.key)}
                            title="Click to reset to 0 dB"
                            style={{ cursor: 'pointer' }}
                          >
                            0dB
                          </span>
                          <span className="eq-guide-mark mark-max">+12dB</span>
                        </div>

                        {/* Interactive Horizontal Range Bar */}
                        <div className="eq-slider-bar-inner">
                          <input 
                            type="range"
                            min="-12"
                            max="12"
                            step="0.5"
                            value={gainVal}
                            disabled={!eqState.enabled}
                            onChange={(e) => handleBandChange(band.key, e.target.value)}
                            onDoubleClick={(e) => { e.stopPropagation(); handleResetSingleBand(band.key); }}
                            className="eq-horizontal-range-input"
                            aria-label={`${band.label} gain`}
                          />
                          {/* Visual center marker notch */}
                          <div className="eq-center-notch" />
                          {/* Dynamic fill bar from center (50%) to thumb */}
                          <div 
                            className={`eq-range-fill ${isBoost ? 'fill-boost' : isCut ? 'fill-cut' : ''}`}
                            style={{
                              left: isCut ? `${percentFromLeft}%` : '50%',
                              width: `${Math.abs(percentFromLeft - 50)}%`
                            }}
                          />
                        </div>
                      </div>

                      {/* Right: Real-time dB readout badge (double click resets this band) */}
                      <button 
                        type="button"
                        className={`eq-db-badge ${isBoost ? 'db-boost' : isCut ? 'db-cut' : 'db-flat'}`}
                        onClick={() => handleResetSingleBand(band.key)}
                        onDoubleClick={(e) => { e.stopPropagation(); handleResetSingleBand(band.key); }}
                        title="Click or double-click to reset to 0.0 dB"
                      >
                        {gainVal > 0 ? `+${gainVal.toFixed(1)}` : gainVal.toFixed(1)} dB
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Notice note */}
              <div className="eq-info-note">
                <Music size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />
                <span>Real-time parametric DSP filtering is applied to audio playback, ambient soundscapes, and local library files.</span>
              </div>
            </div>
          ) : (
            /* =================== TACTILE FEEDBACK VIEW =================== */
            <div className="tactile-content-section">
              {/* Enable / Disable Master Switch */}
              <div className="tactile-master-card">
                <div className="tactile-master-left">
                  <div className="tactile-icon-box">
                    {tactileState.enabled ? <Volume2 size={20} className="icon-enabled" /> : <VolumeX size={20} className="icon-disabled" />}
                  </div>
                  <div>
                    <h3 className="tactile-card-title">Tactile Feedback Sound</h3>
                    <p className="tactile-card-desc">
                      Subtle, aesthetic tactile sound when clicking buttons, tabs, and controls.
                    </p>
                  </div>
                </div>

                <button 
                  className={`eq-toggle-switch ${tactileState.enabled ? 'active' : ''}`}
                  onClick={handleToggleTactile}
                  role="switch"
                  aria-checked={tactileState.enabled}
                >
                  <span className="eq-toggle-knob" />
                </button>
              </div>

              {/* Feedback Settings (Only active if enabled) */}
              <div className={`tactile-settings-subgrid ${!tactileState.enabled ? 'tactile-disabled' : ''}`}>
                {/* 1. Volume Horizontal Bar */}
                <div className="tactile-setting-item">
                  <div className="tactile-item-header">
                    <span className="tactile-item-label">Feedback Volume</span>
                    <span className="tactile-volume-badge">
                      {Math.round((tactileState.volume ?? 0.35) * 100)}%
                    </span>
                  </div>

                  <div className="tactile-slider-wrapper">
                    <input 
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={tactileState.volume ?? 0.35}
                      disabled={!tactileState.enabled}
                      onChange={(e) => handleTactileVolumeChange(e.target.value)}
                      className="tactile-horizontal-slider"
                      aria-label="Tactile feedback volume"
                    />
                  </div>
                </div>

                {/* 2. Sound Aesthetic Style Selector */}
                <div className="tactile-setting-item">
                  <span className="tactile-item-label">Sound Aesthetic Style</span>
                  <div className="tactile-styles-grid">
                    {TACTILE_STYLES.map((st) => {
                      const isSelected = (tactileState.style || 'matte') === st.id;
                      return (
                        <button
                          key={st.id}
                          className={`tactile-style-card ${isSelected ? 'active' : ''}`}
                          onClick={() => handleTactileStyleSelect(st.id)}
                          disabled={!tactileState.enabled}
                        >
                          <div className="tactile-style-radio">
                            {isSelected && <span className="style-radio-dot" />}
                          </div>
                          <div className="tactile-style-text">
                            <span className="tactile-style-name">{st.name}</span>
                            <span className="tactile-style-desc">{st.desc}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Interactive Test Button */}
                <div className="tactile-test-row">
                  <button 
                    className="tactile-test-btn"
                    onClick={handleTestTactileSound}
                    disabled={!tactileState.enabled}
                    title="Click to audition current feedback sound"
                  >
                    <Sparkles size={16} />
                    <span>Test Feedback Sound</span>
                  </button>
                  <span className="tactile-test-hint">Click to preview volume & tone</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Musicly Logo */}
        <div className="audio-settings-footer">
          <div className="audio-settings-footer-brand">
            <img src="/favicon.svg" alt="Musicly" className="audio-settings-footer-logo" />
            <span className="audio-settings-footer-brandname">MUSICLY</span>
          </div>
        </div>
      </div>
    </div>
  );
}
