import React, { useState, useRef } from 'react';
import { 
  X, 
  Crown, 
  Upload, 
  Music, 
  Trash2, 
  Edit3, 
  Play, 
  Pause, 
  Check, 
  Plus, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  Globe, 
  FileAudio, 
  Palette,
  Sparkles,
  Image as ImageIcon,
  Wand2,
  RefreshCw,
  Sliders,
  Layers,
  Zap,
  Coffee,
  Lightbulb,
  CloudRain,
  Eye,
  Maximize2,
  Radio,
  Clock,
  MessageSquare,
  ExternalLink,
  User,
  Calendar,
  FileText,
  ChevronDown,
  ChevronUp,
  Link,
  Star,
  Mail,
  Activity
} from 'lucide-react';

import { GENRES, LANGUAGES } from '../data/tracks';
import { extractYouTubeId, extractYouTubeStartTime } from '../utils/youtubePlayer';
import { detectSongLanguage, detectSongSections } from '../utils/languageDetector';
import { parseAudioFilename, parseYouTubeTitle, fetchYouTubeMetadata } from '../utils/trackParser';
import { playTingSound, playClickSound } from '../utils/audioSynth';
import { extractPaletteFromImage } from '../utils/aiThemeGenerator';
import { loadSongRequests, updateSongRequestStatus, deleteSongRequest, updateSongRequestAdminNote, updateSongRequestAudio, updateSongRequestDetails } from '../utils/songRequestsDB';
import { loadSavedFeedback, deleteFeedback } from '../utils/feedbackDB';

const AVAILABLE_SECTIONS = GENRES.filter(g => g !== 'All');
const AVAILABLE_LANGUAGES = LANGUAGES;

const PRESET_THEMES = [
  {
    name: 'Cozy Kyoto Rain',
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1920&auto=format&fit=crop&q=80',
    desc: 'Japanese alley lamps, soft rain & lantern reflections'
  },
  {
    name: 'Autumn Bookstore Cafe',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1920&auto=format&fit=crop&q=80',
    desc: 'Vintage bookshelves, ambient desk lamp & rain outside'
  },
  {
    name: 'Cyberpunk Tokyo Night',
    image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1920&auto=format&fit=crop&q=80',
    desc: 'Vibrant neon reflections, cyberpunk skyline & purple hues'
  },
  {
    name: 'Moonlit Mountain Lake',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&auto=format&fit=crop&q=80',
    desc: 'Gentle night tide, deep indigo sky & tranquil breeze'
  }
];

