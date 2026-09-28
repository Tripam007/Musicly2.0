import React, { useState, useEffect } from 'react';
import { X, Star, MessageSquare, Send, Sparkles } from 'lucide-react';
import { submitFeedback } from '../utils/feedbackDB';

const RATING_CONFIG = {
  1: {
    label: 'Needs improvement',
    color: '#f87171',
    glow: 'rgba(248, 113, 113, 0.55)',
    bg: 'rgba(248, 113, 113, 0.15)'
  },
  2: {
    label: 'Getting there',
    color: '#fb923c',
    glow: 'rgba(251, 146, 60, 0.55)',
    bg: 'rgba(251, 146, 60, 0.15)'
  },
  3: {
    label: 'Nice & chill',
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.55)',
    bg: 'rgba(250, 204, 21, 0.15)'
  },
  4: {
    label: 'Loving the vibes!',
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.55)',
    bg: 'rgba(52, 211, 153, 0.15)'
  },
  5: {
    label: 'Pure bliss & magic!',
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.6)',
    bg: 'rgba(192, 132, 252, 0.16)'
  }
};

// Warm musical notes for each star rating (C Major Pentatonic: C4, E4, G4, A4, C5)
const STAR_NOTES = {
  1: { root: 261.63, overtone: 523.25 },                     // C4
  2: { root: 329.63, overtone: 659.25 },                     // E4
  3: { root: 392.00, overtone: 783.99 },                     // G4
  4: { root: 440.00, overtone: 880.00 },                     // A4
  5: { root: 523.25, overtone: 1046.50, sparkle: 1567.98 }   // C5 + sparkle
};

function playStarChime(starNum) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    if (!window._starAudioCtx) {
      window._starAudioCtx = new AudioContext();
    }
    const ctx = window._starAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const note = STAR_NOTES[starNum] || STAR_NOTES[1];

    // Master envelope
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.24, now);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    masterGain.connect(ctx.destination);

    // Warm Low-pass filter for a cozy celesta / vibraphone timbre
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, now);
    filter.connect(masterGain);

    // 1. Fundamental root note (warm sine)
    const rootOsc = ctx.createOscillator();
    const rootGain = ctx.createGain();
    rootOsc.type = 'sine';
    rootOsc.frequency.setValueAtTime(note.root, now);

    rootGain.gain.setValueAtTime(0.001, now);
    rootGain.gain.linearRampToValueAtTime(0.3, now + 0.008);
    rootGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

    rootOsc.connect(rootGain);
    rootGain.connect(filter);
    rootOsc.start(now);
    rootOsc.stop(now + 0.62);

    // 2. Harmonic bell overtone (gentle triangle shimmer)
    const overtoneOsc = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtoneOsc.type = 'triangle';
    overtoneOsc.frequency.setValueAtTime(note.overtone, now);

    overtoneGain.gain.setValueAtTime(0.001, now);
    overtoneGain.gain.linearRampToValueAtTime(0.12, now + 0.006);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    overtoneOsc.connect(overtoneGain);
    overtoneGain.connect(filter);
    overtoneOsc.start(now);
    overtoneOsc.stop(now + 0.45);

    // 3. Extra high shimmer for the 5-star climax
    if (note.sparkle) {
      const sparkleOsc = ctx.createOscillator();
      const sparkleGain = ctx.createGain();
      sparkleOsc.type = 'sine';
      sparkleOsc.frequency.setValueAtTime(note.sparkle, now + 0.02);

      sparkleGain.gain.setValueAtTime(0.001, now + 0.02);
      sparkleGain.gain.linearRampToValueAtTime(0.09, now + 0.035);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

      sparkleOsc.connect(sparkleGain);
      sparkleGain.connect(masterGain);
      sparkleOsc.start(now + 0.02);
      sparkleOsc.stop(now + 0.52);
    }
  } catch (_e) {
    // Non-blocking audio fallback
  }
}

