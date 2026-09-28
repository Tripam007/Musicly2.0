import React, { useState, useRef } from 'react';
import { X, Upload, Link2, Music, CheckCircle2, FileAudio, Check, Plus, Layers, Sparkles, Globe, AlertCircle } from 'lucide-react';
import { playTingSound } from '../utils/audioSynth';
import { GENRES, LANGUAGES, LANGUAGE_LABELS, isGhazalLanguage } from '../data/tracks';
import { extractYouTubeId, extractYouTubeStartTime } from '../utils/youtubePlayer';
import { detectSongLanguage, detectSongSections } from '../utils/languageDetector';
import { parseAudioFilename, parseYouTubeTitle, fetchYouTubeMetadata } from '../utils/trackParser';
import { resolveOriginalTrack, resolveTrackAudioStreamAsync } from '../utils/originalTrackResolver';
import { findDuplicateTrack } from '../utils/trackDeduplicator';

const YouTubeIcon = ({ size = 16, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className} 
    style={{ color: '#ef4444' }}
  >
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const AVAILABLE_SECTIONS = GENRES.filter(g => g !== 'All');
const UPLOAD_LANGUAGES = LANGUAGES;

export default function UploadModal({
  isOpen,
  onClose,
  onAddCustomTrack,
  currentGenre = 'All',
  existingTracks = []
}) {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [selectedSections, setSelectedSections] = useState([]);
  const [isManualSections, setIsManualSections] = useState(false);
  const [language, setLanguage] = useState(null);
  const [isManualLanguage, setIsManualLanguage] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [fileObject, setFileObject] = useState(null);
  const [duration, setDuration] = useState(180);
  const [isDragOver, setIsDragOver] = useState(false);
  const [detectedYtId, setDetectedYtId] = useState(null);
  const [isLoadingYtMeta, setIsLoadingYtMeta] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const displayedSections = React.useMemo(() => {
    if (isGhazalLanguage(language)) {
      return AVAILABLE_SECTIONS;
    }
    return AVAILABLE_SECTIONS.filter(s => s.toLowerCase() !== 'ghazal');
  }, [language]);

  // Clear selections at start when opening fresh modal
  React.useEffect(() => {
    if (isOpen && !audioUrl && !fileObject && !title && !artist) {
      setSelectedSections([]);
      setLanguage(null);
      setIsManualSections(false);
      setIsManualLanguage(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSection = (sec) => {
    setIsManualSections(true);
    setSelectedSections(prev => {
      if (prev.includes(sec)) {
        return prev.filter(s => s !== sec);
      } else {
        return [...prev, sec];
      }
    });
  };

  const updateSongAuto = (currTitle, currArtist, extraContext = '') => {
    const combined = `${currTitle || ''} ${currArtist || ''} ${extraContext || ''}`.trim();
    if (!combined) return;

    if (!isManualLanguage) {
      const detected = detectSongLanguage(currTitle, currArtist, extraContext);
      if (detected) {
        setLanguage(detected);
      }
    }
    if (!isManualSections) {
      const detectedSecs = detectSongSections(currTitle, currArtist, currentGenre);
      if (detectedSecs && detectedSecs.length > 0) {
        setSelectedSections(detectedSecs);
      }
    }
  };

  const handleLanguageSelect = (lang) => {
    setIsManualLanguage(true);
    setLanguage(prev => (prev === lang ? null : lang));
  };

  const handleFetchYouTubeMeta = async (ytId) => {
    setIsLoadingYtMeta(true);
    try {
      const meta = await fetchYouTubeMetadata(ytId);
      if (meta && meta.title) {
        const resolvedTitle = meta.title;
        const resolvedArtist = meta.artist || 'YouTube Artist';
        setTitle(resolvedTitle);
        setArtist(resolvedArtist);
        updateSongAuto(resolvedTitle, resolvedArtist, meta.rawTitle);
      }
    } catch (err) {
      console.warn("YouTube metadata auto-detect error:", err);
    } finally {
      setIsLoadingYtMeta(false);
    }
  };

  const handleUrlChange = (val) => {
    setAudioUrl(val);
    const ytId = extractYouTubeId(val);
    setDetectedYtId(ytId);

    if (val.trim()) {
      const dup = findDuplicateTrack({ audioUrl: val.trim(), youtubeId: ytId }, existingTracks);
      if (dup) {
        setErrorMessage("Already present!");
      } else if (errorMessage === "Already present!") {
        setErrorMessage('');
      }
    } else if (errorMessage === "Already present!") {
      setErrorMessage('');
    }

    if (ytId) {
      handleFetchYouTubeMeta(ytId);
    }
  };

  const processFile = (file) => {
    if (!file) return;
    setFileObject(file);
    setDetectedYtId(null);

    const { title: parsedTitle, artist: parsedArtist } = parseAudioFilename(file.name);
    setTitle(parsedTitle);
    setArtist(parsedArtist);
    updateSongAuto(parsedTitle, parsedArtist, file.name);

    const dup = findDuplicateTrack({ title: parsedTitle, artist: parsedArtist }, existingTracks);
    if (dup) {
      setErrorMessage("Already present!");
    } else if (errorMessage === "Already present!") {
      setErrorMessage('');
    }

    try {
      const tempAudio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      tempAudio.src = objectUrl;
      tempAudio.addEventListener('loadedmetadata', () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration)) {
          setDuration(Math.round(tempAudio.duration));
        }
      });
    } catch (e) {}
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const resetForm = () => {
    setTitle('');
    setArtist('');
    setAudioUrl('');
    setFileObject(null);
    setDetectedYtId(null);
    setSelectedSections([]);
    setIsManualSections(false);
    setLanguage(null);
    setIsManualLanguage(false);
    setDuration(180);
    setIsLoadingYtMeta(false);
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    let rawUrl = audioUrl.trim();
    if (!fileObject && rawUrl && !rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = 'https://' + rawUrl;
    }

    let finalAudioUrl = fileObject ? URL.createObjectURL(fileObject) : rawUrl;
    if (!finalAudioUrl && !fileObject) return;

    let ytId = extractYouTubeId(finalAudioUrl) || extractYouTubeId(rawUrl) || detectedYtId;
    const isYt = !!ytId;

    const chosenSections = selectedSections.length > 0 
      ? selectedSections 
      : [(currentGenre && currentGenre !== 'All') ? currentGenre : 'Lo-Fi'];

    const fallbackTitle = isYt 
      ? (artist ? `${artist} Track` : `YouTube Track (${ytId})`) 
      : (fileObject ? fileObject.name.replace(/\.[^/.]+$/, "") : 'My Custom Track');
    const finalTitle = (title && title.trim()) || fallbackTitle;
    const finalArtist = (artist && artist.trim()) || (isYt ? 'YouTube Stream' : 'Unknown Artist');

    // Duplicate Check: Verify if same URL, YouTube ID, or title/artist already exists
    const duplicate = findDuplicateTrack({
      title: finalTitle,
      artist: finalArtist,
      audioUrl: isYt ? `https://www.youtube.com/watch?v=${ytId}` : finalAudioUrl,
      youtubeId: ytId || null
    }, existingTracks);

    if (duplicate) {
      setErrorMessage("Already present!");
      return;
    }

    let ytStartTime = 0;
    if (isYt) {
      ytStartTime = extractYouTubeStartTime(rawUrl) || extractYouTubeStartTime(finalAudioUrl);
    }

    let candidateTrack = {
      id: 'custom-' + Date.now(),
      title: finalTitle,
      artist: finalArtist,
      language: language || 'English',
      genres: chosenSections,
      genre: chosenSections.join(', '),
      duration: duration || (isYt ? 240 : 180),
      cover: isYt 
        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      audioUrl: isYt ? `https://www.youtube.com/watch?v=${ytId}` : finalAudioUrl,
      isCustom: true,
      isYouTube: isYt,
      youtubeId: ytId || null,
      startTime: ytStartTime || 0
    };

    // If YouTube URL was pasted, preserve it completely so the full song plays via YouTube player
    let resolved = isYt ? candidateTrack : resolveOriginalTrack(candidateTrack);

    const finalTrack = {
      ...resolved,
      blob: fileObject || null,
      hasOfflineAudio: !!fileObject,
      isOfflineDownloaded: !!fileObject
    };

    playTingSound();
    onAddCustomTrack(finalTrack, fileObject || null);
    resetForm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-modal-panel upload-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Upload className="panel-title-icon" size={22} />
            <div>
              <h3>Add Your Own Music</h3>
              <p>Play any MP3, WAV, YouTube or audio stream in Musicly</p>
            </div>
          </div>
          <button id="btn-close-upload" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {errorMessage && (
            <div className="upload-error-banner" role="alert">
              <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}
          <div className="form-group">
            <label>Upload Audio File (MP3 / WAV / OGG / FLAC)</label>
            <div 
              className={`file-drop-area ${isDragOver ? 'drag-over' : ''} ${fileObject ? 'file-selected' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >
              <input 
                ref={fileInputRef}
                id="file-upload-input"
                type="file" 
                accept="audio/*" 
                onChange={handleFileChange}
                className="file-hidden-input"
              />
              <div className="file-drop-label">
                {fileObject ? (
                  <>
                    <FileAudio size={32} style={{ color: '#22c55e' }} />
                    <span style={{ color: '#ffffff', fontWeight: '700' }}>{fileObject.name}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {(fileObject.size / (1024 * 1024)).toFixed(2)} MB • {Math.floor(duration / 60)}:{duration % 60 < 10 ? '0' : ''}{duration % 60}
                    </span>
                  </>
                ) : (
                  <>
                    <Music size={28} />
                    <span>Choose audio file or drag & drop here</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="form-or-text">or paste a youtube / streaming url</div>

          <div className="form-group">
            <label>YouTube or Online Audio Stream URL</label>
            <div className="input-with-icon">
              {detectedYtId ? (
                <YouTubeIcon size={17} className="field-icon" />
              ) : (
                <Link2 size={16} className="field-icon" />
              )}
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... or youtu.be/..."
                value={audioUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Track Title</label>
              <input
                type="text"
                placeholder="Track Title (Auto-detected or custom)"
                value={title}
                onChange={(e) => {
                  const val = e.target.value;
                  setTitle(val);
                  updateSongAuto(val, artist);
                }}
              />
            </div>
            <div className="form-group">
              <label>Artist Name</label>
              <input
                type="text"
                placeholder="Artist Name (Auto-detected)"
                value={artist}
                onChange={(e) => {
                  const val = e.target.value;
                  setArtist(val);
                  updateSongAuto(title, val);
                }}
              />
            </div>
          </div>

          {/* Multi-Section / Genre Selector */}
          <div className="form-group">
            <label className="section-select-label">
              <Layers size={14} /> Add to Section(s) (Select 1 or more)
            </label>
            <div className="section-select-chips">
              {displayedSections.map((sec) => {
                const isSelected = selectedSections.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    className={`section-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleSection(sec)}
                  >
                    {isSelected ? <Check size={13} className="chip-check-icon" /> : <Plus size={13} />}
                    <span>{sec}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Song Language Selector */}
          <div className="form-group">
            <label className="section-select-label">
              <Globe size={14} /> Song Language
            </label>
            <div className="section-select-chips lang-select-chips">
              {UPLOAD_LANGUAGES.map((lang) => {
                const isSelected = language === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    className={`section-chip ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => handleLanguageSelect(lang)}
                    title={isSelected ? `Click to deselect ${LANGUAGE_LABELS[lang] || lang}` : `Select ${LANGUAGE_LABELS[lang] || lang}`}
                  >
                    {isSelected ? <Check size={13} className="chip-check-icon" /> : <Plus size={13} />}
                    <span>{LANGUAGE_LABELS[lang] || lang}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="upload-submit-row">
            <button id="btn-submit-track" type="submit" className="upload-submit-btn">
              <CheckCircle2 size={18} /> Save to Musicly
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
