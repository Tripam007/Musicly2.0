import React from 'react';
import { X, Mic, Volume2, Shield, BarChart2, CheckCircle } from 'lucide-react';

export const VoiceSettingsModal = ({ isOpen, onClose, voiceManager }) => {
  if (!isOpen || !voiceManager) return null;

  const config = voiceManager.config;
  const analytics = voiceManager.getAnalytics();

  const handleToggleVoice = (e) => {
    const enabled = e.target.checked;
    voiceManager.updateConfig({ enabled });
    if (!enabled) {
      voiceManager.stop();
    } else {
      voiceManager.start();
    }
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

        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Hey Musicly Voice Control</span>
            <span className="voice-settings-desc">Activate assistant strictly with "Hey Musicly"</span>
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

        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Voice Responses (TTS)</span>
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

        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Audio Ducking</span>
            <span className="voice-settings-desc">Temporarily lower music volume while speaking</span>
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

        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Local Voice Telemetry</span>
            <span className="voice-settings-desc">Log anonymous command counts locally for performance</span>
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
              <div className="voice-stat-num">{analytics.averageLatencyMs}ms</div>
              <div className="voice-stat-lbl">Avg Latency</div>
            </div>
          </div>
        )}

        <div className="voice-privacy-notice">
          <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '6px', color: '#10b981' }} />
          <strong>Privacy Commitment:</strong> Voice control processes your microphone locally only for wake-word and command recognition. No continuous audio streaming or raw audio recordings are stored.
        </div>
      </div>
    </div>
  );
};
