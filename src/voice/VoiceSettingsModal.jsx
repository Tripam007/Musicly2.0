/**
 * VoiceSettingsModal.jsx
 * 
 * Cinematic settings panel for Musicly Voice AI:
 * - Hey Musicly toggle
 * - Language selection (English, Indian English, Hindi, Bengali)
 * - Voice responses (TTS) toggle
 * - Audio ducking toggle
 * - Local telemetry metrics
 * - Dev Diagnostics shortcut
 */

import React from 'react';
import { X, Mic, Volume2, Shield, BarChart2, Activity, Globe } from 'lucide-react';

export const VoiceSettingsModal = ({ isOpen, onClose, voiceManager, onOpenDebug }) => {
  if (!isOpen || !voiceManager) return null;

  const config = voiceManager.config;
  const analytics = voiceManager.getAnalytics();

  const handleToggleVoice = (e) => {
    const enabled = e.target.checked;
    if (!enabled) {
      voiceManager.stop();
    } else {
      voiceManager.start();
    }
  };

  const handleLanguageChange = (e) => {
    voiceManager.updateConfig({ language: e.target.value });
  };

  const handleToggleResponses = (e) => {
    voiceManager.updateConfig({ enableVoiceResponses: e.target.checked });
  };

  const handleToggleDucking = (e) => {
    voiceManager.updateConfig({ enableDucking: e.target.checked });
  };

  const handleToggleAnalytics = (e) => {
    voiceManager.updateConfig({ enableAnalytics: e.target.checked });
  };

  return (
    <div className="voice-settings-overlay" onClick={onClose}>
      <div className="voice-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="voice-settings-header">
          <div className="voice-settings-title">
            <Mic style={{ color: '#818cf8' }} size={20} />
            <span>Voice Control Settings</span>
          </div>
          <button className="voice-settings-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Master Toggle */}
        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Hey Musicly Voice Control</span>
            <span className="voice-settings-desc">Activate hands-free with "Hey Musicly"</span>
          </div>
          <label className="voice-switch">
            <input
              type="checkbox"
              checked={voiceManager.state !== 'IDLE'}
              onChange={handleToggleVoice}
            />
            <span className="voice-slider"></span>
          </label>
        </div>

        {/* Language Selection */}
        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Recognition Language</span>
            <span className="voice-settings-desc">Select preferred voice command dialect</span>
          </div>
          <select
            className="voice-select-dropdown"
            value={config.language || 'en-IN'}
            onChange={handleLanguageChange}
          >
            <option value="en-IN">English (India / Hinglish)</option>
            <option value="en-US">English (US / Global)</option>
            <option value="hi-IN">Hindi (हिन्दी)</option>
            <option value="bn-IN">Bengali (বাংলা)</option>
          </select>
        </div>

        {/* Voice Responses (TTS) */}
        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Voice Responses (ElevenLabs)</span>
            <span className="voice-settings-desc">Speak brief confirmations when actions complete</span>
          </div>
          <label className="voice-switch">
            <input
              type="checkbox"
              checked={config.enableVoiceResponses}
              onChange={handleToggleResponses}
            />
            <span className="voice-slider"></span>
          </label>
        </div>

        {/* Audio Ducking */}
        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Smooth Audio Ducking</span>
            <span className="voice-settings-desc">Temporarily lower music volume during speech</span>
          </div>
          <label className="voice-switch">
            <input
              type="checkbox"
              checked={config.enableDucking}
              onChange={handleToggleDucking}
            />
            <span className="voice-slider"></span>
          </label>
        </div>

        {/* Local Telemetry */}
        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Local Voice Metrics</span>
            <span className="voice-settings-desc">Track local command reliability metrics</span>
          </div>
          <label className="voice-switch">
            <input
              type="checkbox"
              checked={config.enableAnalytics}
              onChange={handleToggleAnalytics}
            />
            <span className="voice-slider"></span>
          </label>
        </div>

        {config.enableAnalytics && (
          <div className="voice-analytics-box">
            <div>
              <div className="voice-stat-num">{analytics.totalCommands}</div>
              <div className="voice-stat-lbl">Commands</div>
            </div>
            <div>
              <div className="voice-stat-num">{analytics.successfulCommands}</div>
              <div className="voice-stat-lbl">Successful</div>
            </div>
            <div>
              <div className="voice-stat-num">{analytics.successRate}%</div>
              <div className="voice-stat-lbl">Success Rate</div>
            </div>
          </div>
        )}

        {/* Dev Diagnostics Button */}
        {onOpenDebug && (
          <button className="voice-debug-btn-link" onClick={onOpenDebug}>
            <Activity size={14} />
            <span>Open Voice Diagnostics Panel (Ctrl+Shift+D)</span>
          </button>
        )}

        {/* Privacy Notice */}
        <div className="voice-privacy-notice">
          <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#10b981' }} />
          <strong>Privacy Commitment:</strong> Wake-word detection is processed 100% locally. Microphone audio is never continuously uploaded to the cloud. Raw audio recordings are never stored.
        </div>
      </div>
    </div>
  );
};
