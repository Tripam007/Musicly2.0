import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Volume1, 
  Heart, 
  Sparkles,
  Hand
} from 'lucide-react';

/**
 * Subtle cinematic confirmation toast for recognized air gestures.
 * Displayed for ~800ms with smooth spring and fade animation.
 */
export default function AirControlsFeedback({ feedback }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!feedback) {
      setVisible(false);
      return;
    }

    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
    }, 850);

    return () => clearTimeout(timer);
  }, [feedback]);

  if (!visible || !feedback) return null;

  const renderIcon = () => {
    switch (feedback.type) {
      case 'PLAY':
        return <Play size={17} className="text-emerald-400 fill-current" />;
      case 'PAUSE':
        return <Pause size={17} className="text-amber-400 fill-current" />;
      case 'NEXT':
        return <SkipForward size={17} className="text-cyan-400" />;
      case 'PREV':
        return <SkipBack size={17} className="text-cyan-400" />;
      case 'VOL_UP':
        return <Volume2 size={17} className="text-blue-400" />;
      case 'VOL_DOWN':
        return <Volume1 size={17} className="text-blue-400" />;
      case 'MUTE':
        return <VolumeX size={17} className="text-rose-400" />;
      case 'UNMUTE':
        return <Volume2 size={17} className="text-emerald-400" />;
      case 'LIKE':
        return <Heart size={17} className="text-rose-500 fill-current" />;
      case 'UNLIKE':
        return <Heart size={17} className="text-slate-400" />;
      case 'AMBIENCE_ON':
      case 'AMBIENCE_OFF':
        return <Sparkles size={17} className="text-amber-300" />;
      default:
        return <Hand size={17} className="text-indigo-400" />;
    }
  };

  return (
    <div className="air-feedback-toast-container" aria-live="polite">
      <div className="air-feedback-toast">
        <div className="air-feedback-icon-wrapper">
          {renderIcon()}
        </div>
        <div className="air-feedback-text-wrapper">
          <span className="air-feedback-label">{feedback.label}</span>
          {feedback.sublabel && (
            <span className="air-feedback-sublabel">{feedback.sublabel}</span>
          )}
        </div>
      </div>
    </div>
  );
}
