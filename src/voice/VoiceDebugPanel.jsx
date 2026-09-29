/**
 * VoiceDebugPanel.jsx
 * 
 * Development-only voice telemetry & debug panel.
 * Displays real-time pipeline diagnostics:
 * - Wake Word status
 * - Microphone status
 * - Audio Recording status
 * - Transcript & STT Confidence
 * - Detected Language
 * - Intent & Intent Confidence
 * - Entity & Entity Confidence
 * - Execution Action
 * - Complete Latency Breakdown (Wake -> Command -> STT -> Parse)
 */

import React from 'react';
import { X, Activity, ShieldCheck, Clock, Zap } from 'lucide-react';
import '../styles/voiceControl.css';

export const VoiceDebugPanel = ({ isOpen, onClose, voiceManager }) => {
  if (!isOpen || !voiceManager) return null;

  const statePayload = voiceManager.getStatePayload();
  const debug = statePayload.debugInfo || {
    wakeWord: statePayload.state !== 'IDLE' ? 'LISTENING' : 'NOT DETECTED',
    microphone: statePayload.hasPermission ? 'READY' : 'WAITING',
    recording: statePayload.state === 'LISTENING_FOR_COMMAND' ? 'YES' : 'NO',
    transcript: statePayload.lastRecognized || 'None',
    sttConfidence: statePayload.confidence || 0,
    detectedLanguage: statePayload.config?.language || 'en-IN',
    intent: 'None',
    intentConfidence: 0,
    entity: 'None',
    entityConfidence: 0,
    action: 'None',
    latencies: { wakeToCommandMs: 0, sttMs: 0, parseMs: 0 }
  };

  return (
    <div className="voice-debug-overlay">
      <div className="voice-debug-panel">
        <div className="voice-debug-header">
          <div className="voice-debug-title">
            <Activity size={18} style={{ color: '#10b981' }} />
            <span>Voice AI Diagnostics (Dev Only)</span>
          </div>
          <button className="voice-debug-close" onClick={onClose} aria-label="Close Debug Panel">
            <X size={16} />
          </button>
        </div>

        <div className="voice-debug-grid">
          <div className="voice-debug-item">
            <span className="voice-debug-label">Wake Word</span>
            <span className={`voice-debug-val ${debug.wakeWord === 'DETECTED' ? 'badge-green' : 'badge-neutral'}`}>
              {debug.wakeWord}
            </span>
          </div>

          <div className="voice-debug-item">
            <span className="voice-debug-label">Microphone</span>
            <span className={`voice-debug-val ${debug.microphone === 'READY' ? 'badge-green' : 'badge-yellow'}`}>
              {debug.microphone}
            </span>
          </div>

          <div className="voice-debug-item">
            <span className="voice-debug-label">Recording</span>
            <span className={`voice-debug-val ${debug.recording === 'YES' ? 'badge-red' : 'badge-neutral'}`}>
              {debug.recording}
            </span>
          </div>

          <div className="voice-debug-item">
            <span className="voice-debug-label">Detected Language</span>
            <span className="voice-debug-val badge-neutral">
              {debug.detectedLanguage}
            </span>
          </div>
        </div>

        <div className="voice-debug-section">
          <div className="voice-debug-row">
            <span className="voice-debug-label">Raw Transcript</span>
            <span className="voice-debug-text">"{debug.transcript}"</span>
          </div>

          <div className="voice-debug-row">
            <span className="voice-debug-label">STT Confidence</span>
            <span className="voice-debug-num">{(debug.sttConfidence * 100).toFixed(1)}%</span>
          </div>

          <div className="voice-debug-row">
            <span className="voice-debug-label">Recognized Intent</span>
            <span className="voice-debug-badge intent">{debug.intent}</span>
          </div>

          <div className="voice-debug-row">
            <span className="voice-debug-label">Intent Confidence</span>
            <span className="voice-debug-num">{(debug.intentConfidence * 100).toFixed(1)}%</span>
          </div>

          <div className="voice-debug-row">
            <span className="voice-debug-label">Extracted Entity</span>
            <span className="voice-debug-text">{debug.entity}</span>
          </div>

          <div className="voice-debug-row">
            <span className="voice-debug-label">Entity Confidence</span>
            <span className="voice-debug-num">{(debug.entityConfidence * 100).toFixed(1)}%</span>
          </div>

          <div className="voice-debug-row">
            <span className="voice-debug-label">Authoritative Action</span>
            <span className="voice-debug-badge action">{debug.action}</span>
          </div>
        </div>

        <div className="voice-debug-latencies">
          <div className="voice-latency-item">
            <Clock size={12} />
            <span>Wake &rarr; Cmd: <strong>{debug.latencies?.wakeToCommandMs || 0}ms</strong></span>
          </div>
          <div className="voice-latency-item">
            <Zap size={12} />
            <span>STT Latency: <strong>{debug.latencies?.sttMs || 0}ms</strong></span>
          </div>
          <div className="voice-latency-item">
            <Activity size={12} />
            <span>Parse & Action: <strong>{debug.latencies?.parseMs || 0}ms</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
