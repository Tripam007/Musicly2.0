"""
Musicly Air AI - Seed Dataset Generator
Generates a physiologically accurate initial dataset based on MediaPipe 21 3D hand topology
for the 7 Air AI gesture classes with natural variations (angles, rotations, scale variations, jitter).
Saves to ml/dataset/dataset.json with 70/15/15 train/val/test split.
"""

import os
import json
import math
import random
import numpy as np
import sys

# Add root ml directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocessing.preprocessor import AIR_AI_CLASSES, FEATURE_VECTOR_DIM, preprocess_landmarks

# Canonical bone hierarchy from MediaPipe: (parent_idx, child_idx, nominal_length_ratio)
# Nominal lengths relative to wrist->middle_mcp (scale = 1.0)
FINGER_BONES = {
    # Thumb: 0 -> 1 -> 2 -> 3 -> 4
    'thumb': [
        (0, 1, 0.35, [0.35, -0.15, 0.0]),
        (1, 2, 0.30, [0.25, -0.20, 0.0]),
        (2, 3, 0.28, [0.20, -0.22, 0.0]),
        (3, 4, 0.25, [0.18, -0.22, 0.0])
    ],
    # Index: 0 -> 5 -> 6 -> 7 -> 8
    'index': [
        (0, 5, 0.90, [0.22, -0.90, 0.0]),
        (5, 6, 0.40, [0.05, -0.40, 0.0]),
        (6, 7, 0.28, [0.02, -0.28, 0.0]),
        (7, 8, 0.24, [0.01, -0.24, 0.0])
    ],
    # Middle: 0 -> 9 -> 10 -> 11 -> 12
    'middle': [
        (0, 9, 1.00, [0.00, -1.00, 0.0]),
        (9, 10, 0.45, [0.00, -0.45, 0.0]),
        (10, 11, 0.30, [0.00, -0.30, 0.0]),
        (11, 12, 0.25, [0.00, -0.25, 0.0])
    ],
    # Ring: 0 -> 13 -> 14 -> 15 -> 16
    'ring': [
        (0, 13, 0.92, [-0.18, -0.90, 0.0]),
        (13, 14, 0.40, [-0.04, -0.39, 0.0]),
        (14, 15, 0.28, [-0.02, -0.27, 0.0]),
        (15, 16, 0.24, [-0.01, -0.23, 0.0])
    ],
    # Pinky: 0 -> 17 -> 18 -> 19 -> 20
    'pinky': [
        (0, 17, 0.82, [-0.34, -0.75, 0.0]),
        (17, 18, 0.32, [-0.06, -0.31, 0.0]),
        (18, 19, 0.22, [-0.03, -0.21, 0.0]),
        (19, 20, 0.20, [-0.02, -0.19, 0.0])
    ]
}


def rotate_2d(vec, angle_rad):
    x, y, z = vec
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    return [x * cos_a - y * sin_a, x * sin_a + y * cos_a, z]


