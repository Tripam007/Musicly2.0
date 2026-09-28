import React, { useState, useEffect } from 'react';
import { X, Music, Sparkles, Send, Check, RefreshCw, Layers, Globe, MessageSquare } from 'lucide-react';
import { GENRES, LANGUAGES, isGhazalLanguage } from '../data/tracks';
import { extractYouTubeId } from '../utils/youtubePlayer';
import { detectSongLanguage, detectSongSections } from '../utils/languageDetector';
import { fetchYouTubeMetadata } from '../utils/trackParser';
import { submitSongRequest } from '../utils/songRequestsDB';
import { playTingSound } from '../utils/audioSynth';

const AVAILABLE_SECTIONS = GENRES.filter(g => g !== 'All');
const AVAILABLE_LANGUAGES = LANGUAGES;

export default function SongRequestModal({
  isOpen,
  onClose,
  user
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [selectedSections, setSelectedSections] = useState([]);
  const [language, setLanguage] = useState(null);
  const [isManualSections, setIsManualSections] = useState(false);
  const [isManualLanguage, setIsManualLanguage] = useState(false);
  const [note, setNote] = useState('');
  const [isLoadingYtMeta, setIsLoadingYtMeta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const displayedSections = React.useMemo(() => {
    if (isGhazalLanguage(language)) {
      return AVAILABLE_SECTIONS;
    }
    return AVAILABLE_SECTIONS.filter(s => s.toLowerCase() !== 'ghazal');
  }, [language]);

  // Clear when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setArtist('');
      setAudioUrl('');
      setSelectedSections([]);
      setLanguage(null);
      setIsManualSections(false);
      setIsManualLanguage(false);
      setNote('');
      setSubmitSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const updateSongAuto = (currTitle, currArtist, extraContext = '') => {
    const combined = `${currTitle || ''} ${currArtist || ''} ${extraContext || ''}`.trim();
    if (!combined) return;

    if (!isManualLanguage) {
      const detected = detectSongLanguage(currTitle, currArtist, extraContext);
      if (detected) setLanguage(detected);
    }
    if (!isManualSections) {
      const detectedSecs = detectSongSections(currTitle, currArtist, 'All');
      if (detectedSecs && detectedSecs.length > 0) {
        setSelectedSections(detectedSecs);
      }
    }
  };

  const handleAudioUrlChange = async (val) => {
    setAudioUrl(val);
    const ytId = extractYouTubeId(val);
    if (ytId) {
      setIsLoadingYtMeta(true);
      try {
        const meta = await fetchYouTubeMetadata(ytId);
        if (meta && meta.title) {
          setTitle(meta.title);
          setArtist(meta.artist || 'Unknown Artist');
          updateSongAuto(meta.title, meta.artist, meta.rawTitle);
        }
      } catch (err) {
        console.warn('YouTube request metadata error:', err);
      } finally {
        setIsLoadingYtMeta(false);
      }
    }
  };

  const toggleSection = (sec) => {
    setIsManualSections(true);
    setSelectedSections(prev =>
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    );
  };

  const handleLanguageSelect = (lang) => {
    setIsManualLanguage(true);
    setLanguage(prev => (prev === lang ? null : lang));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) {
      setErrorMessage('Please provide both song title and artist name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await submitSongRequest({
        title,
        artist,
        audioUrl,
        sections: selectedSections.length > 0 ? selectedSections : ['Lo-Fi'],
        language: language || 'English',
        note,
        user
      });

      playTingSound();
      setSubmitSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit song request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-modal-panel song-request-panel" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="request-modal-icon-badge">
              <Music size={22} className="request-title-icon" />
            </div>
            <div>
              <h3>Request a Song</h3>
              <p>Suggest a track for the Musicly Public Library</p>
            </div>
          </div>
          <button 
            id="btn-close-song-request" 
            className="glass-close-btn bookmark-close-btn" 
            onClick={onClose}
            title="Close"
          >
            <X size={17} />
          </button>
        </div>

        {submitSuccess ? (
          <div className="request-success-box">
            <div className="request-success-glow">
              <Check size={36} />
            </div>
            <h4>Request Submitted!</h4>
            <p>
              Thanks for the recommendation! The admin has received your request and will review it for the public library.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="song-request-form">
            {errorMessage && (
              <div className="request-error-banner">
                {errorMessage}
              </div>
            )}

            <div className="admin-form-group">
              <label>YouTube Link or Streaming Audio URL (Optional)</label>
              <div className="admin-input-wrapper">
                <input 
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=... or https://.../audio.mp3"
                  value={audioUrl}
                  onChange={(e) => handleAudioUrlChange(e.target.value)}
                  style={{ paddingRight: isLoadingYtMeta ? '135px' : '16px' }}
                />
                {isLoadingYtMeta && (
                  <div style={{ 
                    position: 'absolute', 
                    right: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: '#ffd166', 
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    pointerEvents: 'none'
                  }}>
                    <RefreshCw size={14} className="spin-icon" />
                    <span>Auto-detecting...</span>
                  </div>
                )}
              </div>
              <span className="admin-form-hint">Paste a link to automatically fill song details & preview audio</span>
            </div>

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Song Title *</label>
                <input 
                  type="text"
                  placeholder="e.g. Tu Jo Paas or Midnight Horizon"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    updateSongAuto(e.target.value, artist);
                  }}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Artist / Creator Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Suzonn / Prateek Kuhad"
                  value={artist}
                  onChange={(e) => {
                    setArtist(e.target.value);
                    updateSongAuto(title, e.target.value);
                  }}
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label>
                <Layers size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Suggested Genre / Section (Optional)
              </label>
              <div className="admin-chips-picker">
                {displayedSections.map(sec => {
                  const isSel = selectedSections.includes(sec);
                  return (
                    <button 
                      key={sec}
                      type="button"
                      className={`admin-picker-chip ${isSel ? 'selected' : ''}`}
                      onClick={() => toggleSection(sec)}
                    >
                      {isSel && <Check size={12} />} {sec}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="admin-form-group">
              <label>
                <Globe size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Language
              </label>
              <div className="admin-chips-picker">
                {AVAILABLE_LANGUAGES.map(lang => {
                  const isSel = language === lang;
                  return (
                    <button 
                      key={lang}
                      type="button"
                      className={`admin-picker-chip ${isSel ? 'selected' : ''}`}
                      onClick={() => handleLanguageSelect(lang)}
                    >
                      {isSel && <Check size={12} />} {lang}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="admin-form-group">
              <label>
                <MessageSquare size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Note or Dedication for Admin (Optional)
              </label>
              <input 
                type="text"
                placeholder="Why do you love this track? Or who would you dedicate it to?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
            </div>

            <div className="request-modal-footer">
              <button 
                type="button" 
                className="admin-cancel-btn" 
                onClick={onClose}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="request-submit-btn"
                disabled={isSubmitting || !title.trim() || !artist.trim()}
              >
                <span>{isSubmitting ? 'Sending...' : 'Send Request ♪'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
