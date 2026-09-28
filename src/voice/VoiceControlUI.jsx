import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X } from 'lucide-react';
import { VOICE_STATES } from './voiceConfig.js';
import { VoiceSettingsModal } from './VoiceSettingsModal.jsx';
import '../styles/voiceControl.css';

export const VoiceControlUI = ({ voiceManager }) => {
  const [voiceState, setVoiceState] = useState(voiceManager ? voiceManager.getStatePayload() : null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!voiceManager) return;
    const unsubscribe = voiceManager.subscribe((payload) => {
      setVoiceState(payload);
    });
    return () => unsubscribe();
  }, [voiceManager]);

  if (!voiceManager) return null;

  const state = voiceState?.state || VOICE_STATES.IDLE;
  const isListeningWake = state === VOICE_STATES.LISTENING_FOR_WAKE_WORD;
  const isWakeDetected = state === VOICE_STATES.WAKE_WORD_DETECTED;
  const isListeningCommand = state === VOICE_STATES.LISTENING_FOR_COMMAND;
  const isProcessing = state === VOICE_STATES.PROCESSING_COMMAND;
  const isExecuting = state === VOICE_STATES.EXECUTING_ACTION;
  const isResponding = state === VOICE_STATES.RESPONDING;
  const isCooldown = state === VOICE_STATES.COOLDOWN;

  const isActive = state !== VOICE_STATES.IDLE;

  const handleToggle = (e) => {
    e.stopPropagation();
    if (!voiceManager.speechManager.isSupported()) {
      alert("Voice Control isn't supported in this browser yet.");
      return;
    }
    voiceManager.toggle();
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    voiceManager._returnToWakeWordListening();
  };

  const getDotClass = () => {
    if (isWakeDetected) return 'voice-dot detected';
    if (isListeningCommand || isProcessing) return 'voice-dot command';
    if (isListeningWake) return 'voice-dot listening';
    return 'voice-dot';
  };

  const getButtonLabel = () => {
    if (isWakeDetected) return 'Hey Musicly';
    if (isListeningCommand) return 'Listening...';
    if (isProcessing || isExecuting) return 'Thinking...';
    if (isListeningWake) return 'Listening';
    return 'Voice';
  };

  // Determine whether to display the floating status capsule
  const showFloatingCapsule = isWakeDetected || isListeningCommand || isProcessing || isExecuting || (isResponding && voiceState?.lastResponse);

  return (
    <>
      {/* Circular Voice Control Button beside Air Controls */}
      <button
        id="voice-control-toggle-btn"
        className={`voice-btn-below-tuned ${isActive ? 'highlight-active active' : ''} ${isListeningCommand ? 'listening-cmd' : ''} ${isWakeDetected ? 'wake-detected' : ''}`}
        onClick={handleToggle}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsSettingsOpen(true);
        }}
        title={isActive ? 'Voice Controls Active ("Hey Musicly") — Click to toggle, right-click for settings' : 'Voice Controls — Click to enable "Hey Musicly" hands-free voice control'}
        aria-label="Voice Controls"
      >
        <Mic size={17} />
        <span className={`voice-mic-dot ${isActive ? 'active' : ''} ${getDotClass()}`} />
      </button>

      {/* Subtle Floating Status Capsule during interaction */}
      {showFloatingCapsule && (
        <div className="voice-status-floating-capsule" role="status" aria-live="polite">
          <div className="voice-status-icon-glow">
            <span className={getDotClass()}></span>
          </div>

          <div className="voice-status-title">
            {isWakeDetected && 'HEY MUSICLY'}
            {isListeningCommand && 'Listening...'}
            {isProcessing && 'Processing'}
            {isExecuting && 'Executing'}
            {isResponding && 'Musicly'}
          </div>

          <div className="voice-status-sub">
            {isListeningCommand && (voiceState?.lastRecognized ? `"${voiceState.lastRecognized}"` : 'Say a command...')}
            {isProcessing && `"${voiceState?.lastRecognized}"`}
            {isExecuting && `"${voiceState?.lastRecognized}"`}
            {isResponding && (voiceState?.lastResponse || 'Done')}
          </div>

          {(isListeningCommand || isProcessing) && (
            <button
              className="voice-status-cancel-btn"
              onClick={handleCancel}
              title="Cancel (or say 'cancel')"
            >
              <X size={12} />
            </button>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        voiceManager={voiceManager}
      />
    </>
  );
};
