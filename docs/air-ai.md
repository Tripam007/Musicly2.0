# MUSICLY AIR AI — Complete Machine Learning Technical Guide

**Musicly Air AI** is a production-grade, privacy-first machine learning pipeline for webcam hand-gesture recognition. It operates 100% locally in the user's browser, transmitting zero video frames or biometric images across any network.

```
WEBCAM (640x480)
   ↓
MediaPipe Tasks Vision (21 Hand Landmarks: x, y, z)
   ↓
Landmark Preprocessing (Wrist-origin, middle-MCP scale normalization, handedness mirroring)
   ↓
Custom Musicly Gesture MLP Neural Network (63 → 64 → 32 → 6)
   ↓
Temporal Motion Tracker (EMA position smoothing, ΔX displacement, direction analysis)
   ↓
5-State Machine Validation (IDLE → GESTURE_DETECTED → TRACKING → TRIGGERED → COOLDOWN)
   ↓
Gesture Cooldown (1000ms) & Neutral Release Filter
   ↓
Authoritative Musicly Player Actions (Play, Pause, Next, Prev, Volume, Mute)
```

---

## 1. How to Collect Data

Musicly includes a dedicated Developer/Admin dataset collection suite accessible at:

👉 **Route:** `/admin/air-ai/dataset`  
*(Also accessible from the Admin Dashboard or Command Palette `Ctrl+K` → "Air AI: Dataset Collector")*

### Supported Classes (6):
1. `NO_GESTURE`: Neutral hand, relaxed postures, idle movement.
2. `OPEN_PALM`: All 5 fingers extended straight out. Must be held relatively stationary to trigger Play/Pause.
3. `THUMB_GESTURE`: 4 fingers curled into palm with thumb extended outwards. Directional motion determines Next vs Previous Track.
4. `FIST`: All 5 fingers curled tightly into palm. Triggers Mute/Unmute.
5. `ONE_FINGER_UP`: Index extended up, others curled. Triggers Volume +5%.
6. `ONE_FINGER_DOWN`: Index extended down, others curled. Triggers Volume -5%.
3. Position your hand inside the camera frame (~1.5 to 3 feet from webcam).
4. Verify the quality indicator says **"VALID POSE"** (green).
5. Click **START RECORDING [CLASS]**.
6. Hold the posture while slightly varying wrist angle, distance, and hand tilt.
7. The collector records samples at a controlled rate (default: 10 FPS / 100ms interval) to prevent duplicate frame flooding.
8. Switch to the next class and repeat until all 7 classes have balanced samples (~150–200 per class).
9. Click **EXPORT DATASET JSON** to download `musicly_air_ai_dataset_<timestamp>.json`.

---

## 2. Dataset Format

Each dataset JSON file adheres to the following specification:

```json
{
  "version": "1.0.0",
  "created_at": "2026-09-28T00:00:00Z",
  "classes": [
    "NO_GESTURE",
    "OPEN_PALM",
    "THUMB_LEFT",
    "THUMB_RIGHT",
    "FIST",
    "ONE_FINGER_UP",
    "ONE_FINGER_DOWN"
  ],
  "feature_dim": 63,
  "summary": {
    "total_samples": 1400,
    "train_samples": 980,
    "val_samples": 210,
    "test_samples": 210,
    "per_class_counts": {
      "NO_GESTURE": 200,
      "OPEN_PALM": 200,
      "THUMB_LEFT": 200,
      "THUMB_RIGHT": 200,
      "FIST": 200,
      "ONE_FINGER_UP": 200,
      "ONE_FINGER_DOWN": 200
    }
  },
  "train": [ ... ],
  "val": [ ... ],
  "test": [ ... ]
}
```

### Individual Sample Structure:
```json
{
  "label": "OPEN_PALM",
  "vector": [0.0, 0.0, 0.0, 0.35, -0.15, ...],
  "handedness": "Right",
  "timestamp": "2026-09-28T00:12:45Z",
  "session": "session_1727460765"
}
```

---

## 3. How Preprocessing Works

To guarantee invariant gesture recognition regardless of whether a user is close to or far from their webcam, or using their left or right hand:

1. **Origin Selection:** Wrist landmark `(landmark 0)` is selected as the coordinate system origin `(0, 0, 0)`.
2. **Translation:** Every landmark `(x_i, y_i, z_i)` has the wrist coordinate subtracted from it:
   $$\Delta x_i = x_i - x_0, \quad \Delta y_i = y_i - y_0, \quad \Delta z_i = z_i - z_0$$
3. **Scale Invariance:** Hand scale $S$ is calculated as the 3D Euclidean distance between wrist `(0)` and middle finger MCP joint `(9)`:
   $$S = \sqrt{(x_9 - x_0)^2 + (y_9 - y_0)^2 + (z_9 - z_0)^2}$$
4. **Scale Normalization:** All coordinates are divided by $S$:
   $$x'_i = \Delta x_i / S, \quad y'_i = \Delta y_i / S, \quad z'_i = \Delta z_i / S$$