def generate_hand_landmarks(gesture, handedness='Right'):
    """
    Synthesizes a realistic 21-landmark hand configuration for a given gesture
    with natural human anatomical articulation and random variance.
    """
    wrist = {'x': 0.5 + random.uniform(-0.05, 0.05), 'y': 0.75 + random.uniform(-0.04, 0.04), 'z': 0.0}
    scale = random.uniform(0.18, 0.28) # Typical hand scale on 640x480 screen

    # Global hand rotation variation (-15 to +15 deg)
    global_rot = random.uniform(-0.25, 0.25)
    jitter_amt = 0.015

    # Finger curl states for the gesture: 0.0 = fully extended, 1.0 = curled into palm
    curls = {
        'thumb': 0.0,
        'index': 0.0,
        'middle': 0.0,
        'ring': 0.0,
        'pinky': 0.0
    }
    thumb_dir = [0.0, 0.0]

    if gesture == 'NO_GESTURE':
        # Random relaxed / intermediate positions
        curls['thumb'] = random.uniform(0.2, 0.7)
        curls['index'] = random.uniform(0.3, 0.8)
        curls['middle'] = random.uniform(0.3, 0.8)
        curls['ring'] = random.uniform(0.3, 0.8)
        curls['pinky'] = random.uniform(0.3, 0.8)
        global_rot += random.uniform(-0.6, 0.6)

    elif gesture == 'OPEN_PALM':
        # All fingers extended straight out
        curls['thumb'] = random.uniform(0.0, 0.08)
        curls['index'] = random.uniform(0.0, 0.08)
        curls['middle'] = random.uniform(0.0, 0.08)
        curls['ring'] = random.uniform(0.0, 0.08)
        curls['pinky'] = random.uniform(0.0, 0.08)

    elif gesture == 'FIST':
        # All fingers curled tightly
        curls['thumb'] = random.uniform(0.85, 1.0)
        curls['index'] = random.uniform(0.85, 1.0)
        curls['middle'] = random.uniform(0.85, 1.0)
        curls['ring'] = random.uniform(0.85, 1.0)
        curls['pinky'] = random.uniform(0.85, 1.0)

    elif gesture == 'ONE_FINGER_UP':
        # Index extended up, others curled
        curls['index'] = random.uniform(0.0, 0.06)
        curls['thumb'] = random.uniform(0.75, 0.95)
        curls['middle'] = random.uniform(0.82, 1.0)
        curls['ring'] = random.uniform(0.82, 1.0)
        curls['pinky'] = random.uniform(0.82, 1.0)

    elif gesture == 'ONE_FINGER_DOWN':
        # Hand tilted downward, index pointing down, others curled
        curls['index'] = random.uniform(0.0, 0.06)
        curls['thumb'] = random.uniform(0.75, 0.95)
        curls['middle'] = random.uniform(0.82, 1.0)
        curls['ring'] = random.uniform(0.82, 1.0)
        curls['pinky'] = random.uniform(0.82, 1.0)
        global_rot += math.pi + random.uniform(-0.2, 0.2) # Rotate 180 degrees (pointing down)

    elif gesture == 'THUMB_GESTURE':
        # Thumb extended outwards away from hand, other 4 fingers curled tightly into palm
        curls['thumb'] = random.uniform(0.0, 0.08)
        curls['index'] = random.uniform(0.78, 1.0)
        curls['middle'] = random.uniform(0.78, 1.0)
        curls['ring'] = random.uniform(0.78, 1.0)
        curls['pinky'] = random.uniform(0.78, 1.0)
        global_rot += random.uniform(-0.3, 0.3)

    landmarks = [dict(wrist)] # Index 0 is wrist

    # Build 20 remaining finger landmarks
    for finger_name, bones in FINGER_BONES.items():
        curl = curls[finger_name]
        parent_pt = wrist

        for seg_idx, (p_idx, c_idx, length, nominal_vec) in enumerate(bones):
            vec = list(nominal_vec)

            # Apply curl transformation (folds phalanx back toward palm base)
            if seg_idx > 0 and curl > 0.1:
                # Curled vector bends toward positive y (down) and in z
                curl_factor = curl * (seg_idx / 3.0)
                vec[1] = vec[1] * (1.0 - curl_factor) + abs(vec[1]) * curl_factor * 0.7
                vec[2] = (vec[2] or 0.0) + curl_factor * 0.35

            if finger_name == 'thumb' and gesture == 'THUMB_GESTURE':
                # Thumb pointing prominently outward from curled fist
                vec[0] = abs(vec[0]) * random.uniform(1.35, 1.65)
                vec[1] = vec[1] * random.uniform(0.3, 0.5)

            # Add jitter
            vec[0] += random.uniform(-jitter_amt, jitter_amt)
            vec[1] += random.uniform(-jitter_amt, jitter_amt)
            vec[2] += random.uniform(-jitter_amt, jitter_amt)

            # Apply global rotation
            rot_vec = rotate_2d(vec, global_rot)

            new_pt = {
                'x': parent_pt['x'] + rot_vec[0] * scale,
                'y': parent_pt['y'] + rot_vec[1] * scale,
                'z': (parent_pt.get('z', 0.0)) + rot_vec[2] * scale
            }
            landmarks.append(new_pt)
            parent_pt = new_pt

    return landmarks


def create_dataset(samples_per_class=250):
    """
    Generates dataset covering all 6 classes with 70% train, 15% val, 15% test split.
    """
    print(f"[Dataset Generator] Generating {samples_per_class} samples for each of {len(AIR_AI_CLASSES)} classes...")
    all_samples = []

    for gesture in AIR_AI_CLASSES:
        for i in range(samples_per_class):
            handedness = 'Right' if random.random() > 0.3 else 'Left'
            raw_lm = generate_hand_landmarks(gesture, handedness)
            vector = preprocess_landmarks(raw_lm, handedness)

            if vector is not None and len(vector) == FEATURE_VECTOR_DIM:
                all_samples.append({
                    'label': gesture,
                    'handedness': handedness,
                    'vector': vector.tolist(),
                    'timestamp': f"2026-09-28T00:{random.randint(10,59):02d}:{random.randint(10,59):02d}Z",
                    'session': f"seed_session_{gesture.lower()}"
                })

    random.shuffle(all_samples)
    total = len(all_samples)
    train_end = int(total * 0.70)
    val_end = int(total * 0.85)

    train_data = all_samples[:train_end]
    val_data = all_samples[train_end:val_end]
    test_data = all_samples[val_end:]

    dataset_obj = {
        'version': '1.1.0',
        'created_at': '2026-09-28T00:55:00Z',
        'classes': AIR_AI_CLASSES,
        'feature_dim': FEATURE_VECTOR_DIM,
        'summary': {
            'total_samples': total,
            'train_samples': len(train_data),
            'val_samples': len(val_data),
            'test_samples': len(test_data),
            'per_class_counts': {c: sum(1 for s in all_samples if s['label'] == c) for c in AIR_AI_CLASSES}
        },
        'train': train_data,
        'val': val_data,
        'test': test_data
    }

    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(out_dir, 'dataset.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(dataset_obj, f, indent=2)

    print(f"[Dataset Generator] Successfully created dataset at: {out_file}")
    print(f"Total: {total} | Train: {len(train_data)} (70%) | Val: {len(val_data)} (15%) | Test: {len(test_data)} (15%)")
    return dataset_obj


if __name__ == '__main__':
    create_dataset(samples_per_class=200)
