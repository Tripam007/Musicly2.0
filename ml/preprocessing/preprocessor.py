"""
Musicly Air AI - Python Landmark Preprocessor
Matches src/utils/airAiPreprocessor.js EXACTLY.
"""

import math
import numpy as np

LANDMARK_COUNT = 21
FEATURE_VECTOR_DIM = 63

AIR_AI_CLASSES = [
    'NO_GESTURE',
    'OPEN_PALM',
    'THUMB_GESTURE',
    'FIST',
    'ONE_FINGER_UP',
    'ONE_FINGER_DOWN'
]

CLASS_TO_IDX = {cls_name: idx for idx, cls_name in enumerate(AIR_AI_CLASSES)}
IDX_TO_CLASS = {idx: cls_name for idx, cls_name in enumerate(AIR_AI_CLASSES)}


def distance_3d(p1, p2):
    dx = p1['x'] - p2['x']
    dy = p1['y'] - p2['y']
    dz = p1.get('z', 0.0) - p2.get('z', 0.0)
    return math.hypot(dx, dy, dz)


def preprocess_landmarks(landmarks, handedness='Right'):
    """
    Transforms 21 3D landmarks into a 63-element normalized vector.
    1. Wrist (0) as origin.
    2. Hand scale: distance between wrist (0) and middle MCP (9).
    3. Coordinate divide by scale.
    4. Negate x for left hand.
    5. Flatten to 63-element float array.
    """
    if not landmarks or len(landmarks) != LANDMARK_COUNT:
        return None

    wrist = landmarks[0]
    middle_mcp = landmarks[9]

    hand_scale = distance_3d(wrist, middle_mcp)
    if hand_scale < 1e-4:
        return None

    is_left = str(handedness).lower() == 'left'
    vector = np.zeros(FEATURE_VECTOR_DIM, dtype=np.float32)

    for i in range(LANDMARK_COUNT):
        pt = landmarks[i]
        rel_x = (pt['x'] - wrist['x']) / hand_scale
        rel_y = (pt['y'] - wrist['y']) / hand_scale
        rel_z = (pt.get('z', 0.0) - wrist.get('z', 0.0)) / hand_scale

        if is_left:
            rel_x = -rel_x

        offset = i * 3
        vector[offset] = rel_x
        vector[offset + 1] = rel_y
        vector[offset + 2] = rel_z

    return vector


def preprocess_sample_dict(sample):
    """
    Extracts or verifies the 63-element feature vector from a sample dictionary.
    Supports either pre-extracted 'vector' or raw 'landmarks'.
    """
    if 'vector' in sample and len(sample['vector']) == FEATURE_VECTOR_DIM:
        return np.array(sample['vector'], dtype=np.float32)

    if 'landmarks' in sample:
        landmarks = sample['landmarks']
        # If landmarks is already a flat 63 array
        if isinstance(landmarks, (list, np.ndarray)) and len(landmarks) == FEATURE_VECTOR_DIM:
            return np.array(landmarks, dtype=np.float32)
        # If landmarks is a list of dicts with x, y, z
        if isinstance(landmarks, list) and len(landmarks) == LANDMARK_COUNT:
            handedness = sample.get('handedness', 'Right')
            return preprocess_landmarks(landmarks, handedness)

    return None
