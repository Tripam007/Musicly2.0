/**
 * Air Controls - Pure Landmark Geometric Gesture Classifier
 * Processes 21 3D MediaPipe hand landmarks and tracks temporal stability & motion.
 */

function distance2D(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function isFingerExtended(tip, pip, mcp, wrist) {
  const dTipWrist = distance2D(tip, wrist);
  const dPipWrist = distance2D(pip, wrist);
  const dTipMcp = distance2D(tip, mcp);
  const dPipMcp = distance2D(pip, mcp);
  return dTipWrist > dPipWrist * 1.04 && dTipMcp > dPipMcp * 0.95;
}

function isFingerCurled(tip, pip, mcp, wrist) {
  const dTipWrist = distance2D(tip, wrist);
  const dPipWrist = distance2D(pip, wrist);
  const dTipMcp = distance2D(tip, mcp);
  const dPipMcp = distance2D(pip, mcp);
  return dTipWrist < dPipWrist * 1.0 || dTipMcp < dPipMcp * 0.95;
}

export class AirGestureClassifier {
  constructor(options = {}) {
    // Stability duration required for static poses (~180 - 240ms)
    this.minStableMs = options.minStableMs || 200;
    // Cooldown duration after any triggered discrete action (~800 - 1000ms)
    this.cooldownMs = options.cooldownMs || 850;
    // Swipe threshold in normalized screen coordinates (0.0 - 1.0)
    this.swipeThreshold = options.swipeThreshold || 0.04;

    // Movement history buffer for directional gestures: [{ time, x, y, thumbX, thumbY }]
    this.motionHistory = [];
    this.historyWindowMs = 350;

    // Temporal stability state
    this.candidateGesture = null;
    this.candidateStartTime = 0;

    // Cooldown & release state
    this.cooldownUntil = 0;
    this.lastTriggeredGesture = null;
    this.waitingForNeutralRelease = false;

    // Debug info
    this.debugState = {
      rawGesture: 'NONE',
      confidence: 0,
      stableProgress: 0,
      cooldownActive: false,
      waitingRelease: false,
      fps: 0,
      handDetected: false
    };
  }

  reset() {
    this.motionHistory = [];
    this.candidateGesture = null;
    this.candidateStartTime = 0;
    this.cooldownUntil = 0;
    this.lastTriggeredGesture = null;
    this.waitingForNeutralRelease = false;
  }

  /**
   * Main classification step called on each camera frame
   * @param {Array} landmarks - 21 normalized landmarks [{x, y, z}, ...]
   * @param {number} confidence - detection score (0.0 - 1.0)
   * @param {number} now - timestamp (performance.now())
   * @returns {string | null} Triggered gesture identifier or null
   */
  processFrame(landmarks, confidence = 0.8, now = performance.now()) {
    // 1. False Positive Protection: No hand or low confidence
    if (!landmarks || landmarks.length < 21 || confidence < 0.5) {
      this.handleHandLost(now);
      this.updateDebug('NONE', confidence, false);
      return null;
    }

    // 2. Boundary Check: Hand partially outside the frame
    const keyIndices = [0, 4, 8, 12, 16, 20];
    const isOutOfBounds = keyIndices.some(idx => {
      const p = landmarks[idx];
      return p.x < 0.02 || p.x > 0.98 || p.y < 0.02 || p.y > 0.98;
    });

    if (isOutOfBounds) {
      this.updateDebug('OUT_OF_BOUNDS', confidence, false);
      return null;
    }

    // 3. Hand Scale Check: Hand too far away
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const handScale = distance2D(wrist, middleMcp);
    if (handScale < 0.08) {
      this.updateDebug('TOO_FAR', confidence, false);
      return null;
    }

    // Mirror X coordinate so user movement to their right moves to the right in screen space
    const centerMirroredX = 1 - middleMcp.x;
    const centerY = middleMcp.y;
    const thumbMirroredX = 1 - landmarks[4].x;
    const thumbY = landmarks[4].y;

    // 4. Update Motion History
    this.motionHistory.push({
      time: now,
      x: centerMirroredX,
      y: centerY,
      thumbX: thumbMirroredX,
      thumbY: thumbY
    });

    // Prune history older than window
    const cutoff = now - this.historyWindowMs;
    this.motionHistory = this.motionHistory.filter(pt => pt.time >= cutoff);

    // 5. Check Directional Thumb / Hand Movement (High Priority: Next/Prev track)
    const directionalSwipe = this.checkDirectionalSwipe(landmarks, handScale, now);
    if (directionalSwipe) {
      if (now >= this.cooldownUntil && !this.waitingForNeutralRelease) {
        this.triggerGesture(directionalSwipe, now);
        this.updateDebug(directionalSwipe, confidence, true);
        return directionalSwipe;
      }
      this.updateDebug(directionalSwipe, confidence, true);
      return null;
    }

    // 6. Classify Static Pose (Palm vs Fist vs Volume vs Peace vs Like)
    const staticPose = this.classifyStaticPose(landmarks, handScale);
    this.updateDebug(staticPose, confidence, true);

    // If gesture returned to NEUTRAL or hand opened/relaxed
    if (staticPose === 'NEUTRAL') {
      this.waitingForNeutralRelease = false;
      this.candidateGesture = null;
      this.candidateStartTime = 0;
      return null;
    }

    const isVolume = staticPose === 'ONE_FINGER_UP' || staticPose === 'ONE_FINGER_DOWN';

    // If waiting for release of non-volume discrete action
    if (this.waitingForNeutralRelease && !isVolume) {
      if (staticPose === this.lastTriggeredGesture) {
        return null;
      } else {
        // User changed gesture
        this.waitingForNeutralRelease = false;
      }
    }

    // If still in cooldown period
    if (now < this.cooldownUntil) {
      return null;
    }

    // Required stable duration: snappy 130ms for volume, 200ms for palm/fist
    const requiredStableMs = isVolume ? 130 : this.minStableMs;

    // 7. Temporal Stability Validation
    if (this.candidateGesture === staticPose) {
      const stableDuration = now - this.candidateStartTime;
      this.debugState.stableProgress = Math.min(1, stableDuration / requiredStableMs);

      if (stableDuration >= requiredStableMs) {
        // Trigger confirmed gesture!
        this.triggerGesture(staticPose, now);
        return staticPose;
      }
    } else {
      // New candidate gesture
      this.candidateGesture = staticPose;
      this.candidateStartTime = now;
      this.debugState.stableProgress = 0;
    }

    return null;
  }

  /**
   * Check for significant horizontal thumb / hand motion or thumb facing direction
   * Facing right / moving right -> Next track (THUMB_SWIPE_RIGHT)
   * Facing left / moving left -> Previous track (THUMB_SWIPE_LEFT)
   */
  checkDirectionalSwipe(landmarks, handScale, now) {
    if (!landmarks || landmarks.length < 21) return null;

    const thumbTip = landmarks[4];
    const indexMcp = landmarks[5];
    const wrist = landmarks[0];

    const dThumbIndex = distance2D(thumbTip, indexMcp);
    const dThumbWrist = distance2D(thumbTip, wrist);
    const isThumbOut = dThumbIndex > handScale * 0.52 || dThumbWrist > handScale * 0.82;

    const isMiddleCurled = distance2D(landmarks[12], wrist) < distance2D(landmarks[10], wrist) * 1.06;
    const isRingCurled = distance2D(landmarks[16], wrist) < distance2D(landmarks[14], wrist) * 1.06;
    const isPinkyCurled = distance2D(landmarks[20], wrist) < distance2D(landmarks[18], wrist) * 1.06;
    const areOtherFingersCurled = (isMiddleCurled ? 1 : 0) + (isRingCurled ? 1 : 0) + (isPinkyCurled ? 1 : 0) >= 2;

    if (isThumbOut && areOtherFingersCurled) {
      // In mirrored coordinates (natural screen view: right on screen is +X)
      const thumbTipMirroredX = 1 - thumbTip.x;
      const indexMcpMirroredX = 1 - indexMcp.x;
      const facingDiff = thumbTipMirroredX - indexMcpMirroredX;

      const isFacingRight = facingDiff > 0.035;
      const isFacingLeft = facingDiff < -0.035;

      let dx = 0;
      if (this.motionHistory.length >= 2) {
        const oldest = this.motionHistory[0];
        const newest = this.motionHistory[this.motionHistory.length - 1];
        dx = newest.x - oldest.x;
      }

      const isMovingRight = dx > 0.035;
      const isMovingLeft = dx < -0.035;

      if (isFacingRight || isMovingRight) {
        this.motionHistory = [];
        return 'THUMB_SWIPE_RIGHT'; // Next track
      } else if (isFacingLeft || isMovingLeft) {
        this.motionHistory = [];
        return 'THUMB_SWIPE_LEFT';  // Previous track
      }
    }

    return null;
  }

  /**
   * Geometrically classify instantaneous hand pose
   * Palm vs Fist are 100% mutually exclusive:
   * Palm: >= 3 fingers extended
   * Fist: 0 fingers extended and curled
   * Volume: 1 finger (index) extended, pointing UP or DOWN
   */
  classifyStaticPose(lm, handScale) {
    const wrist = lm[0];

    // Extension & Curl states for 4 fingers
    const indexExt = isFingerExtended(lm[8], lm[6], lm[5], wrist);
    const indexCurled = isFingerCurled(lm[8], lm[6], lm[5], wrist);

    const middleExt = isFingerExtended(lm[12], lm[10], lm[9], wrist);
    const middleCurled = isFingerCurled(lm[12], lm[10], lm[9], wrist);

    const ringExt = isFingerExtended(lm[16], lm[14], lm[13], wrist);
    const ringCurled = isFingerCurled(lm[16], lm[14], lm[13], wrist);

    const pinkyExt = isFingerExtended(lm[20], lm[18], lm[17], wrist);
    const pinkyCurled = isFingerCurled(lm[20], lm[18], lm[17], wrist);

    // Counts
    const extendedCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0);
    const curledCount = (indexCurled ? 1 : 0) + (middleCurled ? 1 : 0) + (ringCurled ? 1 : 0) + (pinkyCurled ? 1 : 0);

    // Thumb metrics
    const thumbTip = lm[4];
    const thumbMcp = lm[2];
    const dThumbIndex = distance2D(thumbTip, lm[5]);
    const dThumbMiddle = distance2D(thumbTip, lm[9]);
    const thumbExtended = dThumbIndex > handScale * 0.60 && dThumbMiddle > handScale * 0.60;
    const thumbTucked = dThumbIndex < handScale * 0.50 || dThumbMiddle < handScale * 0.50;

    // 1. OPEN PALM (Play / Pause): At least 3 fingers extended, NOT a fist
    if (extendedCount >= 3 && curledCount <= 1) {
      return 'OPEN_PALM';
    }

    // 2. CLOSED FIST (Mute / Unmute): ZERO fingers extended, all curled
    if (extendedCount === 0 && curledCount >= 3 && (thumbTucked || !thumbExtended)) {
      return 'FIST';
    }

    // 3. ONE FINGER (Index only) -> UP or DOWN for Volume
    if (indexExt && (curledCount >= 2 || (!middleExt && !ringExt && !pinkyExt))) {
      const indexTip = lm[8];
      const indexMcp = lm[5];
      const indexDy = indexTip.y - indexMcp.y; // In screen space: y=0 is top

      // Pointing upwards (tip is higher than MCP knuckle)
      if (indexDy < -0.04) {
        return 'ONE_FINGER_UP';
      }
      // Pointing downwards (tip is lower than MCP knuckle)
      if (indexDy > 0.04) {
        return 'ONE_FINGER_DOWN';
      }
    }

    // 4. TWO FINGERS / PEACE (Index & Middle extended, Ring & Pinky curled) -> Ambience
    if (indexExt && middleExt && (ringCurled || !ringExt) && (pinkyCurled || !pinkyExt)) {
      const indexTip = lm[8];
      const middleTip = lm[12];
      if (indexTip.y < lm[6].y && middleTip.y < lm[10].y) {
        return 'PEACE';
      }
    }

    // 5. THUMBS UP / LIKE (Thumb extended upward, all 4 fingers curled) -> Favorite
    if (extendedCount === 0 && (dThumbIndex > handScale * 0.52 || dThumbMiddle > handScale * 0.52)) {
      // Thumb pointing upward (tip higher than MCP)
      if (thumbTip.y < thumbMcp.y - 0.04) {
        return 'LIKE';
      }
    }

    // 6. TWO-FINGER PINCH (Index tip & Thumb tip touching) -> Favorite
    if (distance2D(lm[4], lm[8]) < handScale * 0.22 && !ringExt && !pinkyExt) {
      return 'LIKE';
    }

    return 'NEUTRAL';
  }

  triggerGesture(gesture, now) {
    this.lastTriggeredGesture = gesture;
    if (gesture === 'ONE_FINGER_UP' || gesture === 'ONE_FINGER_DOWN') {
      // CONTINUOUS VOLUME ADJUSTMENT: Repeat smoothly every 190ms as long as posture is held!
      this.waitingForNeutralRelease = false;
      this.cooldownUntil = now + 190;
    } else {
      // Discrete actions (Palm, Fist, Next/Prev, Peace, Like):
      // Require neutral release or gesture change before triggering again
      this.waitingForNeutralRelease = true;
      this.cooldownUntil = now + this.cooldownMs;
      this.candidateGesture = null;
      this.candidateStartTime = 0;
    }
  }

  handleHandLost(now) {
    this.motionHistory = [];
    this.candidateGesture = null;
    this.candidateStartTime = 0;
    this.waitingForNeutralRelease = false;
  }

  updateDebug(gesture, confidence, handDetected) {
    const now = performance.now();
    this.debugState.rawGesture = gesture;
    this.debugState.confidence = Math.round(confidence * 100) / 100;
    this.debugState.cooldownActive = now < this.cooldownUntil;
    this.debugState.waitingRelease = this.waitingForNeutralRelease;
    this.debugState.handDetected = handDetected;
  }

  getDebugState() {
    return { ...this.debugState };
  }
}
