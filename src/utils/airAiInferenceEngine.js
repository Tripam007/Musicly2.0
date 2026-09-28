/**
 * Musicly Air AI - Browser Inference Engine & Temporal Motion Tracker
 * 
 * Architecture:
 * WEBCAM -> MediaPipe Hand Landmarks -> Normalization (63-D) 
 *        -> MLP Classifier (6 classes) -> Temporal Motion Tracker 
 *        -> State Machine Validation -> Musicly Audio Action
 * 
 * 100% Client-Side. 0 External API Calls. 0 Camera Uploads.
 */

import { FEATURE_VECTOR_DIM, AIR_AI_CLASSES, distance3D } from './airAiPreprocessor';
import localModelBundle from '../data/airAiModel_v1.json';

class AirAiInferenceEngine {
  constructor() {
    this.model = null;
    this.isLoaded = false;
    this.modelMetadata = null;
    this.classes = AIR_AI_CLASSES;
    this.confidenceThreshold = 0.65;

    // Temporal Motion Tracker & State Machine
    // States: 'IDLE' | 'GESTURE_DETECTED' | 'TRACKING' | 'TRIGGERED' | 'COOLDOWN'
    this.state = 'IDLE';
    this.candidateClass = null;
    this.candidateStartTime = 0;
    this.trackingStartX = null;
    this.trackingStartY = null;
    this.smoothedX = null;
    this.smoothedY = null;
    this.motionHistory = []; // [{ time, x, y }]

    // Cooldown & Neutral Release Guard
    this.cooldownMs = 1000;
    this.cooldownUntil = 0;
    this.lastTriggeredClass = null;
    this.waitingForNeutralRelease = false;

    // Real live telemetry buffer (rolling max 200 events)
    this.telemetryEvents = this.loadStoredTelemetry();
    this.telemetryListeners = new Set();
  }

