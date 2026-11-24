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
import { Mic, MicOff, X, Music, AlertCircle, MessageSquare, VolumeX, Sparkles, Radio } from 'lucide-react';
import { VOICE_STATES } from './voiceConfig.js';
import { VoiceSettingsModal } from './VoiceSettingsModal.jsx';
import { VoiceDebugPanel } from './VoiceDebugPanel.jsx';
import '../styles/voiceControl.css';

export const VoiceControlUI = ({ voiceManager, user, isAdmin }) => {
  const [voiceState, setVoiceState] = useState(voiceManager ? voiceManager.getStatePayload() : null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

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
  const isConversing = state === VOICE_STATES.CONVERSING || !!voiceState?.isConversing;
  const isSpeaking = state === VOICE_STATES.SPEAKING || (voiceManager.responseManager && voiceManager.responseManager.isSpeaking);

  const isActive = state !== VOICE_STATES.IDLE;

  const handleToggle = (e) => {
    e.stopPropagation();
    voiceManager.toggle();
  };

  const handleToggleConversational = (e) => {
    e.stopPropagation();
    if (isConversing) {
      voiceManager.stopConversationalSession();
    } else {
      voiceManager.startConversationalSession();
      setIsTranscriptOpen(true);
    }
  };

  const handleStopSpeaking = (e) => {
    e.stopPropagation();
    if (voiceManager.responseManager) {
      voiceManager.responseManager.cancel();
    }
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    if (voiceManager.cancel) {
      voiceManager.cancel();
    } else {
      voiceManager.stop();
    }
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

  const getOrbStateClass = () => {
    if (isSpeaking) return 'speaking';
    if (isConversing) return 'conversing';
    if (isProcessing || isExecuting) return 'processing';
    if (isListeningCommand || isWakeDetected) return 'listening';
    return 'idle';
  };

  const showFloatingCapsule =
    isWakeDetected ||
    isListeningCommand ||
    isProcessing ||
    isExecuting ||
    isSuccess ||
    isError ||
    isAmbiguous;

  const transcript = voiceState?.conversationTranscript || [];

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
            ? 'Voice Controls Active ("Hey Musicly") — Click to disable microphone, right-click for settings'
            : 'Voice Controls Off — Click to enable microphone ("Hey Musicly")'
        }
        aria-label={isActive ? 'Voice Controls Active' : 'Voice Controls Off'}
      >
        {isActive ? <Mic size={17} /> : <MicOff size={17} style={{ opacity: 0.7 }} />}
        {isActive && <span className={`voice-mic-dot active ${getDotClass()}`} />}
      </button>

      {/* Assistant Orb & Waveform Floating Widget */}
      {isActive && (
        <div className="voice-assistant-orb-wrapper">
          {/* Conversational Transcript Drawer */}
          {isTranscriptOpen && (
            <div className="voice-transcript-drawer">
              <div className="voice-transcript-header">
                <div className="voice-transcript-header-title">
                  <Sparkles size={15} style={{ color: '#a855f7' }} />
                  <span>Musicly AI Transcript</span>
                </div>
                <div className="voice-transcript-header-actions">
                  {isSpeaking && (
                    <button
                      className="voice-transcript-icon-btn"
                      onClick={handleStopSpeaking}
                      title="Stop Spoken Audio"
                    >
                      <VolumeX size={14} style={{ color: '#f87171' }} />
                    </button>
                  )}
                  <button
                    className="voice-transcript-icon-btn"
                    onClick={() => setIsTranscriptOpen(false)}
                    title="Close Transcript"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="voice-transcript-body">
                {transcript.length === 0 ? (
                  <div className="voice-transcript-bubble system">
                    Start speaking with "Hey Musicly" or speak naturally with conversational AI.
                  </div>
                ) : (
                  transcript.map((entry) => (
                    <div
                      key={entry.id}
                      className={`voice-transcript-bubble ${entry.role}`}
                    >
                      {entry.text}
                    </div>
                  ))
                )}
              </div>

              <div className="voice-transcript-footer">
                <div className="voice-transcript-mode-badge">
                  <Radio size={12} />
                  <span>{isConversing ? 'Conversational AI' : 'Quick Voice Commands'}</span>
                </div>
                <button
                  className={`voice-transcript-footer-btn ${isConversing ? 'active' : ''}`}
                  onClick={handleToggleConversational}
                >
                  {isConversing ? 'Switch to Quick Mode' : 'Start Conversing'}
                </button>
              </div>
            </div>
          )}

          {/* Interactive Floating Orb Button */}
          <button
            className="voice-orb-interactive-btn"
            onClick={() => setIsTranscriptOpen((prev) => !prev)}
            title={`Musicly AI Assistant (${getOrbStateClass()}) — Click for Conversation Transcript`}
          >
            <div className={`voice-assistant-orb ${getOrbStateClass()}`}>
              {isSpeaking ? (
                <div className="voice-orb-waveform">
                  <span className="voice-orb-bar" />
                  <span className="voice-orb-bar" />
                  <span className="voice-orb-bar" />
                  <span className="voice-orb-bar" />
                </div>
              ) : isConversing ? (
                <MessageSquare size={16} color="#ffffff" />
              ) : (
                <Sparkles size={16} color="#ffffff" />
              )}
            </div>
          </button>
        </div>
      )}

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
        user={user}
        isAdmin={isAdmin}
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
