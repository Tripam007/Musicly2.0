import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Play, 
  Square, 
  Trash2, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle, 
  ArrowLeft, 
  Layers, 
  Activity, 
  ShieldCheck, 
  HelpCircle,
  RefreshCw,
  Zap,
  Sparkles,
  TrendingUp
} from 'lucide-react';

import { airControlsService } from '../utils/airControlsService';
import { airAiInferenceEngine } from '../utils/airAiInferenceEngine';
import { trainAirAiModel } from '../utils/airAiTrainer';
import { 
  AIR_AI_CLASSES, 
  preprocessLandmarks, 
  validateLandmarkQuality,
  FEATURE_VECTOR_DIM 
} from '../utils/airAiPreprocessor';

export default function AirAiDatasetCollector({
  onBack,
  onNavigateToDashboard
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [selectedClass, setSelectedClass] = useState('OPEN_PALM');
  const [isCollecting, setIsCollecting] = useState(false);
  const [samples, setSamples] = useState(() => {
    try {
      const saved = localStorage.getItem('musicly_air_ai_collected_samples');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [cameraStatus, setCameraStatus] = useState('idle');
  const [qualityStatus, setQualityStatus] = useState({ valid: false, reason: 'Waiting for camera' });
  const [lastSampleTime, setLastSampleTime] = useState(0);
  const [samplingRateMs, setSamplingRateMs] = useState(100); // 10 samples per sec max to prevent flood
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [statusMessage, setStatusMessage] = useState('');

  // Neural network training states
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(null);
  const [trainingResult, setTrainingResult] = useState(null);
  const [activeModelMeta, setActiveModelMeta] = useState(() => {
    try {
      const saved = localStorage.getItem('musicly_air_ai_custom_model');
      if (saved) return JSON.parse(saved).metadata;
    } catch (e) {}
    return null;
  });

  const isCollectingRef = useRef(isCollecting);
  isCollectingRef.current = isCollecting;
  const selectedClassRef = useRef(selectedClass);
  selectedClassRef.current = selectedClass;
  const lastSampleTimeRef = useRef(0);

  // Sync camera status
  useEffect(() => {
    const unsub = airControlsService.subscribeStatus((st) => {
      setCameraStatus(st);
    });
    return unsub;
  }, []);

  // Ensure camera is active when this tool is mounted
  useEffect(() => {
    airControlsService.start();
    return () => {
      // Do not stop service if user navigates back to musicly, but reset collection
      setIsCollecting(false);
    };
  }, []);

  // Bind video element
  useEffect(() => {
    if (cameraStatus !== 'active') return;
    const interval = setInterval(() => {
      const srcVideo = airControlsService.getVideoElement();
      if (srcVideo && srcVideo.srcObject && videoRef.current) {
        if (videoRef.current.srcObject !== srcVideo.srcObject) {
          videoRef.current.srcObject = srcVideo.srcObject;
          videoRef.current.play().catch(() => {});
          clearInterval(interval);
        }
      }
    }, 150);
    return () => clearInterval(interval);
  }, [cameraStatus]);

  // Frame listener for landmark drawing and sampling
  useEffect(() => {
    const unsub = airControlsService.subscribeFrame((landmarks, debugState) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (landmarks && landmarks.length === 21) {
          const w = canvas.width;
          const h = canvas.height;

          // Draw skeleton
          const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],
            [0, 5], [5, 6], [6, 7], [7, 8],
            [0, 9], [9, 10], [10, 11], [11, 12],
            [0, 13], [13, 14], [14, 15], [15, 16],
            [0, 17], [17, 18], [18, 19], [19, 20],
            [5, 9], [9, 13], [13, 17]
          ];

          ctx.lineWidth = 2;
          ctx.strokeStyle = isCollectingRef.current ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.75)';
          ctx.shadowBlur = 6;
          ctx.shadowColor = isCollectingRef.current ? 'rgba(239, 68, 68, 0.6)' : 'rgba(56, 189, 248, 0.5)';

          connections.forEach(([i, j]) => {
            const p1 = landmarks[i];
            const p2 = landmarks[j];
            ctx.beginPath();
            ctx.moveTo((1 - p1.x) * w, p1.y * h);
            ctx.lineTo((1 - p2.x) * w, p2.y * h);
            ctx.stroke();
          });

          // Draw landmark dots
          landmarks.forEach((p, idx) => {
            const isTip = [4, 8, 12, 16, 20].includes(idx);
            ctx.beginPath();
            ctx.arc((1 - p.x) * w, p.y * h, isTip ? 4 : 2.5, 0, 2 * Math.PI);
            ctx.fillStyle = isTip ? '#10b981' : '#38bdf8';
            ctx.fill();
          });
        }
      }

      // Quality validation
      const q = validateLandmarkQuality(landmarks, debugState.confidence);
      setQualityStatus(q);

      // Controlled sampling rate
      const now = performance.now();
      if (
        isCollectingRef.current && 
        q.valid && 
        now - lastSampleTimeRef.current >= samplingRateMs
      ) {
        lastSampleTimeRef.current = now;
        setLastSampleTime(now);

        const handedness = debugState.handedness || 'Right';
        const vector = preprocessLandmarks(landmarks, handedness);

        if (vector && vector.length === FEATURE_VECTOR_DIM) {
          const sample = {
            label: selectedClassRef.current,
            vector: Array.from(vector),
            handedness,
            timestamp: new Date().toISOString(),
            session: sessionId
          };

          setSamples(prev => {
            const updated = [...prev, sample];
            try {
              localStorage.setItem('musicly_air_ai_collected_samples', JSON.stringify(updated.slice(-3000)));
            } catch (e) {}
            return updated;
          });
        }
      }
    });

    return unsub;
  }, [samplingRateMs, sessionId]);

  // Compute class distributions
  const classCounts = {};
  AIR_AI_CLASSES.forEach(c => { classCounts[c] = 0; });
  samples.forEach(s => {
    if (classCounts[s.label] !== undefined) {
      classCounts[s.label]++;
    }
  });

  const totalCount = samples.length;
  const countsArray = Object.values(classCounts);
  const maxCount = Math.max(...countsArray, 0);
  const minCount = Math.min(...countsArray);
  const hasImbalance = totalCount >= 100 && (maxCount > minCount * 3 || minCount === 0);

  // Clear session
  const handleClearSession = () => {
    if (window.confirm('Are you sure you want to clear all collected samples in this session?')) {
      setSamples([]);
      try {
        localStorage.removeItem('musicly_air_ai_collected_samples');
      } catch (e) {}
      setStatusMessage('Session samples cleared.');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  // Export JSON file
  const handleExportDataset = () => {
    if (samples.length === 0) {
      alert('No samples collected yet!');
      return;
    }

    const datasetPayload = {
      version: `custom_${Date.now()}`,
      created_at: new Date().toISOString(),
      classes: AIR_AI_CLASSES,
      feature_dim: FEATURE_VECTOR_DIM,
      summary: {
        total_samples: samples.length,
        class_distribution: classCounts
      },
      samples
    };

    const blob = new Blob([JSON.stringify(datasetPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `musicly_air_ai_dataset_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage(`Exported ${samples.length} samples successfully!`);
    setTimeout(() => setStatusMessage(''), 4000);
  };

  // Import JSON file
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        let importedSamples = [];
        if (Array.isArray(parsed)) {
          importedSamples = parsed;
        } else if (Array.isArray(parsed.samples)) {
          importedSamples = parsed.samples;
        } else if (Array.isArray(parsed.train)) {
          importedSamples = [...parsed.train, ...(parsed.val || []), ...(parsed.test || [])];
        }

        if (importedSamples.length > 0) {
          setSamples(prev => {
            const combined = [...prev, ...importedSamples];
            try {
              localStorage.setItem('musicly_air_ai_collected_samples', JSON.stringify(combined.slice(-3000)));
            } catch (err) {}
            return combined;
          });
          setStatusMessage(`Imported ${importedSamples.length} samples successfully!`);
        } else {
          alert('Could not find valid samples array in the uploaded JSON file.');
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // In-Browser Model Training Handler
  const handleTrainModel = async () => {
    if (samples.length === 0) {
      alert('Please record or import some samples first before training!');
      return;
    }

    setIsTraining(true);
    setTrainingProgress({
      epoch: 0,
      totalEpochs: 40,
      trainLoss: 1.8,
      valLoss: 1.8,
      trainAcc: 0.2,
      valAcc: 0.2,
      percent: 0
    });
    setTrainingResult(null);

    try {
      const result = await trainAirAiModel(samples, { epochs: 40, batchSize: 32 }, (prog) => {
        setTrainingProgress(prog);
      });

      // Hot-reload newly trained model into live inference engine immediately!
      airAiInferenceEngine.reloadCustomModel(result);
      setTrainingResult(result);
      setActiveModelMeta(result.metadata);
      setStatusMessage(`Model ${result.metadata.version} trained & deployed! Test Acc: ${(result.metrics.evaluation.test_accuracy * 100).toFixed(1)}%`);
    } catch (err) {
      console.error('[AirAi Collector] Training failed:', err);
      alert('Training failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="air-dataset-page">
      {/* Top Header */}
      <header className="air-dataset-header">
        <div className="air-dataset-header-left">
          <button 
            type="button" 
            className="air-back-nav-btn" 
            onClick={onBack}
            title="Return to Musicly player"
          >
            <ArrowLeft size={16} />
            <span>Musicly</span>
          </button>
          <div className="air-dataset-title-block">
            <div className="air-dataset-title-row">
              <h1>AIR AI DATASET COLLECTOR</h1>
              <span className="air-admin-badge">ADMIN TOOL</span>
            </div>
            <p className="air-dataset-subtitle">Capture real MediaPipe landmark vectors for model training</p>
          </div>
        </div>

        <div className="air-dataset-header-right">
          {onNavigateToDashboard && (
            <button 
              type="button" 
              className="air-nav-link-btn"
              onClick={onNavigateToDashboard}
            >
              <Activity size={15} />
              <span>Model Analytics</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="air-dataset-grid">
        {/* Left Column: Live Webcam Viewport & Quality Check */}
        <section className="air-dataset-viewport-card">
          <div className="air-viewport-header">
            <div className="air-viewport-title-group">
              <span className={`air-live-dot ${cameraStatus === 'active' ? 'pulse-glow' : 'dot-pending'}`} />
              <span className="air-viewport-title">LIVE WEBCAM PREVIEW</span>
            </div>
            <div className="air-quality-badge-group">
              <span className={`air-quality-badge ${qualityStatus.valid ? 'valid' : 'invalid'}`}>
                {qualityStatus.valid ? 'VALID POSE' : qualityStatus.reason}
              </span>
            </div>
          </div>

          <div className="air-collector-camera-box">
            <video 
              ref={videoRef} 
              className="air-collector-video" 
              playsInline 
              muted 
              autoPlay 
            />
            <canvas 
              ref={canvasRef} 
              className="air-collector-canvas" 
              width={640} 
              height={480} 
            />

            {/* Recording overlay indicator */}
            {isCollecting && (
              <div className="air-recording-indicator">
                <span className="air-rec-dot blink" />
                <span>RECORDING [{selectedClass}]</span>
              </div>
            )}
          </div>

          {/* Rate and Quality Controls */}
          <div className="air-collector-controls-bar">
            <div className="air-sampling-rate-group">
              <label htmlFor="sampling-rate-select">Sampling Rate:</label>
              <select 
                id="sampling-rate-select"
                value={samplingRateMs} 
                onChange={(e) => setSamplingRateMs(Number(e.target.value))}
                className="air-select"
              >
                <option value={100}>10 samples/sec (100ms)</option>
                <option value={150}>6.7 samples/sec (150ms)</option>
                <option value={200}>5 samples/sec (200ms)</option>
                <option value={300}>3.3 samples/sec (300ms)</option>
              </select>
            </div>

            <div className="air-privacy-notice-pill">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Vectors only &bull; No video uploaded</span>
            </div>
          </div>

          {/* Feedback banner */}
          {statusMessage && (
            <div className="air-collector-toast-banner">
              <CheckCircle size={15} />
              <span>{statusMessage}</span>
            </div>
          )}
        </section>

        {/* Right Column: Class Selection & Dataset Management */}
        <section className="air-dataset-controls-card">
          <div className="air-controls-card-header">
            <h3>SELECT TARGET GESTURE</h3>
            <span className="air-total-samples-pill">Total: {totalCount} samples</span>
          </div>

          {/* Gesture Class Selector */}
          <div className="air-classes-selector-grid">
            {AIR_AI_CLASSES.map((cls) => {
              const count = classCounts[cls] || 0;
              const isSelected = selectedClass === cls;
              return (
                <button
                  key={cls}
                  type="button"
                  className={`air-class-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedClass(cls);
                    if (isCollecting) setIsCollecting(false);
                  }}
                >
                  <div className="air-class-btn-top">
                    <span className="air-class-name">{cls}</span>
                    <span className="air-class-count-badge">{count}</span>
                  </div>
                  {/* Mini progress bar */}
                  <div className="air-class-progress-track">
                    <div 
                      className="air-class-progress-bar"
                      style={{ width: `${Math.min(100, (count / 200) * 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Gesture-Specific Guidance Box (Requirement 10) */}
          <div className="air-gesture-guidance-card">
            {selectedClass === 'OPEN_PALM' && (
              <div className="air-guidance-content">
                <strong>📸 Stable Static Open Palm Collection:</strong>
                <p>Hold your open hand facing the camera relatively stationary. Capture samples with subtle variations: near/far distances, varying room lighting, minor rotations (±15°), and both left and right hands.</p>
              </div>
            )}
            {selectedClass === 'THUMB_GESTURE' && (
              <div className="air-guidance-content text-amber-300">
                <strong>↔️ Directional Thumb Motion Sequences:</strong>
                <p>Curl 4 fingers into your palm with thumb extended outward. Collect continuous natural motion sequences: <em>neutral → thumb extended → swipe left → release</em> and <em>neutral → thumb extended → swipe right → release</em>.</p>
              </div>
            )}
            {selectedClass === 'FIST' && (
              <div className="air-guidance-content">
                <strong>✊ Closed Fist Collection:</strong>
                <p>Curl all 5 fingers tightly into a ball. Collect samples with knuckles facing camera, varying wrist angles and lighting.</p>
              </div>
            )}
            {(selectedClass === 'ONE_FINGER_UP' || selectedClass === 'ONE_FINGER_DOWN') && (
              <div className="air-guidance-content">
                <strong>☝️ Pointer Finger Collection:</strong>
                <p>Extend index finger while keeping other fingers tucked. Capture steady poses with minor tilts.</p>
              </div>
            )}
            {selectedClass === 'NO_GESTURE' && (
              <div className="air-guidance-content">
                <strong>✋ Neutral / Idle Poses:</strong>
                <p>Relaxed hands, scratching, typing, moving in and out of frame to teach the model to ignore non-command postures.</p>
              </div>
            )}
          </div>

          {/* Class Imbalance Warning */}
          {hasImbalance && (
            <div className="air-imbalance-alert">
              <AlertTriangle size={16} />
              <div className="air-imbalance-text">
                <strong>Dataset imbalance detected</strong>
                <span>Some classes have significantly fewer samples. Aim for balanced distribution (~200 samples/class).</span>
              </div>
            </div>
          )}

          {/* Primary Action Buttons */}
          <div className="air-primary-actions-row">
            {!isCollecting ? (
              <button
                type="button"
                className="air-btn-start-collection"
                onClick={() => setIsCollecting(true)}
              >
                <Play size={16} fill="currentColor" />
                <span>START RECORDING [{selectedClass}]</span>
              </button>
            ) : (
              <button
                type="button"
                className="air-btn-stop-collection"
                onClick={() => setIsCollecting(false)}
              >
                <Square size={16} fill="currentColor" />
                <span>STOP RECORDING</span>
              </button>
            )}
          </div>

          {/* Secondary Actions (Export, Import, Clear) */}
          <div className="air-secondary-actions-grid">
            <button
              type="button"
              className="air-action-tool-btn"
              onClick={handleExportDataset}
              disabled={samples.length === 0}
            >
              <Download size={15} />
              <span>Export Dataset JSON</span>
            </button>

            <label className="air-action-tool-btn file-upload-label">
              <Upload size={15} />
              <span>Import Dataset JSON</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportFile}
                style={{ display: 'none' }}
              />
            </label>

            <button
              type="button"
              className="air-action-tool-btn text-danger"
              onClick={handleClearSession}
              disabled={samples.length === 0}
            >
              <Trash2 size={15} />
              <span>Clear Session</span>
            </button>
          </div>

          {/* In-Browser Neural Network Training Card */}
          <div className="air-train-section">
            <div className="air-train-header">
              <div className="air-train-title">
                <Zap size={16} className="text-amber-400" />
                <span>IN-BROWSER MODEL TRAINING</span>
              </div>
              {activeModelMeta ? (
                <span className="air-train-badge" title="Live custom model deployed">
                  ● ACTIVE: {activeModelMeta.version}
                </span>
              ) : (
                <span className="air-train-badge" style={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)' }}>
                  DEFAULT v1.1.0
                </span>
              )}
            </div>

            <button
              type="button"
              className="air-btn-train-model"
              onClick={handleTrainModel}
              disabled={isTraining || samples.length === 0}
            >
              {isTraining ? (
                <>
                  <RefreshCw size={15} className="spin-slow" />
                  <span>TRAINING NEURAL NETWORK ({trainingProgress?.percent || 0}%)...</span>
                </>
              ) : (
                <>
                  <Zap size={16} fill="currentColor" />
                  <span>TRAIN MODEL NOW ({samples.length} SAMPLES)</span>
                </>
              )}
            </button>

            {/* Live Progress Feedback while training */}
            {isTraining && trainingProgress && (
              <div className="air-training-progress-card">
                <div className="air-training-progress-header">
                  <span>Epoch {trainingProgress.epoch} of {trainingProgress.totalEpochs}</span>
                  <strong className="text-cyan-400">{trainingProgress.percent}%</strong>
                </div>
                <div className="air-training-bar-track">
                  <div 
                    className="air-training-bar-fill" 
                    style={{ width: `${trainingProgress.percent}%` }} 
                  />
                </div>
                <div className="air-training-metrics-row">
                  <span>Loss: <strong>{trainingProgress.trainLoss.toFixed(3)}</strong></span>
                  <span>Val Loss: <strong>{trainingProgress.valLoss.toFixed(3)}</strong></span>
                  <span>Accuracy: <strong className="text-emerald-400">{(trainingProgress.trainAcc * 100).toFixed(1)}%</strong></span>
                </div>
              </div>
            )}

            {/* Success Card after training */}
            {trainingResult && !isTraining && (
              <div className="air-training-success-card">
                <CheckCircle size={18} className="text-emerald-400" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div className="air-training-success-content">
                  <div className="air-training-success-title">
                    Training Complete & Deployed!
                  </div>
                  <div className="air-training-success-desc">
                    Verified test accuracy: <strong>{(trainingResult.metrics.evaluation.test_accuracy * 100).toFixed(1)}%</strong> on {trainingResult.metadata.sample_count} samples. Accuracy scales higher as sample volume grows.
                  </div>
                  <div className="air-training-success-actions">
                    {onNavigateToDashboard && (
                      <button
                        type="button"
                        className="air-link-analytics-btn"
                        onClick={onNavigateToDashboard}
                      >
                        <Activity size={12} style={{ display: 'inline', marginRight: '4px' }} />
                        View Live Curves in Model Analytics
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Training Workflow Summary */}
          <div className="air-training-workflow-card" style={{ marginTop: '14px' }}>
            <h4><Layers size={14} /> Training Instructions:</h4>
            <ol className="air-workflow-steps">
              <li>Record samples for each gesture (aim for 20–100+ samples per class).</li>
              <li>Click <strong>TRAIN MODEL NOW</strong> above to run backpropagation directly in your browser.</li>
              <li>Your model accuracy automatically increases as you add more samples!</li>
              <li>Trained weights deploy instantly to your camera Air Controls.</li>
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}
