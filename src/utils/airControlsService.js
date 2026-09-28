/**
 * Air Controls - Service & Computer Vision Engine
 * Coordinates MediaPipe HandLandmarker, local camera stream, and RAF loop.
 * 100% Client-Side. ZERO Server Uploads. Video frames are never stored or transmitted.
 */

import { AirGestureClassifier } from './airGestureClassifier';
import { AirFaceClassifier } from './faceGestureClassifier';
import { airAiInferenceEngine } from './airAiInferenceEngine';
import { preprocessLandmarks, validateLandmarkQuality } from './airAiPreprocessor';

class AirControlsService {
  constructor() {
    this.status = 'idle'; // 'idle' | 'requesting_permission' | 'permission_denied' | 'loading_model' | 'active' | 'error'
    this.errorMessage = '';
    this.stream = null;
    this.videoElement = null;
    this.handLandmarker = null;
    this.faceLandmarker = null;
    this.animFrameId = null;
    this.lastVideoTime = -1;
    this.classifier = new AirGestureClassifier();
    this.faceClassifier = new AirFaceClassifier();

    // Callbacks
    this.listeners = new Set();
    this.gestureListeners = new Set();
    this.frameListeners = new Set();

    // Performance tracking
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.currentFps = 0;
  }

  getStatus() {
    return this.status;
  }

  getErrorMessage() {
    return this.errorMessage;
  }

  getVideoElement() {
    return this.videoElement;
  }

  getClassifier() {
    return this.classifier;
  }

  getFaceClassifier() {
    return this.faceClassifier;
  }

  subscribeStatus(fn) {
    this.listeners.add(fn);
    fn(this.status, this.errorMessage);
    return () => this.listeners.delete(fn);
  }

  subscribeGesture(fn) {
    this.gestureListeners.add(fn);
    return () => this.gestureListeners.delete(fn);
  }

  subscribeFrame(fn) {
    this.frameListeners.add(fn);
    return () => this.frameListeners.delete(fn);
  }

  notifyStatus(status, errorMessage = '') {
    this.status = status;
    this.errorMessage = errorMessage;
    this.listeners.forEach(fn => {
      try {
        fn(status, errorMessage);
      } catch (e) {
        console.error('[AirControls] Status listener error:', e);
      }
    });
  }

  notifyGesture(gesture) {
    this.gestureListeners.forEach(fn => {
      try {
        fn(gesture);
      } catch (e) {
        console.error('[AirControls] Gesture listener error:', e);
      }
    });
  }

