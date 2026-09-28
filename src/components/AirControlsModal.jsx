import React, { useState, useEffect } from 'react';
import { 
  Hand, 
  X, 
  ShieldCheck, 
  Camera, 
  Sliders, 
  AlertCircle, 
  Check, 
  Sparkles,
  Info,
  Terminal,
  Activity
} from 'lucide-react';
import { airControlsService } from '../utils/airControlsService';

export default function AirControlsModal({
  isOpen,
  onClose,
  isEnabled,
  onToggleEnabled,
  showPreview,
  onToggleShowPreview,
  isDebug,
  onToggleDebug,
  isAdmin = false,
  onOpenAirAiDashboard,
  onOpenDatasetCollector
}) {
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsub = airControlsService.subscribeStatus((st, err) => {
      setStatus(st);
      setErrorMessage(err);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const gestures = [
    {
      icon: '✋',
      title: 'Open Palm',
      action: 'Play / Pause',
      desc: 'Show open flat palm facing camera'
    },
    {
      icon: '✊',
      title: 'Closed Fist',
      action: 'Mute / Unmute',
      desc: 'Curl all fingers into a compact fist'
    },
    {
      icon: '👤➡️',
      title: 'Move Face Right',
      action: 'Next Song',
      desc: 'Move or turn your face towards the right'
    },
    {
      icon: '⬅️👤',
      title: 'Move Face Left',
      action: 'Previous Song',
      desc: 'Move or turn your face towards the left'
    },
    {
      icon: '👉',
      title: 'Thumb Right (Hand)',
      action: 'Next Song (Alt)',
      desc: 'Thumb facing right or swipe right'
    },
    {
      icon: '👈',
      title: 'Thumb Left (Hand)',
      action: 'Previous Song (Alt)',
      desc: 'Thumb facing left or swipe left'
    },
    {
      icon: '☝',
      title: 'One Finger Up',
      action: 'Volume Up',
      desc: 'Point index up (hold posture to raise continuously)'
    },
    {
      icon: '👇',
      title: 'One Finger Down',
      action: 'Volume Down',
      desc: 'Point index down (hold posture to lower continuously)'
    },
    {
      icon: '✌',
      title: 'Peace / Two Fingers',
      action: 'Toggle Ambience',
      desc: 'Index & middle fingers up in a V'
    },
    {
      icon: '👍',
      title: 'Thumbs Up / Like',
      action: 'Like Song (Favorite)',
      desc: 'Give a thumbs up to save the track'
    }
  ];

  return (
    <div 
      className="modal-overlay air-controls-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="air-controls-title"
    >
      <div className="air-controls-modal">
        {/* Header */}
        <div className="air-modal-header">
          <div className="air-header-icon-badge">
            <Hand size={20} className="text-cyan-400" />
          </div>
          <div className="air-header-text">
            <div className="air-title-row">
              <h2 id="air-controls-title" className="air-modal-title">AIR CONTROLS</h2>
              <span className="air-beta-pill">BETA</span>
            </div>
            <p className="air-modal-subtitle">Control Music. Without Touching It.</p>
          </div>
          <button 
            type="button"
            className="air-modal-close-btn"
            onClick={onClose}
            aria-label="Close Air Controls modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main Master Switch Card */}
        <div className="air-master-toggle-card">
          <div className="air-master-info">
            <div className="air-master-status-indicator">
              <span className={`air-toggle-dot ${isEnabled && status === 'active' ? 'active pulse-glow' : ''}`} />
              <span className="air-master-label">
                {isEnabled ? 'Air Controls Active' : 'Air Controls Disabled'}
              </span>
            </div>
            <p className="air-master-subtext">
              {isEnabled 
                ? 'Camera is active & tracking hand gestures locally.' 
                : 'Turn on to control playback with natural hand movements.'}
            </p>
          </div>

          <button
            type="button"
            className={`air-switch-btn ${isEnabled ? 'switch-on' : 'switch-off'}`}
            onClick={onToggleEnabled}
            role="switch"
            aria-checked={isEnabled}
          >
            <span className="air-switch-thumb" />
          </button>
        </div>

        {/* Permission Denied Warning Banner */}
        {status === 'permission_denied' && (
          <div className="air-permission-banner">
            <AlertCircle size={18} className="text-amber-400" />
            <div className="air-permission-text">
              <strong>Camera access is required for Air Controls.</strong>
              <span>Please grant webcam permission in your browser address bar.</span>
            </div>
            <button 
              type="button"
              className="air-permission-retry-btn"
              onClick={() => airControlsService.start()}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Privacy Assurance Banner */}
        <div className="air-privacy-banner">
          <ShieldCheck size={18} className="text-emerald-400" />
          <div className="air-privacy-text">
            <strong>100% Local Device Privacy</strong>
            <span>Your camera is processed locally on your device. Video is never uploaded, recorded, or stored.</span>
          </div>
        </div>

        {/* Options Row - Admin Only */}
        {isEnabled && isAdmin && (
          <div className="air-options-row">
            <label className="air-option-checkbox-label">
              <input 
                type="checkbox" 
                checked={showPreview} 
                onChange={(e) => onToggleShowPreview(e.target.checked)}
                className="air-checkbox"
              />
              <span className="air-option-title">Show floating camera preview (Admin)</span>
            </label>

            <button 
              type="button" 
              className={`air-debug-toggle-btn ${isDebug ? 'active' : ''}`}
              onClick={onToggleDebug}
              title="Toggle developer diagnostics & landmark coordinates"
            >
              <Activity size={14} />
              <span>{isDebug ? 'Diagnostics On' : 'Diagnostics'}</span>
            </button>
          </div>
        )}

        {/* Admin Tools Banner */}
        {isAdmin && onOpenAirAiDashboard && (
          <div className="air-admin-tools-box" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} className="text-cyan-400" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>Musicly Air AI Model & Dataset</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Real metrics, confusion matrix & training</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {onOpenDatasetCollector && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDatasetCollector();
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#e2e8f0',
                    cursor: 'pointer'
                  }}
                >
                  Collector
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAirAiDashboard();
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  background: '#0ea5e9',
                  border: 'none',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                Model Analytics
              </button>
            </div>
          </div>
        )}

        {/* Gesture Guide */}
        <div className="air-guide-section">
          <h3 className="air-guide-heading">Gesture Guide</h3>
          <div className="air-gestures-grid">
            {gestures.map((g, idx) => (
              <div key={idx} className="air-gesture-card">
                <div className="air-gesture-icon-col">
                  <span className="air-gesture-emoji">{g.icon}</span>
                </div>
                <div className="air-gesture-details">
                  <div className="air-gesture-action">{g.action}</div>
                  <div className="air-gesture-name">{g.title}</div>
                  <div className="air-gesture-desc">{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Note */}
        <div className="air-modal-footer">
          <p className="air-footer-tip">
            💡 <strong>Tip:</strong> Keep your hand around 1.5–3 feet from the webcam. Open Palm and Fist trigger Play/Pause and Mute once. Hold your index finger up or down to adjust volume smoothly and continuously!
          </p>
        </div>
      </div>
    </div>
  );
}