  loadStoredTelemetry() {
    try {
      const stored = localStorage.getItem('musicly_air_ai_telemetry');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed.slice(-200);
      }
    } catch (e) {}
    return [];
  }

  saveTelemetry() {
    try {
      localStorage.setItem('musicly_air_ai_telemetry', JSON.stringify(this.telemetryEvents.slice(-200)));
    } catch (e) {}
  }

  subscribeTelemetry(fn) {
    this.telemetryListeners.add(fn);
    return () => this.telemetryListeners.delete(fn);
  }

  notifyTelemetry() {
    const data = this.getTelemetrySummary();
    this.telemetryListeners.forEach(fn => {
      try { fn(data); } catch (e) {}
    });
  }

  /**
   * Initializes the browser model
   */
  async loadModel() {
    if (this.isLoaded) return true;

    try {
      let weights = null;
      let metadata = null;

      // 1. First check if a custom in-browser trained model exists in localStorage
      try {
        const customModelStr = localStorage.getItem('musicly_air_ai_custom_model');
        if (customModelStr) {
          const customModel = JSON.parse(customModelStr);
          if (customModel.weights && customModel.weights.layers) {
            weights = customModel.weights;
            metadata = customModel.metadata;
            console.log('[AirAI] Loaded custom trained in-browser model:', metadata.version);
          }
        }
      } catch (customErr) {
        console.warn('[AirAI] Could not load custom model:', customErr);
      }

      // 2. Fallback: try fetching v1.1.0 first, then v1.0.0
      if (!weights) {
        for (const ver of ['v1.1.0', 'v1.0.0']) {
          try {
            const resp = await fetch(`/models/air-ai/${ver}/model_weights.json`);
            if (resp.ok) {
              weights = await resp.json();
              const metaResp = await fetch(`/models/air-ai/${ver}/model_metadata.json`);
              if (metaResp.ok) metadata = await metaResp.json();
              break;
            }
          } catch (err) {}
        }
      }

      if (!weights && localModelBundle?.weights) {
        weights = localModelBundle.weights;
        metadata = localModelBundle.metadata;
      }

      if (!weights || !weights.layers) {
        throw new Error('Failed to load gesture model weights');
      }

      this.model = weights;
      this.modelMetadata = metadata || {
        model_name: 'Musicly Gesture AI',
        version: 'v1.1.0',
        dataset_version: '1.1.0'
      };

      this.isLoaded = true;
      console.log(`[AirAI] Model active: ${this.modelMetadata.model_name} ${this.modelMetadata.version}`);
      return true;
    } catch (e) {
      console.error('[AirAI] Error loading inference model:', e);
      return false;
    }
  }

  /**
   * Instantly reloads the inference engine with newly trained custom model weights
   */
  reloadCustomModel(customModelData) {
    if (!customModelData || !customModelData.weights || !customModelData.weights.layers) {
      return false;
    }
    this.model = customModelData.weights;
    this.modelMetadata = customModelData.metadata;
    this.isLoaded = true;
    try {
      localStorage.setItem('musicly_air_ai_custom_model', JSON.stringify(customModelData));
    } catch (e) {}
    this.notifyTelemetry();
    console.log(`[AirAI] Hot-reloaded custom model: ${this.modelMetadata.version} (${this.modelMetadata.sample_count} samples)`);
    return true;
  }

  /**
   * Pure JavaScript Forward Pass through trained MLP:
   * Input (63) -> Dense(64, ReLU) -> Dense(32, ReLU) -> Dense(6, Softmax)
   * 
   * @param {Float32Array} inputVector - 63-element normalized landmark array
   * @returns {{ probabilities: number[], predictedClass: string, confidence: number, top3: Array<{label: string, prob: number}>, latencyMs: number }}
   */
  predict(inputVector) {
    if (!this.isLoaded || !this.model || !inputVector || inputVector.length !== FEATURE_VECTOR_DIM) {
      return null;
    }

    const t0 = performance.now();
    const layers = this.model.layers;
    const numClasses = this.classes.length;

    // Layer 1: 63 -> 64 (ReLU)
    const W1 = layers[0].weights;
    const b1 = layers[0].biases;
    const h1 = new Float32Array(64);

    for (let j = 0; j < 64; j++) {
      let sum = b1[j];
      for (let i = 0; i < 63; i++) {
        sum += inputVector[i] * W1[i][j];
      }
      h1[j] = sum > 0 ? sum : 0;
    }

    // Layer 2: 64 -> 32 (ReLU)
    const W2 = layers[1].weights;
    const b2 = layers[1].biases;
    const h2 = new Float32Array(32);

    for (let k = 0; k < 32; k++) {
      let sum = b2[k];
      for (let j = 0; j < 64; j++) {
        sum += h1[j] * W2[j][k];
      }
      h2[k] = sum > 0 ? sum : 0;
    }

    // Layer 3: 32 -> numClasses (Softmax)
    const W3 = layers[2].weights;
    const b3 = layers[2].biases;
    const logits = new Float32Array(numClasses);
    let maxLogit = -Infinity;

    for (let m = 0; m < numClasses; m++) {
      let sum = b3[m];
      for (let k = 0; k < 32; k++) {
        sum += h2[k] * W3[k][m];
      }
      logits[m] = sum;
      if (sum > maxLogit) maxLogit = sum;
    }

    // Numerically Stable Softmax
    const exps = new Float32Array(numClasses);
    let expSum = 0;
    for (let m = 0; m < numClasses; m++) {
      exps[m] = Math.exp(logits[m] - maxLogit);
      expSum += exps[m];
    }

    const probabilities = [];
    let bestIdx = 0;
    let maxProb = -1;

    for (let m = 0; m < numClasses; m++) {
      const p = exps[m] / expSum;
      probabilities.push(p);
      if (p > maxProb) {
        maxProb = p;
        bestIdx = m;
      }
    }

    // Top 3 predictions sorted descending (Requirement 9)
    const sortedIndices = Array.from({ length: numClasses }, (_, i) => i)
      .sort((a, b) => probabilities[b] - probabilities[a]);

    const top3 = sortedIndices.slice(0, 3).map(idx => ({
      label: this.classes[idx] || 'UNKNOWN',
      prob: Math.round(probabilities[idx] * 1000) / 1000,
      percent: Math.round(probabilities[idx] * 100)
    }));

    const latencyMs = Math.round((performance.now() - t0) * 100) / 100;
    const predictedClass = this.classes[bestIdx] || 'NO_GESTURE';

    return {
      probabilities,
      predictedClass,
      confidence: Math.round(maxProb * 1000) / 1000,
      classIndex: bestIdx,
      top3,
      latencyMs
    };
  }

  /**
   * Main Recognition Pipeline:
   * Landmark Preprocessing -> Pose Classifier -> Temporal Motion Tracker -> State Machine
   * 
   * @param {Float32Array} inputVector - 63-element normalized vector
   * @param {Array<{x: number, y: number, z: number}>} rawLandmarks - 21 raw landmarks
   * @param {number} now - timestamp (performance.now())
   * @returns {{ gesture: string | null, rawPrediction: object, isAccepted: boolean, state: string, motion: object, top3: array, reason: string }}
   */
  processFrameInference(inputVector, rawLandmarks = null, now = performance.now()) {
    const raw = this.predict(inputVector);
    if (!raw) {
      this.state = 'IDLE';
      return { 
        gesture: null, 
        rawPrediction: null, 
        isAccepted: false, 
        state: 'IDLE', 
        motion: null, 
        top3: [], 
        reason: 'model_not_ready' 
      };
    }

    const { predictedClass, confidence, top3, latencyMs } = raw;
    let accepted = false;
    let triggeredAction = null;
    let reason = 'rejected';

    // 1. Hand Position & Motion Tracking via Landmark Coordinates
    let handScale = 0.2;
    let currentMirroredX = 0.5;
    let currentY = 0.5;
    let extendedCount = 0;
    let thumbFacingRight = false;
    let thumbFacingLeft = false;

    if (rawLandmarks && rawLandmarks.length >= 21) {
      const wrist = rawLandmarks[0];
      const middleMcp = rawLandmarks[9];
      handScale = distance3D(wrist, middleMcp) || 0.2;
      
      // In camera mirror mode, user moving right moves right on screen: (1 - x)
      currentMirroredX = 1 - middleMcp.x;
      currentY = middleMcp.y;

      // Exponential Moving Average filter to smooth camera noise
      if (this.smoothedX === null) {
        this.smoothedX = currentMirroredX;
        this.smoothedY = currentY;
      } else {
        this.smoothedX = this.smoothedX * 0.55 + currentMirroredX * 0.45;
        this.smoothedY = this.smoothedY * 0.55 + currentY * 0.45;
      }

      // Check finger extensions to definitively separate PALM from FIST
      const d2D = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const isIndexExt = d2D(rawLandmarks[8], wrist) > d2D(rawLandmarks[6], wrist) * 1.04;
      const isMiddleExt = d2D(rawLandmarks[12], wrist) > d2D(rawLandmarks[10], wrist) * 1.04;
      const isRingExt = d2D(rawLandmarks[16], wrist) > d2D(rawLandmarks[14], wrist) * 1.04;
      const isPinkyExt = d2D(rawLandmarks[20], wrist) > d2D(rawLandmarks[18], wrist) * 1.04;
      extendedCount = (isIndexExt ? 1 : 0) + (isMiddleExt ? 1 : 0) + (isRingExt ? 1 : 0) + (isPinkyExt ? 1 : 0);

      // Thumb facing orientation relative to index knuckle (in mirrored coords)
      const thumbTipX = 1 - rawLandmarks[4].x;
      const indexMcpX = 1 - rawLandmarks[5].x;
      thumbFacingRight = (thumbTipX - indexMcpX) > 0.035;
      thumbFacingLeft = (thumbTipX - indexMcpX) < -0.035;
    }

    let deltaX = 0;
    let deltaY = 0;
    let gestureDuration = 0;

    // Is this a continuous volume posture?
    const isVolumePosture = predictedClass === 'ONE_FINGER_UP' || predictedClass === 'ONE_FINGER_DOWN';

    // 2. Gesture State Machine Execution
    if (isVolumePosture && confidence >= this.confidenceThreshold) {
      // CONTINUOUS VOLUME ADJUSTMENT WHILE HOLDING POSTURE
      this.waitingForNeutralRelease = false; // Never block continuous volume

      if (this.candidateClass !== predictedClass) {
        this.candidateClass = predictedClass;
        this.candidateStartTime = now;
        this.lastVolumeRepeatTime = 0;
        this.state = 'GESTURE_DETECTED';
        reason = 'volume_gesture_detected';
      } else {
        gestureDuration = now - this.candidateStartTime;
        this.state = 'TRACKING';

        // Initial trigger after 180ms stable posture, then repeat smoothly every 220ms
        if (gestureDuration >= 180) {
          if (this.lastVolumeRepeatTime === 0 || (now - this.lastVolumeRepeatTime >= 220)) {
            triggeredAction = predictedClass;
            accepted = true;
            this.state = 'TRIGGERED';
            this.lastVolumeRepeatTime = now;
            this.lastTriggeredClass = predictedClass;
            reason = 'continuous_volume_tick';
          } else {
            reason = 'volume_holding_interval';
          }
        } else {
          reason = 'stabilizing_volume_posture';
        }
      }
    } else {
      // Non-volume gestures (Palm, Fist, Thumb, Neutral)
      this.lastVolumeRepeatTime = 0;

      // Check Cooldown Status
      if (now < this.cooldownUntil) {
        this.state = 'COOLDOWN';
        reason = 'in_cooldown';
      } else if (this.waitingForNeutralRelease) {
        // Must return to NO_GESTURE or release hand before another action can occur
        if (predictedClass === 'NO_GESTURE' || confidence < 0.70 || !rawLandmarks) {
          this.waitingForNeutralRelease = false;
          this.state = 'IDLE';
          this.candidateClass = null;
          this.trackingStartX = null;
          this.motionHistory = [];
          reason = 'neutral_released';
        } else {
          this.state = 'COOLDOWN';
          reason = 'waiting_for_neutral_release';
        }
      } else {
        // Active State Processing
        if (predictedClass === 'NO_GESTURE' || confidence < this.confidenceThreshold) {
          this.state = 'IDLE';
          this.candidateClass = null;
          this.trackingStartX = null;
          this.motionHistory = [];
          reason = 'neutral_or_low_confidence';
        } else {
          // High confidence gesture detected
          if (this.candidateClass !== predictedClass) {
            this.candidateClass = predictedClass;
            this.candidateStartTime = now;
            this.trackingStartX = this.smoothedX;
            this.trackingStartY = this.smoothedY;
            this.motionHistory = [{ time: now, x: this.smoothedX, y: this.smoothedY }];
            this.state = 'GESTURE_DETECTED';
            reason = 'candidate_detected';
          } else {
            this.motionHistory.push({ time: now, x: this.smoothedX, y: this.smoothedY });
            if (this.motionHistory.length > 25) this.motionHistory.shift();

            gestureDuration = now - this.candidateStartTime;
            deltaX = (this.smoothedX !== null && this.trackingStartX !== null) ? (this.smoothedX - this.trackingStartX) : 0;
            deltaY = (this.smoothedY !== null && this.trackingStartY !== null) ? (this.smoothedY - this.trackingStartY) : 0;

            this.state = 'TRACKING';

            // ==========================================
            // ACTION 1: THUMB NAVIGATION (Facing direction & Movement)
            // ==========================================
            if (predictedClass === 'THUMB_GESTURE') {
              const isMovingRight = deltaX > 0.045;
              const isMovingLeft = deltaX < -0.045;

              // Facing right OR moving right -> NEXT SONG
              if (thumbFacingRight || isMovingRight) {
                triggeredAction = 'THUMB_SWIPE_RIGHT';
              }
              // Facing left OR moving left -> PREVIOUS SONG
              else if (thumbFacingLeft || isMovingLeft) {
                triggeredAction = 'THUMB_SWIPE_LEFT';
              } else if (gestureDuration > 1400) {
                this.state = 'IDLE';
                this.candidateClass = null;
                reason = 'stationary_thumb_timeout';
              } else {
                reason = 'tracking_thumb';
              }
            }

            // ==========================================
            // ACTION 2: OPEN PALM (Play / Pause)
            // Definitively verified: extended fingers >= 3
            // ==========================================
            else if (predictedClass === 'OPEN_PALM') {
              const isGeometricallyPalm = extendedCount >= 3;
              const isStationary = Math.abs(deltaX) < 0.12 && Math.abs(deltaY) < 0.12;

              if (!isStationary) {
                this.trackingStartX = this.smoothedX;
                this.trackingStartY = this.smoothedY;
                reason = 'moving_palm_ignored';
              } else if (isGeometricallyPalm && gestureDuration >= 190) {
                triggeredAction = 'OPEN_PALM';
              } else {
                reason = 'stabilizing_open_palm';
              }
            }

            // ==========================================
            // ACTION 3: FIST (Mute / Unmute)
            // Definitively verified: extended fingers === 0
            // ==========================================
            else if (predictedClass === 'FIST') {
              const isGeometricallyFist = extendedCount === 0;
              const isStationary = Math.abs(deltaX) < 0.12 && Math.abs(deltaY) < 0.12;

              if (isGeometricallyFist && isStationary && gestureDuration >= 190) {
                triggeredAction = 'FIST';
              } else {
                reason = 'stabilizing_fist';
              }
            }

            // Action Trigger Confirmation (for Palm, Fist, Thumb)
            if (triggeredAction) {
              this.state = 'TRIGGERED';
              accepted = true;
              reason = 'accepted';
              this.lastTriggeredClass = triggeredAction;
              this.cooldownUntil = now + this.cooldownMs;
              this.waitingForNeutralRelease = true;
              this.candidateClass = null;
              this.trackingStartX = null;
              this.motionHistory = [];
            }
          }
        }
      }
    }

    // Motion Diagnostics for Debug Overlay (Requirement 9)
    const motionDiagnostics = {
      handX: this.smoothedX !== null ? Math.round(this.smoothedX * 100) / 100 : 0.5,
      handY: this.smoothedY !== null ? Math.round(this.smoothedY * 100) / 100 : 0.5,
      startX: this.trackingStartX !== null ? Math.round(this.trackingStartX * 100) / 100 : 0.5,
      deltaX: Math.round(deltaX * 1000) / 1000,
      direction: deltaX > 0.03 ? 'RIGHT' : (deltaX < -0.03 ? 'LEFT' : 'STATIONARY'),
      durationMs: Math.round(gestureDuration),
      state: this.state,
      cooldownActive: now < this.cooldownUntil,
      cooldownRemainingMs: Math.max(0, Math.round(this.cooldownUntil - now))
    };

    // Record privacy-safe telemetry
    this.recordTelemetry({
      timestamp: Date.now(),
      gesture: predictedClass,
      confidence,
      accepted,
      actionTriggered: triggeredAction !== null,
      latencyMs,
      modelVersion: this.modelMetadata?.version || 'v1.1.0'
    });

    return {
      gesture: triggeredAction,
      rawPrediction: raw,
      isAccepted: accepted,
      state: this.state,
      top3,
      motion: motionDiagnostics,
      reason
    };
  }

  recordTelemetry(event) {
    this.telemetryEvents.push(event);
    if (this.telemetryEvents.length > 200) {
      this.telemetryEvents.shift();
    }
    if (this.telemetryEvents.length % 5 === 0) {
      this.saveTelemetry();
      this.notifyTelemetry();
    }
  }

  getTelemetrySummary() {
    const total = this.telemetryEvents.length;
    if (total === 0) {
      return {
        hasData: false,
        totalPredictions: 0,
        acceptedPredictions: 0,
        rejectedPredictions: 0,
        acceptanceRate: 0,
        actionTriggerRate: 0,
        avgConfidence: 0,
        avgLatencyMs: 0,
        events: []
      };
    }

    let acceptedCount = 0;
    let actionCount = 0;
    let confSum = 0;
    let latSum = 0;

    for (const e of this.telemetryEvents) {
      if (e.accepted) acceptedCount++;
      if (e.actionTriggered) actionCount++;
      confSum += e.confidence || 0;
      latSum += e.latencyMs || 0;
    }

    return {
      hasData: true,
      totalPredictions: total,
      acceptedPredictions: acceptedCount,
      rejectedPredictions: total - acceptedCount,
      acceptanceRate: Math.round((acceptedCount / total) * 1000) / 10,
      actionTriggerRate: Math.round((actionCount / total) * 1000) / 10,
      avgConfidence: Math.round((confSum / total) * 100) / 100,
      avgLatencyMs: Math.round((latSum / total) * 100) / 100,
      events: this.telemetryEvents.slice(-50)
    };
  }

  reset() {
    this.state = 'IDLE';
    this.candidateClass = null;
    this.candidateStartTime = 0;
    this.trackingStartX = null;
    this.trackingStartY = null;
    this.smoothedX = null;
    this.smoothedY = null;
    this.motionHistory = [];
    this.cooldownUntil = 0;
    this.lastTriggeredClass = null;
    this.waitingForNeutralRelease = false;
  }
}

export const airAiInferenceEngine = new AirAiInferenceEngine();