5. **Handedness Mirroring:** If the detected hand is a Left hand, $x'_i$ is negated ($x'_i = -x'_i$). This ensures that both left and right hands produce the exact same geometric representation.
6. **Flattening:** The normalized points are flattened into a fixed 63-element feature vector ($21 \times 3$).

> [!IMPORTANT]
> The exact same mathematical logic is implemented in `src/utils/airAiPreprocessor.js` (JavaScript) and `ml/preprocessing/preprocessor.py` (Python).

---

## 4. How to Train the Model

The training pipeline uses Python with `scikit-learn` and `numpy`:

```bash
# 1. Install dependencies
pip install -r ml/requirements.txt

# 2. Place dataset in ml/dataset/dataset.json (or run seed generator)
python ml/dataset/generate_dataset.py

# 3. Execute training pipeline
python ml/training/train.py
```

### Training Pipeline Execution Details:
1. Loads samples from `ml/dataset/dataset.json`.
2. Verifies 70% train / 15% validation / 15% held-out test split.
3. Initializes a 3-layer Multilayer Perceptron (MLP):
   - Input layer: 63 nodes
   - Hidden Layer 1: 64 nodes (ReLU activation, L2 alpha = 0.0005)
   - Hidden Layer 2: 32 nodes (ReLU activation)
   - Output Layer: 7 nodes (Softmax output)
4. Trains for 120 epochs using the Adam optimizer with a batch size of 32 and initial learning rate of 0.001.
5. Records epoch-by-epoch training and validation loss and accuracy curves.
6. Evaluates the model on the untouched test set strictly after training finishes.
7. Exports weights, metrics, classes, and metadata.

---

## 5. How to Evaluate the Model

To run an independent evaluation on the held-out test set:

```bash
python ml/evaluation/evaluate.py
```

This prints:
- Real test accuracy
- Real test loss
- Macro & Weighted Precision, Recall, and F1 scores
- Average inference latency
- Per-class classification metrics
- Complete 7x7 Confusion Matrix

---

## 6. How to Export & Deploy the Model

When `python ml/training/train.py` finishes, it automatically generates and deploys the following artifacts:

- `ml/models/musicly_gesture_v1/model_weights.json`
- `ml/models/musicly_gesture_v1/metrics.json`
- `ml/models/musicly_gesture_v1/classes.json`
- `ml/models/musicly_gesture_v1/preprocessing.json`
- `ml/models/musicly_gesture_v1/model_metadata.json`

And mirrors them directly into:
1. `public/models/air-ai/v1.0.0/` (for dynamic fetch)
2. `src/data/airAiModel_v1.json` (bundled directly with Vite for zero-latency instant startup without network requests).

---

## 7. How to Create a New Model Version

To train a new version (e.g. `v1.1.0`):
1. Collect additional samples using `/admin/air-ai/dataset` or augment `ml/dataset/dataset.json`.
2. Update the `model_version="1.1.0"` argument in `ml/training/train.py`.
3. Run `python ml/training/train.py`.
4. Artifacts will be deployed into `ml/models/musicly_gesture_v1_1_0/` and `public/models/air-ai/v1.1.0/`.
5. The Admin Model Analytics dashboard (`/admin/air-ai`) will automatically display the new model alongside previous versions in the **Model Versions** history tab.

---

## 8. Real Metrics Calculation Reference

All metrics displayed in the Admin Dashboard are measured directly from model inference:

- **Test Accuracy:** $\frac{\text{Correct Test Predictions}}{\text{Total Test Samples}}$ on the 15% held-out test set.
- **Precision (per class):** $\frac{TP}{TP + FP}$
- **Recall (per class):** $\frac{TP}{TP + FN}$
- **F1 Score:** $2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}}$
- **Inference Latency:** Measured using high-resolution browser timers (`performance.now()`) per forward pass.
- **Production Acceptance Rate:** Percentage of live predictions above the 85% confidence threshold.
- **Action Trigger Rate:** Percentage of predictions resulting in an active Musicly audio action.

---

## 9. Privacy & Security Architecture

1. **Local Processing Only:** All MediaPipe Hand Landmark extraction and neural network inference execute client-side via WebAssembly and JavaScript.
2. **Zero Uploads:** No video feeds, images, or raw landmark coordinates are ever transmitted to Firebase, Netlify, analytics providers, or external AI APIs.
3. **No Microphone Permission:** The webcam stream is opened strictly with `{ video: true, audio: false }`.
4. **Aggregated Telemetry Only:** Optional admin telemetry stores only non-biometric performance metadata (timestamp, predicted gesture label, confidence float, latency ms).

---

## 10. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **Camera permission denied** | Browser blocked camera access | Click the lock/camera icon in the browser address bar, set Camera to "Allow", and click "Try Again". |
| **"Hand partially outside frame"** | Fingertips or wrist are cut off by the camera boundary | Move your hand toward the center of the video preview. |
| **"Hand is too far from camera"** | Distance exceeds 3.5 feet | Move hand closer (~1.5–2.5 feet from webcam). |
| **No gestures triggering** | Prediction confidence is below threshold (< 0.85) | Perform clear, distinct gestures as shown in the Gesture Guide. |
| **Accidental multiple triggers** | Cooldown active or neutral release not met | Drop or relax hand to neutral before repeating the gesture. |
