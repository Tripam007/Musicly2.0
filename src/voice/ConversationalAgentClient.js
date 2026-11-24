/**
 * ConversationalAgentClient.js
 * 
 * Client manager for ElevenLabs Conversational AI WebSockets & Real-Time Audio Streaming.
 * Handles:
 * 1. WebSocket lifecycle with ElevenLabs Conversational AI using server-side signed URLs.
 * 2. Real-time microphone audio capture (16kHz PCM mono) streamed over WebSocket.
 * 3. Incoming audio chunk queuing, playback, and instant barge-in / interruption handling.
 * 4. Dual response provider routing:
 *    - ElevenLabs Agent raw audio stream (default)
 *    - Google Cloud TTS text interception (user selected Google as response provider)
 * 5. Two-way Client Tool Calling mapped to MusiclyActionRegistry (play, pause, search, volume, recommend).
 * 6. Live bidirectional conversation transcript management.
 */

import { MusiclyActionRegistry } from './MusiclyActionRegistry.js';
import { MUSICLY_ACTIONS } from './voiceConfig.js';

export class ConversationalAgentClient {
  constructor(options = {}) {
    this.commandClient = options.commandClient;
    this.actionRegistry = options.actionRegistry || MusiclyActionRegistry.getInstance();
    this.onTranscriptUpdate = options.onTranscriptUpdate || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.onToolExecuted = options.onToolExecuted || (() => {});

    this.ws = null;
    this.isConnected = false;
    this.isMuted = false;
    this.isSpeaking = false;
    this.micStream = null;
    this.audioContext = null;
    this.scriptProcessor = null;
    this.outputAudioContext = null;

    // Transcript history: [{ id, role: 'user' | 'agent' | 'system', text, timestamp, toolName }]
    this.transcript = [];

    // Audio playback queue
    this.audioQueue = [];
    this.isPlayingAudio = false;
    this.currentAudioSource = null;
    this.scheduledTime = 0;

    // Active configuration
    this.agentId = options.agentId || 'AeRdCCKzvd23BpJoofzx';
    this.responseProvider = options.responseProvider || 'elevenlabs_agent';
    this.personality = options.personality || null;
  }

