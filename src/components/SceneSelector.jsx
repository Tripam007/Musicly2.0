import { useState, useRef } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Sun, 
  Sparkles, 
  Check, 
  Crown, 
  Camera, 
  Upload, 
  Link, 
  RotateCcw,
  Crop,
  ZoomIn,
  ZoomOut,
  Move
} from 'lucide-react';
import { SCENES } from '../data/tracks';
import AppleGlassScrollbar from './AppleGlassScrollbar';
import { playClickSound, playTingSound } from '../utils/audioSynth';

/**
 * Offscreen HTML5 canvas cropper that exports framed 16:9 image
 */
async function getCroppedImage(imageSrc, pan, zoom, containerW, containerH, naturalW, naturalH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const targetW = 1920;
        const targetH = 1080;
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        const nw = naturalW || img.naturalWidth || targetW;
        const nh = naturalH || img.naturalHeight || targetH;
        const cw = containerW || 600;
        const ch = containerH || 337.5;

        const baseScale = Math.max(cw / nw, ch / nh);
        const currentScale = baseScale * zoom;

        // Viewport dimensions in source image coordinates
        const sw = Math.min(nw, cw / currentScale);
        const sh = Math.min(nh, ch / currentScale);

        // Viewport center in source image coordinates
        const cx = (nw / 2) - (pan.x / currentScale);
        const cy = (nh / 2) - (pan.y / currentScale);

        let sx = cx - (sw / 2);
        let sy = cy - (sh / 2);

        // Clamping within source bounds
        sx = Math.max(0, Math.min(Math.max(0, nw - sw), sx));
        sy = Math.max(0, Math.min(Math.max(0, nh - sh), sy));

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve(croppedDataUrl);
      } catch (err) {
        console.warn('Canvas crop fallback to original:', err);
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export default function SceneSelector({
  isOpen,
  onClose,
  currentScene,
  onSelectScene,
  overlayOpacity,
  onChangeOpacity,
  scenes = SCENES,
  isAdmin = false,
  onUpdateSceneImage,
  onResetSceneImage,
  sceneOverrides = {}
}) {
  const scenesGridRef = useRef(null);
  const fileInputRef = useRef(null);
  const viewportRef = useRef(null);

  // Admin Theme Image Editor State
  const [editingScene, setEditingScene] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Interactive Crop & Framing State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });

  if (!isOpen) return null;

  // Calculate intuitive brightness percentage (10% dim -> 100% bright)
  const currentBrightness = Math.round((1 - overlayOpacity) * 100);

  const minVal = 10;
  const maxVal = 100;
  // Precise track fill percentage matching the range thumb position exactly
  const fillPercent = Math.max(0, Math.min(100, ((currentBrightness - minVal) / (maxVal - minVal)) * 100));

  const handleBrightnessChange = (e) => {
    const brightnessPct = parseFloat(e.target.value);
    const newOpacity = 1 - (brightnessPct / 100);
    onChangeOpacity(newOpacity);
  };

  const openImageEditor = (scene) => {
    playClickSound('light');
    setEditingScene(scene);
    setPreviewImage(scene.image || '');
    setImageUrlInput(scene.image && !scene.image.startsWith('data:') ? scene.image : '');
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsDraggingFile(false);
    setIsDraggingPan(false);
    setErrorMessage('');
  };

  const handleFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvt) => {
      const dataUrl = loadEvt.target.result;
      setPreviewImage(dataUrl);
      setImageUrlInput('');
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setErrorMessage('');
      playTingSound();
    };
    reader.readAsDataURL(file);
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    setIsDraggingPan(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y
    });
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!isDraggingPan) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    if (viewportRef.current && imgNaturalSize.width && imgNaturalSize.height) {
      const cw = viewportRef.current.clientWidth;
      const ch = viewportRef.current.clientHeight;
      const baseScale = Math.max(cw / imgNaturalSize.width, ch / imgNaturalSize.height);
      const currentScale = baseScale * zoom;
      const renderW = imgNaturalSize.width * currentScale;
      const renderH = imgNaturalSize.height * currentScale;
      const maxPanX = Math.max(0, (renderW - cw) / 2);
      const maxPanY = Math.max(0, (renderH - ch) / 2);

      setPan({
        x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
        y: Math.max(-maxPanY, Math.min(maxPanY, newY))
      });
    } else {
      setPan({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e) => {
    setIsDraggingPan(false);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  };

  const handleZoomChange = (newZoom) => {
    const clampedZoom = Math.max(1, Math.min(3, newZoom));
    setZoom(clampedZoom);

    if (viewportRef.current && imgNaturalSize.width && imgNaturalSize.height) {
      const cw = viewportRef.current.clientWidth;
      const ch = viewportRef.current.clientHeight;
      const baseScale = Math.max(cw / imgNaturalSize.width, ch / imgNaturalSize.height);
      const currentScale = baseScale * clampedZoom;
      const renderW = imgNaturalSize.width * currentScale;
      const renderH = imgNaturalSize.height * currentScale;
      const maxPanX = Math.max(0, (renderW - cw) / 2);
      const maxPanY = Math.max(0, (renderH - ch) / 2);

      setPan((prev) => ({
        x: Math.max(-maxPanX, Math.min(maxPanX, prev.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, prev.y))
      }));
    }
  };

  const handleQuickAlign = (align) => {
    if (!viewportRef.current || !imgNaturalSize.width || !imgNaturalSize.height) {
      setPan({ x: 0, y: 0 });
      return;
    }
    const cw = viewportRef.current.clientWidth;
    const ch = viewportRef.current.clientHeight;
    const baseScale = Math.max(cw / imgNaturalSize.width, ch / imgNaturalSize.height);
    const currentScale = baseScale * zoom;
    const renderH = imgNaturalSize.height * currentScale;
    const maxPanY = Math.max(0, (renderH - ch) / 2);

    if (align === 'top') {
      setPan((prev) => ({ ...prev, y: maxPanY }));
    } else if (align === 'bottom') {
      setPan((prev) => ({ ...prev, y: -maxPanY }));
    } else {
      setPan({ x: 0, y: 0 });
    }
  };

  const handleSaveThemeImage = async () => {
    if (!editingScene || !onUpdateSceneImage) return;

    const rawImage = (previewImage || imageUrlInput || '').trim();
    if (!rawImage) {
      setErrorMessage('Please provide an image file or direct image URL.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      let finalImage = rawImage;

      // When crop container exists, generate high-res cropped export
      if (viewportRef.current && (zoom > 1.01 || Math.abs(pan.x) > 1 || Math.abs(pan.y) > 1 || rawImage.startsWith('data:'))) {
        const cw = viewportRef.current.clientWidth || 600;
        const ch = viewportRef.current.clientHeight || 337.5;
        finalImage = await getCroppedImage(
          rawImage,
          pan,
          zoom,
          cw,
          ch,
          imgNaturalSize.width,
          imgNaturalSize.height
        );
      }

      await onUpdateSceneImage(editingScene.id, finalImage);
      playTingSound();
      setEditingScene(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update scene theme image.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!editingScene || !onResetSceneImage) return;
    setIsSaving(true);
    try {
      await onResetSceneImage(editingScene.id);
      playTingSound();
      setEditingScene(null);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset scene theme image.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="modal-overlay vibe-modal-no-wheel" 
      onClick={(e) => {
        if (e.target === e.currentTarget && !editingScene) {
          onClose();
        }
      }}
      onWheel={(e) => e.stopPropagation()}
    >
      <div 
        className="glass-modal-panel scene-panel vibe-modal-no-wheel" 
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <ImageIcon className="panel-title-icon" size={22} />
            <div>
              <h3>Room Themes & Backdrops</h3>
              <p>Customize your visual atmosphere, themes & interactive scenes</p>
            </div>
          </div>
          <button id="btn-close-scene" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Ambient Dark Dim / Brightness Slider (Left = Dim, Right = Bright) */}
        <div className="scene-dim-control">
          <div className="dim-labels">
            <span><Sun size={15} style={{ color: '#ffb703' }} /> Room Brightness</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: '#ffb703' }}>{currentBrightness}%</span>
          </div>
          <input
            type="range"
            min={minVal}
            max={maxVal}
            step="1"
            value={currentBrightness}
            onChange={handleBrightnessChange}
            className="dim-slider"
            style={{
              background: `linear-gradient(to right, #fb8500 0%, #ffb703 ${fillPercent}%, rgba(255,255,255,0.15) ${fillPercent}%, rgba(255,255,255,0.15) 100%)`
            }}
          />
        </div>

        {/* Scenes Scroll Container with Apple VisionOS Glass Scrollbar */}
        <div className="scenes-scroll-container vibe-modal-no-wheel" onWheel={(e) => e.stopPropagation()}>
          <div className="scenes-grid vibe-modal-no-wheel" ref={scenesGridRef} onWheel={(e) => e.stopPropagation()}>
            {scenes.map((scene) => {
              const isSelected = currentScene?.id === scene.id;
              const hasOverride = !!(sceneOverrides && sceneOverrides[scene.id]);

              return (
                <div
                  key={scene.id}
                  className={`scene-card apple-glass-scene-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectScene(scene)}
                >
                  {/* Full-bleed background image */}
                  <img src={scene.image} alt={scene.name} className="scene-bg-cover-img" />

                  {/* Subtle dark gradient scrim for contrast */}
                  <div className="scene-card-gradient-overlay" />

                  {/* Admin Change Theme Image Trigger Badge (Icon Only) */}
                  {isAdmin && (
                    <button
                      type="button"
                      className={`scene-admin-edit-badge ${hasOverride ? 'has-custom-override' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageEditor(scene);
                      }}
                      title={hasOverride ? `Edit Custom Theme Image for "${scene.name}" (Admin)` : `Change Theme Image for "${scene.name}" (Admin)`}
                      aria-label={`Change Theme Image for ${scene.name}`}
                    >
                      <Camera size={13} />
                    </button>
                  )}

                  {/* Premium Bookmark Ribbon Badge (Crown logo only) */}
                  {(scene.isPremium || scene.id === 'vibe_carousel') && (
                    <div className="scene-premium-bookmark" title="Premium 3D Experience">
                      <Crown size={13} strokeWidth={2.4} className="scene-premium-crown" />
                    </div>
                  )}
                  
                  {/* Selection checkmark */}
                  {isSelected && (
                    <div className={`scene-check-badge ${(scene.isPremium || scene.id === 'vibe_carousel') ? 'pos-left' : ''}`}>
                      <Check size={13} strokeWidth={2.8} color="#000" />
                    </div>
                  )}

                  {/* Apple-style floating frosted glass title bar */}
                  <div className="scene-apple-glass-titlebar">
                    <span className="scene-apple-title">{scene.name}</span>
                  </div>
                </div>
              );
            })}

            {/* Coming Soon Vibes Banner at the end of scene box */}
            <div className="scenes-coming-soon-banner">
              <Sparkles size={14} className="scenes-coming-soon-icon" />
              <span className="scenes-coming-soon-text">More vibes coming soon. Stay tuned....</span>
            </div>
          </div>

          {/* Futuristic Apple Glass Pill Capsule Scrollbar */}
          <AppleGlassScrollbar targetRef={scenesGridRef} />
        </div>
      </div>

      {/* 🖼️ Admin Theme Image Editor Overlay Dialog */}
      {editingScene && (
        <div 
          className="scene-edit-overlay-backdrop"
          onClick={() => {
            if (!isSaving) setEditingScene(null);
          }}
        >
          <div 
            className="scene-edit-modal-box glass-modal-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="scene-edit-header">
              <div className="scene-edit-title-group">
                <Camera size={20} style={{ color: '#ffb703' }} />
                <div>
                  <h4>Change Theme Image</h4>
                  <p className="scene-edit-subtitle">
                    Updating visual for <strong>"{editingScene.name}"</strong>
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                className="drawer-close-btn" 
                onClick={() => setEditingScene(null)}
                disabled={isSaving}
              >
                <X size={18} />
              </button>
            </div>

            {/* Broad Drag & Drop Upload Zone + Direct Link */}
            <div className="scene-edit-form-body">
              {/* Option 1: Broad Drag & Drop Zone */}
              <div
                className={`scene-broad-dropzone ${isDraggingFile ? 'is-dragging' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = '';
                  }}
                  style={{ display: 'none' }}
                />
                <div className="scene-dropzone-icon-wrap">
                  <Upload size={22} className="scene-dropzone-icon" />
                </div>
                <div className="scene-dropzone-text-group">
                  <p className="scene-dropzone-title">
                    <strong>Drag & drop image here</strong>, or <span className="scene-dropzone-browse-text">Browse Device</span>
                  </p>
                  <p className="scene-dropzone-hint">Supports high-res JPG, PNG, WebP up to 4K</p>
                </div>
              </div>

              <div className="scene-edit-separator">
                <span>OR ENTER DIRECT IMAGE URL</span>
              </div>

              {/* Option 2: Image URL */}
              <div className="scene-edit-input-field">
                <label className="scene-field-label">
                  <Link size={13} />
                  <span>Direct Image Link</span>
                </label>
                <input
                  type="url"
                  className="scene-text-url-input"
                  placeholder="https://images.unsplash.com/... or /assets/images/..."
                  value={imageUrlInput}
                  onChange={(e) => {
                    setImageUrlInput(e.target.value);
                    setPreviewImage(e.target.value);
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  disabled={isSaving}
                />
              </div>

              {/* Interactive Cropper & Framing Section */}
              {previewImage && (
                <div className="scene-crop-section">
                  <div className="scene-crop-section-header">
                    <div className="scene-crop-title-group">
                      <Crop size={14} className="scene-crop-title-icon" />
                      <span className="scene-crop-heading">Crop & Framing Position</span>
                    </div>
                    <div className="scene-crop-hint-badge">
                      <Move size={11} />
                      <span>Drag image to position • Slider to zoom</span>
                    </div>
                  </div>

                  {/* 16:9 Viewport Frame */}
                  <div
                    ref={viewportRef}
                    className={`scene-crop-viewport ${isDraggingPan ? 'is-panning' : ''}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    title="Click and drag image to choose what part to show"
                  >
                    <img 
                      src={previewImage} 
                      alt="Crop Viewport" 
                      className="scene-crop-img"
                      draggable={false}
                      style={{
                        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: isDraggingPan ? 'none' : 'transform 0.15s ease-out'
                      }}
                      onLoad={(e) => {
                        setImgNaturalSize({
                          width: e.currentTarget.naturalWidth || 1920,
                          height: e.currentTarget.naturalHeight || 1080
                        });
                      }}
                      onError={(e) => {
                        e.currentTarget.src = '/assets/images/cozy_bedroom.jpg';
                      }}
                    />

                    {/* Rule of thirds grid guides */}
                    <div className="scene-crop-grid-overlay">
                      <div className="scene-crop-grid-line v1" />
                      <div className="scene-crop-grid-line v2" />
                      <div className="scene-crop-grid-line h1" />
                      <div className="scene-crop-grid-line h2" />
                    </div>

                    {/* Corner viewfinder brackets */}
                    <div className="scene-crop-corner tl" />
                    <div className="scene-crop-corner tr" />
                    <div className="scene-crop-corner bl" />
                    <div className="scene-crop-corner br" />

                    {/* 16:9 Aspect Badge */}
                    <div className="scene-crop-aspect-badge">
                      <span>16:9 Backdrop</span>
                    </div>

                    {/* Apple glass title overlay */}
                    <div className="scene-apple-glass-titlebar">
                      <span className="scene-apple-title">{editingScene.name}</span>
                    </div>
                  </div>

                  {/* Crop & Zoom Controls Toolbar */}
                  <div className="scene-crop-toolbar">
                    {/* Zoom control */}
                    <div className="scene-crop-zoom-group">
                      <button
                        type="button"
                        className="scene-crop-zoom-btn"
                        onClick={() => handleZoomChange(Math.max(1, +(zoom - 0.1).toFixed(2)))}
                        title="Zoom out"
                        disabled={zoom <= 1}
                      >
                        <ZoomOut size={13} />
                      </button>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.05"
                        value={zoom}
                        onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                        className="scene-crop-zoom-slider"
                        title="Zoom to crop"
                      />
                      <button
                        type="button"
                        className="scene-crop-zoom-btn"
                        onClick={() => handleZoomChange(Math.min(3, +(zoom + 0.1).toFixed(2)))}
                        title="Zoom in"
                        disabled={zoom >= 3}
                      >
                        <ZoomIn size={13} />
                      </button>
                      <span className="scene-crop-zoom-value">{Math.round(zoom * 100)}%</span>
                    </div>

                    {/* Quick Alignment Presets */}
                    <div className="scene-crop-presets-group">
                      <button
                        type="button"
                        className="scene-crop-preset-btn"
                        onClick={() => {
                          playClickSound('light');
                          setPan({ x: 0, y: 0 });
                        }}
                        title="Center image"
                      >
                        Center
                      </button>
                      <button
                        type="button"
                        className="scene-crop-preset-btn"
                        onClick={() => {
                          playClickSound('light');
                          handleQuickAlign('top');
                        }}
                        title="Align to top"
                      >
                        Top
                      </button>
                      <button
                        type="button"
                        className="scene-crop-preset-btn"
                        onClick={() => {
                          playClickSound('light');
                          handleQuickAlign('bottom');
                        }}
                        title="Align to bottom"
                      >
                        Bottom
                      </button>
                      <button
                        type="button"
                        className="scene-crop-preset-btn reset"
                        onClick={() => {
                          playClickSound('light');
                          setZoom(1);
                          setPan({ x: 0, y: 0 });
                        }}
                        title="Reset framing"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="scene-edit-error-banner">
                  {errorMessage}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="scene-edit-actions-footer">
              {sceneOverrides && sceneOverrides[editingScene.id] && onResetSceneImage && (
                <button
                  type="button"
                  className="scene-btn-reset-original"
                  onClick={handleResetToDefault}
                  disabled={isSaving}
                  title="Revert back to the original default image"
                >
                  <RotateCcw size={13} />
                  <span>Reset to Default</span>
                </button>
              )}
              
              <div style={{ flex: 1 }} />

              <button
                type="button"
                className="scene-btn-cancel-edit"
                onClick={() => setEditingScene(null)}
                disabled={isSaving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="scene-btn-save-image"
                onClick={handleSaveThemeImage}
                disabled={isSaving || !previewImage}
              >
                {isSaving ? 'Saving...' : 'Apply & Save Theme Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

