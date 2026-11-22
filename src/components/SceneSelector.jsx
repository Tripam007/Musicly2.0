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
  Move,
  ShieldCheck,
  Video,
  Trash2,
  Shuffle,
  Plus,
  Film
} from 'lucide-react';
import { SCENES } from '../data/tracks';
import AppleGlassScrollbar from './AppleGlassScrollbar';
import { playClickSound, playTingSound } from '../utils/audioSynth';
import {
  loadSceneVisuals,
  saveSceneVisuals,
  deleteSceneVisual,
  resetSceneVisualsToDefault,
  isLiveVisual,
  DEFAULT_STUDIO_VISUALS
} from '../utils/publicScenesDB';

/**
 * Offscreen HTML5 canvas cropper that extracts the user's selected crop box
 * from the uncropped original image and exports it at high-res 16:9 (or selected ratio)
 */
async function getCroppedImage(imageSrc, crop, naturalW, naturalH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const nw = naturalW || img.naturalWidth || 1920;
        const nh = naturalH || img.naturalHeight || 1080;

        const targetW = 1920;
        const aspect = (crop.w * nw) / Math.max(1, crop.h * nh);
        const targetH = Math.round(targetW / aspect) || 1080;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        const sx = Math.max(0, Math.min(nw, crop.x * nw));
        const sy = Math.max(0, Math.min(nh, crop.y * nh));
        const sw = Math.max(1, Math.min(nw - sx, crop.w * nw));
        const sh = Math.max(1, Math.min(nh - sy, crop.h * nh));

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
  const stageRef = useRef(null);
  const studioFileInputRef = useRef(null);
  const studioVideoInputRef = useRef(null);

  // Studio Background Visuals Selection & Live Wallpaper Manager State
  const [visualsModalScene, setVisualsModalScene] = useState(null);
  const [sceneVisuals, setSceneVisuals] = useState([]);
  const [adminUploadMode, setAdminUploadMode] = useState('image'); // 'image' | 'live' | 'url'
  const [liveVideoUrlInput, setLiveVideoUrlInput] = useState('');
  const [adminUrlInput, setAdminUrlInput] = useState('');

  // Admin Theme Image Editor & Cropper State
  const [editingScene, setEditingScene] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Interactive Crop on Original Image State
  const [selectedRatio, setSelectedRatio] = useState('16:9');
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, w: 1, h: 0.5625 });
  const [activeDrag, setActiveDrag] = useState(null);
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

  const calculateDefaultCrop = (nw, nh, ratioKey = selectedRatio) => {
    if (!nw || !nh) return { x: 0, y: 0, w: 1, h: 0.5625 };
    if (ratioKey === 'free') {
      return { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
    }
    const targetR = ratioKey === '16:9' ? 16 / 9 : ratioKey === '4:3' ? 4 / 3 : 1;
    const imgR = nw / nh;
    let w, h;
    if (imgR >= targetR) {
      h = 1;
      w = (nh * targetR) / nw;
    } else {
      w = 1;
      h = nw / (nh * targetR);
    }
    return {
      x: Math.max(0, (1 - w) / 2),
      y: Math.max(0, (1 - h) / 2),
      w,
      h
    };
  };

  const handleImageLoad = (e) => {
    const nw = e.currentTarget.naturalWidth || 1920;
    const nh = e.currentTarget.naturalHeight || 1080;
    setImgNaturalSize({ width: nw, height: nh });
    setCropBox(calculateDefaultCrop(nw, nh, selectedRatio));
  };

  const changeRatio = (ratioKey) => {
    playClickSound('light');
    setSelectedRatio(ratioKey);
    const nw = imgNaturalSize.width || 1920;
    const nh = imgNaturalSize.height || 1080;
    setCropBox(calculateDefaultCrop(nw, nh, ratioKey));
  };

  const openVisualsModal = async (scene) => {
    playClickSound('light');
    setVisualsModalScene(scene);
    setAdminUploadMode('image');
    setLiveVideoUrlInput('');
    setAdminUrlInput('');
    try {
      const list = await loadSceneVisuals(scene.id);
      setSceneVisuals(list);
    } catch {
      setSceneVisuals([...DEFAULT_STUDIO_VISUALS]);
    }
  };

  const handleCameraClick = (e, scene) => {
    e.stopPropagation();
    openVisualsModal(scene);
  };

  const handleSelectVisual = async (visual) => {
    if (!visualsModalScene || !onUpdateSceneImage) return;
    playClickSound('light');
    try {
      await onUpdateSceneImage(visualsModalScene.id, visual.url);
      playTingSound();
    } catch (err) {
      console.warn("Failed to activate visual:", err);
    }
  };

  const handleDeleteVisual = async (e, visualId) => {
    e.stopPropagation();
    if (!visualsModalScene || !isAdmin || sceneVisuals.length <= 1) return;
    playClickSound('light');
    const updated = sceneVisuals.filter(v => v.id !== visualId && v.url !== visualId);
    setSceneVisuals(updated);
    try {
      await deleteSceneVisual(visualsModalScene.id, visualId, updated, null);
      const activeUrl = sceneOverrides[visualsModalScene.id] || visualsModalScene.image;
      if (activeUrl === visualId && updated[0] && onUpdateSceneImage) {
        await onUpdateSceneImage(visualsModalScene.id, updated[0].url);
      }
    } catch (err) {
      console.warn("Failed to delete visual:", err);
    }
  };

  const handleShuffleVisual = async () => {
    if (!visualsModalScene || sceneVisuals.length === 0 || !onUpdateSceneImage) return;
    playClickSound('light');
    const randomVisual = sceneVisuals[Math.floor(Math.random() * sceneVisuals.length)];
    try {
      await onUpdateSceneImage(visualsModalScene.id, randomVisual.url);
      playTingSound();
    } catch (err) {
      console.warn("Shuffle visual error:", err);
    }
  };

  const handleResetPresets = async () => {
    if (!visualsModalScene || !isAdmin) return;
    playClickSound('light');
    try {
      const resetList = await resetSceneVisualsToDefault(visualsModalScene.id, null);
      setSceneVisuals(resetList);
      if (resetList[0] && onUpdateSceneImage) {
        await onUpdateSceneImage(visualsModalScene.id, resetList[0].url);
      }
      playTingSound();
    } catch (err) {
      console.warn("Reset visuals error:", err);
    }
  };

  const handleAdminUploadFile = (file) => {
    if (!file || !visualsModalScene) return;
    if (file.type.startsWith('video/')) {
      handleAdminUploadLiveVideo(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = async (loadEvt) => {
      const dataUrl = loadEvt.target.result;

      // 1. Instantly register in visual list & save to IndexedDB so it is NEVER lost
      const newVisual = {
        id: 'vis_' + Date.now(),
        url: dataUrl,
        type: 'image'
      };
      const updated = [newVisual, ...sceneVisuals.filter(v => v.url !== dataUrl)];
      setSceneVisuals(updated);
      try {
        await saveSceneVisuals(visualsModalScene.id, updated, null);
        if (onUpdateSceneImage) {
          await onUpdateSceneImage(visualsModalScene.id, dataUrl);
        }
      } catch (err) {
        console.warn("Immediate visual persist notice:", err);
      }

      // 2. Open 16:9 crop framing editor to let admin adjust if desired
      setPreviewImage(dataUrl);
      setImageUrlInput('');
      setEditingScene(visualsModalScene);
      setSelectedRatio('16:9');
      setCropBox({ x: 0, y: 0, w: 1, h: 0.5625 });
      setErrorMessage('');
      playTingSound();
    };
    reader.readAsDataURL(file);
  };

  const handleAdminUploadLiveVideo = (file) => {
    if (!file || !visualsModalScene) return;
    if (!file.type.startsWith('video/')) {
      alert('Please select a valid video file (MP4, WebM).');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (loadEvt) => {
      const videoDataUrl = loadEvt.target.result;
      const newVisual = {
        id: 'live_' + Date.now(),
        url: videoDataUrl,
        type: 'video'
      };
      const updated = [newVisual, ...sceneVisuals];
      setSceneVisuals(updated);
      try {
        await saveSceneVisuals(visualsModalScene.id, updated, null);
        if (onUpdateSceneImage) {
          await onUpdateSceneImage(visualsModalScene.id, videoDataUrl);
        }
        playTingSound();
      } catch (err) {
        console.warn("Save live video error:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddLiveVideoUrl = async () => {
    if (!visualsModalScene || !liveVideoUrlInput.trim()) return;
    const cleanUrl = liveVideoUrlInput.trim();
    const newVisual = {
      id: 'live_' + Date.now(),
      url: cleanUrl,
      type: 'video'
    };
    const updated = [newVisual, ...sceneVisuals];
    setSceneVisuals(updated);
    setLiveVideoUrlInput('');
    try {
      await saveSceneVisuals(visualsModalScene.id, updated, null);
      if (onUpdateSceneImage) {
        await onUpdateSceneImage(visualsModalScene.id, cleanUrl);
      }
      playTingSound();
    } catch (err) {
      console.warn("Add live video URL error:", err);
    }
  };

  const handleAddDirectUrl = async () => {
    if (!visualsModalScene || !adminUrlInput.trim()) return;
    const cleanUrl = adminUrlInput.trim();
    const isVid = isLiveVisual(cleanUrl);
    const newVisual = {
      id: 'vis_' + Date.now(),
      url: cleanUrl,
      type: isVid ? 'video' : 'image'
    };
    const updated = [newVisual, ...sceneVisuals];
    setSceneVisuals(updated);
    setAdminUrlInput('');
    try {
      await saveSceneVisuals(visualsModalScene.id, updated, null);
      if (onUpdateSceneImage) {
        await onUpdateSceneImage(visualsModalScene.id, cleanUrl);
      }
      playTingSound();
    } catch (err) {
      console.warn("Add visual URL error:", err);
    }
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
      setErrorMessage('');
      playTingSound();
    };
    reader.readAsDataURL(file);
  };

  const handlePointerDown = (e, action) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    setActiveDrag({
      action,
      startX: e.clientX,
      startY: e.clientY,
      stageW: rect.width,
      stageH: rect.height,
      initCrop: { ...cropBox }
    });
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch { }
  };

  const handlePointerMove = (e) => {
    if (!activeDrag) return;
    const { action, startX, startY, stageW, stageH, initCrop } = activeDrag;
    if (!stageW || !stageH) return;

    const dx = (e.clientX - startX) / stageW;
    const dy = (e.clientY - startY) / stageH;

    const nw = imgNaturalSize.width || stageW;
    const nh = imgNaturalSize.height || stageH;
    const targetR = selectedRatio === '16:9' ? 16 / 9 : selectedRatio === '4:3' ? 4 / 3 : selectedRatio === '1:1' ? 1 : null;
    const rNorm = targetR ? targetR * (nh / nw) : null;

    if (action === 'move') {
      const newX = Math.max(0, Math.min(1 - initCrop.w, initCrop.x + dx));
      const newY = Math.max(0, Math.min(1 - initCrop.h, initCrop.y + dy));
      setCropBox((prev) => ({ ...prev, x: newX, y: newY }));
    } else if (action === 'resize-br') {
      let newW = Math.max(0.1, Math.min(1 - initCrop.x, initCrop.w + dx));
      let newH;
      if (rNorm) {
        newH = newW / rNorm;
        if (newH > 1 - initCrop.y) {
          newH = 1 - initCrop.y;
          newW = newH * rNorm;
        }
      } else {
        newH = Math.max(0.1, Math.min(1 - initCrop.y, initCrop.h + dy));
      }
      setCropBox((prev) => ({ ...prev, w: newW, h: newH }));
    } else if (action === 'resize-tl') {
      let newW = Math.max(0.1, Math.min(initCrop.x + initCrop.w, initCrop.w - dx));
      let newH;
      if (rNorm) {
        newH = newW / rNorm;
        if (newH > initCrop.y + initCrop.h) {
          newH = initCrop.y + initCrop.h;
          newW = newH * rNorm;
        }
      } else {
        newH = Math.max(0.1, Math.min(initCrop.y + initCrop.h, initCrop.h - dy));
      }
      const newX = initCrop.x + (initCrop.w - newW);
      const newY = initCrop.y + (initCrop.h - newH);
      setCropBox({ x: newX, y: newY, w: newW, h: newH });
    } else if (action === 'resize-tr') {
      let newW = Math.max(0.1, Math.min(1 - initCrop.x, initCrop.w + dx));
      let newH;
      if (rNorm) {
        newH = newW / rNorm;
        if (newH > initCrop.y + initCrop.h) {
          newH = initCrop.y + initCrop.h;
          newW = newH * rNorm;
        }
      } else {
        newH = Math.max(0.1, Math.min(initCrop.y + initCrop.h, initCrop.h - dy));
      }
      const newY = initCrop.y + (initCrop.h - newH);
      setCropBox((prev) => ({ ...prev, y: newY, w: newW, h: newH }));
    } else if (action === 'resize-bl') {
      let newW = Math.max(0.1, Math.min(initCrop.x + initCrop.w, initCrop.w - dx));
      let newH;
      if (rNorm) {
        newH = newW / rNorm;
        if (newH > 1 - initCrop.y) {
          newH = 1 - initCrop.y;
          newW = newH * rNorm;
        }
      } else {
        newH = Math.max(0.1, Math.min(initCrop.y + initCrop.h, initCrop.h - dy));
      }
      const newX = initCrop.x + (initCrop.w - newW);
      setCropBox((prev) => ({ ...prev, x: newX, w: newW, h: newH }));
    }
  };

  const handlePointerUp = (e) => {
    if (activeDrag) {
      setActiveDrag(null);
      try {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      } catch { }
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
      if (cropBox) {
        finalImage = await getCroppedImage(
          rawImage,
          cropBox,
          imgNaturalSize.width,
          imgNaturalSize.height
        );
      }

      await onUpdateSceneImage(editingScene.id, finalImage);
      try {
        const newVis = { id: 'vis_' + Date.now(), url: finalImage, type: 'image' };
        const currentList = await loadSceneVisuals(editingScene.id);
        const updated = [newVis, ...currentList.filter(v => v.url !== finalImage)];
        await saveSceneVisuals(editingScene.id, updated, null);
        setSceneVisuals(updated);
      } catch { }
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
                  {/* Full-bleed background image or live video */}
                  {isLiveVisual(scene.image) ? (
                    <video src={scene.image} autoPlay loop muted playsInline className="scene-bg-cover-img" />
                  ) : (
                    <img src={scene.image} alt={scene.name} className="scene-bg-cover-img" />
                  )}

                  {/* Live wallpaper indicator tag */}
                  {isLiveVisual(scene.image) && (
                    <div className="scene-card-live-tag" title="Live Video Wallpaper">
                      <span className="live-dot" />
                      <span>LIVE</span>
                    </div>
                  )}

                  {/* Subtle dark gradient scrim for contrast */}
                  <div className="scene-card-gradient-overlay" />

                  {/* Studio Visuals Gallery Camera Trigger Badge */}
                  <button
                    type="button"
                    className={`scene-admin-edit-badge ${hasOverride ? 'has-custom-override' : ''}`}
                    onClick={(e) => handleCameraClick(e, scene)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      openVisualsModal(scene);
                    }}
                    title={`Studio Background Visuals for "${scene.name}"`}
                    aria-label={`Studio Background Visuals for ${scene.name}`}
                  >
                    <Camera size={13} />
                  </button>

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
                  }}
                  disabled={isSaving}
                />
              </div>

              {/* Original Image Canvas with Interactive Crop Selection Frame */}
              {previewImage && (
                <div className="scene-crop-section">
                  <div className="scene-crop-section-header">
                    <div className="scene-crop-title-group">
                      <Crop size={14} className="scene-crop-title-icon" />
                      <span className="scene-crop-heading">Crop Frame on Original Image</span>
                    </div>
                    <div className="scene-crop-ratio-pills">
                      <button
                        type="button"
                        className={`scene-ratio-pill ${selectedRatio === '16:9' ? 'active' : ''}`}
                        onClick={() => changeRatio('16:9')}
                      >
                        16:9 Backdrop
                      </button>
                      <button
                        type="button"
                        className={`scene-ratio-pill ${selectedRatio === '4:3' ? 'active' : ''}`}
                        onClick={() => changeRatio('4:3')}
                      >
                        4:3
                      </button>
                      <button
                        type="button"
                        className={`scene-ratio-pill ${selectedRatio === '1:1' ? 'active' : ''}`}
                        onClick={() => changeRatio('1:1')}
                      >
                        1:1
                      </button>
                      <button
                        type="button"
                        className={`scene-ratio-pill ${selectedRatio === 'free' ? 'active' : ''}`}
                        onClick={() => changeRatio('free')}
                      >
                        Free
                      </button>
                    </div>
                  </div>

                  {/* Stage: Original Image displayed in full, uncropped */}
                  <div className="scene-crop-stage-wrapper">
                    <div
                      ref={stageRef}
                      className="scene-crop-stage"
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                    >
                      <img
                        src={previewImage}
                        alt="Original Full View"
                        className="scene-crop-stage-img"
                        onLoad={handleImageLoad}
                        draggable={false}
                        onError={(e) => {
                          e.currentTarget.src = '/assets/images/cozy_bedroom.jpg';
                        }}
                      />

                      {/* Movable & Resizable 16:9 Crop Selection Box */}
                      <div
                        className="scene-crop-box"
                        style={{
                          left: `${cropBox.x * 100}%`,
                          top: `${cropBox.y * 100}%`,
                          width: `${cropBox.w * 100}%`,
                          height: `${cropBox.h * 100}%`
                        }}
                        onPointerDown={(e) => handlePointerDown(e, 'move')}
                        title="Drag to reposition crop area"
                      >
                        {/* Rule of thirds grid lines */}
                        <div className="scene-crop-grid-line v1" />
                        <div className="scene-crop-grid-line v2" />
                        <div className="scene-crop-grid-line h1" />
                        <div className="scene-crop-grid-line h2" />

                        {/* Center drag helper badge */}
                        <div className="scene-crop-move-badge">
                          <Move size={12} />
                          <span>Drag Box</span>
                        </div>

                        {/* 4 Corner Resize Handles */}
                        <div
                          className="scene-crop-handle tl"
                          onPointerDown={(e) => handlePointerDown(e, 'resize-tl')}
                          title="Drag to resize crop area"
                        />
                        <div
                          className="scene-crop-handle tr"
                          onPointerDown={(e) => handlePointerDown(e, 'resize-tr')}
                          title="Drag to resize crop area"
                        />
                        <div
                          className="scene-crop-handle bl"
                          onPointerDown={(e) => handlePointerDown(e, 'resize-bl')}
                          title="Drag to resize crop area"
                        />
                        <div
                          className="scene-crop-handle br"
                          onPointerDown={(e) => handlePointerDown(e, 'resize-br')}
                          title="Drag to resize crop area"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Live Resulting Card & Backdrop Preview */}
                  <div className="scene-crop-preview-row">
                    <div className="scene-crop-preview-info">
                      <p className="scene-crop-preview-title">
                        <strong>Resulting Scene Box Preview</strong>
                      </p>
                      <p className="scene-crop-preview-sub">
                        Showing how your selected crop region fits into the scene card and ambient backdrop
                      </p>
                      <div className="scene-crop-action-shortcuts">
                        <button
                          type="button"
                          className="scene-crop-action-pill"
                          onClick={() => {
                            playClickSound('light');
                            setCropBox((prev) => ({
                              ...prev,
                              x: Math.max(0, (1 - prev.w) / 2),
                              y: Math.max(0, (1 - prev.h) / 2)
                            }));
                          }}
                        >
                          Center Crop
                        </button>
                        <button
                          type="button"
                          className="scene-crop-action-pill"
                          onClick={() => {
                            playClickSound('light');
                            setCropBox(calculateDefaultCrop(imgNaturalSize.width, imgNaturalSize.height, selectedRatio));
                          }}
                        >
                          Max Fit
                        </button>
                      </div>
                    </div>

                    <div className="scene-crop-preview-card-wrap">
                      <div className="scene-crop-live-card">
                        <img
                          src={previewImage}
                          alt="Live Crop Preview"
                          className="scene-crop-live-img"
                          style={{
                            width: `${(1 / Math.max(0.01, cropBox.w)) * 100}%`,
                            height: `${(1 / Math.max(0.01, cropBox.h)) * 100}%`,
                            position: 'absolute',
                            left: `-${(cropBox.x / Math.max(0.01, cropBox.w)) * 100}%`,
                            top: `-${(cropBox.y / Math.max(0.01, cropBox.h)) * 100}%`,
                            maxWidth: 'none',
                            maxHeight: 'none'
                          }}
                        />
                        <div className="scene-card-gradient-overlay" />
                        <div className="scene-apple-glass-titlebar">
                          <span className="scene-apple-title">{editingScene.name}</span>
                        </div>
                      </div>
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

      {/* 🎬 Studio Background Visuals Selection & Live Wallpaper Manager Modal */}
      {visualsModalScene && (
        <div
          className="scene-edit-overlay-backdrop studio-visuals-backdrop"
          onClick={() => setVisualsModalScene(null)}
        >
          <div
            className="studio-visuals-modal-box glass-modal-panel vibe-modal-no-wheel"
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="studio-visuals-header">
              <div className="studio-visuals-title-group">
                <div className="studio-visuals-icon-box">
                  <ShieldCheck size={22} className="studio-visuals-shield-icon" />
                </div>
                <div>
                  <div className="studio-visuals-headline-row">
                    <h4>Studio Background Visuals</h4>
                    <span className={`studio-visuals-role-badge ${isAdmin ? 'admin' : 'user'}`}>
                      {isAdmin ? 'ADMIN' : 'STUDIO VISUALS'}
                    </span>
                  </div>
                  <p className="studio-visuals-subtitle">
                    Manage background visuals for <strong>{visualsModalScene.name}</strong>. Click any visual to activate{isAdmin ? ', remove unwanted items, or upload new live wallpapers.' : '.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setVisualsModalScene(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Section Header: Available Visuals Count + Hint */}
            <div className="studio-visuals-subhead">
              <span className="studio-visuals-count-label">
                AVAILABLE VISUALS ({sceneVisuals.length})
              </span>
              <span className="studio-visuals-hint-label">
                Click image to set as active
              </span>
            </div>

            {/* Grid of Visuals (NO text names beneath cards!) */}
            <div className="studio-visuals-grid">
              {sceneVisuals.map((visual, idx) => {
                const currentActiveUrl = sceneOverrides[visualsModalScene.id] || visualsModalScene.image;
                const isActive = currentActiveUrl === visual.url;
                const isVideo = visual.type === 'video' || isLiveVisual(visual.url);

                return (
                  <div
                    key={visual.id || visual.url || idx}
                    className={`studio-visual-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleSelectVisual(visual)}
                    title={isVideo ? 'Click to activate Live Wallpaper' : 'Click to activate wallpaper'}
                  >
                    {isVideo ? (
                      <video
                        src={visual.url}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="studio-visual-thumb-media"
                      />
                    ) : (
                      <img
                        src={visual.url}
                        alt=""
                        className="studio-visual-thumb-media"
                        onError={(e) => {
                          e.currentTarget.src = '/assets/images/cozy_bedroom.jpg';
                        }}
                      />
                    )}

                    {/* Dark subtle gradient overlay */}
                    <div className="studio-visual-card-gradient" />

                    {/* Active Badge */}
                    {isActive && (
                      <div className="studio-visual-active-pill">
                        <Check size={11} strokeWidth={3} />
                        <span>ACTIVE</span>
                      </div>
                    )}

                    {/* Live Video Indicator Badge */}
                    {isVideo && !isActive && (
                      <div className="studio-visual-live-pill">
                        <span className="live-dot" />
                        <span>LIVE</span>
                      </div>
                    )}

                    {/* Admin Trash Button */}
                    {isAdmin && sceneVisuals.length > 1 && (
                      <button
                        type="button"
                        className="studio-visual-delete-btn"
                        onClick={(e) => handleDeleteVisual(e, visual.id || visual.url)}
                        title="Remove this visual"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Admin Uploader Area: Images, Live Wallpapers, and URLs */}
            {isAdmin && (
              <div className="studio-admin-uploader-section">
                {/* Tabs */}
                <div className="studio-uploader-tabs">
                  <button
                    type="button"
                    className={`studio-tab-btn ${adminUploadMode === 'image' ? 'active' : ''}`}
                    onClick={() => setAdminUploadMode('image')}
                  >
                    <Upload size={13} />
                    <span>Upload Image File</span>
                  </button>
                  <button
                    type="button"
                    className={`studio-tab-btn ${adminUploadMode === 'live' ? 'active' : ''}`}
                    onClick={() => setAdminUploadMode('live')}
                  >
                    <Video size={13} />
                    <span>Add Live Wallpaper</span>
                  </button>
                  <button
                    type="button"
                    className={`studio-tab-btn ${adminUploadMode === 'url' ? 'active' : ''}`}
                    onClick={() => setAdminUploadMode('url')}
                  >
                    <Link size={13} />
                    <span>Add by URL</span>
                  </button>
                </div>

                {/* Mode 1: Image Upload (Triggers Cropper or Direct Add) */}
                {adminUploadMode === 'image' && (
                  <div
                    className={`scene-broad-dropzone ${isDraggingFile ? 'is-dragging' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                    onDragEnter={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDraggingFile(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFile(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleAdminUploadFile(file);
                    }}
                    onClick={() => studioFileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      ref={studioFileInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAdminUploadFile(file);
                        e.target.value = '';
                      }}
                      style={{ display: 'none' }}
                    />
                    <div className="scene-dropzone-icon-wrap">
                      <Upload size={22} className="scene-dropzone-icon" />
                    </div>
                    <div className="scene-dropzone-text-group">
                      <p className="scene-dropzone-title">
                        <strong>Click to Browse or Drag & Drop Wallpaper</strong>
                      </p>
                      <p className="scene-dropzone-hint">
                        Supports PNG, JPEG, WebP. Opens 16:9 interactive cropper to fit perfectly.
                      </p>
                    </div>
                  </div>
                )}

                {/* Mode 2: Live Wallpaper Video Upload */}
                {adminUploadMode === 'live' && (
                  <div className="studio-live-video-uploader">
                    <div
                      className={`scene-broad-dropzone ${isDraggingFile ? 'is-dragging' : ''}`}
                      onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                      onDragEnter={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDraggingFile(false); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingFile(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleAdminUploadLiveVideo(file);
                      }}
                      onClick={() => studioVideoInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        ref={studioVideoInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAdminUploadLiveVideo(file);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      <div className="scene-dropzone-icon-wrap live">
                        <Film size={22} className="scene-dropzone-icon" />
                      </div>
                      <div className="scene-dropzone-text-group">
                        <p className="scene-dropzone-title">
                          <strong>Click to Browse or Drop Live Wallpaper (MP4, WebM)</strong>
                        </p>
                        <p className="scene-dropzone-hint">
                          Upload seamless looping video clips to turn this room into an animated live scene.
                        </p>
                      </div>
                    </div>

                    {/* Direct video link input */}
                    <div className="studio-video-url-row">
                      <input
                        type="url"
                        className="scene-text-url-input"
                        placeholder="Or enter direct live wallpaper video link (e.g. https://.../loop.mp4)"
                        value={liveVideoUrlInput}
                        onChange={(e) => setLiveVideoUrlInput(e.target.value)}
                      />
                      <button
                        type="button"
                        className="studio-btn-add-live"
                        onClick={handleAddLiveVideoUrl}
                        disabled={!liveVideoUrlInput.trim()}
                      >
                        <Plus size={14} />
                        <span>Add Live</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Mode 3: Add by Direct Image / Video URL */}
                {adminUploadMode === 'url' && (
                  <div className="studio-url-uploader-row">
                    <input
                      type="url"
                      className="scene-text-url-input"
                      placeholder="https://images.unsplash.com/... or direct image/video URL"
                      value={adminUrlInput}
                      onChange={(e) => setAdminUrlInput(e.target.value)}
                    />
                    <button
                      type="button"
                      className="studio-btn-add-live"
                      onClick={handleAddDirectUrl}
                      disabled={!adminUrlInput.trim()}
                    >
                      <Plus size={14} />
                      <span>Add Visual</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Toolbar matching screenshot */}
            <div className="studio-visuals-bottom-toolbar">
              <div className="studio-toolbar-left">
                <div className="studio-counter-pill">
                  <span className="dot-green" />
                  <span>
                    Visual {
                      (() => {
                        const activeUrl = sceneOverrides[visualsModalScene.id] || visualsModalScene.image;
                        const idx = sceneVisuals.findIndex(v => v.url === activeUrl);
                        return idx >= 0 ? idx + 1 : 1;
                      })()
                    } of {sceneVisuals.length}
                  </span>
                </div>
                <div className="studio-quality-pill">
                  <Sparkles size={11} />
                  <span>4K UHD • Lossless</span>
                </div>
              </div>

              <div className="studio-toolbar-middle">
                <button
                  type="button"
                  className="studio-shuffle-btn"
                  onClick={handleShuffleVisual}
                  title="Randomly pick a visual"
                >
                  <Shuffle size={13} />
                  <span>Shuffle Visual</span>
                </button>
              </div>

              <div className="studio-toolbar-right">
                {isAdmin && (
                  <button
                    type="button"
                    className="studio-reset-presets-btn"
                    onClick={handleResetPresets}
                    title="Reset to default curated visuals"
                  >
                    Reset Presets
                  </button>
                )}

                <button
                  type="button"
                  className="studio-apply-return-btn"
                  onClick={() => setVisualsModalScene(null)}
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Apply & Return</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

