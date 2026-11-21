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
  Palette
} from 'lucide-react';
import { SCENES } from '../data/tracks';
import AppleGlassScrollbar from './AppleGlassScrollbar';
import { playClickSound, playTingSound } from '../utils/audioSynth';

const PRESET_THEMES = [
  { name: 'Cozy Bedroom Studio', url: '/assets/images/cozy_bedroom.jpg' },
  { name: 'Route 66 Sunset', url: '/assets/images/country_scene.jpg' },
  { name: 'Vintage Hi-Fi Neon', url: '/assets/images/retro_scene.jpg' },
  { name: 'Midnight Lo-Fi Studio', url: '/assets/images/lofi_scene.jpg' },
  { name: 'Cyberpunk Rain City', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1920&auto=format&fit=crop&q=85' },
  { name: 'Tokyo Neon Alley', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1920&auto=format&fit=crop&q=85' },
  { name: 'Peaceful Ocean Coast', url: '/assets/images/peace_scene.jpg' },
  { name: 'Warm Sunset Horizon', url: 'https://images.unsplash.com/photo-1510784722466-f2aa9c52fff6?w=1920&auto=format&fit=crop&q=85' }
];

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

  // Admin Theme Image Editor State
  const [editingScene, setEditingScene] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
    setErrorMessage('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
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

  const handleSaveThemeImage = async () => {
    if (!editingScene || !onUpdateSceneImage) return;

    const finalImage = (previewImage || imageUrlInput || '').trim();
    if (!finalImage) {
      setErrorMessage('Please provide an image file or direct image URL.');
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
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

                  {/* Admin Change Theme Image Trigger Badge */}
                  {isAdmin && (
                    <button
                      type="button"
                      className="scene-admin-edit-badge"
                      onClick={(e) => {
                        e.stopPropagation();
                        openImageEditor(scene);
                      }}
                      title="Change Theme Image for this scene (Admin)"
                    >
                      <Camera size={11} />
                      <span>{hasOverride ? 'Custom' : 'Change'}</span>
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

            {/* Live Visual Preview Card */}
            <div className="scene-edit-preview-container">
              <div className="scene-edit-preview-card">
                <img 
                  src={previewImage || editingScene.image} 
                  alt="Preview" 
                  className="scene-edit-preview-img"
                  onError={(e) => {
                    e.currentTarget.src = '/assets/images/cozy_bedroom.jpg';
                  }}
                />
                <div className="scene-card-gradient-overlay" />
                <div className="scene-apple-glass-titlebar">
                  <span className="scene-apple-title">{editingScene.name}</span>
                </div>
              </div>
              <span className="scene-edit-preview-note">Preview of how listeners will see this theme</span>
            </div>

            {/* Inputs: File Upload & URL */}
            <div className="scene-edit-form-body">
              {/* Option 1: File Upload */}
              <div className="scene-edit-upload-row">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="scene-browse-file-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSaving}
                >
                  <Upload size={15} />
                  <span>Browse Image from Device</span>
                </button>
                <span className="scene-file-hint">JPG, PNG, WebP up to 4K</span>
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

              {/* Quick Preset Visuals */}
              <div className="scene-preset-themes-section">
                <label className="scene-field-label">
                  <Palette size={13} />
                  <span>Quick Preset Visuals</span>
                </label>
                <div className="scene-preset-pills-wrap">
                  {PRESET_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      className={`scene-preset-pill ${previewImage === theme.url ? 'active' : ''}`}
                      onClick={() => {
                        playClickSound('light');
                        setPreviewImage(theme.url);
                        setImageUrlInput(theme.url);
                        setErrorMessage('');
                      }}
                      disabled={isSaving}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

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

