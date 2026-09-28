/**
 * Air Controls - Real-time Precision Face & Head Movement Classifier
 * Detects deliberate, intentional face turns & lateral movements.
 * 
 * Immunity to False Positives:
 * 1. True 3D Eye-to-Nose Perspective Yaw measurement.
 * 2. Adaptive Resting Baseline tracking: requires active delta motion from resting pose.
 * 3. 320ms Temporal Stability verification filter (prevents twitch/glance triggers).
 * 4. Post-trigger Neutral Release Lock: prevents accidental double-skips until user returns to center.
 * 5. 1100ms Action Cooldown.
 * 
 * 100% Client-Side. ZERO video or landmark data leaves the device.
 */

export class AirFaceClassifier {
  constructor(options = {}) {
    // Deliberate intention duration (~320ms)
    this.minStableMs = options.minStableMs || 320;
    // Cooldown duration after triggering (~1100ms)
    this.cooldownMs = options.cooldownMs || 1100;

    // Thresholds for deliberate motion
    this.yawThreshold = 0.26;
    this.shiftThreshold = 0.065;
    this.neutralResetThreshold = 0.11;

    // Adaptive resting baseline tracker
    this.baselineNoseX = 0.5;
    this.baselineEyeMidX = 0.5;
    this.baselineYaw = 0;
    this.isCalibrated = false;

    // Movement history buffer [{ time, x, yaw }]
    this.history = [];
    this.historyWindowMs = 400;

    // Temporal stability candidate state
    this.candidateDirection = null; // 'RIGHT' | 'LEFT' | null
    this.candidateStartTime = 0;

    // State locks
    this.cooldownUntil = 0;
    this.waitingForNeutral = false;
    this.lastTriggeredDirection = null;

    // Telemetry / Live UI metrics
    this.debugState = {
      faceDetected: false,
      direction: 'CENTER',
      yaw: 0,
      shiftX: 0,
      score: 0,
      progress: 0,
      isCooldown: false,
      waitingForNeutral: false
    };
  }

  reset() {
    this.history = [];
    this.candidateDirection = null;
    this.candidateStartTime = 0;
    this.cooldownUntil = 0;
    this.waitingForNeutral = false;
    this.lastTriggeredDirection = null;
    this.isCalibrated = false;
  }

  getDebugState() {
    return { ...this.debugState };
  }

