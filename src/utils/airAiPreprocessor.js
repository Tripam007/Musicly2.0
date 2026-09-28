/**
 * Musicly Air AI - Landmark Preprocessing Module
 * Preprocesses 21 3D MediaPipe hand landmarks into a scale-invariant,
 * translation-invariant, and handedness-normalized 63-dimensional feature vector.
 *
 * CRITICAL: The mathematical transformation implemented here MUST match
 * ml/preprocessing/preprocessor.py identically across collection, training, and inference.
 */

export const LANDMARK_COUNT = 21;
export const FEATURE_VECTOR_DIM = 63; // 21 landmarks * 3 coords (x, y, z)

export const AIR_AI_CLASSES = [
  'NO_GESTURE',
  'OPEN_PALM',
  'THUMB_GESTURE',
  'FIST',
  'ONE_FINGER_UP',
  'ONE_FINGER_DOWN'
];

/**
 * Computes 3D Euclidean distance between two points
 */
export function distance3D(p1, p2) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z || 0) - (p2.z || 0);
  return Math.hypot(dx, dy, dz);
}

/**
 * Preprocesses raw 21 MediaPipe hand landmarks into a normalized 63-D feature vector.
 * 
 * @param {Array<{x: number, y: number, z: number}>} landmarks - Raw MediaPipe hand landmarks
 * @param {string} handedness - 'Left' | 'Right'
 * @returns {Float32Array | null} 63-element normalized vector, or null if invalid
 */
export function preprocessLandmarks(landmarks, handedness = 'Right') {
  if (!landmarks || landmarks.length !== LANDMARK_COUNT) {
    return null;
  }

  // 1. Select wrist (landmark 0) as origin
  const wrist = landmarks[0];

  // 2. Compute hand scale: Euclidean distance between wrist (0) and middle MCP (9)
  const middleMcp = landmarks[9];
  const handScale = distance3D(wrist, middleMcp);

  // Guard against division by zero or invalid scale
  if (handScale < 1e-4) {
    return null;
  }

  // 3. Handedness normalization flag
  // In camera mirror mode or natural usage, normalizing left hands ensures the model
  // learns invariant gesture shapes rather than camera-side asymmetry.
  const isLeftHand = typeof handedness === 'string' && handedness.toLowerCase() === 'left';

  // 4. Translate, scale-normalize, and mirror if left hand
  const vector = new Float32Array(FEATURE_VECTOR_DIM);

  for (let i = 0; i < LANDMARK_COUNT; i++) {
    const pt = landmarks[i];
    let relX = (pt.x - wrist.x) / handScale;
    const relY = (pt.y - wrist.y) / handScale;
    const relZ = ((pt.z || 0) - (wrist.z || 0)) / handScale;

    // Flip x for left hand to ensure uniform gesture geometry
    if (isLeftHand) {
      relX = -relX;
    }

    const offset = i * 3;
    vector[offset] = relX;
    vector[offset + 1] = relY;
    vector[offset + 2] = relZ;
  }

  return vector;
}

/**
 * Basic quality validation of raw landmarks before preprocessing
 */
export function validateLandmarkQuality(landmarks, confidence = 1.0) {
  if (!landmarks || landmarks.length !== LANDMARK_COUNT) {
    return { valid: false, reason: 'Invalid landmark count' };
  }

  if (confidence < 0.60) {
    return { valid: false, reason: 'Low landmark detection confidence' };
  }

  // Check boundary cutoff on key extremities (wrist, thumb tip, index tip, middle tip, ring tip, pinky tip)
  const keyIndices = [0, 4, 8, 12, 16, 20];
  for (const idx of keyIndices) {
    const p = landmarks[idx];
    if (p.x < 0.02 || p.x > 0.98 || p.y < 0.02 || p.y > 0.98) {
      return { valid: false, reason: 'Hand partially outside frame boundary' };
    }
  }

  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const scale = distance3D(wrist, middleMcp);
  if (scale < 0.08) {
    return { valid: false, reason: 'Hand is too far from camera' };
  }

  return { valid: true, scale };
}
