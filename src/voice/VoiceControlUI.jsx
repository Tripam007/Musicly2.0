/**
 * VoiceControlUI.jsx
 * 
 * Cinematic minimal Musicly voice indicator & ambiguity resolution UI.
 * States:
 * - IDLE
 * - LISTENING FOR "HEY MUSICLY"
 * - WAKE WORD DETECTED
 * - LISTENING
 * - PROCESSING
 * - SUCCESS
 * - ERROR
 * - AMBIGUOUS (candidate track selection UI)
 */

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, X, Music, AlertCircle } from 'lucide-react';
import { VOICE_STATES } from './voiceConfig.js';
import { VoiceSettingsModal } from './VoiceSettingsModal.jsx';
import { VoiceDebugPanel } from './VoiceDebugPanel.jsx';
import '../styles/voiceControl.css';

export const VoiceControlUI = ({ voiceManager }) => {
  const [voiceState, setVoiceState] = useState(voiceManager ? voiceManager.getStatePayload() : null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  useEffect(() => {
    if (!voiceManager) return;
    const unsubscribe = voiceManager.subscribe((payload) => {
      setVoiceState(payload);
    });

    // Keyboard shortcut for Dev Debug Panel: Ctrl + Shift + D
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        e.preventDefault();
        setIsDebugOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [voiceManager]);

  if (!voiceManager) return null;

  const state = voiceState?.state || VOICE_STATES.IDLE;
  const isListeningWake = state === VOICE_STATES.LISTENING_FOR_WAKE_WORD;
  const isWakeDetected = state === VOICE_STATES.WAKE_WORD_DETECTED;
  const isListeningCommand = state === VOICE_STATES.LISTENING_FOR_COMMAND;
  const isProcessing = state === VOICE_STATES.PROCESSING_COMMAND;
  const isExecuting = state === VOICE_STATES.EXECUTING_ACTION;
  const isSuccess = state === VOICE_STATES.SUCCESS;
  const isError = state === VOICE_STATES.ERROR;
  const isAmbiguous = state === VOICE_STATES.AMBIGUOUS;

  const isActive = state !== VOICE_STATES.IDLE;

  const handleToggle = (e) => {
    e.stopPropagation();
    voiceManager.toggle();
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    voiceManager._returnToWakeWordListening();
  };

  const handleSelectCandidate = (track) => {
    voiceManager.selectAmbiguousCandidate(track);
  };

  const getDotClass = () => {
    if (isWakeDetected) return 'voice-dot detected';
    if (isListeningCommand) return 'voice-dot listening';
    if (isProcessing || isExecuting) return 'voice-dot command';
    if (isSuccess) return 'voice-dot success';
    if (isError) return 'voice-dot error';
    if (isAmbiguous) return 'voice-dot ambiguous';
    if (isListeningWake) return 'voice-dot idle-listening';
    return 'voice-dot';
  };

  const showFloatingCapsule =
    isWakeDetected ||
    isListeningCommand ||
    isProcessing ||
    isExecuting ||
    isSuccess ||
    isError ||
    isAmbiguous;

  return (
    <>
      {/* Cinematic Voice Control Button beside Air Controls */}
      <button
        id="voice-control-toggle-btn"
        className={`voice-btn-below-tuned ${isActive ? 'highlight-active active' : ''} ${
          isListeningCommand ? 'listening-cmd' : ''
        } ${isWakeDetected ? 'wake-detected' : ''}`}
        onClick={handleToggle}
        onContextMenu={(e) => {
          e.preventDefault();
          setIsSettingsOpen(true);
        }}
        title={
          isActive
            ? 'Voice Controls Active ("Hey Musicly") — Click to toggle, right-click for settings'
            : 'Voice Controls — Click to enable "Hey Musicly" hands-free voice control'
        }
        aria-label="Voice Controls"
      >
        <Mic size={17} />
        <span className={`voice-mic-dot ${isActive ? 'active' : ''} ${getDotClass()}`} />
      </button>

      {/* Cinematic Floating Status Capsule */}
      {showFloatingCapsule && (
        <div className="voice-status-floating-capsule" role="status" aria-live="polite">
          <div className="voice-status-icon-glow">
            <span className={getDotClass()} />
          </div>

          <div className="voice-status-content">
            <div className="voice-status-title">
              {isWakeDetected && 'HEY MUSICLY'}
              {isListeningCommand && 'Listening...'}
              {isProcessing && 'Thinking...'}
              {isExecuting && 'Executing'}
              {isSuccess && (voiceState?.lastResponse || 'Playing...')}
              {isError && "Didn't catch that"}
              {isAmbiguous && 'Which one did you mean?'}
            </div>

            <div className="voice-status-sub">
              {isListeningCommand && (voiceState?.lastRecognized ? `"${voiceState.lastRecognized}"` : 'Say a command...')}
              {(isProcessing || isExecuting) && `"${voiceState?.lastRecognized}"`}
              {isError && (voiceState?.lastResponse || "Please repeat")}
            </div>

            {/* Ambiguity Match List (Phase 12) */}
            {isAmbiguous && voiceState?.ambiguousCandidates && (
              <div className="voice-ambiguity-list">
                {voiceState.ambiguousCandidates.slice(0, 3).map((candidate) => (
                  <button
                    key={candidate.id}
                    className="voice-candidate-item"
                    onClick={() => handleSelectCandidate(candidate)}
                  >
                    <Music size={12} className="candidate-icon" />
                    <span className="candidate-title">{candidate.title}</span>
                    <span className="candidate-artist">&bull; {candidate.artist}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {(isListeningCommand || isProcessing || isAmbiguous) && (
            <button
              className="voice-status-cancel-btn"
              onClick={handleCancel}
              title="Cancel (or say 'cancel')"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        voiceManager={voiceManager}
        onOpenDebug={() => {
          setIsSettingsOpen(false);
          setIsDebugOpen(true);
        }}
      />

      {/* Development Debug Panel */}
      <VoiceDebugPanel
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        voiceManager={voiceManager}
      />
    </>
  );
};
