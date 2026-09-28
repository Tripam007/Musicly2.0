import React, { useEffect } from 'react';
import { X, Disc, Play, Sparkles, Music2, CheckCircle2 } from 'lucide-react';

export default function PosterDetailModal({
  isOpen,
  posterData,
  onClose,
  onPlaySong
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !posterData) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-modal-panel poster-glass-spotlight" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Disc className="panel-title-icon spin-slow" size={22} style={{ color: '#fb8500' }} />
            <div>
              <span className="poster-tag-category">{posterData.category || 'Featured Band & Album'}</span>
              <h3 className="spotlight-title">{posterData.title}</h3>
            </div>
          </div>
          <button id="btn-close-poster" className="drawer-close-btn" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Short Summary Section */}
        <div className="spotlight-body">
          <div className="spotlight-summary-card">
            {posterData.image && (
              <img src={posterData.image} alt={posterData.title} className="spotlight-thumb" />
            )}
            <div className="spotlight-summary-text">
              <h4 className="spotlight-headline">{posterData.subtitle}</h4>
              <p className="spotlight-bio">{posterData.description}</p>
              {posterData.stats && (
                <div className="spotlight-stats-badge">
                  <Sparkles size={12} /> {posterData.stats}
                </div>
              )}
            </div>
          </div>

          {/* Popular Songs List */}
          {posterData.tracks && posterData.tracks.length > 0 && (
            <div className="spotlight-songs-block">
              <h5 className="spotlight-section-heading">
                <Music2 size={15} /> Popular Songs & Hits
              </h5>
              <div className="spotlight-songs-list">
                {posterData.tracks.map((track, idx) => (
                  <div key={idx} className="spotlight-song-row">
                    <div className="song-idx-tag">{idx + 1}</div>
                    <div className="song-meta">
                      <span className="song-title-text">{track.name || track}</span>
                      {track.note && <span className="song-note-text">{track.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fun Trivia Note */}
          {posterData.trivia && (
            <div className="spotlight-trivia-pill">
              <Sparkles size={14} className="trivia-icon" />
              <span>{posterData.trivia}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="spotlight-footer">
          <button className="upload-submit-btn spotlight-close-btn" onClick={onClose}>
            <CheckCircle2 size={16} /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
