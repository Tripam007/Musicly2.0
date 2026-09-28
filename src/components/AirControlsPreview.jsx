import React, { useEffect, useRef, useState } from 'react';
import { 
  Camera, 
  X, 
  Minimize2, 
  Maximize2, 
  HelpCircle, 
  Sparkles,
  Sliders,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { airControlsService } from '../utils/airControlsService';

export default function AirControlsPreview({
  isOpen,
  onClose,
  onOpenSettings,
  isDebug = false,
  onToggleDebug
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);
  const [activeGesture, setActiveGesture] = useState(null);
  const gestureTimeoutRef = useRef(null);

  // Subscribe to status changes
  useEffect(() => {
    const unsub = airControlsService.subscribeStatus((st, err) => {
      setStatus(st);
      setErrorMessage(err);
    });
    return unsub;
  }, []);

  // Bind live camera stream to video preview element
  useEffect(() => {
    if (!isOpen || status !== 'active' || isMinimized) return;

    let attached = false;
    const interval = setInterval(() => {
      const srcVideo = airControlsService.getVideoElement();
      if (srcVideo && srcVideo.srcObject && videoRef.current) {
        if (videoRef.current.srcObject !== srcVideo.srcObject) {
          videoRef.current.srcObject = srcVideo.srcObject;
          videoRef.current.play().catch(() => {});
          attached = true;
          clearInterval(interval);
        }
      }
    }, 150);

    return () => clearInterval(interval);
  }, [isOpen, status, isMinimized]);

  // Subscribe to frame data for landmark drawing & debug state
  useEffect(() => {
    if (!isOpen) return;

    const unsubFrame = airControlsService.subscribeFrame((landmarks, debugState, faceLandmarks) => {
      // Draw landmarks on canvas if available
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const w = canvas.width;
        const h = canvas.height;

        // 1. Draw Face Tracking & Navigation Reticle
        if (faceLandmarks && faceLandmarks.length >= 468) {
          const nose = faceLandmarks[1];
          const rightCheek = faceLandmarks[234];
          const leftCheek = faceLandmarks[454];
          const forehead = faceLandmarks[10];
          const chin = faceLandmarks[152];

          // Mirrored coordinates
          const noseX = (1 - nose.x) * w;
          const noseY = nose.y * h;
          const rCheekX = (1 - rightCheek.x) * w;
          const lCheekX = (1 - leftCheek.x) * w;
          const topY = forehead.y * h;
          const botY = chin.y * h;

          const faceCenterX = (rCheekX + lCheekX) / 2;
          const faceCenterY = (topY + botY) / 2;
          const faceRadiusX = Math.max(16, Math.abs(rCheekX - lCheekX) * 0.52);
          const faceRadiusY = Math.max(22, Math.abs(botY - topY) * 0.52);

          const faceDir = debugState?.face?.direction || 'CENTER';
          const isFaceRight = faceDir === 'RIGHT';
          const isFaceLeft = faceDir === 'LEFT';
          const faceProgress = debugState?.face?.progress || 0;

          // Draw Face Contour Oval
          ctx.save();
          ctx.beginPath();
          ctx.ellipse(faceCenterX, faceCenterY, faceRadiusX, faceRadiusY, 0, 0, 2 * Math.PI);
          ctx.lineWidth = isFaceRight || isFaceLeft ? 2 : 1;
          ctx.strokeStyle = isFaceRight 
            ? 'rgba(52, 211, 153, 0.85)' 
            : isFaceLeft 
              ? 'rgba(96, 165, 250, 0.85)' 
              : 'rgba(167, 139, 250, 0.35)';
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw Eyes
          const eyeR = faceLandmarks[33];
          const eyeL = faceLandmarks[263];
          if (eyeR && eyeL) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
            ctx.beginPath();
            ctx.arc((1 - eyeR.x) * w, eyeR.y * h, 2, 0, 2 * Math.PI);
            ctx.arc((1 - eyeL.x) * w, eyeL.y * h, 2, 0, 2 * Math.PI);
            ctx.fill();
          }

          // Draw Nose Center Tracker
          ctx.beginPath();
          ctx.arc(noseX, noseY, 3, 0, 2 * Math.PI);
          ctx.fillStyle = isFaceRight ? '#34d399' : isFaceLeft ? '#60a5fa' : '#c084fc';
          ctx.shadowBlur = 6;
          ctx.shadowColor = isFaceRight ? '#34d399' : '#c084fc';
          ctx.fill();
          ctx.restore();

          // Draw Directional Intent Indicators
          if (isFaceRight) {
            ctx.save();
            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('NEXT TRACK →', w - 75, 16);

            // Progress arc around nose
            ctx.beginPath();
            ctx.arc(noseX, noseY, 9, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.max(0.1, faceProgress)));
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#34d399';
            ctx.stroke();
            ctx.restore();
          } else if (isFaceLeft) {
            ctx.save();
            ctx.fillStyle = '#60a5fa';
            ctx.font = 'bold 9px sans-serif';
            ctx.fillText('← PREV TRACK', 8, 16);

            // Progress arc around nose
            ctx.beginPath();
            ctx.arc(noseX, noseY, 9, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.max(0.1, faceProgress)));
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#60a5fa';
            ctx.stroke();
            ctx.restore();
          }
        }

        // 2. Draw Hand Landmarks
        if (landmarks && landmarks.length > 0) {
          // Draw hand connections
          const connections = [
            [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
            [0, 5], [5, 6], [6, 7], [7, 8],       // Index
            [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
            [0, 13], [13, 14], [14, 15], [15, 16],// Ring
            [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
            [5, 9], [9, 13], [13, 17]             // Palm base
          ];

          // Subtly styled glowing landmark lines
          ctx.lineWidth = isDebug ? 2 : 1.5;
          ctx.strokeStyle = isDebug ? 'rgba(96, 165, 250, 0.85)' : 'rgba(167, 139, 250, 0.55)';
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(167, 139, 250, 0.6)';

          connections.forEach(([i, j]) => {
            const p1 = landmarks[i];
            const p2 = landmarks[j];
            const x1 = (1 - p1.x) * w;
            const y1 = p1.y * h;
            const x2 = (1 - p2.x) * w;
            const y2 = p2.y * h;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          });

          // Draw joints
          landmarks.forEach((p, idx) => {
            const x = (1 - p.x) * w;
            const y = p.y * h;
            const isTip = [4, 8, 12, 16, 20].includes(idx);

            ctx.beginPath();
            ctx.arc(x, y, isTip ? (isDebug ? 4 : 3) : 2, 0, 2 * Math.PI);
            ctx.fillStyle = isTip ? '#34d399' : '#a78bfa';
            ctx.fill();
          });
        }
      }

      if (isDebug && debugState) {
        setDebugInfo(debugState);
      }
    });

    const unsubGesture = airControlsService.subscribeGesture((gesture) => {
      setActiveGesture(gesture);
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
      gestureTimeoutRef.current = setTimeout(() => {
        setActiveGesture(null);
      }, 700);
    });

    return () => {
      unsubFrame();
      unsubGesture();
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    };
  }, [isOpen, isDebug]);

  if (!isOpen) return null;

  // Minimized Floating Pill View
  if (isMinimized) {
    return (
      <div 
        className="air-preview-pill-container"
        onClick={() => setIsMinimized(false)}
        title="Air Controls active - Click to expand camera preview"
      >
        <div className="air-preview-pill">
          <span className="air-live-dot pulse-glow" />
          <span className="air-pill-title">AIR CONTROLS</span>
          {activeGesture && (
            <span className="air-pill-gesture-badge">{activeGesture.replace(/_/g, ' ')}</span>
          )}
          <Maximize2 size={12} className="air-pill-icon" />
        </div>
      </div>
    );
  }

  return (
    <aside 
      className="air-camera-preview-container" 
      aria-label="Air Controls Camera Feed"
    >
      <div className="air-preview-card">
        {/* Top Header */}
        <div className="air-preview-header">
          <div className="air-preview-title-group">
            <span className={`air-live-dot ${status === 'active' ? 'pulse-glow' : 'dot-pending'}`} />
            <span className="air-preview-title">AIR AI</span>
            {activeGesture && (
              <span className="air-active-gesture-pill">{activeGesture.replace(/_/g, ' ')}</span>
            )}
          </div>
          <div className="air-preview-actions">
            {onToggleDebug && (
              <button 
                type="button"
                className={`air-btn-icon ${isDebug ? 'active-debug' : ''}`}
                onClick={onToggleDebug}
                title={isDebug ? 'Disable debug diagnostics' : 'Enable debug diagnostics'}
              >
                {isDebug ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            )}
            <button 
              type="button"
              className="air-btn-icon"
              onClick={onOpenSettings}
              title="Air Controls Gesture Guide & Settings"
            >
              <HelpCircle size={13} />
            </button>
            <button 
              type="button"
              className="air-btn-icon"
              onClick={() => setIsMinimized(true)}
              title="Minimize camera preview"
            >
              <Minimize2 size={13} />
            </button>
            <button 
              type="button"
              className="air-btn-icon btn-close-air"
              onClick={onClose}
              title="Disable Air Controls"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Video & Canvas Viewport */}
        <div className="air-viewport-wrapper">
          {status === 'active' ? (
            <>
              {/* Mirrored horizontally for natural hand movement */}
              <video 
                ref={videoRef} 
                className="air-video-feed" 
                playsInline 
                muted 
                autoPlay 
              />
              <canvas 
                ref={canvasRef} 
                className="air-landmark-canvas"
                width={240}
                height={160}
              />
            </>
          ) : (
            <div className="air-viewport-status-placeholder">
              {status === 'requesting_permission' && (
                <div className="air-status-state">
                  <div className="air-spinner" />
                  <p>Requesting camera permission...</p>
                </div>
              )}
              {status === 'loading_model' && (
                <div className="air-status-state">
                  <div className="air-spinner" />
                  <p>Loading Hand & Face AI Models...</p>
                </div>
              )}
              {status === 'permission_denied' && (
                <div className="air-status-state text-danger">
                  <AlertCircle size={22} />
                  <p>Camera access denied</p>
                  <button 
                    type="button" 
                    className="air-retry-btn"
                    onClick={() => airControlsService.start()}
                  >
                    Try Again
                  </button>
                </div>
              )}
              {status === 'error' && (
                <div className="air-status-state text-danger">
                  <AlertCircle size={22} />
                  <p>{errorMessage || 'Camera initialization error'}</p>
                  <button 
                    type="button" 
                    className="air-retry-btn"
                    onClick={() => airControlsService.start()}
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cinematic Corner Accents */}
          <div className="air-corner-bracket top-left" />
          <div className="air-corner-bracket top-right" />
          <div className="air-corner-bracket bottom-left" />
          <div className="air-corner-bracket bottom-right" />
        </div>

        {/* Footer / Debug Overlay (Requirement 9) */}
        {isDebug && debugInfo && (
          <div className="air-debug-panel">
            <div className="air-debug-header-row">
              <span className="air-debug-section-title">AIR AI DIAGNOSTICS</span>
              <span className={`air-state-tag state-${(debugInfo.aiModel?.state || 'IDLE').toLowerCase()}`}>
                ● {debugInfo.aiModel?.state || 'IDLE'}
              </span>
            </div>

            {/* Current Gesture & Top Predictions */}
            <div className="air-debug-col-full">
              <div className="air-debug-row">
                <span>Gesture:</span>
                <strong className="text-emerald-400 font-bold">
                  {(debugInfo.aiModel?.predictedClass || debugInfo.rawGesture || 'NONE').replace(/_/g, ' ')}
                  {' '}({((debugInfo.aiModel?.confidence || 0) * 100).toFixed(0)}%)
                </strong>
              </div>

              {debugInfo.aiModel?.top3 && debugInfo.aiModel.top3.length > 0 && (
                <div className="air-top3-predictions-box">
                  <div className="air-top3-title">TOP PREDICTIONS:</div>
                  {debugInfo.aiModel.top3.map((item, idx) => (
                    <div key={idx} className="air-top3-row">
                      <span>{item.label.replace(/_/g, ' ')}</span>
                      <span>{item.percent}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Motion Tracking Diagnostics */}
            <div className="air-debug-col-full air-motion-debug-box">
              <div className="air-debug-row">
                <span>Motion ΔX:</span>
                <strong className={Math.abs(debugInfo.aiModel?.motion?.deltaX || 0) > 0.05 ? 'text-amber-300' : 'text-slate-400'}>
                  {debugInfo.aiModel?.motion?.deltaX > 0 ? `+${debugInfo.aiModel?.motion?.deltaX}` : (debugInfo.aiModel?.motion?.deltaX || '0.000')}
                </strong>
              </div>
              <div className="air-debug-row">
                <span>Direction:</span>
                <strong className="text-cyan-400 font-bold">
                  {debugInfo.aiModel?.motion?.direction || 'STATIONARY'}
                </strong>
              </div>
              <div className="air-debug-row">
                <span>Duration:</span>
                <span>{debugInfo.aiModel?.motion?.durationMs || 0} ms</span>
              </div>
            </div>

            {/* Face Movement Diagnostics */}
            {debugInfo.face && (
              <div className="air-debug-col-full air-motion-debug-box" style={{ marginTop: '4px', borderColor: 'rgba(56, 189, 248, 0.25)' }}>
                <div className="air-debug-row">
                  <span>Face Tracking:</span>
                  <strong className={debugInfo.face.faceDetected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                    {debugInfo.face.faceDetected ? `● ${debugInfo.face.direction}` : 'NO FACE'}
                  </strong>
                </div>
                <div className="air-debug-row">
                  <span>Face Yaw / Shift:</span>
                  <strong className={debugInfo.face.direction !== 'CENTER' ? 'text-cyan-300' : 'text-slate-400'}>
                    {debugInfo.face.yaw > 0 ? `+${debugInfo.face.yaw}` : debugInfo.face.yaw} / {debugInfo.face.shiftX > 0 ? `+${debugInfo.face.shiftX}` : debugInfo.face.shiftX}
                  </strong>
                </div>
                {debugInfo.face.progress > 0 && (
                  <div className="air-debug-row">
                    <span>Switch Progress:</span>
                    <strong className="text-emerald-400">{Math.round(debugInfo.face.progress * 100)}%</strong>
                  </div>
                )}
              </div>
            )}

            {/* Cooldown & Latency */}
            <div className="air-debug-row">
              <span>Cooldown:</span>
              <strong className={debugInfo.aiModel?.motion?.cooldownActive || debugInfo.face?.isCooldown ? 'text-amber-400' : 'text-emerald-400'}>
                {debugInfo.aiModel?.motion?.cooldownActive || debugInfo.face?.isCooldown ? 'WAITING / COOLDOWN' : 'READY'}
              </strong>
            </div>
            <div className="air-debug-row">
              <span>Latency:</span>
              <strong>{debugInfo.aiModel?.latencyMs ? `${debugInfo.aiModel.latencyMs} ms` : `${debugInfo.fps} FPS`}</strong>
            </div>
          </div>
        )}

        {/* Subtle Local Processing Notice */}
        <div className="air-privacy-micro-footer">
          <span>Processed locally &bull; Not uploaded</span>
        </div>
      </div>
    </aside>
  );
}