  /**
   * Connect to ElevenLabs Conversational AI
   */
  async startConversation({ agentId, personality, responseProvider } = {}) {
    if (this.isConnected) {
      console.log('[ConversationalAgentClient] Already connected.');
      return true;
    }

    if (agentId) this.agentId = agentId;
    if (personality) this.personality = personality;
    if (responseProvider) this.responseProvider = responseProvider;

    this.onStateChange('CONNECTING');

    try {
      // 1. Obtain temporary signed WebSocket URL securely from Firebase Cloud Function
      let wsUrl = null;
      if (this.commandClient?.getConversationalAgentSignedUrl) {
        const urlRes = await this.commandClient.getConversationalAgentSignedUrl(this.agentId);
        if (urlRes?.success && urlRes?.signedUrl) {
          wsUrl = urlRes.signedUrl;
        }
      }

      // Fallback: If no signed URL returned, connect directly if agent ID exists
      if (!wsUrl) {
        const cleanAgentId = this.agentId || 'AeRdCCKzvd23BpJoofzx';
        wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${cleanAgentId}`;
      }

      // 2. Open WebSocket
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = async () => {
        console.log('[ConversationalAgentClient] WebSocket connected.');
        this.isConnected = true;
        this.onStateChange('CONNECTED');

        this._addTranscriptEntry('system', `Connected to Musicly AI (${this.personality?.name || 'Assistant'}).`);

        // Start microphone capture
        await this._startMicCapture();
      };

      this.ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          await this._handleWebSocketMessage(data);
        } catch (err) {
          console.warn('[ConversationalAgentClient] Message parse error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[ConversationalAgentClient] WebSocket error:', err);
        this.onStateChange('ERROR');
      };

      this.ws.onclose = () => {
        console.log('[ConversationalAgentClient] WebSocket closed.');
        this._cleanupConnection();
        this.onStateChange('DISCONNECTED');
      };

      return true;
    } catch (err) {
      console.error('[ConversationalAgentClient] Connection failure:', err);
      this._cleanupConnection();
      this.onStateChange('ERROR');
      return false;
    }
  }

  /**
   * Handle incoming WebSocket messages from ElevenLabs
   */
  async _handleWebSocketMessage(msg) {
    if (!msg) return;

    // 1. Keepalive Ping -> Pong
    if (msg.type === 'ping') {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'pong',
          event_id: msg.ping_event?.event_id || 0
        }));
      }
      return;
    }

    // 2. User live transcript
    if (msg.type === 'user_transcript' && msg.user_transcription_event?.user_transcript) {
      const text = msg.user_transcription_event.user_transcript.trim();
      if (text) {
        this._addTranscriptEntry('user', text);
      }
      return;
    }

    // 3. Agent response text
    if (msg.type === 'agent_response' && msg.agent_response_event?.agent_response) {
      const text = msg.agent_response_event.agent_response.trim();
      if (text) {
        this._addTranscriptEntry('agent', text);

        // If user configured Google Cloud TTS as response provider:
        // Intercept text and speak via Google TTS instead of playing ElevenLabs raw audio!
        if (this.responseProvider === 'google' && this.commandClient?.generateVoiceResponse) {
          try {
            await this.commandClient.generateVoiceResponse(text, {
              provider: 'google',
              voiceId: 'en-US-Journey-F'
            });
          } catch (e) {
            console.warn('[ConversationalAgentClient] Google TTS speech error:', e);
          }
        }
      }
      return;
    }

    // 4. Incoming audio chunk
    if (msg.type === 'audio' && msg.audio_event?.audio_base_64) {
      // If user selected Google as response provider, do not play ElevenLabs raw audio chunks!
      if (this.responseProvider !== 'google') {
        this._enqueueAudioChunk(msg.audio_event.audio_base_64);
      }
      return;
    }

    // 5. Interruption / Barge-In event
    if (msg.type === 'interruption') {
      console.log('[ConversationalAgentClient] User interrupted agent speech.');
      this._stopAudioPlayback();
      return;
    }

    // 6. Client Tool Calling
    if (msg.type === 'client_tool_call' && msg.client_tool_call) {
      await this._handleClientToolCall(msg.client_tool_call);
      return;
    }
  }

  /**
   * Execute Musicly Client Tool Calls requested by the agent
   */
  async _handleClientToolCall(toolCall) {
    const { tool_call_id, tool_name, parameters = {} } = toolCall;
    console.log(`[ConversationalAgentClient] Tool call received: ${tool_name}`, parameters);

    let result = { success: false, message: 'Tool not found' };

    try {
      const name = (tool_name || '').toLowerCase();
      const params = parameters || {};

      if (name.includes('play') && (name.includes('track') || name.includes('song') || params.title)) {
        result = await this.actionRegistry.execute({
          action: MUSICLY_ACTIONS.PLAY_SEARCH,
          params: { query: params.title || params.query || '' }
        });
      } else if (name.includes('pause')) {
        result = await this.actionRegistry.execute({
          action: MUSICLY_ACTIONS.PAUSE
        });
      } else if (name.includes('resume') || name === 'play') {
        result = await this.actionRegistry.execute({
          action: MUSICLY_ACTIONS.PLAY
        });
      } else if (name.includes('next')) {
        result = await this.actionRegistry.execute({
          action: MUSICLY_ACTIONS.NEXT_TRACK
        });
      } else if (name.includes('prev')) {
        result = await this.actionRegistry.execute({
          action: MUSICLY_ACTIONS.PREVIOUS_TRACK
        });
      } else if (name.includes('volume')) {
        const val = typeof params.volume === 'number' ? params.volume : (params.level || 0.7);
        result = await this.actionRegistry.execute({
          action: MUSICLY_ACTIONS.SET_VOLUME,
          params: { volume: val > 1 ? val / 100 : val }
        });
      } else if (name.includes('playing') || name.includes('current')) {
        const ctx = this.actionRegistry.contextProvider() || {};
        result = {
          success: true,
          currentlyPlaying: ctx.currentTrack ? `${ctx.currentTrack.title} by ${ctx.currentTrack.artist}` : 'No music currently playing'
        };
      } else if (name.includes('recommend')) {
        const ctx = this.actionRegistry.contextProvider() || {};
        const tracks = ctx.allTracks || [];
        const mood = (params.mood || params.genre || '').toLowerCase();
        let matched = tracks.filter(t => 
          (t.genre && t.genre.toLowerCase().includes(mood)) ||
          (t.title && t.title.toLowerCase().includes(mood))
        );
        if (matched.length === 0 && tracks.length > 0) {
          matched = tracks.slice(0, 3);
        }
        result = {
          success: true,
          recommendations: matched.slice(0, 3).map(t => ({ title: t.title, artist: t.artist, genre: t.genre }))
        };
      } else if (name.includes('scene')) {
        result = await this.actionRegistry.execute({
          action: MUSICLY_ACTIONS.CHANGE_SCENE,
          params: { sceneId: params.scene || params.name }
        });
      } else {
        // Fallback generic search
        result = await this.actionRegistry.execute({
          action: MUSICLY_ACTIONS.SEARCH,
          params: { query: params.query || tool_name }
        });
      }

      this._addTranscriptEntry('system', `Executed tool "${tool_name}": ${result.success ? 'Success' : 'Completed'}`);
      this.onToolExecuted({ toolName: tool_name, parameters, result });
    } catch (err) {
      console.warn('[ConversationalAgentClient] Tool execution error:', err);
      result = { success: false, error: err.message };
    }

    // Send tool result back to agent WebSocket
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'client_tool_result',
        tool_call_id: tool_call_id,
        result: JSON.stringify(result),
        is_error: !result.success
      }));
    }
  }

  /**
   * Start microphone audio stream (16kHz PCM mono)
   */
  async _startMicCapture() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const source = this.audioContext.createMediaStreamSource(this.micStream);
      // ScriptProcessor for real-time PCM chunk streaming
      this.scriptProcessor = this.audioContext.createScriptProcessor(2048, 1, 1);

      this.scriptProcessor.onaudioprocess = (e) => {
        if (!this.isConnected || this.isMuted) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array to 16-bit PCM ArrayBuffer
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Base64 encode PCM bytes
        const bytes = new Uint8Array(pcm16.buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Chunk = btoa(binary);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            user_audio_chunk: base64Chunk
          }));
        }
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioContext.destination);
    } catch (err) {
      console.warn('[ConversationalAgentClient] Mic capture initialization error:', err);
    }
  }

  /**
   * Queue incoming audio chunk for smooth gapless playback
   */
  _enqueueAudioChunk(base64Audio) {
    if (!base64Audio) return;
    this.audioQueue.push(base64Audio);
    if (!this.isPlayingAudio) {
      this._playNextAudioChunk();
    }
  }

  async _playNextAudioChunk() {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      this.isSpeaking = false;
      this.onStateChange('LISTENING');
      return;
    }

    this.isPlayingAudio = true;
    this.isSpeaking = true;
    this.onStateChange('SPEAKING');

    const chunk = this.audioQueue.shift();
    try {
      // Decode audio chunk using HTML5 Audio
      const audio = new Audio(`data:audio/mp3;base64,${chunk}`);
      this.currentAudioSource = audio;

      audio.onended = () => {
        this.currentAudioSource = null;
        this._playNextAudioChunk();
      };

      audio.onerror = () => {
        this.currentAudioSource = null;
        this._playNextAudioChunk();
      };

      await audio.play();
    } catch {
      this.currentAudioSource = null;
      this._playNextAudioChunk();
    }
  }

  _stopAudioPlayback() {
    this.audioQueue = [];
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.pause();
        this.currentAudioSource.currentTime = 0;
      } catch {}
      this.currentAudioSource = null;
    }
    this.isPlayingAudio = false;
    this.isSpeaking = false;
  }

  _addTranscriptEntry(role, text) {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role,
      text,
      timestamp: Date.now()
    };
    this.transcript.push(entry);
    // Keep max 50 entries
    if (this.transcript.length > 50) {
      this.transcript.shift();
    }
    this.onTranscriptUpdate([...this.transcript]);
  }

  /**
   * Send a manual text message to the agent
   */
  sendMessage(text) {
    if (!text || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this._addTranscriptEntry('user', text);
    this.ws.send(JSON.stringify({
      type: 'user_message',
      message: text
    }));
  }

  setMuted(muted) {
    this.isMuted = muted;
  }

  disconnect() {
    this._cleanupConnection();
  }

  _cleanupConnection() {
    this.isConnected = false;
    this._stopAudioPlayback();

    if (this.micStream) {
      this.micStream.getTracks().forEach(t => t.stop());
      this.micStream = null;
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }

  getTranscript() {
    return [...this.transcript];
  }

  clearTranscript() {
    this.transcript = [];
    this.onTranscriptUpdate([]);
  }
}