  /**
   * Lazily loads MediaPipe Tasks Vision, HandLandmarker, and FaceLandmarker
   */
  async initLandmarkers() {
    if (this.handLandmarker && this.faceLandmarker) {
      return { handLandmarker: this.handLandmarker, faceLandmarker: this.faceLandmarker };
    }

    this.notifyStatus('loading_model');
    const { FilesetResolver, HandLandmarker, FaceLandmarker } = await import('@mediapipe/tasks-vision');

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    const handModelAssetPath = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
    const faceModelAssetPath = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

    // 1. Initialize Hand Landmarker
    try {
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: handModelAssetPath,
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
    } catch (gpuErr) {
      console.warn('[AirControls] Hand GPU initialization failed, falling back to CPU:', gpuErr);
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: handModelAssetPath,
          delegate: 'CPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6
      });
    }

    // 2. Initialize Face Landmarker (for face turn & movement controls)
    try {
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: faceModelAssetPath,
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
    } catch (gpuErr) {
      console.warn('[AirControls] Face GPU initialization failed, falling back to CPU:', gpuErr);
      try {
        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: faceModelAssetPath,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
      } catch (faceErr) {
        console.warn('[AirControls] FaceLandmarker initialization error:', faceErr);
      }
    }

    return { handLandmarker: this.handLandmarker, faceLandmarker: this.faceLandmarker };
  }

  /**
   * Compatibility alias
   */
  async initHandLandmarker() {
    return this.initLandmarkers();
  }

  /**
   * Explicitly starts Air Controls
   */
  async start() {
    if (this.status === 'active' || this.status === 'requesting_permission' || this.status === 'loading_model') {
      return;
    }

    // Mobile check
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      console.info('[AirControls] Air Controls is designed for desktop/laptop environments.');
    }

    try {
      this.notifyStatus('requesting_permission');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam access is not supported by your browser.');
      }

      // Request STRICTLY camera permission, NO audio/microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user'
        },
        audio: false
      });

      this.stream = stream;

      // Handle stream disconnection
      stream.getVideoTracks().forEach(track => {
        track.onended = () => {
          console.warn('[AirControls] Camera track ended or disconnected.');
          this.stop();
        };
      });

      // Create hidden video element if not already present
      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.setAttribute('playsinline', '');
        this.videoElement.setAttribute('autoplay', '');
        this.videoElement.muted = true;
      }

      this.videoElement.srcObject = stream;

      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play().then(resolve).catch(reject);
        };
        this.videoElement.onerror = reject;
      });

      // Load MediaPipe landmarkers and custom Air AI neural classifier
      await this.initLandmarkers();
      await airAiInferenceEngine.loadModel();

      // Reset state and begin detection loop
      this.classifier.reset();
      this.faceClassifier.reset();
      airAiInferenceEngine.reset();
      this.lastVideoTime = -1;
      this.frameCount = 0;
      this.lastFpsUpdate = performance.now();
      this.notifyStatus('active');

      this.startLoop();
    } catch (err) {
      console.error('[AirControls] Start error:', err);
      this.stopMediaStream();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.notifyStatus('permission_denied', 'Camera access is required for Air Controls.');
      } else {
        this.notifyStatus('error', err.message || 'Failed to start camera.');
      }
    }
  }

  /**
   * Animation Frame Processing Loop
   */
  startLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const loop = (now) => {
      if (this.status !== 'active') return;

      this.animFrameId = requestAnimationFrame(loop);

      // Calculate FPS
      this.frameCount++;
      if (now - this.lastFpsUpdate >= 1000) {
        this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
        this.frameCount = 0;
        this.lastFpsUpdate = now;
      }

      const video = this.videoElement;
      if (!video || video.readyState < 2) return;

      // Only process when a new video frame is available
      if (video.currentTime !== this.lastVideoTime && (this.handLandmarker || this.faceLandmarker)) {
        this.lastVideoTime = video.currentTime;

        let handResults = null;
        let faceResults = null;

        // Run FaceLandmarker
        if (this.faceLandmarker) {
          try {
            faceResults = this.faceLandmarker.detectForVideo(video, now);
          } catch (e) {
            // Drop frame gracefully
          }
        }

        // Run HandLandmarker
        if (this.handLandmarker) {
          try {
            handResults = this.handLandmarker.detectForVideo(video, now);
          } catch (e) {
            // Drop frame gracefully
          }
        }

        this.handleDetectionResults(handResults, faceResults, now);
      }
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Process results and dispatch gestures
   */
  handleDetectionResults(handResults, faceResults, now) {
    // 1. Process Face Turn & Head Movement
    let primaryFaceLandmarks = null;
    let faceGesture = null;

    if (faceResults && faceResults.faceLandmarks && faceResults.faceLandmarks.length > 0) {
      primaryFaceLandmarks = faceResults.faceLandmarks[0];
      faceGesture = this.faceClassifier.processFrame(primaryFaceLandmarks, now);
    } else {
      this.faceClassifier.handleFaceLost();
    }

    // 2. Process Hand Landmarks
    let primaryLandmarks = null;
    let confidence = 0;
    let handedness = 'Right';

    if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
      if (handResults.landmarks.length === 1) {
        primaryLandmarks = handResults.landmarks[0];
        confidence = handResults.handednesses?.[0]?.[0]?.score || 0.85;
        handedness = handResults.handednesses?.[0]?.[0]?.categoryName || 'Right';
      } else {
        let bestScore = -1;
        let chosenIdx = 0;

        handResults.landmarks.forEach((lm, idx) => {
          const wrist = lm[0];
          const middleMcp = lm[9];
          const scale = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y);
          const distFromCenter = Math.hypot(middleMcp.x - 0.5, middleMcp.y - 0.5);
          const score = scale - distFromCenter * 0.3;
          if (score > bestScore) {
            bestScore = score;
            chosenIdx = idx;
          }
        });

        primaryLandmarks = handResults.landmarks[chosenIdx];
        confidence = handResults.handednesses?.[chosenIdx]?.[0]?.score || 0.8;
        handedness = handResults.handednesses?.[chosenIdx]?.[0]?.categoryName || 'Right';
      }
    }

    // Process Hand with Geometric Temporal Classifier
    const geometricGesture = this.classifier.processFrame(primaryLandmarks, confidence, now);

    // Air AI Neural Network Inference Pipeline
    let aiInferenceResult = null;
    let aiGesture = null;

    if (primaryLandmarks) {
      const normVector = preprocessLandmarks(primaryLandmarks, handedness);
      if (normVector && airAiInferenceEngine.isLoaded) {
        aiInferenceResult = airAiInferenceEngine.processFrameInference(normVector, primaryLandmarks, now);
        if (aiInferenceResult.gesture) {
          aiGesture = aiInferenceResult.gesture;
        }
      }
    }

    // 3. Trigger confirmed gesture
    // Face gestures (FACE_RIGHT / FACE_LEFT) take precedence for track changing
    const triggeredGesture = faceGesture || geometricGesture || aiGesture;

    if (triggeredGesture) {
      this.notifyGesture(triggeredGesture);
    }

    // 4. Inform frame listeners (for canvas preview, debug panel, and real-time live telemetry)
    if (this.frameListeners.size > 0) {
      const debugState = this.classifier.getDebugState();
      debugState.fps = this.currentFps;
      debugState.handedness = handedness;
      debugState.face = this.faceClassifier.getDebugState();

      if (aiInferenceResult?.rawPrediction) {
        debugState.aiModel = {
          predictedClass: aiInferenceResult.rawPrediction.predictedClass,
          confidence: aiInferenceResult.rawPrediction.confidence,
          latencyMs: aiInferenceResult.rawPrediction.latencyMs,
          probabilities: aiInferenceResult.rawPrediction.probabilities,
          isAccepted: aiInferenceResult.isAccepted,
          state: aiInferenceResult.state,
          top3: aiInferenceResult.top3 || [],
          motion: aiInferenceResult.motion || null,
          reason: aiInferenceResult.reason,
          modelVersion: airAiInferenceEngine.modelMetadata?.version || 'v1.1.0'
        };
      }

      this.frameListeners.forEach(fn => {
        try {
          fn(primaryLandmarks, debugState, primaryFaceLandmarks);
        } catch (err) {}
      });
    }
  }

  stopMediaStream() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {}
      });
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Stops Air Controls completely and frees all camera resources
   */
  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.stopMediaStream();
    this.classifier.reset();
    this.faceClassifier.reset();
    this.notifyStatus('idle');
  }

  toggle() {
    if (this.status === 'active' || this.status === 'requesting_permission' || this.status === 'loading_model') {
      this.stop();
    } else {
      this.start();
    }
  }
}

export const airControlsService = new AirControlsService();