export default function AdminDashboardModal({
  isOpen,
  onClose,
  user,
  isAdmin,
  publicTracks = [],
  onPublishTrack,
  onUpdateTrack,
  onDeleteTrack,
  onPlayTrack,
  currentTrackId,
  isPlaying,
  customScenes = [],
  onAddScene,
  onDeleteScene,
  onSelectScene,
  onApplyWebappTheme,
  onResetWebappTheme,
  onOpenAirAiDashboard
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'upload' | 'scenes'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Upload form state
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [fileObject, setFileObject] = useState(null);
  const [selectedSections, setSelectedSections] = useState([]);
  const [isManualSections, setIsManualSections] = useState(false);
  const [language, setLanguage] = useState(null);
  const [isManualLanguage, setIsManualLanguage] = useState(false);
  const [duration, setDuration] = useState(180);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingYtMeta, setIsLoadingYtMeta] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Editing state
  const [editingTrack, setEditingTrack] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editSections, setEditSections] = useState([]);
  const [editLanguage, setEditLanguage] = useState('English');
  const [editAudioUrl, setEditAudioUrl] = useState('');
  const [editFileObject, setEditFileObject] = useState(null);
  const [editFileError, setEditFileError] = useState('');
  const editFileInputRef = useRef(null);

  // Scene addition state
  const [sceneName, setSceneName] = useState('');
  const [sceneImage, setSceneImage] = useState('');
  const [sceneDesc, setSceneDesc] = useState('');
  const [sceneSubmitting, setSceneSubmitting] = useState(false);
  const [sceneError, setSceneError] = useState('');
  const [sceneSuccess, setSceneSuccess] = useState('');
  const sceneFileInputRef = useRef(null);

  const [themePalette, setThemePalette] = useState(null);

  // Song Requests state
  const [songRequests, setSongRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [requestFilter, setRequestFilter] = useState('pending'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [requestSearch, setRequestSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);
  const [requestActionMsg, setRequestActionMsg] = useState('');
  const [adminNotesMap, setAdminNotesMap] = useState({});
  const [savingNoteId, setSavingNoteId] = useState(null);
  const [savedNoteSuccessId, setSavedNoteSuccessId] = useState(null);
  const [expandedRequesters, setExpandedRequesters] = useState({});
  const [requestAudioInputs, setRequestAudioInputs] = useState({});
  const [requestAudioFiles, setRequestAudioFiles] = useState({});
  const [requestItemErrors, setRequestItemErrors] = useState({});
  const [openAddMusic, setOpenAddMusic] = useState({});
  const [attachingMusicId, setAttachingMusicId] = useState(null);
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [editReqTitle, setEditReqTitle] = useState('');
  const [editReqArtist, setEditReqArtist] = useState('');
  const [editReqSections, setEditReqSections] = useState([]);
  const [editReqLanguage, setEditReqLanguage] = useState('');
  const [savingEditReqId, setSavingEditReqId] = useState(null);

  // Feedback reviews state
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackRatingFilter, setFeedbackRatingFilter] = useState('all'); // 'all' | '5' | '4' | '1-3' | 'has_comments'
  const [deletingFeedbackId, setDeletingFeedbackId] = useState(null);
  const [feedbackActionMsg, setFeedbackActionMsg] = useState('');

  const fileInputRef = useRef(null);

  // Fetch song requests when modal opens or activeTab switches
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await loadSongRequests();
      setSongRequests(data);
    } catch (err) {
      console.warn("Failed to load song requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch user reviews / feedbacks
  const fetchFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const data = await loadSavedFeedback();
      setFeedbacks(data || []);
    } catch (err) {
      console.warn("Failed to load feedback reviews:", err);
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      fetchRequests();
      fetchFeedbacks();
    }
  }, [isOpen, activeTab]);

  // Clear initial selections when opening or when form is untouched
  React.useEffect(() => {
    if (isOpen && !audioUrl && !fileObject && !title && !artist) {
      setSelectedSections([]);
      setLanguage(null);
      setIsManualSections(false);
      setIsManualLanguage(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter public songs in directory
  const filteredPublicTracks = publicTracks.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.genre && t.genre.toLowerCase().includes(q))
    );
  });

  const pendingRequestsCount = songRequests.filter(r => r.status === 'pending').length;

  const filteredRequests = songRequests.filter(req => {
    if (requestFilter !== 'all' && req.status !== requestFilter) return false;
    if (!requestSearch) return true;
    const q = requestSearch.toLowerCase();
    return (
      (req.title && req.title.toLowerCase().includes(q)) ||
      (req.artist && req.artist.toLowerCase().includes(q)) ||
      (req.userName && req.userName.toLowerCase().includes(q)) ||
      (req.userEmail && req.userEmail.toLowerCase().includes(q))
    );
  });

  // Feedback review computations & actions
  const handleDeleteFeedback = async (id, userName) => {
    if (!window.confirm(`Delete review from "${userName || 'Listener'}"?`)) return;
    setDeletingFeedbackId(id);
    try {
      await deleteFeedback(id);
      setFeedbacks(prev => prev.filter(f => f.id !== id));
      playClickSound();
      setFeedbackActionMsg('Feedback review removed.');
      setTimeout(() => setFeedbackActionMsg(''), 3500);
    } catch (err) {
      console.error("Failed to delete feedback:", err);
    } finally {
      setDeletingFeedbackId(null);
    }
  };

  const averageRating = feedbacks.length > 0 
    ? (feedbacks.reduce((acc, f) => acc + (Number(f.rating) || 0), 0) / feedbacks.length).toFixed(1)
    : '5.0';

  const feedbacksWithCommentsCount = feedbacks.filter(f => f.comments && f.comments.trim().length > 0).length;

  const filteredFeedbacks = feedbacks.filter(item => {
    if (feedbackRatingFilter === '5' && Number(item.rating) !== 5) return false;
    if (feedbackRatingFilter === '4' && Number(item.rating) !== 4) return false;
    if (feedbackRatingFilter === '1-3' && Number(item.rating) > 3) return false;
    if (feedbackRatingFilter === 'has_comments' && (!item.comments || !item.comments.trim())) return false;

    if (feedbackSearch) {
      const q = feedbackSearch.toLowerCase();
      const matchUser = (item.userName || '').toLowerCase().includes(q);
      const matchEmail = (item.userEmail || '').toLowerCase().includes(q);
      const matchComment = (item.comments || '').toLowerCase().includes(q);
      return matchUser || matchEmail || matchComment;
    }
    return true;
  });

  const toggleRequesterExpand = (id) => {
    setExpandedRequesters(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAudioUrlInputChange = (id, val) => {
    setRequestAudioInputs(prev => ({ ...prev, [id]: val }));
    if (requestItemErrors[id]) {
      setRequestItemErrors(prev => ({ ...prev, [id]: '' }));
    }
  };

  const handleRequestFileUpload = (id, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setRequestItemErrors(prev => ({ ...prev, [id]: 'Please select a valid audio file (MP3, WAV, M4A, OGG)' }));
      return;
    }
    setRequestAudioFiles(prev => ({ ...prev, [id]: file }));
    setRequestItemErrors(prev => ({ ...prev, [id]: '' }));
    playTingSound();
  };

  const handleClearRequestFile = (id) => {
    setRequestAudioFiles(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const toggleAddMusic = (id) => {
    setOpenAddMusic(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSaveAttachedAudio = async (request) => {
    setAttachingMusicId(request.id);
    setRequestItemErrors(prev => ({ ...prev, [request.id]: '' }));

    try {
      const providedUrl = (requestAudioInputs[request.id] !== undefined ? requestAudioInputs[request.id] : (request.audioUrl || '')).trim();
      const uploadedFile = requestAudioFiles[request.id] || null;

      if (!providedUrl && !uploadedFile) {
        setRequestItemErrors(prev => ({
          ...prev,
          [request.id]: '⚠️ Please provide a YouTube link or select an audio file first.'
        }));
        setAttachingMusicId(null);
        return;
      }

      let finalAudioUrl = providedUrl;
      const ytId = extractYouTubeId(providedUrl);
      const isYt = !!ytId;

      if (uploadedFile) {
        finalAudioUrl = URL.createObjectURL(uploadedFile);
      }

      // Update in songRequests database & local state
      await updateSongRequestAudio(request.id, finalAudioUrl, {
        isYouTube: isYt,
        youtubeId: ytId || null
      });

      setSongRequests(prev => prev.map(r => r.id === request.id ? {
        ...r,
        audioUrl: finalAudioUrl,
        isYouTube: isYt,
        youtubeId: ytId || null
      } : r));

      // If already published to publicTracks, update the live public track
      if (onUpdateTrack) {
        const existingTrack = publicTracks.find(t => 
          (request.publicTrackId && t.id === request.publicTrackId) ||
          (t.title?.toLowerCase() === request.title?.toLowerCase() && t.artist?.toLowerCase() === request.artist?.toLowerCase())
        );

        if (existingTrack) {
          await onUpdateTrack(existingTrack.id, {
            ...existingTrack,
            audioUrl: finalAudioUrl,
            blob: uploadedFile || existingTrack.blob || null,
            isYouTube: isYt,
            youtubeId: ytId || null
          });
        }
      }

      playTingSound();
      setRequestActionMsg(`Music attached to "${request.title}" successfully!`);
      setTimeout(() => setRequestActionMsg(''), 4000);
      setOpenAddMusic(prev => ({ ...prev, [request.id]: false }));
    } catch (err) {
      console.error("Error attaching audio to request:", err);
      setRequestItemErrors(prev => ({
        ...prev,
        [request.id]: err.message || 'Failed to attach audio to request.'
      }));
    } finally {
      setAttachingMusicId(null);
    }
  };

  const handleToggleEditRequest = (request) => {
    if (editingRequestId === request.id) {
      setEditingRequestId(null);
      return;
    }
    setEditingRequestId(request.id);
    setEditReqTitle(request.title || '');
    setEditReqArtist(request.artist || '');
    const currentSecs = Array.isArray(request.sections) && request.sections.length > 0 
      ? [...request.sections] 
      : (request.genre ? request.genre.split(',').map(s => s.trim()).filter(Boolean) : []);
    setEditReqSections(currentSecs);
    setEditReqLanguage(request.language || 'English');
  };

  const handleSaveRequestEdit = async (requestId) => {
    if (!editReqTitle.trim()) {
      setRequestItemErrors(prev => ({ ...prev, [requestId]: '⚠️ Song title cannot be empty.' }));
      return;
    }
    setSavingEditReqId(requestId);
    setRequestItemErrors(prev => ({ ...prev, [requestId]: '' }));

    try {
      const updatedFields = {
        title: editReqTitle.trim(),
        artist: editReqArtist.trim() || 'Unknown Artist',
        sections: editReqSections,
        genre: editReqSections.join(', '),
        language: editReqLanguage || 'English'
      };

      // 1. Update in songRequestsDB
      await updateSongRequestDetails(requestId, updatedFields);

      // 2. Update local state
      setSongRequests(prev => prev.map(r => r.id === requestId ? { ...r, ...updatedFields } : r));

      // 3. If published to publicTracks, update the public track
      const currReq = songRequests.find(r => r.id === requestId);
      if (currReq && onUpdateTrack) {
        const liveTrack = publicTracks.find(t => 
          (currReq.publicTrackId && t.id === currReq.publicTrackId) ||
          (t.title?.toLowerCase() === currReq.title?.toLowerCase() && t.artist?.toLowerCase() === currReq.artist?.toLowerCase())
        );

        if (liveTrack) {
          await onUpdateTrack(liveTrack.id, {
            ...liveTrack,
            title: updatedFields.title,
            artist: updatedFields.artist,
            genres: updatedFields.sections,
            genre: updatedFields.sections.join(', '),
            language: updatedFields.language
          });
        }
      }

      playTingSound();
      setRequestActionMsg(`Updated song details for "${editReqTitle.trim()}"!`);
      setTimeout(() => setRequestActionMsg(''), 4000);
      setEditingRequestId(null);
    } catch (err) {
      console.error("Error saving request edits:", err);
      setRequestItemErrors(prev => ({
        ...prev,
        [requestId]: err.message || 'Failed to update song details.'
      }));
    } finally {
      setSavingEditReqId(null);
    }
  };

  const handleApproveRequest = async (request) => {
    setApprovingId(request.id);
    setRequestActionMsg('');
    setRequestItemErrors(prev => ({ ...prev, [request.id]: '' }));

    try {
      const providedUrl = (requestAudioInputs[request.id] !== undefined ? requestAudioInputs[request.id] : (request.audioUrl || '')).trim();
      const uploadedFile = requestAudioFiles[request.id] || null;

      // Validate that at least a YouTube link, streaming audio link, or uploaded audio file exists!
      if (!providedUrl && !uploadedFile) {
        setRequestItemErrors(prev => ({
          ...prev,
          [request.id]: '⚠️ Please provide a YouTube link or upload an audio file below before publishing.'
        }));
        setApprovingId(null);
        return;
      }

      const ytId = extractYouTubeId(providedUrl);
      const isYt = !!ytId;
      const chosenSections = Array.isArray(request.sections) && request.sections.length > 0 
        ? request.sections 
        : (request.genre ? request.genre.split(',').map(s => s.trim()) : ['Lo-Fi']);

      let finalAudioUrl = providedUrl;
      let finalCover = isYt 
        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80';

      if (uploadedFile) {
        finalAudioUrl = URL.createObjectURL(uploadedFile);
      }

      const trackPayload = {
        id: `public-${Date.now()}`,
        title: request.title,
        artist: request.artist || 'Musicly Public',
        genre: chosenSections.join(', '),
        genres: chosenSections,
        language: request.language || 'English',
        duration: 240,
        cover: finalCover,
        audioUrl: finalAudioUrl,
        blob: uploadedFile || null,
        isYouTube: isYt,
        youtubeId: ytId || null,
        isPublic: true,
        requestedBy: request.userName || request.userEmail || null
      };

      await onPublishTrack(trackPayload, uploadedFile || null);
      await updateSongRequestStatus(request.id, 'approved', trackPayload.id);

      setSongRequests(prev => prev.map(r => r.id === request.id ? { ...r, status: 'approved', publicTrackId: trackPayload.id } : r));
      playTingSound();
      setRequestActionMsg(`Approved "${request.title}" and published to Public Library!`);
      setTimeout(() => setRequestActionMsg(''), 4500);
    } catch (err) {
      console.error("Error approving song request:", err);
      setRequestItemErrors(prev => ({
        ...prev,
        [request.id]: err.message || 'Failed to approve and publish track.'
      }));
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await updateSongRequestStatus(requestId, 'rejected');
      setSongRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
      playClickSound();
    } catch (err) {
      console.error("Error rejecting song request:", err);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    try {
      await deleteSongRequest(requestId);
      setSongRequests(prev => prev.filter(r => r.id !== requestId));
      playClickSound();
    } catch (err) {
      console.error("Error deleting song request:", err);
    }
  };

  const handleSaveAdminNote = async (requestId) => {
    setSavingNoteId(requestId);
    const noteContent = adminNotesMap[requestId] !== undefined
      ? adminNotesMap[requestId]
      : (songRequests.find(r => r.id === requestId)?.adminNote || '');

    try {
      await updateSongRequestAdminNote(requestId, noteContent);
      setSongRequests(prev => prev.map(r => r.id === requestId ? { ...r, adminNote: noteContent } : r));
      setSavedNoteSuccessId(requestId);
      playTingSound();
      setTimeout(() => setSavedNoteSuccessId(null), 2500);
    } catch (err) {
      console.error("Error saving admin note:", err);
    } finally {
      setSavingNoteId(null);
    }
  };

  const toggleUploadSection = (sec) => {
    setIsManualSections(true);
    setSelectedSections(prev => 
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    );
  };

  const handleLanguageSelect = (lang) => {
    setIsManualLanguage(true);
    setLanguage(prev => (prev === lang ? null : lang));
  };

  const toggleEditSection = (sec) => {
    setEditSections(prev => 
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    );
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
          setArtist(meta.artist || 'Musicly Public');
          updateSongAuto(meta.title, meta.artist, meta.rawTitle);
        }
      } catch (err) {
        console.warn("YouTube metadata fetch error:", err);
      } finally {
        setIsLoadingYtMeta(false);
      }
    }
  };

  const processFile = (file) => {
    if (!file) return;
    setFileObject(file);
    const { title: parsedTitle, artist: parsedArtist } = parseAudioFilename(file.name);
    setTitle(parsedTitle);
    setArtist(parsedArtist || 'Musicly Artist');
    updateSongAuto(parsedTitle, parsedArtist, file.name);

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

  const resetUploadForm = () => {
    setTitle('');
    setArtist('');
    setAudioUrl('');
    setFileObject(null);
    setSelectedSections([]);
    setLanguage(null);
    setIsManualSections(false);
    setIsManualLanguage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveTab('list');
  };

  const handlePublishSubmit = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadSuccess('');
    setIsSubmitting(true);

    try {
      let rawUrl = audioUrl.trim();
      let finalAudioUrl = fileObject ? URL.createObjectURL(fileObject) : rawUrl;
      const ytId = extractYouTubeId(rawUrl) || extractYouTubeId(finalAudioUrl);
      const isYt = !!ytId;

      if (!fileObject && !rawUrl) {
        throw new Error("Please provide either a streaming/YouTube URL or upload an audio file.");
      }

      const chosenSections = selectedSections.length > 0 ? selectedSections : ['Lo-Fi'];
      const finalTitle = title.trim() || (isYt ? 'Public YouTube Song' : (fileObject ? fileObject.name : 'Public Track'));
      const finalArtist = artist.trim() || 'Musicly Public';

      const trackPayload = {
        id: `public-${Date.now()}`,
        title: finalTitle,
        artist: finalArtist,
        genre: chosenSections.join(', '),
        genres: chosenSections,
        language: language || 'English',
        duration: duration || (isYt ? 240 : 180),
        cover: isYt 
          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
        audioUrl: isYt ? `https://www.youtube.com/watch?v=${ytId}` : finalAudioUrl,
        isYouTube: isYt,
        youtubeId: ytId || null,
        isPublic: true
      };

      await onPublishTrack(trackPayload, fileObject);

      playTingSound();
      setUploadSuccess(`"${finalTitle}" published successfully to Musicly Public Library!`);
      // Reset form
      setTitle('');
      setArtist('');
      setAudioUrl('');
      setFileObject(null);
      setSelectedSections([]);
      setLanguage(null);
      setIsManualSections(false);
      setIsManualLanguage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        setActiveTab('list');
        setUploadSuccess('');
      }, 1500);
    } catch (err) {
      setUploadError(err.message || "Failed to publish public track.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEditTrack = (track) => {
    setEditingTrack(track);
    setEditTitle(track.title || '');
    setEditArtist(track.artist || '');
    setEditSections(Array.isArray(track.genres) && track.genres.length > 0 ? track.genres : [track.genre || 'Lo-Fi']);
    setEditLanguage(track.language || 'English');
    setEditAudioUrl(track.audioUrl || (track.youtubeId ? `https://www.youtube.com/watch?v=${track.youtubeId}` : ''));
    setEditFileObject(null);
    setEditFileError('');
  };

  const handleSaveEdit = async () => {
    if (!editingTrack) return;
    try {
      const chosen = editSections.length > 0 ? editSections : ['Lo-Fi'];
      const rawUrl = (editAudioUrl || '').trim();
      let finalAudioUrl = editingTrack.audioUrl;
      let finalBlob = editingTrack.blob || null;
      let isYt = editingTrack.isYouTube;
      let ytId = editingTrack.youtubeId;
      let finalCover = editingTrack.cover;

      if (editFileObject) {
        finalBlob = editFileObject;
        finalAudioUrl = URL.createObjectURL(editFileObject);
        isYt = false;
        ytId = null;
      } else if (rawUrl && rawUrl !== editingTrack.audioUrl) {
        const extractedId = extractYouTubeId(rawUrl);
        if (extractedId) {
          isYt = true;
          ytId = extractedId;
          finalAudioUrl = `https://www.youtube.com/watch?v=${extractedId}`;
          finalCover = `https://img.youtube.com/vi/${extractedId}/hqdefault.jpg`;
          finalBlob = null;
        } else {
          isYt = false;
          ytId = null;
          finalAudioUrl = rawUrl;
        }
      }

      await onUpdateTrack(editingTrack.id, {
        title: editTitle.trim() || editingTrack.title,
        artist: editArtist.trim() || editingTrack.artist,
        genres: chosen,
        genre: chosen.join(', '),
        language: editLanguage,
        audioUrl: finalAudioUrl,
        blob: finalBlob,
        isYouTube: isYt,
        youtubeId: ytId,
        cover: finalCover
      });
      playTingSound();
      setEditingTrack(null);
    } catch (err) {
      alert(err.message || "Failed to update track");
    }
  };

  const handleDelete = async (trackId, trackTitle) => {
    if (window.confirm(`Are you sure you want to permanently delete "${trackTitle}" from the Musicly Public Library? It will be removed for all users worldwide.`)) {
      try {
        await onDeleteTrack(trackId);
        playClickSound();
      } catch (err) {
        alert(err.message || "Failed to delete track");
      }
    }
  };

  const handleAddSceneSubmit = async (e) => {
    e.preventDefault();
    if (!sceneName.trim()) {
      setSceneError('Please enter a room theme name');
      return;
    }
    if (!sceneImage.trim()) {
      setSceneError('Please enter an image URL or upload an image file');
      return;
    }

    setSceneSubmitting(true);
    setSceneError('');
    setSceneSuccess('');

    try {
      if (onAddScene) {
        await onAddScene({
          name: sceneName.trim(),
          image: sceneImage.trim(),
          desc: sceneDesc.trim() || 'Custom room theme',
          primaryColor: themePalette?.primaryColor || '#3b82f6',
          secondaryColor: themePalette?.secondaryColor || '#60a5fa',
          glowColor: themePalette?.glowColor || 'rgba(59, 130, 246, 0.45)',
          isTheme: true,
          isInteractive: false,
          interactiveHotspots: []
        });
      }
      playTingSound();
      setSceneSuccess(`🎉 Room theme "${sceneName.trim()}" published & added to room scenes!`);
      setSceneName('');
      setSceneImage('');
      setSceneDesc('');
      setThemePalette(null);
    } catch (err) {
      setSceneError(err.message || 'Failed to publish room theme');
    } finally {
      setSceneSubmitting(false);
    }
  };

  const handleSceneFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSceneError('Please select a valid image file (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (loadEvt) => {
      const dataUrl = loadEvt.target.result;
      setSceneImage(dataUrl);
      setSceneError('');
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const titleName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      if (!sceneName) {
        setSceneName(titleName);
      }

      // Automatically extract vibrant theme colors from uploaded image
      try {
        const palette = await extractPaletteFromImage(dataUrl);
        setThemePalette(palette);
      } catch (err) {}
      playTingSound();
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-overlay admin-modal-overlay" onClick={onClose}>
      <div className="glass-modal-panel admin-dashboard-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-modal-header">
          <div className="admin-title-badge-group">
            <div className="admin-shield-icon-wrapper">
              <Crown size={22} className="admin-crown-icon" />
            </div>
            <div>
              <div className="admin-title-row">
                <h3>Musicly Public Library</h3>
                <span className="admin-status-badge">
                  <ShieldCheck size={13} /> {isAdmin ? 'Verified Admin' : 'Admin Portal'}
                </span>
              </div>
              <p className="admin-subtitle">
                Official public songs published here are streamed by all visitors worldwide.
              </p>
            </div>
          </div>
          <button className="glass-close-btn bookmark-close-btn" onClick={onClose} title="Close" aria-label="Close">
            <X size={17} />
          </button>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="admin-nav-tabs">
          <button 
            className={`admin-nav-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <Music size={15} /> Public Directory ({publicTracks.length})
          </button>
          <button 
            className={`admin-nav-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={15} /> Publish New Song
          </button>
          <button 
            className={`admin-nav-btn ${activeTab === 'scenes' ? 'active' : ''}`}
            onClick={() => setActiveTab('scenes')}
          >
            <Sparkles size={15} /> Room Themes ({customScenes.length})
          </button>
          <button 
            className={`admin-nav-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            <Radio size={15} /> Song Requests {pendingRequestsCount > 0 && <span className="admin-requests-badge">{pendingRequestsCount}</span>}
          </button>
          <button 
            className={`admin-nav-btn ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <Star size={15} /> Feedback ({feedbacks.length})
          </button>
          {onOpenAirAiDashboard && (
            <button 
              type="button"
              className="admin-nav-btn air-ai-tab-link"
              onClick={() => {
                onClose();
                onOpenAirAiDashboard();
              }}
              style={{ color: '#38bdf8' }}
              title="Open Musicly Air AI Model Analytics & Metrics"
            >
              <Activity size={15} /> Air AI Model Analytics
            </button>
          )}
        </div>

        {/* TAB 1: Public Directory */}
        {activeTab === 'list' && (
          <div className="admin-tab-content">
            <div className="admin-search-and-stats">
              <div className="admin-search-bar">
                <Search size={15} />
                <input 
                  type="text" 
                  placeholder="Filter public tracks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                className="admin-quick-add-btn"
                onClick={() => setActiveTab('upload')}
              >
                <Plus size={14} /> Add Public Track
              </button>
            </div>

            <div className="admin-tracks-scroll-area">
              {filteredPublicTracks.length === 0 ? (
                <div className="admin-empty-state">
                  <Music size={36} style={{ opacity: 0.4 }} />
                  <p>No public songs found.</p>
                  <button className="admin-publish-action-btn" onClick={() => setActiveTab('upload')}>
                    Publish First Song
                  </button>
                </div>
              ) : (
                <div className="admin-tracks-list">
                  {filteredPublicTracks.map(track => {
                    const isCurrent = currentTrackId === track.id;
                    const isTrackPlaying = isCurrent && isPlaying;
                    return (
                      <div 
                        key={track.id} 
                        className={`admin-track-card ${isCurrent ? 'active' : ''} ${isTrackPlaying ? 'playing' : ''}`}
                        onClick={() => onPlayTrack(track)}
                        title={isTrackPlaying ? `Click anywhere to pause "${track.title}"` : `Click anywhere to play "${track.title}"`}
                      >
                        <div className="admin-track-cover-wrap">
                          <img src={track.cover} alt={track.title} className="admin-track-cover" />
                          <button 
                            type="button"
                            className="admin-track-play-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPlayTrack(track);
                            }}
                            title={isTrackPlaying ? "Pause" : "Play preview"}
                          >
                            {isTrackPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                          </button>
                        </div>

                        <div className="admin-track-info">
                          <div className="admin-track-header-row">
                            <span className="admin-track-title">{track.title}</span>
                            <span className="admin-public-badge">Public</span>
                          </div>
                          <p className="admin-track-artist">{track.artist}</p>
                          <div className="admin-track-meta-chips">
                            <span className="admin-chip genre">{track.genre}</span>
                            <span className="admin-chip lang">{track.language || 'English'}</span>
                            <span className="admin-chip type">
                              {track.isYouTube ? 'YouTube Stream' : 'Direct Audio'}
                            </span>
                          </div>
                        </div>

                        <div className="admin-track-actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            className="admin-action-icon-btn edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditTrack(track);
                            }}
                            title="Edit metadata"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button 
                            type="button"
                            className="admin-action-icon-btn delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(track.id, track.title);
                            }}
                            title="Delete from public library"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Upload / Publish Form */}
        {activeTab === 'upload' && (
          <form className="admin-tab-content admin-upload-form" onSubmit={handlePublishSubmit}>
            {uploadError && (
              <div className="admin-alert error">
                <AlertCircle size={16} /> {uploadError}
              </div>
            )}
            {uploadSuccess && (
              <div className="admin-alert success">
                <Check size={16} /> {uploadSuccess}
              </div>
            )}

            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>Song Title *</label>
                <input 
                  type="text"
                  placeholder="e.g. Midnight Horizon"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>Artist / Publisher Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Musicly Records / Synth Collective"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="admin-form-group">
              <label>YouTube Link or Streaming Audio URL</label>
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
                    pointerEvents: 'none'
                  }}>
                    <RefreshCw size={14} className="spin-icon" />
                    <span>Auto-detecting...</span>
                  </div>
                )}
              </div>
              <span className="admin-form-hint">Paste any YouTube URL or streaming link to stream directly.</span>
            </div>

            <div className="admin-divider-text">
              <span>OR UPLOAD AUDIO FILE</span>
            </div>

            <div 
              className={`admin-file-upload-box ${isDragOver ? 'drag-over' : ''} ${fileObject ? 'file-selected' : ''}`} 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  processFile(e.dataTransfer.files[0]);
                }
              }}
            >
              <FileAudio size={28} />
              <p>
                {fileObject ? fileObject.name : "Click to select or drag MP3, WAV, FLAC, or OGG file"}
              </p>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="audio/*" 
                style={{ display: 'none' }} 
              />
            </div>

            <div className="admin-form-group">
              <label>Genre / Section Categorization (Select all that apply)</label>
              <div className="admin-chips-picker">
                {AVAILABLE_SECTIONS.map(sec => {
                  const isSel = selectedSections.includes(sec);
                  return (
                    <button 
                      key={sec}
                      type="button"
                      className={`admin-picker-chip ${isSel ? 'selected' : ''}`}
                      onClick={() => toggleUploadSection(sec)}
                    >
                      {isSel && <Check size={12} />} {sec}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="admin-form-group">
              <label>Language</label>
              <div className="admin-chips-picker">
                {AVAILABLE_LANGUAGES.map(lang => (
                  <button 
                    key={lang}
                    type="button"
                    className={`admin-picker-chip ${language === lang ? 'selected' : ''}`}
                    onClick={() => handleLanguageSelect(lang)}
                  >
                    {language === lang && <Check size={12} />} {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-form-footer">
              <button 
                type="button" 
                className="admin-cancel-btn" 
                onClick={resetUploadForm}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="admin-publish-action-btn"
                disabled={isSubmitting}
              >
                <Upload size={16} /> {isSubmitting ? 'Publishing...' : 'Publish to Public Library'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: Room Themes & Scenes */}
        {activeTab === 'scenes' && (
          <div className="admin-tab-content admin-scenes-tab">
            <div className="admin-scenes-intro">
              <div className="status-indicator-header">
                <Palette size={24} style={{ color: '#ffd166' }} />
                <div>
                  <h4>Musicly Room Themes & Backdrops</h4>
                  <p>Publish custom visual environments and atmospheres visible to all visitors worldwide</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {onResetWebappTheme && (
                    <button
                      type="button"
                      className="admin-reset-theme-btn"
                      onClick={() => {
                        onResetWebappTheme();
                        playClickSound();
                      }}
                      title="Reset WebApp colors back to default Musicly gold/amber"
                    >
                      <RefreshCw size={12} /> Reset Colors
                    </button>
                  )}
                  <span className="badge-pill granted">
                    {customScenes.length} Custom {customScenes.length === 1 ? 'Theme' : 'Themes'}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-scenes-builder-layout">
              {/* Form to add a new scene */}
              <form className="admin-scene-form-card" onSubmit={handleAddSceneSubmit}>
                <div className="admin-scene-form-header">
                  <h5>Add & Publish Room Theme</h5>
                  <span className="admin-form-hint">Upload any image file or enter an image URL</span>
                </div>

                {sceneError && (
                  <div className="admin-alert error">
                    <AlertCircle size={15} /> {sceneError}
                  </div>
                )}
                {sceneSuccess && (
                  <div className="admin-alert success">
                    <Check size={15} /> {sceneSuccess}
                  </div>
                )}

                {/* Quick Presets */}
                <div className="admin-theme-presets-wrap">
                  <label className="admin-preset-label">1-Click Aesthetic Presets:</label>
                  <div className="admin-presets-row">
                    {PRESET_THEMES.map(pr => (
                      <button
                        key={pr.name}
                        type="button"
                        className="admin-preset-chip"
                        onClick={() => {
                          setSceneName(pr.name);
                          setSceneImage(pr.image);
                          setSceneDesc(pr.desc);
                          setSceneError('');
                          extractPaletteFromImage(pr.image).then(pal => setThemePalette(pal)).catch(() => {});
                        }}
                        title={`Load "${pr.name}"`}
                      >
                        {pr.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Theme Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Spider-Man City Lights"
                    value={sceneName}
                    onChange={(e) => setSceneName(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Upload Image File or Enter URL *</label>
                  <div className="admin-input-file-combo">
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/... or direct image link"
                      value={sceneImage.startsWith('data:') ? '[Uploaded Custom Image File]' : sceneImage}
                      onChange={(e) => {
                        const url = e.target.value;
                        setSceneImage(url);
                        if (url && url.startsWith('http')) {
                          extractPaletteFromImage(url).then(pal => setThemePalette(pal)).catch(() => {});
                        }
                      }}
                    />
                    <input
                      type="file"
                      ref={sceneFileInputRef}
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleSceneFileUpload}
                    />
                    <button
                      type="button"
                      className="admin-secondary-file-btn"
                      onClick={() => sceneFileInputRef.current?.click()}
                      title="Upload local JPG / PNG / WebP image"
                    >
                      <Upload size={14} /> Upload Image
                    </button>
                  </div>
                </div>

                {/* Extracted Theme Colors */}
                {themePalette && (
                  <div className="admin-form-group">
                    <label>Auto-Extracted Theme Colors</label>
                    <div className="ai-palette-preview" style={{ marginTop: '4px' }}>
                      <span className="palette-label">Palette:</span>
                      <span className="color-swatch" style={{ background: themePalette.primaryColor }} title={`Primary Accent: ${themePalette.primaryColor}`} />
                      <span className="color-swatch" style={{ background: themePalette.secondaryColor }} title={`Secondary Accent: ${themePalette.secondaryColor}`} />
                      <span className="color-swatch" style={{ background: themePalette.glowColor }} title="Ambient Glow" />
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: '6px' }}>Matches your image</span>
                    </div>
                  </div>
                )}

                <div className="admin-form-group">
                  <label>Atmosphere & Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Neon city skyline, quiet night & deep ambient vibes"
                    value={sceneDesc}
                    onChange={(e) => setSceneDesc(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="admin-publish-action-btn"
                  disabled={sceneSubmitting}
                >
                  <Sparkles size={16} /> {sceneSubmitting ? 'Publishing Theme...' : 'Publish Room Theme'}
                </button>
              </form>

              {/* Live Card Preview */}
              <div className="admin-scene-preview-box">
                <label className="admin-preview-label">Live Theme Preview</label>
                <div className="scene-card admin-live-preview-card">
                  <div className="scene-thumb-wrapper">
                    <img
                      src={sceneImage || '/assets/images/cozy_bedroom.jpg'}
                      alt="Theme Preview"
                      className="scene-thumb-img"
                      onError={(e) => { e.target.src = '/assets/images/cozy_bedroom.jpg'; }}
                    />
                    <div className="scene-preview-live-tag">
                      <Sparkles size={11} /> Preview
                    </div>
                  </div>
                  <div className="scene-card-info">
                    <h5>{sceneName || 'Custom Atmosphere'}</h5>
                    <p>{sceneDesc || 'Uploaded room background theme'}</p>
                  </div>

                  {sceneImage && (
                    <div className="admin-preview-action-row" style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {onApplyWebappTheme && (
                        <button
                          type="button"
                          className="ai-btn-apply-webapp"
                          onClick={() => {
                            const pal = themePalette || { primaryColor: '#3b82f6', secondaryColor: '#60a5fa', glowColor: 'rgba(59, 130, 246, 0.45)' };
                            onApplyWebappTheme(pal);
                            if (onSelectScene) {
                              onSelectScene({
                                id: 'custom_preview',
                                name: sceneName || 'Custom Theme',
                                image: sceneImage,
                                desc: sceneDesc,
                                primaryColor: pal.primaryColor,
                                secondaryColor: pal.secondaryColor,
                                glowColor: pal.glowColor,
                                isTheme: true
                              });
                            }
                            playTingSound();
                            setSceneSuccess('✨ Applied theme to the whole webapp!');
                          }}
                        >
                          <Palette size={14} /> Apply to WebApp
                        </button>
                      )}
                      {onSelectScene && (
                        <button
                          type="button"
                          className="ai-btn-apply-bg"
                          onClick={() => {
                            const pal = themePalette || { primaryColor: '#3b82f6', secondaryColor: '#60a5fa', glowColor: 'rgba(59, 130, 246, 0.45)' };
                            onSelectScene({
                              id: 'custom_preview',
                              name: sceneName || 'Custom Theme',
                              image: sceneImage,
                              desc: sceneDesc,
                              primaryColor: pal.primaryColor,
                              secondaryColor: pal.secondaryColor,
                              glowColor: pal.glowColor,
                              isTheme: true
                            });
                            playClickSound();
                            setSceneSuccess('🖼️ Set as active background scene!');
                          }}
                        >
                          <ImageIcon size={14} /> Set as Background
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Scenes List */}
            <div className="admin-custom-scenes-directory">
              <div className="admin-scenes-dir-header">
                <h5>Published Custom Themes ({customScenes.length})</h5>
                <span className="admin-scenes-dir-sub">All visitors can select these backdrops from Room Themes</span>
              </div>

              {customScenes.length === 0 ? (
                <div className="admin-empty-scenes-notice">
                  <Palette size={32} style={{ opacity: 0.35 }} />
                  <p>No custom room themes published yet. Use the form above to publish your first aesthetic backdrop!</p>
                </div>
              ) : (
                <div className="admin-scenes-cards-list">
                  {customScenes.map((sc) => (
                    <div key={sc.id} className="admin-scene-item-row">
                      <img src={sc.image} alt={sc.name} className="admin-scene-item-thumb" />
                      <div className="admin-scene-item-text">
                        <h6>{sc.name}</h6>
                        <p>{sc.desc}</p>
                      </div>
                      <div className="admin-scene-item-actions">
                        {onSelectScene && (
                          <button
                            type="button"
                            className="admin-scene-apply-btn"
                            onClick={() => {
                              onSelectScene(sc);
                              playClickSound();
                            }}
                            title="Set as your active background"
                          >
                            Apply Now
                          </button>
                        )}
                        {onDeleteScene && (
                          <button
                            type="button"
                            className="admin-action-icon-btn delete"
                            onClick={() => {
                              if (window.confirm(`Delete room theme "${sc.name}"? It will be removed for all users.`)) {
                                onDeleteScene(sc.id);
                                playClickSound();
                              }
                            }}
                            title="Delete theme"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: Song Requests & Approvals */}
        {activeTab === 'requests' && (
          <div className="admin-tab-content admin-requests-tab">
            <div className="admin-requests-header">
              <div className="admin-search-bar" style={{ maxWidth: '380px' }}>
                <Search size={15} />
                <input 
                  type="text" 
                  placeholder="Filter requests by title, artist, user..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                />
              </div>

              <div className="admin-request-filter-pills">
                <button
                  type="button"
                  className={`admin-filter-pill filter-all ${requestFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setRequestFilter('all')}
                >
                  All ({songRequests.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill filter-pending ${requestFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setRequestFilter('pending')}
                >
                  Pending ({pendingRequestsCount})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill filter-approved ${requestFilter === 'approved' ? 'active' : ''}`}
                  onClick={() => setRequestFilter('approved')}
                >
                  Approved ({songRequests.filter(r => r.status === 'approved').length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill filter-rejected ${requestFilter === 'rejected' ? 'active' : ''}`}
                  onClick={() => setRequestFilter('rejected')}
                >
                  Rejected ({songRequests.filter(r => r.status === 'rejected').length})
                </button>
              </div>
            </div>

            {requestActionMsg && (
              <div className="admin-request-action-banner">
                <Check size={16} />
                <span>{requestActionMsg}</span>
              </div>
            )}

            {filteredRequests.length === 0 ? (
              <div className="admin-empty-state">
                <Radio size={36} style={{ opacity: 0.4 }} />
                <p>
                  {requestFilter === 'pending'
                    ? 'No pending song requests right now! All caught up.'
                    : 'No song requests found matching your filter.'}
                </p>
              </div>
            ) : (
              <div className="admin-requests-list">
                {filteredRequests.map(req => {
                  const isApproved = req.status === 'approved';
                  const isRejected = req.status === 'rejected';
                  const isPending = req.status === 'pending';

                  return (
                    <div key={req.id} className={`admin-request-card status-${req.status}`}>
                      {/* Card Header: Requested Song, Expand Button & Status */}
                      <div className="admin-request-card-header">
                        <div className="admin-request-main-info">
                          <div className="admin-request-icon-wrap">
                            <Music size={18} />
                          </div>
                          <div className="admin-request-header-content">
                            <div className="admin-requester-header-lead">
                              <span className="admin-requester-prominent-name" title={`Requested by: ${req.userName || 'Musicly Listener'}`}>
                                {req.userName || 'Musicly Listener'}
                              </span>
                            </div>
                            <div className="admin-request-title-row">
                              <h5 className="admin-request-title">{req.title}</h5>
                              <button
                                type="button"
                                className={`admin-request-inline-pencil-btn ${editingRequestId === req.id ? 'active' : ''}`}
                                onClick={() => handleToggleEditRequest(req)}
                                title="Directly change song title, artist, or sections"
                              >
                                <Edit3 size={13} />
                              </button>
                            </div>
                            <p className="admin-request-artist">by {req.artist || 'Unknown Artist'}</p>
                          </div>
                        </div>

                        <div className="admin-request-header-right">
                          <button
                            type="button"
                            className={`admin-requester-expand-btn ${expandedRequesters[req.id] ? 'expanded' : ''}`}
                            onClick={() => toggleRequesterExpand(req.id)}
                            title={expandedRequesters[req.id] ? "Hide requester details" : "Click to view requester details"}
                          >
                            <User size={13} />
                            <span className="admin-requester-name-text">Requester Details</span>
                            <span className="admin-requester-info-badge">
                              {expandedRequesters[req.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </span>
                          </button>

                          <span className={`admin-request-status-pill status-${req.status}`}>
                            {isApproved && <><Check size={12} /> Status: Approved</>}
                            {isPending && <><Clock size={12} /> Status: Pending</>}
                            {isRejected && <><X size={12} /> Status: Rejected</>}
                          </span>
                        </div>
                      </div>

                      {/* Requester Details (Collapsible when expand icon is clicked) */}
                      {expandedRequesters[req.id] && (
                        <div className="admin-request-expanded-wrap">
                          <div className="admin-request-details-grid">
                            {/* 1. Requester Name & Email */}
                            <div className="admin-request-grid-item">
                              <div className="admin-grid-label">
                                <User size={13} />
                                <span>Requester:</span>
                              </div>
                              <div className="admin-grid-val">
                                <strong>{req.userName || 'Musicly Listener'}</strong>
                                {req.userEmail ? (
                                  <span className="admin-request-email">({req.userEmail})</span>
                                ) : (
                                  <span className="admin-request-guest-tag">(Guest Listener)</span>
                                )}
                              </div>
                            </div>

                            {/* 2. Date & Time */}
                            <div className="admin-request-grid-item">
                              <div className="admin-grid-label">
                                <Calendar size={13} />
                                <span>Date & Time:</span>
                              </div>
                              <div className="admin-grid-val admin-datetime-text">
                                {req.createdAt ? (
                                  <>
                                    <span>{new Date(req.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                    <span className="admin-time-sub"> at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </>
                                ) : (
                                  <span>Unknown time</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Requester's Dedication / Note */}
                          {req.note && (
                            <div className="admin-request-note-box">
                              <MessageSquare size={13} />
                              <p><strong>Requester Note:</strong> "{req.note}"</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Genre / Mood & Language Tags */}
                      <div className="admin-request-tags-row">
                        <span className="admin-grid-label"><Layers size={12} /> Section:</span>
                        <div className="admin-request-tags">
                          {req.sections && req.sections.map(s => (
                            <span key={s} className="admin-tag-pill genre-tag">{s}</span>
                          ))}
                          {req.language && (
                            <span className="admin-tag-pill lang-tag">{req.language}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className={`admin-edit-sections-inline-btn ${editingRequestId === req.id ? 'active' : ''}`}
                          onClick={() => handleToggleEditRequest(req)}
                          title="Directly change sections or genre tags"
                        >
                          <Edit3 size={11} />
                          <span>Edit</span>
                        </button>
                      </div>

                      {/* Inline Request Editor (Title, Artist, Sections) */}
                      {editingRequestId === req.id && (
                        <div className="admin-request-inline-editor-card">
                          <div className="admin-inline-editor-top">
                            <div className="admin-inline-editor-title">
                              <Edit3 size={13} />
                              <span>Edit Song & Sections</span>
                            </div>
                            <button
                              type="button"
                              className="admin-inline-editor-close-btn"
                              onClick={() => setEditingRequestId(null)}
                              title="Close editor"
                            >
                              <X size={13} />
                            </button>
                          </div>

                          <div className="admin-inline-editor-inputs-grid">
                            <div className="admin-inline-editor-field">
                              <label>Song Title</label>
                              <input
                                type="text"
                                className="admin-inline-editor-input"
                                value={editReqTitle}
                                onChange={(e) => setEditReqTitle(e.target.value)}
                                placeholder="Enter song title..."
                                autoFocus
                              />
                            </div>
                            <div className="admin-inline-editor-field">
                              <label>Artist Name</label>
                              <input
                                type="text"
                                className="admin-inline-editor-input"
                                value={editReqArtist}
                                onChange={(e) => setEditReqArtist(e.target.value)}
                                placeholder="Enter artist name..."
                              />
                            </div>
                          </div>

                          <div className="admin-inline-editor-sections-wrap">
                            <label className="admin-inline-editor-label">
                              <Layers size={12} /> Song Sections / Genres (Click to toggle):
                            </label>
                            <div className="admin-inline-editor-section-chips">
                              {AVAILABLE_SECTIONS.map(sec => {
                                const isSelected = editReqSections.includes(sec);
                                return (
                                  <button
                                    key={sec}
                                    type="button"
                                    className={`admin-editor-chip ${isSelected ? 'selected' : ''}`}
                                    onClick={() => {
                                      setEditReqSections(prev =>
                                        prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
                                      );
                                    }}
                                  >
                                    {isSelected && <Check size={11} />}
                                    <span>{sec}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="admin-inline-editor-actions">
                            <button
                              type="button"
                              className="admin-save-editor-btn"
                              onClick={() => handleSaveRequestEdit(req.id)}
                              disabled={savingEditReqId === req.id}
                            >
                              <Check size={13} />
                              <span>{savingEditReqId === req.id ? 'Saving Changes...' : 'Save Changes'}</span>
                            </button>
                            <button
                              type="button"
                              className="admin-cancel-editor-btn"
                              onClick={() => setEditingRequestId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Space to upload song by YouTube URL / File Upload */}
                      {(openAddMusic[req.id] || isPending) && (
                        <div className="admin-request-audio-source-card">
                          <div className="admin-audio-source-header">
                            <div className="admin-audio-source-title">
                              <FileAudio size={14} />
                              <span>Audio Source for Public Library:</span>
                            </div>
                            <span className="admin-audio-source-hint">
                              {requestAudioFiles[req.id] 
                                ? `Selected: ${requestAudioFiles[req.id].name}` 
                                : ((requestAudioInputs[req.id] !== undefined ? requestAudioInputs[req.id] : req.audioUrl) 
                                    ? 'Stream link ready' 
                                    : 'Provide YouTube URL or upload audio file')}
                            </span>
                          </div>

                          <div className="admin-audio-source-controls">
                            {/* YouTube URL input */}
                            <div className="admin-audio-input-field-wrap">
                              <Link size={13} className="admin-link-icon" />
                              <input
                                type="text"
                                className="admin-audio-source-input"
                                placeholder="Paste YouTube link (https://youtube.com/watch?v=...) or audio URL"
                                value={requestAudioInputs[req.id] !== undefined ? requestAudioInputs[req.id] : (req.audioUrl || '')}
                                onChange={(e) => handleAudioUrlInputChange(req.id, e.target.value)}
                                disabled={!!requestAudioFiles[req.id]}
                              />
                              {(requestAudioInputs[req.id] || req.audioUrl) && (
                                <a
                                  href={requestAudioInputs[req.id] || req.audioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-audio-preview-external"
                                  title="Test audio link in new tab"
                                >
                                  <ExternalLink size={13} />
                                </a>
                              )}
                            </div>

                            <span className="admin-audio-source-or">or</span>

                            {/* File Upload Button */}
                            <div className="admin-audio-file-upload-wrap">
                              <input
                                type="file"
                                id={`request-file-${req.id}`}
                                accept="audio/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleRequestFileUpload(req.id, e)}
                              />
                              <button
                                type="button"
                                className={`admin-audio-pick-file-btn ${requestAudioFiles[req.id] ? 'has-file' : ''}`}
                                onClick={() => document.getElementById(`request-file-${req.id}`)?.click()}
                                title="Upload MP3 / WAV audio file from device"
                              >
                                <Upload size={13} />
                                <span>{requestAudioFiles[req.id] ? requestAudioFiles[req.id].name : 'Upload Audio File'}</span>
                              </button>
                              {requestAudioFiles[req.id] && (
                                <button
                                  type="button"
                                  className="admin-clear-file-btn"
                                  onClick={() => handleClearRequestFile(req.id)}
                                  title="Remove uploaded file"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="admin-audio-source-save-row">
                            <button
                              type="button"
                              className="admin-attach-audio-action-btn"
                              onClick={() => handleSaveAttachedAudio(req)}
                              disabled={attachingMusicId === req.id}
                              title="Save audio to this request"
                            >
                              <Check size={13} />
                              <span>
                                {attachingMusicId === req.id 
                                  ? 'Attaching...' 
                                  : (isApproved ? 'Attach & Update Public Track' : 'Attach & Save Audio')}
                              </span>
                            </button>
                            {openAddMusic[req.id] && (
                              <button
                                type="button"
                                className="admin-cancel-add-music-btn"
                                onClick={() => toggleAddMusic(req.id)}
                              >
                                Cancel
                              </button>
                            )}
                          </div>

                          {requestItemErrors[req.id] && (
                            <div className="admin-request-item-error">
                              <AlertCircle size={13} />
                              <span>{requestItemErrors[req.id]}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin Notes Section */}
                      <div className="admin-request-admin-notes-card">
                        <div className="admin-notes-top-bar">
                          <div className="admin-notes-title">
                            <FileText size={13} />
                            <span>Admin Notes:</span>
                          </div>
                          {savedNoteSuccessId === req.id && (
                            <span className="admin-note-saved-pill">
                              <Check size={11} /> Saved
                            </span>
                          )}
                        </div>
                        <div className="admin-notes-input-row">
                          <input
                            type="text"
                            className="admin-notes-field"
                            placeholder="Add admin notes (e.g. approved for midnight lofi, audio verified)..."
                            value={adminNotesMap[req.id] !== undefined ? adminNotesMap[req.id] : (req.adminNote || '')}
                            onChange={(e) => setAdminNotesMap(prev => ({ ...prev, [req.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveAdminNote(req.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="admin-save-note-action-btn"
                            onClick={() => handleSaveAdminNote(req.id)}
                            disabled={savingNoteId === req.id}
                            title="Save note to database"
                          >
                            {savingNoteId === req.id ? 'Saving...' : 'Save Note'}
                          </button>
                        </div>
                      </div>

                      {/* URL & Actions */}
                      <div className="admin-request-actions-row">
                        <div className="admin-request-stream-info">
                          {(requestAudioInputs[req.id] || req.audioUrl || requestAudioFiles[req.id]) ? (
                            <div className="admin-audio-ready-flex">
                              {requestAudioFiles[req.id] ? (
                                <span className="admin-ready-file-tag" title={requestAudioFiles[req.id].name}>
                                  <FileAudio size={13} /> {requestAudioFiles[req.id].name}
                                </span>
                              ) : (
                                <a
                                  href={requestAudioInputs[req.id] || req.audioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="admin-request-stream-link"
                                >
                                  <ExternalLink size={13} />
                                  <span>Preview Stream Link</span>
                                </a>
                              )}
                              <button
                                type="button"
                                className="admin-inline-add-music-btn edit-mode"
                                onClick={() => toggleAddMusic(req.id)}
                                title="Change or update audio"
                              >
                                <Music size={12} />
                                <span>{openAddMusic[req.id] ? 'Hide' : 'Change Audio'}</span>
                              </button>
                            </div>
                          ) : (
                            <div className="admin-no-audio-flex">
                              <span className="admin-request-no-url">No audio link provided yet</span>
                              <button
                                type="button"
                                className={`admin-inline-add-music-btn ${openAddMusic[req.id] ? 'active' : ''}`}
                                onClick={() => toggleAddMusic(req.id)}
                                title="Upload or paste audio URL for this request"
                              >
                                <Plus size={13} />
                                <span>{openAddMusic[req.id] ? 'Close' : 'Add Music'}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="admin-request-btns-group">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                className="admin-request-approve-btn"
                                onClick={() => handleApproveRequest(req)}
                                disabled={approvingId === req.id}
                              >
                                <Check size={14} />
                                <span>{approvingId === req.id ? 'Publishing...' : 'Approve & Publish to Public'}</span>
                              </button>
                              <button
                                type="button"
                                className="admin-request-reject-btn"
                                onClick={() => handleRejectRequest(req.id)}
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {isRejected && (
                            <button
                              type="button"
                              className="admin-request-approve-btn"
                              onClick={() => handleApproveRequest(req)}
                              disabled={approvingId === req.id}
                            >
                              <Check size={14} />
                              <span>Re-Approve & Publish</span>
                            </button>
                          )}
                          {isApproved && (
                            <span className="admin-request-approved-label">
                              <Check size={14} /> Live in Public Library
                            </span>
                          )}
                          <button
                            type="button"
                            className="admin-action-icon-btn delete"
                            onClick={() => {
                              if (window.confirm(`Delete request for "${req.title}"?`)) {
                                handleDeleteRequest(req.id);
                              }
                            }}
                            title="Delete Request Record"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Feedback & Listener Reviews */}
        {activeTab === 'feedback' && (
          <div className="admin-tab-content admin-feedback-tab">
            {/* Header & Score Metrics */}
            <div className="admin-feedback-summary-banner">
              <div className="admin-feedback-score-card">
                <div className="admin-feedback-score-val">
                  <Star size={24} className="score-star-icon" fill="#ffb703" color="#ffb703" />
                  <span>{averageRating}</span>
                </div>
                <div className="admin-feedback-score-meta">
                  <h6>Average Listener Score</h6>
                  <span>from {feedbacks.length} total rating{feedbacks.length === 1 ? '' : 's'}</span>
                </div>
              </div>

              <div className="admin-feedback-stat-pills">
                <div className="admin-stat-badge">
                  <span className="stat-num">{feedbacks.filter(f => Number(f.rating) === 5).length}</span>
                  <span className="stat-lbl">★ 5 Stars</span>
                </div>
                <div className="admin-stat-badge">
                  <span className="stat-num">{feedbacks.filter(f => Number(f.rating) === 4).length}</span>
                  <span className="stat-lbl">★ 4 Stars</span>
                </div>
                <div className="admin-stat-badge">
                  <span className="stat-num">{feedbacksWithCommentsCount}</span>
                  <span className="stat-lbl">With Comments</span>
                </div>
              </div>

              <button
                type="button"
                className="admin-refresh-requests-btn"
                onClick={() => {
                  fetchFeedbacks();
                  playClickSound();
                }}
                disabled={loadingFeedbacks}
                title="Refresh user feedback from database"
              >
                <RefreshCw size={14} className={loadingFeedbacks ? 'spinning' : ''} />
                <span>{loadingFeedbacks ? 'Syncing...' : 'Refresh'}</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="admin-requests-header" style={{ marginTop: '16px' }}>
              <div className="admin-search-bar" style={{ maxWidth: '380px' }}>
                <Search size={15} />
                <input 
                  type="text" 
                  placeholder="Filter by user name, gmail, or review..."
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                />
              </div>

              <div className="admin-request-filter-pills">
                <button
                  type="button"
                  className={`admin-filter-pill filter-all ${feedbackRatingFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setFeedbackRatingFilter('all')}
                >
                  All ({feedbacks.length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill filter-approved ${feedbackRatingFilter === '5' ? 'active' : ''}`}
                  onClick={() => setFeedbackRatingFilter('5')}
                >
                  ★ 5 Stars ({feedbacks.filter(f => Number(f.rating) === 5).length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill filter-pending ${feedbackRatingFilter === '4' ? 'active' : ''}`}
                  onClick={() => setFeedbackRatingFilter('4')}
                >
                  ★ 4 Stars ({feedbacks.filter(f => Number(f.rating) === 4).length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill filter-rejected ${feedbackRatingFilter === '1-3' ? 'active' : ''}`}
                  onClick={() => setFeedbackRatingFilter('1-3')}
                >
                  ★ 1-3 Stars ({feedbacks.filter(f => Number(f.rating) <= 3).length})
                </button>
                <button
                  type="button"
                  className={`admin-filter-pill ${feedbackRatingFilter === 'has_comments' ? 'active' : ''}`}
                  onClick={() => setFeedbackRatingFilter('has_comments')}
                >
                  Written Suggestions ({feedbacksWithCommentsCount})
                </button>
              </div>
            </div>

            {/* Notification message */}
            {feedbackActionMsg && (
              <div className="admin-alert success" style={{ margin: '14px 0 6px' }}>
                <Check size={14} /> {feedbackActionMsg}
              </div>
            )}

            {/* Feedback Cards List */}
            {filteredFeedbacks.length === 0 ? (
              <div className="admin-empty-scenes-notice" style={{ marginTop: '24px' }}>
                <Star size={36} style={{ opacity: 0.35, color: '#ffb703' }} />
                <p>
                  {feedbacks.length === 0 
                    ? "No user reviews submitted yet. When listeners submit ratings or suggestions, they will be listed here."
                    : "No feedback reviews match your search or filter."}
                </p>
              </div>
            ) : (
              <div className="admin-feedback-cards-grid">
                {filteredFeedbacks.map((item) => {
                  const ratingVal = Number(item.rating) || 5;
                  const formattedDate = item.createdAt 
                    ? new Date(item.createdAt).toLocaleString([], { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : 'Recent';

                  const ratingLabel = 
                    ratingVal === 5 ? 'Euphoric & Chill ✨' :
                    ratingVal === 4 ? 'Calm & Cozy ☕' :
                    ratingVal === 3 ? 'Gentle / Neutral 🌿' :
                    ratingVal === 2 ? 'Needs Better Flow 🌧️' : 'Distracting / Off-Key ⚡';

                  return (
                    <div key={item.id} className="admin-feedback-card">
                      {/* Top Bar: Stars + Rating Label + Date + Delete */}
                      <div className="admin-fb-card-top">
                        <div className="admin-fb-stars-rating-badge">
                          <div className="admin-fb-stars-row">
                            {[1, 2, 3, 4, 5].map((starNum) => (
                              <Star 
                                key={starNum} 
                                size={14} 
                                fill={starNum <= ratingVal ? '#ffb703' : 'transparent'} 
                                color={starNum <= ratingVal ? '#ffb703' : 'rgba(255, 255, 255, 0.22)'} 
                              />
                            ))}
                          </div>
                          <span className="admin-fb-rating-digit">{ratingVal}.0 / 5.0</span>
                          <span className="admin-fb-mood-tag">{ratingLabel}</span>
                        </div>

                        <div className="admin-fb-card-top-right">
                          <span className="admin-fb-date">
                            <Clock size={12} /> {formattedDate}
                          </span>
                        </div>
                      </div>

                      {/* User Info Line: Name + Gmail + Status + Delete on the right */}
                      <div className="admin-fb-user-row">
                        <div className="admin-fb-user-avatar">
                          {(item.userName || 'U')[0].toUpperCase()}
                        </div>
                        <div className="admin-fb-user-details">
                          <div className="admin-fb-user-name-line">
                            <span className="admin-fb-user-name">{item.userName || 'Anonymous Listener'}</span>
                            {item.isAnonymous ? (
                              <span className="admin-fb-guest-badge">Guest</span>
                            ) : (
                              <span className="admin-fb-member-badge">
                                <ShieldCheck size={11} /> Member
                              </span>
                            )}
                          </div>
                          <div className="admin-fb-user-email">
                            <Mail size={12} />
                            <span>{item.userEmail || 'No Gmail / email provided'}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="admin-action-icon-btn delete admin-fb-user-delete-btn"
                          onClick={() => handleDeleteFeedback(item.id, item.userName)}
                          disabled={deletingFeedbackId === item.id}
                          title="Delete this feedback record"
                          aria-label="Delete feedback record"
                          style={{ marginLeft: 'auto', flexShrink: 0 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Written Suggestions / Feedback Text (if written) */}
                      {item.comments && item.comments.trim().length > 0 ? (
                        <div className="admin-fb-comment-bubble">
                          <div className="admin-fb-comment-header">
                            <MessageSquare size={13} className="admin-fb-quote-icon" />
                            <span>Listener Feedback & Feature Suggestions:</span>
                          </div>
                          <p className="admin-fb-comment-text">{item.comments}</p>
                        </div>
                      ) : (
                        <div className="admin-fb-no-comment-pill">
                          <span>Rating submitted without written comment</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* INLINE EDIT MODAL OVERLAY */}
        {editingTrack && (
          <div className="admin-submodal-overlay" onClick={() => setEditingTrack(null)}>
            <div className="admin-submodal-panel" onClick={(e) => e.stopPropagation()}>
              <div className="submodal-header">
                <h4>Edit Public Track</h4>
                <button className="glass-close-btn bookmark-close-btn" onClick={() => setEditingTrack(null)} title="Close" aria-label="Close">
                  <X size={15} />
                </button>
              </div>
              <div className="submodal-body">
                <div className="admin-form-group">
                  <label>Title</label>
                  <input 
                    type="text" 
                    value={editTitle} 
                    onChange={(e) => setEditTitle(e.target.value)} 
                  />
                </div>
                <div className="admin-form-group">
                  <label>Artist</label>
                  <input 
                    type="text" 
                    value={editArtist} 
                    onChange={(e) => setEditArtist(e.target.value)} 
                  />
                </div>
                <div className="admin-form-group">
                  <label>Sections / Moods</label>
                  <div className="admin-chips-picker">
                    {AVAILABLE_SECTIONS.map(sec => {
                      const isSel = editSections.includes(sec);
                      return (
                        <button 
                          key={sec}
                          type="button"
                          className={`admin-picker-chip ${isSel ? 'selected' : ''}`}
                          onClick={() => toggleEditSection(sec)}
                        >
                          {isSel && <Check size={12} />} {sec}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Language</label>
                  <div className="admin-chips-picker">
                    {AVAILABLE_LANGUAGES.map(lang => (
                      <button 
                        key={lang}
                        type="button"
                        className={`admin-picker-chip ${editLanguage === lang ? 'selected' : ''}`}
                        onClick={() => setEditLanguage(lang)}
                      >
                        {editLanguage === lang && <Check size={12} />} {lang}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>
                    <FileAudio size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    Audio Source (YouTube URL or Upload Audio File)
                  </label>
                  <div className="admin-input-file-combo">
                    <input 
                      type="text" 
                      placeholder="https://www.youtube.com/watch?v=... or direct audio link"
                      value={editFileObject ? `[New Audio File: ${editFileObject.name}]` : editAudioUrl} 
                      onChange={(e) => {
                        setEditAudioUrl(e.target.value);
                        setEditFileObject(null);
                        setEditFileError('');
                      }}
                      disabled={!!editFileObject}
                    />
                    <input 
                      type="file" 
                      ref={editFileInputRef}
                      accept="audio/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (!file.type.startsWith('audio/')) {
                            setEditFileError('Please select a valid audio file (MP3, WAV, M4A, OGG)');
                            return;
                          }
                          setEditFileObject(file);
                          setEditFileError('');
                          playTingSound();
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className={`admin-secondary-file-btn ${editFileObject ? 'has-file' : ''}`}
                      onClick={() => editFileInputRef.current?.click()}
                      title="Upload local MP3/WAV file from your computer"
                    >
                      <Upload size={14} /> {editFileObject ? 'Change File' : 'Upload File'}
                    </button>
                  </div>

                  {editFileObject && (
                    <div className="admin-edit-file-info">
                      <span className="admin-file-badge">
                        <FileAudio size={12} /> {editFileObject.name} ({(editFileObject.size / (1024 * 1024)).toFixed(1)} MB)
                      </span>
                      <button 
                        type="button" 
                        className="admin-clear-edit-file"
                        onClick={() => {
                          setEditFileObject(null);
                          if (editFileInputRef.current) editFileInputRef.current.value = '';
                        }}
                        title="Remove file and use URL instead"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}

                  {editFileError && (
                    <div className="admin-alert error" style={{ marginTop: '6px' }}>
                      <AlertCircle size={13} /> {editFileError}
                    </div>
                  )}
                  <span className="admin-form-hint">
                    Enter a new YouTube/audio URL or upload an audio file to replace this track's stream.
                  </span>
                </div>
              </div>
              <div className="submodal-footer">
                <button className="admin-cancel-btn" onClick={() => setEditingTrack(null)}>Cancel</button>
                <button className="admin-publish-action-btn" onClick={handleSaveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
