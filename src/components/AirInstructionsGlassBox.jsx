import React from 'react';
import { X, Sparkles, Shield, Clock } from 'lucide-react';

export default function AirInstructionsGlassBox({ isOpen, onClose, secondsRemaining = 8 }) {
  if (!isOpen) return null;

  const gestures = [
    {
      icon: '👤➡️',
      title: 'Move Face Right',
      action: 'Next Track',
      accent: '#34d399'
    },
    {
      icon: '⬅️👤',
      title: 'Move Face Left',
      action: 'Previous Track',
      accent: '#60a5fa'
    },
    {
      icon: '✋',
      title: 'Open Palm',
      action: 'Play / Pause',
      accent: '#a78bfa'
    },
    {
      icon: '✊',
      title: 'Closed Fist',
      action: 'Mute / Unmute',
      accent: '#f43f5e'
    },
    {
      icon: '☝️ 👇',
      title: 'One Finger Up / Down',
      action: 'Volume ±',
      accent: '#fbbf24'
    }
  ];

  return (
    <div 
      className="air-instructions-glass-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-label="Air Controls Quick Instructions"
    >
      <div className="air-instructions-glass-card">
        {/* Top Header */}
        <div className="air-glass-header">
          <div className="air-glass-title-group">
            <span className="air-glass-live-indicator">
              <span className="air-glass-pulse" />
              <span className="air-glass-dot" />
            </span>
            <div>
              <div className="air-glass-badge-row">
                <span className="air-glass-badge">
                  <Sparkles size={11} className="text-cyan-400" /> CAMERA ACTIVE
                </span>
                <span className="air-glass-timer-pill">
                  <Clock size={11} /> {secondsRemaining}s
                </span>
              </div>
              <h3 className="air-glass-heading">Air Controls Guide</h3>
            </div>
          </div>

          <button 
            type="button" 
            className="air-glass-close-btn" 
            onClick={onClose}
            aria-label="Close instructions"
          >
            <X size={15} />
          </button>
        </div>

        <p className="air-glass-desc">
          Camera is now running locally. Move your face or show your hands to control Musicly:
        </p>

        {/* Gestures Grid */}
        <div className="air-glass-grid">
          {gestures.map((item, idx) => (
            <div key={idx} className="air-glass-item">
              <span className="air-glass-item-icon">{item.icon}</span>
              <div className="air-glass-item-content">
                <span className="air-glass-item-title">{item.title}</span>
                <span className="air-glass-item-action" style={{ color: item.accent }}>
                  {item.action}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="air-glass-footer">
          <div className="air-glass-privacy-tag">
            <Shield size={12} className="text-emerald-400" />
            <span>100% On-Device AI • No video stored</span>
          </div>
          <button 
            type="button" 
            className="air-glass-dismiss-btn"
            onClick={onClose}
          >
            Got it ({secondsRemaining}s)
          </button>
        </div>

        {/* Shrinking 8-second progress line */}
        <div 
          className="air-glass-progress-bar" 
          style={{ width: `${Math.max(0, Math.min(100, (secondsRemaining / 8) * 100))}%` }} 
        />
      </div>
    </div>
  );
}
