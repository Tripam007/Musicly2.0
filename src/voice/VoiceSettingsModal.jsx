/**
 * VoiceSettingsModal.jsx
 * 
 * Cinematic settings panel for Musicly Voice AI:
 * - Hey Musicly toggle
 * - AI Voice Model Selection (ElevenLabs & Local System Voices)
 * - Admin Voice Management (Add ElevenLabs voices via link/ID, delete custom voices)
 * - Voice preview synthesis
 * - Recognition language selection
 * - Audio ducking & feedback speech toggles
 * - Local telemetry metrics & Diagnostics shortcut
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Mic, 
  Volume2, 
  Shield, 
  Activity, 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  Key, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Radio
} from 'lucide-react';
import { 
  getAvailableVoices, 
  subscribeVoiceRegistry, 
  addCustomVoice, 
  deleteCustomVoice, 
  getSelectedVoiceId, 
  setSelectedVoiceId,
  extractVoiceId,
  getCustomElevenLabsApiKey,
  setCustomElevenLabsApiKey
} from '../utils/voiceRegistryDB';
import { playVoicePreview, stopVoicePreview } from '../utils/elevenLabsTTS';

export const VoiceSettingsModal = ({ 
  isOpen, 
  onClose, 
  voiceManager, 
  onOpenDebug, 
  user, 
  isAdmin = false 
}) => {
  const [voices, setVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoice] = useState(getSelectedVoiceId());
  const [previewingVoiceId, setPreviewingVoiceId] = useState(null);
  const [showAdminAddVoice, setShowAdminAddVoice] = useState(false);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKey, setApiKey] = useState(getCustomElevenLabsApiKey());

  // Form states for Admin adding a new voice
  const [voiceInputUrl, setVoiceInputUrl] = useState('');
  const [voiceName, setVoiceName] = useState('');
  const [voiceGender, setVoiceGender] = useState('Male');
  const [voiceStyle, setVoiceStyle] = useState('British Calm');
  const [voiceDescription, setVoiceDescription] = useState('');
  const [voiceSamplePhrase, setVoiceSamplePhrase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState(null);

  // Admin verification check
  const effectiveIsAdmin = Boolean(
    isAdmin ||
    (user?.email && user.email.toLowerCase() === 'tripambiswas007@gmail.com') ||
    (typeof window !== 'undefined' && localStorage.getItem('musicly_user_role') === 'admin')
  );

  useEffect(() => {
    if (!isOpen) {
      stopVoicePreview();
      setPreviewingVoiceId(null);
      if (typeof document !== 'undefined') {
        document.body.classList.remove('voice-settings-active');
        document.body.classList.remove('app-modal-open');
      }
      return;
    }

    if (typeof document !== 'undefined') {
      document.body.classList.add('voice-settings-active');
      document.body.classList.add('app-modal-open');
    }

    const unsubscribe = subscribeVoiceRegistry((updatedVoices) => {
      setVoices(updatedVoices);
    });

    const activeId = voiceManager?.config?.voiceId || getSelectedVoiceId();
    setSelectedVoice(activeId);

    return () => {
      stopVoicePreview();
      unsubscribe();
      if (typeof document !== 'undefined') {
        document.body.classList.remove('voice-settings-active');
        document.body.classList.remove('app-modal-open');
      }
    };
  }, [isOpen, voiceManager]);

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

  const handleSelectVoice = (voiceId) => {
    setSelectedVoice(voiceId);
    setSelectedVoiceId(voiceId);
    voiceManager.updateConfig({ voiceId });
  };

  const handlePreviewVoice = async (voice, e) => {
    e.stopPropagation();
    if (previewingVoiceId === voice.id) {
      stopVoicePreview();
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);
    try {
      await playVoicePreview(voice, null, voiceManager.commandClient);
    } catch (err) {
      console.warn('[VoiceSettingsModal] Preview error:', err);
    } finally {
      setPreviewingVoiceId(null);
    }
  };

  const handleUrlInputChange = (e) => {
    const val = e.target.value;
    setVoiceInputUrl(val);
    const extracted = extractVoiceId(val);

    // Auto-fill voice name if URL matches Nathaniel C
    if (extracted === 'AeRdCCKzvd23BpJoofzx' && !voiceName) {
      setVoiceName('Nathaniel C');
      setVoiceStyle('British Calm & Suspense');
      setVoiceGender('Male');
      setVoiceDescription('Calm, suspenseful British storyteller voice.');
    }
  };

  const handleSaveApiKey = () => {
    setCustomElevenLabsApiKey(apiKey);
    setFormFeedback({ type: 'success', message: 'ElevenLabs API key updated successfully.' });
    setTimeout(() => setFormFeedback(null), 3000);
  };

  const handleAddVoiceSubmit = async (e) => {
    e.preventDefault();
    const cleanId = extractVoiceId(voiceInputUrl);

    if (!cleanId) {
      setFormFeedback({ type: 'error', message: 'Please provide a valid ElevenLabs voice link or ID.' });
      return;
    }

    if (!voiceName.trim()) {
      setFormFeedback({ type: 'error', message: 'Please provide a display name for the voice.' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      const newVoice = await addCustomVoice({
        id: cleanId,
        url: voiceInputUrl.startsWith('http') ? voiceInputUrl : `https://elevenlabs.io/voices/${cleanId}`,
        name: voiceName.trim(),
        gender: voiceGender,
        style: voiceStyle.trim(),
        description: voiceDescription.trim() || 'Custom ElevenLabs voice model.',
        samplePhrase: voiceSamplePhrase.trim() || `Hello! I am ${voiceName.trim()}. Ready to curate your music on Musicly.`
      }, user);

      // Auto-select newly added voice
      handleSelectVoice(newVoice.id);
      setFormFeedback({ type: 'success', message: `Added "${newVoice.name}" successfully!` });

      // Reset form
      setVoiceInputUrl('');
      setVoiceName('');
      setVoiceDescription('');
      setVoiceSamplePhrase('');
      setTimeout(() => {
        setShowAdminAddVoice(false);
        setFormFeedback(null);
      }, 1800);
    } catch (err) {
      setFormFeedback({ type: 'error', message: err?.message || 'Failed to add voice.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVoice = async (voiceId, voiceName, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove the voice "${voiceName}"?`)) return;

    try {
      await deleteCustomVoice(voiceId);
      if (selectedVoiceId === voiceId) {
        handleSelectVoice('AeRdCCKzvd23BpJoofzx');
      }
    } catch (err) {
      alert('Failed to delete voice: ' + err.message);
    }
  };

  const detectedVoiceId = extractVoiceId(voiceInputUrl);

  const modalContent = (
    <div className="voice-settings-overlay" onClick={onClose}>
      <div className="voice-settings-modal voice-settings-modal-extended" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="voice-settings-header">
          <div className="voice-settings-title">
            <Mic style={{ color: '#818cf8' }} size={20} />
            <span>Voice Control & Persona Settings</span>
          </div>
          <button className="voice-settings-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Master Toggle */}
        <div className="voice-settings-row">
          <div className="voice-settings-info">
            <span className="voice-settings-label">Hey Musicly Voice Control</span>
            <span className="voice-settings-desc">Activate hands-free playback with "Hey Musicly"</span>
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

        {/* --- AI VOICE SELECTION SECTION (For All Users) --- */}
        <div className="voice-settings-section-divider">
          <div className="voice-section-header">
            <div className="voice-section-title">
              <Sparkles size={16} className="voice-section-icon" />
              <span>AI Voice Persona</span>
            </div>
            <span className="voice-section-hint">Select the voice that confirms your commands</span>
          </div>

          <div className="voice-cards-grid">
            {voices.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isPreviewing = previewingVoiceId === voice.id;

              return (
                <div 
                  key={voice.id}
                  className={`voice-model-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectVoice(voice.id)}
                >
                  <div className="voice-card-top">
                    <div className="voice-card-radio-box">
                      <div className={`voice-custom-radio ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                      <div className="voice-card-title-group">
                        <span className="voice-card-name">{voice.name}</span>
                        {voice.isFeatured && (
                          <span className="voice-badge featured">Featured</span>
                        )}
                        {voice.provider === 'elevenlabs' ? (
                          <span className="voice-badge elevenlabs">ElevenLabs</span>
                        ) : (
                          <span className="voice-badge system">System Native</span>
                        )}
                      </div>
                    </div>

                    <div className="voice-card-actions">
                      <button
                        className={`voice-preview-btn ${isPreviewing ? 'playing' : ''}`}
                        onClick={(e) => handlePreviewVoice(voice, e)}
                        title={isPreviewing ? 'Stop Preview' : 'Listen to Voice Sample'}
                        aria-label={`Preview ${voice.name}`}
                      >
                        {isPreviewing ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                        <span>{isPreviewing ? 'Playing' : 'Preview'}</span>
                      </button>

                      {effectiveIsAdmin && voice.isCustom && (
                        <button
                          className="voice-delete-btn"
                          onClick={(e) => handleDeleteVoice(voice.id, voice.name, e)}
                          title="Delete Custom Voice (Admin)"
                          aria-label="Delete Voice"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="voice-card-details">
                    <div className="voice-card-meta">
                      <span className="voice-meta-pill">{voice.gender}</span>
                      <span className="voice-meta-pill">{voice.style || voice.accent}</span>
                    </div>
                    {voice.description && (
                      <p className="voice-card-desc">{voice.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- ADMIN VOICE MANAGEMENT SECTION (Admin Only) --- */}
        {effectiveIsAdmin && (
          <div className="voice-admin-section">
            <div className="voice-admin-header">
              <div className="voice-admin-badge">
                <Shield size={13} />
                <span>Admin Voice Controls</span>
              </div>
              <button 
                type="button" 
                className="voice-admin-accordion-toggle"
                onClick={() => setShowAdminAddVoice(!showAdminAddVoice)}
              >
                {showAdminAddVoice ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                <span>{showAdminAddVoice ? 'Hide Add Voice Panel' : '+ Add ElevenLabs Voice'}</span>
              </button>
            </div>

            {showAdminAddVoice && (
              <form className="voice-admin-form" onSubmit={handleAddVoiceSubmit}>
                <div className="voice-admin-form-intro">
                  Enter an ElevenLabs voice link or ID (e.g. <code>https://elevenlabs.io/voices/AeRdCCKzvd23BpJoofzx</code>) to make it available to all users across Musicly.
                </div>

                <div className="voice-form-group">
                  <label className="voice-form-label">ElevenLabs Voice URL or Voice ID *</label>
                  <input
                    type="text"
                    className="voice-form-input"
                    placeholder="e.g. https://elevenlabs.io/voices/AeRdCCKzvd23BpJoofzx or AeRdCCKzvd23BpJoofzx"
                    value={voiceInputUrl}
                    onChange={handleUrlInputChange}
                    required
                  />
                  {detectedVoiceId && (
                    <div className="voice-detected-id">
                      Parsed Voice ID: <strong>{detectedVoiceId}</strong>
                    </div>
                  )}
                </div>

                <div className="voice-form-grid-2">
                  <div className="voice-form-group">
                    <label className="voice-form-label">Voice Display Name *</label>
                    <input
                      type="text"
                      className="voice-form-input"
                      placeholder="e.g. Nathaniel C"
                      value={voiceName}
                      onChange={(e) => setVoiceName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="voice-form-group">
                    <label className="voice-form-label">Gender</label>
                    <select
                      className="voice-form-select"
                      value={voiceGender}
                      onChange={(e) => setVoiceGender(e.target.value)}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Neutral">Neutral</option>
                    </select>
                  </div>
                </div>

                <div className="voice-form-group">
                  <label className="voice-form-label">Voice Style & Accent</label>
                  <input
                    type="text"
                    className="voice-form-input"
                    placeholder="e.g. British Calm & Suspense"
                    value={voiceStyle}
                    onChange={(e) => setVoiceStyle(e.target.value)}
                  />
                </div>

                <div className="voice-form-group">
                  <label className="voice-form-label">Voice Description</label>
                  <input
                    type="text"
                    className="voice-form-input"
                    placeholder="e.g. Calm, thoughtful British narrator with cinematic depth"
                    value={voiceDescription}
                    onChange={(e) => setVoiceDescription(e.target.value)}
                  />
                </div>

                <div className="voice-form-group">
                  <label className="voice-form-label">Sample Preview Phrase (Optional)</label>
                  <input
                    type="text"
                    className="voice-form-input"
                    placeholder="e.g. Hello, I am Nathaniel. Ready to play your favorite music."
                    value={voiceSamplePhrase}
                    onChange={(e) => setVoiceSamplePhrase(e.target.value)}
                  />
                </div>

                {/* Optional API Key Configuration */}
                <div className="voice-apikey-accordion">
                  <button
                    type="button"
                    className="voice-apikey-toggle"
                    onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                  >
                    <Key size={13} />
                    <span>Configure ElevenLabs API Key (Optional Client Override)</span>
                  </button>

                  {showApiKeyInput && (
                    <div className="voice-apikey-panel">
                      <input
                        type="password"
                        className="voice-form-input"
                        placeholder="Paste xi-api-key here"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                      <button
                        type="button"
                        className="voice-apikey-save-btn"
                        onClick={handleSaveApiKey}
                      >
                        Save Key
                      </button>
                    </div>
                  )}
                </div>

                {formFeedback && (
                  <div className={`voice-form-feedback ${formFeedback.type}`}>
                    {formFeedback.message}
                  </div>
                )}

                <div className="voice-form-actions">
                  <button
                    type="submit"
                    className="voice-form-submit-btn"
                    disabled={isSubmitting}
                  >
                    <Plus size={15} />
                    <span>{isSubmitting ? 'Saving Voice...' : 'Save & Publish Voice'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* --- SYSTEM & RECOGNITION SETTINGS --- */}
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
            <span className="voice-settings-label">Voice Confirmations (TTS)</span>
            <span className="voice-settings-desc">Speak brief responses when voice commands execute</span>
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

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