  /**
   * Process face landmarks for the current video frame
   * @param {Array<{x: number, y: number, z: number}>} landmarks - MediaPipe face mesh landmarks
   * @param {number} now - timestamp (performance.now())
   * @returns {'FACE_RIGHT' | 'FACE_LEFT' | null} Triggered gesture or null
   */
  processFrame(landmarks, now = performance.now()) {
    if (!landmarks || landmarks.length < 468) {
      this.handleFaceLost();
      return null;
    }

    // Key Facial Geometry Points:
    // Landmark 1: Nose tip
    // Landmark 33: Outer right eye corner (subject's right)
    // Landmark 263: Outer left eye corner (subject's left)
    // Landmark 168: Nose bridge / glabella midpoint
    // Landmark 234 / 454: Outer facial contour
    const nose = landmarks[1];
    const rightEye = landmarks[33];
    const leftEye = landmarks[263];

    if (!nose || !rightEye || !leftEye) {
      this.handleFaceLost();
      return null;
    }

    // Mirrored screen coordinates (User's Right = Screen Right = +X)
    const mirroredNoseX = 1 - nose.x;
    const mirroredRightEyeX = 1 - rightEye.x;
    const mirroredLeftEyeX = 1 - leftEye.x;

    const eyeMidX = (mirroredRightEyeX + mirroredLeftEyeX) / 2;
    const eyeDist = Math.max(0.04, Math.hypot(mirroredRightEyeX - mirroredLeftEyeX, rightEye.y - leftEye.y));

    // 1. Perspective Eye-to-Nose Yaw
    // When looking straight: nose aligns with eye center -> yaw ≈ 0 (-0.08 to +0.08)
    // When turning face to RIGHT: nose projects to the right of eye center -> yaw > 0
    // When turning face to LEFT: nose projects to the left of eye center -> yaw < 0
    const rawYaw = (mirroredNoseX - eyeMidX) / eyeDist;

    // 2. Adaptive Neutral Resting Baseline
    // Absorbs natural posture asymmetry (e.g. user sitting slightly to the side)
    if (!this.isCalibrated) {
      this.baselineNoseX = mirroredNoseX;
      this.baselineEyeMidX = eyeMidX;
      this.baselineYaw = rawYaw;
      this.isCalibrated = true;
    } else if (!this.waitingForNeutral && Math.abs(rawYaw - this.baselineYaw) < 0.12) {
      // Smoothly adapt resting baseline while user is facing forward in neutral pose
      this.baselineNoseX = this.baselineNoseX * 0.97 + mirroredNoseX * 0.03;
      this.baselineEyeMidX = this.baselineEyeMidX * 0.97 + eyeMidX * 0.03;
      this.baselineYaw = this.baselineYaw * 0.97 + rawYaw * 0.03;
    }

    // 3. Dynamic Delta: Measures deviation from the user's current resting pose
    const relativeYaw = rawYaw - this.baselineYaw;
    const deltaShiftX = mirroredNoseX - this.baselineNoseX;

    // Combined deliberate intent score (weighted by both head rotation and head lateral translation)
    const combinedScore = (relativeYaw * 1.4) + (deltaShiftX * 2.8);

    // 4. Update motion history buffer
    this.history.push({ time: now, x: mirroredNoseX, yaw: relativeYaw });
    const cutoff = now - this.historyWindowMs;
    while (this.history.length > 0 && this.history[0].time < cutoff) {
      this.history.shift();
    }

    // 5. Cooldown & Neutral Return Locks
    const isCooldown = now < this.cooldownUntil;
    const absRelativeYaw = Math.abs(relativeYaw);
    const absShiftX = Math.abs(deltaShiftX);

    // If waiting for neutral release after previous skip, require returning to center
    if (this.waitingForNeutral) {
      if (absRelativeYaw < this.neutralResetThreshold && absShiftX < 0.05) {
        this.waitingForNeutral = false;
      }
    }

    // 6. Strict Candidate Evaluation
    // Requires both perspective yaw displacement AND dynamic movement from baseline
    let currentDirection = 'CENTER';

    const isTurnRight = (relativeYaw > this.yawThreshold && combinedScore > 0.32) || 
                        (relativeYaw > 0.18 && deltaShiftX > this.shiftThreshold);

    const isTurnLeft = (relativeYaw < -this.yawThreshold && combinedScore < -0.32) || 
                       (relativeYaw < -0.18 && deltaShiftX < -this.shiftThreshold);

    if (isTurnRight) {
      currentDirection = 'RIGHT';
    } else if (isTurnLeft) {
      currentDirection = 'LEFT';
    }

    let progress = 0;
    let triggeredGesture = null;

    if (!isCooldown && !this.waitingForNeutral) {
      if (currentDirection === 'RIGHT' || currentDirection === 'LEFT') {
        if (this.candidateDirection === currentDirection) {
          const elapsed = now - this.candidateStartTime;
          progress = Math.min(1, elapsed / this.minStableMs);

          // Only trigger if sustained intentionally for full minStableMs window (~320ms)
          if (elapsed >= this.minStableMs) {
            triggeredGesture = currentDirection === 'RIGHT' ? 'FACE_RIGHT' : 'FACE_LEFT';
            this.cooldownUntil = now + this.cooldownMs;
            this.waitingForNeutral = true;
            this.lastTriggeredDirection = currentDirection;
            this.candidateDirection = null;
            this.candidateStartTime = 0;
            progress = 1;
          }
        } else {
          // New candidate direction initiated
          this.candidateDirection = currentDirection;
          this.candidateStartTime = now;
          progress = 0.05;
        }
      } else {
        // Returned to center - reset candidate
        this.candidateDirection = null;
        this.candidateStartTime = 0;
        progress = 0;
      }
    } else {
      progress = 0;
    }

    // Update debug telemetry
    this.debugState = {
      faceDetected: true,
      direction: currentDirection,
      yaw: Math.round(relativeYaw * 100) / 100,
      shiftX: Math.round(deltaShiftX * 100) / 100,
      score: Math.round(combinedScore * 100) / 100,
      progress: Math.round(progress * 100) / 100,
      isCooldown,
      waitingForNeutral: this.waitingForNeutral,
      lastTriggered: this.lastTriggeredDirection
    };

    return triggeredGesture;
  }

  handleFaceLost() {
    this.candidateDirection = null;
    this.candidateStartTime = 0;
    this.debugState = {
      faceDetected: false,
      direction: 'CENTER',
      yaw: 0,
      shiftX: 0,
      score: 0,
      progress: 0,
      isCooldown: false,
      waitingForNeutral: false
    };
  }
}
