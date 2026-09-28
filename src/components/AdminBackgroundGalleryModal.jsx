import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Check, 
  Plus, 
  Link as LinkIcon, 
  RotateCcw, 
  ShieldCheck, 
  Image as ImageIcon,
  Shuffle,
  Sparkles,
  MonitorPlay
} from 'lucide-react';
import { process4KImageFile } from '../utils/studioBackgroundsDB';

export default function AdminBackgroundGalleryModal({
  isOpen,
  onClose,
  backgrounds = [],
  activeBackgroundIndex = 0,
  onSelectBackground,
  onAddBackground,
  onRemoveBackground,
  onResetDefaults,
  isAutoCycleBg = false,
  onToggleAutoCycleBg,
  onShuffleBackground,
  showToast
}) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle local file upload
  const handleFileUpload = async (file) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      showToast?.('Processing background visual...');
      const processed = await process4KImageFile(file);
      
      const newBg = {
        id: `bg-${Date.now()}`,
        url: processed.url,
        title: processed.title || 'Custom Background',
        isCustom: true,
        width: processed.width,
        height: processed.height
      };

      onAddBackground(newBg);
      showToast?.('Background visual added and activated!');
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'Failed to process image file');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    try {
      setIsProcessing(true);
      showToast?.('Enhancing visual to full HD quality...');
      const processed = await process4KImageFile(cleanUrl);
      const newBg = {
        id: `bg-url-${Date.now()}`,
        url: processed.url,
        title: processed.title || 'Web Wallpaper',
        isCustom: true,
        width: processed.width,
        height: processed.height
      };
      onAddBackground(newBg);
      setUrlInput('');
      showToast?.('Background visual added and activated!');
    } catch (err) {
      console.warn('Direct URL canvas processing failed, trying direct image load:', err);
      const testImg = new Image();
      testImg.onload = () => {
        const newBg = {
          id: `bg-url-${Date.now()}`,
          url: cleanUrl,
          title: 'Web Wallpaper',
          isCustom: true,
          width: testImg.naturalWidth,
          height: testImg.naturalHeight
        };
        onAddBackground(newBg);
        setUrlInput('');
        showToast?.('Background visual added and activated!');
      };
      testImg.onerror = () => {
        showToast?.('Failed to load image from provided URL. Please check the link.');
      };
      testImg.src = cleanUrl;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="admin-bg-modal-overlay" onClick={onClose}>
      <div 
        className="admin-bg-modal-card" 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Studio Background Visuals Admin Manager"
      >
        {/* Header */}
        <div className="admin-bg-modal-header">
          <div className="admin-bg-header-left">
            <div className="admin-bg-badge-icon">
              <ShieldCheck size={18} color="#f4a000" />
            </div>
            <div>
              <div className="admin-bg-title-row">
                <h3 className="admin-bg-modal-title">Studio Background Visuals</h3>
                <span className="admin-bg-admin-badge">
                  <ShieldCheck size={11} /> ADMIN
                </span>
              </div>
              <p className="admin-bg-modal-sub">
                Manage background visuals for Minimal Studio. Click any image to activate, remove unwanted items, or upload new wallpapers.
              </p>
            </div>
          </div>
          <button 
            className="admin-bg-close-btn" 
            onClick={onClose}
            title="Close Background Manager"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Backgrounds Grid */}
        <div className="admin-bg-gallery-section">
          <div className="admin-bg-section-label-row">
            <span className="admin-bg-section-label">
              Available Visuals ({backgrounds.length})
            </span>
            <span className="admin-bg-hint">Click image to set as active</span>
          </div>

          <div className="admin-bg-grid">
            {backgrounds.map((bg, idx) => {
              const isActive = idx === activeBackgroundIndex;
              return (
                <div 
                  key={bg.id || idx}
                  className={`admin-bg-thumb-card ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    onSelectBackground(idx);
                    showToast?.(`Activated: ${bg.title || `Visual ${idx + 1}`}`);
                  }}
                  title={`Click to set as Studio Background (${bg.title || `Visual ${idx + 1}`})`}
                >
                  <img 
                    src={bg.url} 
                    alt={bg.title || `Background ${idx + 1}`}
                    className="admin-bg-thumb-img"
                    loading="lazy"
                  />
                  
                  {/* Top Badges */}
                  <div className="admin-bg-thumb-top-badges">
                    {isActive && (
                      <span className="admin-bg-active-tag">
                        <Check size={10} strokeWidth={3} /> ACTIVE
                      </span>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button 
                    className="admin-bg-thumb-del-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (backgrounds.length <= 1) {
                        showToast?.("At least one background visual must remain.");
                        return;
                      }
                      onRemoveBackground(idx);
                      showToast?.("Background visual removed.");
                    }}
                    title="Delete this background visual"
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* Hover Overlay Title */}
                  <div className="admin-bg-thumb-info">
                    <span className="admin-bg-thumb-title">
                      {bg.title || `Visual 0${idx + 1}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add New Background Controls */}
        <div className="admin-bg-add-section">
          <div className="admin-bg-add-tabs">
            <button 
              type="button"
              className={`admin-bg-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <Upload size={14} /> Upload Image File
            </button>
            <button 
              type="button"
              className={`admin-bg-tab-btn ${activeTab === 'url' ? 'active' : ''}`}
              onClick={() => setActiveTab('url')}
            >
              <LinkIcon size={14} /> Add by Image URL
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div 
              className={`admin-bg-dropzone ${dragOver ? 'drag-over' : ''} ${isProcessing ? 'processing' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !isProcessing && fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <div className="admin-bg-dropzone-inner">
                <div className="admin-bg-upload-icon-circle">
                  <Upload size={22} color="#f4a000" />
                </div>
                <div className="admin-bg-dropzone-text">
                  <span className="admin-bg-drop-title">
                    {isProcessing ? 'Optimizing background visual...' : 'Click to Browse or Drag & Drop Wallpaper'}
                  </span>
                  <span className="admin-bg-drop-sub">
                    Supports PNG, JPEG, WebP. High-resolution images preserved in full quality.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} className="admin-bg-url-form">
              <div className="admin-bg-url-input-wrap">
                <ImageIcon size={16} className="admin-bg-url-icon" />
                <input 
                  type="url"
                  placeholder="Paste image link (e.g. Unsplash, Wallhaven, direct photo URL)..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="admin-bg-url-input"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="admin-bg-add-btn"
                disabled={isProcessing || !urlInput.trim()}
              >
                <Plus size={15} /> {isProcessing ? 'Verifying...' : 'Add Visual'}
              </button>
            </form>
          )}
        </div>

        {/* Premium Musicly Visuals Control Deck (Replaces clunky Reset/Done buttons) */}
        <div className="admin-bg-modal-footer">
          {/* Left: Live Visual Status & Quality Telemetry */}
          <div className="admin-bg-footer-left">
            <div className="admin-bg-live-indicator-pill">
              <span className="admin-bg-live-pulse-dot" />
              <span className="admin-bg-live-text">
                Visual {activeBackgroundIndex + 1} of {backgrounds.length}
              </span>
            </div>

            <div className="admin-bg-quality-badge" title="Retina Ultra HD Quality Visuals">
              <Sparkles size={11} className="admin-bg-sparkle-icon" />
              <span>4K UHD • Lossless</span>
            </div>
          </div>

          {/* Center: Premium Studio Action Controls */}
          <div className="admin-bg-footer-center">
            {/* Quick Shuffle Visual Button */}
            <button
              type="button"
              className="admin-bg-action-pill-btn"
              onClick={() => {
                if (onShuffleBackground) {
                  onShuffleBackground();
                } else if (backgrounds.length > 1) {
                  const nextIdx = (activeBackgroundIndex + 1) % backgrounds.length;
                  onSelectBackground(nextIdx);
                  showToast?.(`Shuffled visual: ${backgrounds[nextIdx]?.title || `Visual ${nextIdx + 1}`}`);
                }
              }}
              title="Shuffle to a random studio backdrop visual"
            >
              <Shuffle size={12} />
              <span>Shuffle Visual</span>
            </button>

            {/* Auto-Cycle Slideshow with Music Tracks */}
            <button
              type="button"
              className={`admin-bg-action-pill-btn ${isAutoCycleBg ? 'is-cycle-active' : ''}`}
              onClick={() => onToggleAutoCycleBg && onToggleAutoCycleBg(!isAutoCycleBg)}
              title="Automatically transition backdrop visual when a new song starts"
            >
              <MonitorPlay size={12} />
              <span>Cycle with Tracks</span>
              <span className={`admin-bg-mini-switch ${isAutoCycleBg ? 'switch-on' : 'switch-off'}`}>
                <span className="admin-bg-mini-thumb" />
              </span>
            </button>

            {/* Subtle Restore Presets Icon */}
            <button
              type="button"
              className="admin-bg-subtle-icon-btn"
              onClick={() => {
                if (window.confirm("Restore original studio preset visuals?")) {
                  onResetDefaults();
                  showToast?.("Restored original studio visuals.");
                }
              }}
              title="Restore original studio presets"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Right: Premium Apple Glass Apply & Return Pill */}
          <div className="admin-bg-footer-right">
            <button 
              type="button" 
              className="admin-bg-apply-pill-btn"
              onClick={onClose}
              title="Return to Studio Stage"
            >
              <Check size={13} strokeWidth={2.5} />
              <span>Apply & Return</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