export default function FeedbackModal({ 
  isOpen, 
  onClose, 
  user = null,
  backdropImage = '/assets/images/ghazals_bg.png'
}) {
  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [mounted, setMounted] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  // Sync animation mounting and closing
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setIsClosing(false);
      setIsSuccess(false);
      setErrorMsg('');
      setIsSubmitting(false);
      // Reset comments and rating for clean modal (all stars blank at first)
      setRating(0);
      setComments('');
    } else if (mounted) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setMounted(false);
        setIsClosing(false);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = (submitted = false) => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose?.({ submitted });
      setMounted(false);
      setIsClosing(false);
    }, 240);
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen || isClosing) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating < 1) {
      setErrorMsg('Please select a star rating (1-5)');
      return;
    }

    setErrorMsg('');
    // Instantly display the message without delay
    setIsSuccess(true);

    try {
      submitFeedback({
        rating,
        comments,
        user,
        guestName,
        guestEmail
      }).catch((err) => console.warn('Feedback submission error:', err));
    } catch {}

    // Automatically close modal after brief appreciation and return to music
    setTimeout(() => {
      handleClose(true);
    }, 1600);
  };

  if (!mounted && !isOpen) return null;

  const currentConfig = RATING_CONFIG[rating] || {
    label: '',
    color: '#94a3b8',
    glow: 'rgba(255, 255, 255, 0.08)',
    bg: 'rgba(255, 255, 255, 0.04)'
  };

  return (
    <div 
      className={`modal-overlay feedback-modal-overlay ${isSuccess ? 'is-success-backdrop' : ''} ${isClosing ? 'is-closing' : 'is-opening'}`}
      onClick={() => handleClose(isSuccess)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-modal-title"
    >
      {isSuccess ? (
        /* Zero Box - Just the pure aesthetic floating text */
        <div 
          className="feedback-pure-message-view"
          onClick={() => handleClose(true)}
        >
          <p className="feedback-pure-message-text">
            Thanks for listening. ♡
          </p>
        </div>
      ) : (
        <div 
          className={`glass-modal-panel feedback-modal-panel ${isClosing ? 'is-closing' : 'is-opening'}`} 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Subtle black glass rim and soft glow */}
          <div className="feedback-glass-subtle-glow" aria-hidden="true" />
          <div className="feedback-glass-subtle-rim" aria-hidden="true" />

          {/* Close Button */}
          <button 
            id="btn-close-feedback-modal" 
            className="drawer-close-btn feedback-close-btn" 
            onClick={() => handleClose(false)}
            aria-label="Close feedback modal"
          >
            <X size={17} />
          </button>

          <div className="feedback-content-wrapper">
            {/* Header */}
            <div className="feedback-header">
              <div className="feedback-pill-badge">
                <Sparkles size={13} className="feedback-badge-icon" />
                <span>LISTENER REVIEW</span>
              </div>
              <h3 id="feedback-modal-title" className="feedback-title">
                How's your vibe so far? ✨
              </h3>
              <p className="feedback-subtitle">
                Your ratings and thoughts directly shape the soundscapes, themes, and tracks we add next.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="feedback-form">
              {/* Star Rating Section */}
              <div 
                className="feedback-stars-box"
                style={{
                  '--rating-color': currentConfig.color,
                  '--rating-glow': currentConfig.glow,
                  '--rating-bg': currentConfig.bg
                }}
              >
                <div className="feedback-stars-row" role="radiogroup" aria-label="Rating from 1 to 5 stars">
                  {[1, 2, 3, 4, 5].map((starNum) => {
                    const isFilled = rating > 0 && starNum <= rating;
                    const isApex = rating === starNum;
                    return (
                      <button
                        type="button"
                        key={starNum}
                        className={`feedback-star-col-btn ${isFilled ? 'is-active' : ''} ${isApex ? 'is-apex' : ''}`}
                        onClick={() => {
                          setRating(starNum);
                          playStarChime(starNum);
                        }}
                        aria-label={`${starNum} star${starNum > 1 ? 's' : ''}`}
                        title={`${starNum} Star${starNum > 1 ? 's' : ''}`}
                        style={{
                          '--star-color': currentConfig.color,
                          '--star-glow': currentConfig.glow,
                          '--star-bg': currentConfig.bg
                        }}
                      >
                        <div className="feedback-star-icon-wrap">
                          <Star 
                            size={28} 
                            fill={isFilled ? currentConfig.color : 'none'} 
                            color={isFilled ? currentConfig.color : 'rgba(255, 255, 255, 0.3)'}
                            style={{
                              filter: isFilled ? `drop-shadow(0 0 10px ${currentConfig.glow})` : 'none',
                              transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                          />
                        </div>
                        <span className="feedback-star-badge">
                          {starNum}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div 
                  className="feedback-rating-label"
                  style={{
                    color: currentConfig.color,
                    textShadow: rating > 0 ? `0 0 14px ${currentConfig.glow}` : 'none',
                    opacity: rating > 0 ? 1 : 0
                  }}
                >
                  {rating > 0 ? currentConfig.label : '\u00A0'}
                </div>
              </div>

              {/* Text Comments / Suggestions */}
              <div className="feedback-field-group">
                <label htmlFor="feedback-comment-input" className="feedback-input-label">
                  Comments or Feature Suggestions <span className="label-optional">(optional)</span>
                </label>
                <textarea
                  id="feedback-comment-input"
                  rows={3}
                  maxLength={500}
                  placeholder="What tracks, ambient sounds, or features would you like to see?"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="feedback-textarea"
                />
                <div className="feedback-char-count">
                  {comments.length}/500
                </div>
              </div>

              {/* Guest Identity (Only if not logged in) */}
              {!user && (
                <div className="feedback-guest-fields-row">
                  <div className="guest-field">
                    <input
                      type="text"
                      placeholder="Your Name (optional)"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="feedback-text-input"
                      maxLength={40}
                    />
                  </div>
                  <div className="guest-field">
                    <input
                      type="email"
                      placeholder="Email (optional, if you'd like a reply)"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="feedback-text-input"
                    />
                  </div>
                </div>
              )}

              {user && (
                <div className="feedback-logged-user-hint">
                  <span>Submitting as <strong>{user.displayName || user.email}</strong></span>
                </div>
              )}

              {errorMsg && (
                <div className="feedback-error-banner" role="alert">
                  {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="feedback-actions-row">
                <button
                  type="submit"
                  id="btn-submit-feedback"
                  disabled={isSubmitting}
                  className={`feedback-submit-btn ${isSubmitting ? 'is-submitting' : ''}`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="feedback-spinner" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
