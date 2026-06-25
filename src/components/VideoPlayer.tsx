import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Play,
  Pause,
  ThumbsUp,
  Bookmark,
  Share2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
  Sun,
  Settings,
  Lock,
  Unlock,
  Plus,
  Star,
  CheckCircle,
  X,
  FileCheck2,
  MessageSquare,
  Sparkles,
  Info,
  RotateCcw,
  RotateCw,
  Tv,
  MoreVertical
} from 'lucide-react';
import { Lecture, Review } from '../types';
import { getLectureThumbnail } from '../services/thumbnailHelper';
import YoutubeThumbnailImg from './YoutubeThumbnailImg';
import { SafeImage } from './SafeImage';
import {
  toggleWatchLater,
  toggleLikeVideo,
  trackWatchProgress,
  fetchWatchLaterIds,
  fetchLikedLecturesIds,
  submitReview,
  fetchReviews
} from '../services/dbService';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface VideoPlayerProps {
  lecture: Lecture;
  onClose?: () => void;
  playlistLectures?: Lecture[];
  onSelectLecture?: (lec: Lecture) => void;
}

const getYoutubeId = (url?: string): string => {
  if (!url) return 'nLE7_YBFQNQ';
  const embedMatch = url.match(/embed\/([^?]+)/);
  if (embedMatch && embedMatch[1] && embedMatch[1].length === 11) {
    return embedMatch[1];
  }
  const watchMatch = url.match(/v=([^&]+)/);
  if (watchMatch && watchMatch[1] && watchMatch[1].length === 11) {
    return watchMatch[1];
  }
  return 'nLE7_YBFQNQ'; // Default fallback
};

export default function VideoPlayer({
  lecture,
  onClose,
  playlistLectures = [],
  onSelectLecture
}: VideoPlayerProps) {
  const { user, isGuest, updatePreferences } = useAuth();

  // Playback states synchronized with YT IFrame Player API
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [totalDurationSec, setTotalDurationSec] = useState(1);
  const [progressPercent, setProgressPercent] = useState(0);
  
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [quality, setQuality] = useState<string>('1080p');
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Gestural / sliders values
  const [brightness, setBrightness] = useState<number>(100);
  const [volume, setVolume] = useState<number>(85);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showSeekOverlay, setShowSeekOverlay] = useState<'forward' | 'backward' | null>(null);
  
  // Custom HUD overlays
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [activePopupSection, setActivePopupSection] = useState<'main' | 'speed' | 'quality'>('main');
  const [showReportToast, setShowReportToast] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showFullScreenReviews, setShowFullScreenReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [autoQuality, setAutoQuality] = useState(true);

  // Transient Play/Pause indicator states & Unified tap references
  const [transientAction, setTransientAction] = useState<'play' | 'pause' | null>(null);
  const transientTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Social/Channel states
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [channelInfo, setChannelInfo] = useState<{ channelTitle: string; avatarUrl: string; subscriberCountFormatted?: string } | null>(null);

  // Watched state tracking inside VideoPlayer
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);

  // Safe client-only watched videos cache load
  useEffect(() => {
    try {
      const stored = localStorage.getItem('watched_videos');
      if (stored) setWatchedVideos(JSON.parse(stored));
    } catch (e) {
      console.warn("Error restoring watched videos:", e);
    }
  }, []);

  const toggleVideoWatched = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const currentList = [...watchedVideos];
    const isWatched = currentList.includes(id);
    let newList;
    if (isWatched) {
      newList = currentList.filter(item => item !== id);
    } else {
      newList = [...new Set([...currentList, id])];
    }
    setWatchedVideos(newList);
    localStorage.setItem('watched_videos', JSON.stringify(newList));
  };

  const playNext = () => {
    if (!playlistLectures || playlistLectures.length === 0 || !onSelectLecture) return;
    const currentIndex = playlistLectures.findIndex(l => l.id === lecture.id);
    if (currentIndex !== -1 && currentIndex < playlistLectures.length - 1) {
      onSelectLecture(playlistLectures[currentIndex + 1]);
    }
  };

  const playPrevious = () => {
    if (!playlistLectures || playlistLectures.length === 0 || !onSelectLecture) return;
    const currentIndex = playlistLectures.findIndex(l => l.id === lecture.id);
    if (currentIndex > 0) {
      onSelectLecture(playlistLectures[currentIndex - 1]);
    }
  };

  // Keyboard shortcut: N = next, P = previous, F = fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if typing in forms
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        playNext();
      } else if (key === 'p') {
        e.preventDefault();
        playPrevious();
      } else if (key === 'f') {
        e.preventDefault();
        toggleScreenSim();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lecture, playlistLectures, watchedVideos]);

  useEffect(() => {
    const videoId = getYoutubeId(lecture.videoUrl);
    if (!videoId) return;
    fetch(`/api/youtube/channel-info?videoId=${videoId}`)
      .then(res => res.json())
      .then(res => {
        if (res.status === 'ok' && res.data) {
          setChannelInfo({
            channelTitle: res.data.channelTitle,
            avatarUrl: res.data.avatarUrl
          });
        }
      })
      .catch(err => {
        console.warn("Error loading channel info from API:", err);
      });
  }, [lecture.videoUrl]);

  // Lesson reviews
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const averageRating = localReviews.length > 0
    ? (localReviews.reduce((sum, r) => sum + (r.rating || 5), 0) / localReviews.length).toFixed(1)
    : null;
  const [authWarning, setAuthWarning] = useState<string | null>(null);

  // Screen orientation fullscreen simulation
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);
  const [isNativeFsActive, setIsNativeFsActive] = useState(false);
  const [isPortrait, setIsPortrait] = useState(true); // Safe default for hydration

  useEffect(() => {
    // Correctly query viewport dimensions on initial client-only layout mount
    setIsPortrait(window.innerHeight > window.innerWidth);
    
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      
      setIsNativeFsActive(isFs);
      setIsFullscreenMode(isFs);

      if (!isFs) {
        // Exited native fullscreen, unlock orientation
        try {
          if ((window.screen as any)?.orientation?.unlock) {
            (window.screen.orientation as any).unlock();
          } else if ((window.screen as any)?.unlockOrientation) {
            (window.screen as any).unlockOrientation();
          }
        } catch (e) {
          console.warn('Unlock orientation error:', e);
        }
      } else {
        // Entered native fullscreen, lock orientation to landscape
        try {
          if ((window.screen as any)?.orientation?.lock) {
            (window.screen.orientation as any).lock('landscape').catch(() => {});
          } else if ((window.screen as any)?.lockOrientation) {
            (window.screen as any).lockOrientation('landscape');
          }
        } catch (e) {
          console.warn('Lock orientation error:', e);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Clean up gesture/transient interaction timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (transientTimeoutRef.current) clearTimeout(transientTimeoutRef.current);
    };
  }, []);

  const shouldRotate = isFullscreenMode && isPortrait;

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSyncTimeRef = useRef<number>(-1);
  const volTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const brightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trackerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset playback and cover state when active lecture changes
  useEffect(() => {
    setHasPlayed(false);
    setIsPlaying(false);
    setCurrentTimeSec(0);
    setProgressPercent(0);
  }, [lecture]);

  // Load YouTube script on mount
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Set up YT Player instance
  const [isYtReady, setIsYtReady] = useState(false);

  useEffect(() => {
    let active = true;
    let player: any = null;
    let checkInterval: any = null;
    let initialized = false;

    const createPlayer = () => {
      if (!active || initialized) return;
      if (!window.YT || !window.YT.Player) return;

      initialized = true;
      const videoId = getYoutubeId(lecture.videoUrl);

      // Clean up previous container and recreate #yt-iframe-player inside it
      const container = document.getElementById('yt-iframe-container');
      if (container) {
        container.innerHTML = '<div id="yt-iframe-player" style="position: absolute; top:0; left:0; width:100%; height:100%; border:none; z-index:1; pointer-events:none;"></div>';
      }

      setPlayerReady(false);

      player = new window.YT.Player('yt-iframe-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event: any) => {
            if (!active) return;
            ytPlayerRef.current = event.target;
            setPlayerReady(true);
            setIsYtReady(true);
            event.target.setVolume(volume);
            try {
              event.target.playVideo();
            } catch (err) {
              console.warn("Autoplay block:", err);
            }
            const duration = event.target.getDuration();
            if (duration) {
              setTotalDurationSec(Math.floor(duration));
            }
          },
          onStateChange: (event: any) => {
            if (!active) return;
            // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
            if (event.data === 1) {
              setIsPlaying(true);
              setHasPlayed(true);
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              setIsPlaying(false);
              // Auto-mark completed lecture as watched
              setWatchedVideos(prev => {
                if (!prev.includes(lecture.id)) {
                  const newList = [...prev, lecture.id];
                  localStorage.setItem('watched_videos', JSON.stringify(newList));
                  return newList;
                }
                return prev;
              });
              // Auto-advance
              if (playlistLectures && playlistLectures.length > 0 && onSelectLecture) {
                const currentIndex = playlistLectures.findIndex(l => l.id === lecture.id);
                if (currentIndex !== -1 && currentIndex < playlistLectures.length - 1) {
                  onSelectLecture(playlistLectures[currentIndex + 1]);
                }
              }
            }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      // Use interval to check
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          createPlayer();
        }
      }, 100);

      // Dynamic ready subscription fallback for first load
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        if (window.YT && window.YT.Player) {
          if (checkInterval) clearInterval(checkInterval);
          createPlayer();
        }
      };
    }

    return () => {
      active = false;
      if (checkInterval) clearInterval(checkInterval);
      if (player && typeof player.destroy === 'function') {
        try {
          player.destroy();
        } catch (e) {
          console.warn("Destroy fail:", e);
        }
      }
      ytPlayerRef.current = null;
      setPlayerReady(false);
      setIsYtReady(false);
    };
  }, [lecture]);

  // Gestural dragging handlers for VLC style controls (left screen brightness, right screen volume)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef<number>(0);
  const dragStartVal = useRef<number>(0);
  const dragType = useRef<'brightness' | 'volume' | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);

  const handlePointerStart = (clientX: number, clientY: number) => {
    if (!isFullscreenMode) return; // Volume and brightness gestures only show & work in landscape fullscreen!
    if (isLocked || !containerRef.current) return;
    
    // Calculate if index pointer was on left or right half of the player
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const isLeftHalf = relativeX < rect.width / 2;

    setIsDragging(true);
    dragStartY.current = clientY;
    
    if (isLeftHalf) {
      dragType.current = 'brightness';
      dragStartVal.current = brightness;
      setShowBrightnessIndicator(true);
      setShowVolumeIndicator(false);
      if (brightTimeoutRef.current) clearTimeout(brightTimeoutRef.current);
      brightTimeoutRef.current = setTimeout(() => setShowBrightnessIndicator(false), 1500);
    } else {
      dragType.current = 'volume';
      dragStartVal.current = volume;
      setShowVolumeIndicator(true);
      setShowBrightnessIndicator(false);
      if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
      volTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
    }
  };

  const handlePointerMove = (clientY: number) => {
    if (!isFullscreenMode) return; // Volume and brightness gestures only show & work in landscape fullscreen!
    if (!isDragging || !dragType.current) return;
    
    const deltaY = dragStartY.current - clientY; // Positive means swipe/drag upwards
    const sensitivity = 1.2; // Pixels per percentage unit delta
    const deltaPercent = Math.round(deltaY / sensitivity);
    
    if (dragType.current === 'brightness') {
      const newBright = Math.max(30, Math.min(150, dragStartVal.current + deltaPercent));
      setBrightness(newBright);
      setShowBrightnessIndicator(true);
      setShowVolumeIndicator(false);
      if (brightTimeoutRef.current) clearTimeout(brightTimeoutRef.current);
      brightTimeoutRef.current = setTimeout(() => setShowBrightnessIndicator(false), 1500);
    } else if (dragType.current === 'volume') {
      const newVol = Math.max(0, Math.min(100, dragStartVal.current + deltaPercent));
      setVolume(newVol);
      try {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
          ytPlayerRef.current.setVolume(newVol);
        }
      } catch (e) {
        console.warn(e);
      }
      setShowVolumeIndicator(true);
      setShowBrightnessIndicator(false);
      if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
      volTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
    }
  };

  const handlePointerEnd = () => {
    setIsDragging(false);
    dragType.current = null;
  };

  const handleContainerDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLocked || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const isLeftHalf = relativeX < rect.width / 2;
    
    if (isLeftHalf) {
      handleSeekOffset('backward');
    } else {
      handleSeekOffset('forward');
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('svg')) {
      return;
    }
    resetControlsTimer();
    const touch = e.touches[0];
    const now = Date.now();
    
    if (lastTapRef.current) {
      const { time, x } = lastTapRef.current;
      const timespan = now - time;
      const distance = Math.abs(touch.clientX - x);
      
      if (timespan < 300 && distance < 35) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const relativeX = touch.clientX - rect.left;
          if (relativeX < rect.width / 2) {
            handleSeekOffset('backward');
          } else {
            handleSeekOffset('forward');
          }
        }
        lastTapRef.current = null;
        return;
      }
    }
    
    lastTapRef.current = { time: now, x: touch.clientX };
    handlePointerStart(touch.clientX, touch.clientY);
  };

  const handleStartPlay = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setHasPlayed(true);
    setIsPlaying(true);
    setTimeout(() => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.playVideo();
        } catch (err) {
          console.warn("Youtube play failed on start:", err);
        }
      }
    }, 150);
  };

  // Load social / saved user states & reviews
  useEffect(() => {
    if (user) {
      if (isGuest || user.uid === 'guest') {
        setIsLiked(!!user.likedContent?.includes(lecture.id));
        setIsSaved(!!user.savedContent?.includes(lecture.id));
        setIsWatchLater(!!user.watchLaterContent?.includes(lecture.id));
      } else {
        fetchLikedLecturesIds().then(ids => setIsLiked(ids.includes(lecture.id)));
        fetchWatchLaterIds().then(ids => {
          setIsSaved(ids.includes(lecture.id));
          setIsWatchLater(ids.includes(lecture.id));
        });
      }
    }

    if (user && user.hiddenContent?.includes(`followed_teacher_${lecture.teacherId}`)) {
      setIsFollowed(true);
    }

    fetchReviews(lecture.teacherId || lecture.id)
      .then(revs => setLocalReviews(revs))
      .catch(err => console.warn('Could not fetch reviews:', err));
  }, [
    lecture.id,
    lecture.teacherId,
    isGuest,
    user?.uid,
    user?.likedContent,
    user?.savedContent,
    user?.watchLaterContent,
    user?.hiddenContent
  ]);

  // Set up timer loop to get actual current position and duration from YT Player API
  useEffect(() => {
    const checkYtProgress = setInterval(() => {
      if (ytPlayerRef.current && isPlaying && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const current = ytPlayerRef.current.getCurrentTime();
          const duration = ytPlayerRef.current.getDuration() || totalDurationSec;
          if (typeof current === 'number' && !isNaN(current)) {
            setCurrentTimeSec(Math.floor(current));
            if (duration && !isNaN(duration)) {
              setTotalDurationSec(Math.floor(duration));
              setProgressPercent((current / duration) * 100);

              // Sync progress periodically
              const roundedSecs = Math.floor(current);
              if (user && roundedSecs !== lastSyncTimeRef.current && roundedSecs % 15 === 0) {
                lastSyncTimeRef.current = roundedSecs;
                trackWatchProgress(lecture, roundedSecs, roundedSecs >= Math.floor(duration));
              }
            }
          }
        } catch (e) {
          console.warn("Error reading YT current time:", e);
        }
      }
    }, 500);

    return () => clearInterval(checkYtProgress);
  }, [isPlaying, lecture, user, totalDurationSec]);

  // Set up body overflow locks for simulated fullscreen landscape scroll inhibition
  useEffect(() => {
    if (isFullscreenMode) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreenMode]);

  // Inactivity controls count-down
  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isLocked) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500); // Set to at least 2.5 seconds (2500ms) of persistent screen time!
    }
  };

  const showWarning = (msg: string) => {
    setAuthWarning(msg);
    setTimeout(() => setAuthWarning(null), 4000);
  };

  const triggerTransientIndicator = (type: 'play' | 'pause') => {
    setTransientAction(type);
    if (transientTimeoutRef.current) clearTimeout(transientTimeoutRef.current);
    transientTimeoutRef.current = setTimeout(() => {
      setTransientAction(null);
    }, 600);
  };

  const handleSingleOrDoubleTap = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, 
    clientX: number, 
    clientY: number
  ) => {
    e.stopPropagation();
    if (isLocked) return;
    resetControlsTimer();
    
    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;
    
    if (timeDiff < 300) {
      // Double tap!
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      lastClickTimeRef.current = 0; // reset
      
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const relativeX = clientX - rect.left;
        if (relativeX < rect.width / 2) {
          handleSeekOffset('backward');
        } else {
          handleSeekOffset('forward');
        }
      }
    } else {
      // Single tap potential
      lastClickTimeRef.current = now;
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      
      clickTimeoutRef.current = setTimeout(() => {
        setIsDescExpanded(false);
        setShowControls(prev => {
          const nextState = !prev;
          if (nextState) {
            resetControlsTimer();
          }
          return nextState;
        });
      }, 250);
    }
  };

  const handlePlayPause = () => {
    if (isLocked) return;
    resetControlsTimer();
    if (ytPlayerRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
          triggerTransientIndicator('pause');
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          triggerTransientIndicator('play');
        }
      } catch (e) {
        console.warn(e);
      }
    } else {
      const nextPlaying = !isPlaying;
      setIsPlaying(nextPlaying);
      triggerTransientIndicator(nextPlaying ? 'play' : 'pause');
    }
  };

  const handleSeekOffset = (direction: 'forward' | 'backward') => {
    if (isLocked) return;
    resetControlsTimer();
    setShowSeekOverlay(direction);

    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        const current = ytPlayerRef.current.getCurrentTime();
        const duration = ytPlayerRef.current.getDuration() || totalDurationSec;
        const delta = direction === 'forward' ? 10 : -10;
        const target = Math.max(0, Math.min(duration, current + delta));
        
        ytPlayerRef.current.seekTo(target, true);
        setCurrentTimeSec(Math.floor(target));
        if (duration) {
          setProgressPercent((target / duration) * 100);
        }
      }
    } catch (e) {
      console.warn(e);
    }

    setTimeout(() => setShowSeekOverlay(null), 500);
  };

  const handleTimelineChange = (targetSecs: number) => {
    if (isLocked) return;
    resetControlsTimer();
    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(targetSecs, true);
      }
      setCurrentTimeSec(targetSecs);
      const duration = totalDurationSec;
      if (duration) {
        setProgressPercent((targetSecs / duration) * 100);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleVolumeChange = (volValue: number) => {
    if (isLocked) return;
    resetControlsTimer();
    setVolume(volValue);
    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        ytPlayerRef.current.setVolume(volValue);
      }
    } catch (e) {
      console.warn(e);
    }
    setShowVolumeIndicator(true);
    setShowBrightnessIndicator(false);
    if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
    volTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
  };

  const handleBrightnessChange = (brightValue: number) => {
    if (isLocked) return;
    resetControlsTimer();
    setBrightness(brightValue);
    setShowBrightnessIndicator(true);
    setShowVolumeIndicator(false);
    if (brightTimeoutRef.current) clearTimeout(brightTimeoutRef.current);
    brightTimeoutRef.current = setTimeout(() => setShowBrightnessIndicator(false), 1500);
  };

  const handleSpeedSelect = (rate: number) => {
    if (isLocked) return;
    setPlaybackSpeed(rate);
    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
        ytPlayerRef.current.setPlaybackRate(rate);
      }
    } catch (e) {
      console.warn(e);
    }
    setActivePopupSection('main');
    setShowSettingsPopup(false);
  };

  const handleQualitySelect = (ql: string) => {
    setQuality(ql);
    setActivePopupSection('main');
    setShowSettingsPopup(false);
  };

  const handleLike = async () => {
    if (!user) {
      showWarning("Sign in to like lessons and record feedback.");
      return;
    }
    const current = isLiked;
    setIsLiked(!current);
    
    const currentLikes = user.likedContent || [];
    const updatedLikes = current 
      ? currentLikes.filter(id => id !== lecture.id)
      : [...currentLikes, lecture.id];
      
    await updatePreferences({ likedContent: updatedLikes });
    await toggleLikeVideo(lecture, current);
  };

  const handleSave = async () => {
    if (!user) {
      showWarning("Sign in to save this lesson to your board.");
      return;
    }
    const current = isSaved;
    setIsSaved(!current);
    
    const currentSaved = user.savedContent || [];
    const updatedSaved = current
      ? currentSaved.filter(id => id !== lecture.id)
      : [...currentSaved, lecture.id];

    await updatePreferences({ savedContent: updatedSaved });
  };

  const handleWatchLaterToggle = async () => {
    if (!user) {
      showWarning("Sign in to save this lesson to Watch Later.");
      return;
    }
    const current = isWatchLater;
    setIsWatchLater(!current);
    
    const currentWatchLater = user.watchLaterContent || [];
    const updatedWatchLater = current
      ? currentWatchLater.filter((id: string) => id !== lecture.id)
      : [...currentWatchLater, lecture.id];

    await updatePreferences({ watchLaterContent: updatedWatchLater });
    await toggleWatchLater(lecture, current);
  };

  const handleFollowToggle = () => {
    setIsFollowed(!isFollowed);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.origin + `?lecture=${lecture.id}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const toggleScreenSim = () => {
    const nextState = !isFullscreenMode;
    
    if (nextState) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen()
          .then(() => {
            // Screen orientation lock is handled automatically in our fullscreenchange listener
          })
          .catch((err) => {
            console.warn("Native requestFullscreen failed (sandbox constraints), falling back to simulated full-window mode:", err);
            // Fallback for sandboxed iframe context
            setIsFullscreenMode(true);
          });
      } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
        try {
          (containerRef.current as any).webkitRequestFullscreen();
        } catch (err) {
          setIsFullscreenMode(true);
        }
      } else {
        // Fallback for browsers that don't support native fullscreen at all
        setIsFullscreenMode(true);
      }
    } else {
      const isNativeFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      if (isNativeFs) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          try {
            (document as any).webkitExitFullscreen();
          } catch (e) {}
        }
      }
      
      // Always guarantee reset of React state and screen unlocks
      setIsFullscreenMode(false);
      setIsNativeFsActive(false);
      try {
        if ((window.screen as any)?.orientation?.unlock) {
          (window.screen.orientation as any).unlock();
        } else if ((window.screen as any)?.unlockOrientation) {
          (window.screen as any).unlockOrientation();
        }
      } catch (e) {
        console.warn('Unlock orientation error:', e);
      }
    }
  };

  // Convert raw seconds to beautifully padded clock strings e.g. 49:32 or 2:15:28
  const formatSecToClock = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = Math.floor(totalSecs % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Subtitles / Captions dynamically matched to the video timeline
  const getSubtitlesText = () => {
    const s = currentTimeSec % 180;
    const subj = lecture.subject || "Concepts";
    const tit = lecture.title || "Lesson";
    if (s < 15) return `Welcome back! Today we are studying: ${tit || "this lesson"}.`;
    if (s < 35) return `Let's review the fundamental theories of ${subj} and their practical applications.`;
    if (s < 55) return "Observe this core formula and standard derivations. Focus on these keys.";
    if (s < 75) return "These specific trends are highly expected questions for your competitive exams.";
    return "Make sure to record these notes in your notebook. Let's practice further.";
  };

  const handleReviewSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showWarning("Sign in to submit your official rating check.");
      return;
    }
    if (!reviewComment.trim()) {
      showWarning("Please write your comment to verify concept delivery.");
      return;
    }

    setReviewSubmitting(true);
    try {
      await submitReview({
        targetId: lecture.teacherId || 'general_teacher',
        targetType: 'teacher',
        rating: newRating,
        comment: reviewComment,
        trustImpact: user?.role === 'teacher' || user?.role === 'admin' ? 3 : 1,
        isVerifiedStudent: true,
        lectureId: lecture.id
      });
      const updated = await fetchReviews(lecture.teacherId || lecture.id);
      setLocalReviews(updated);
      setReviewComment('');
      setShowAddReviewModal(false);
    } catch (err: any) {
      console.error(err);
      showWarning(err.message || "Failed to catalog review. Try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const nextUpLessons = React.useMemo(() => {
    // 1. Same playlist items first
    const samePlaylist = playlistLectures.filter(l => l.id !== lecture.id && l.playlistId === lecture.playlistId);
    
    // 2. Same subject items next
    const sameSubject = playlistLectures.filter(l => l.id !== lecture.id && l.playlistId !== lecture.playlistId && l.subject === lecture.subject);
    
    // 3. Any other items
    const rest = playlistLectures.filter(l => l.id !== lecture.id && l.playlistId !== lecture.playlistId && l.subject !== lecture.subject);
    
    // Combine them up to a nice, long list (e.g., 24 items)
    return [...samePlaylist, ...sameSubject, ...rest].slice(0, 24);
  }, [playlistLectures, lecture.id, lecture.playlistId, lecture.subject]);

  const subscriberCountFormatted = React.useMemo(() => {
    if (channelInfo?.subscriberCountFormatted) return channelInfo.subscriberCountFormatted;
    // Generate realistic sub count based on teacherName / channelTitle length/hash
    const name = channelInfo?.channelTitle || lecture.teacherName || "Verified Educator";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const val = 120 + Math.abs(hash % 480); // 120k to 600k
    return `${val}K`;
  }, [channelInfo, lecture.teacherName]);

  return (
    <div className={`w-full bg-[#000000] text-white font-sans selection:bg-red-650 selection:text-white flex flex-col justify-start transition-all duration-300 min-h-screen ${isFullscreenMode ? 'px-0 py-0 overflow-hidden' : ''}`}>

      {/* Main Grid for player and playlist sidebar support */}
      <div className={`w-full max-w-7xl mx-auto ${isFullscreenMode ? '' : 'pb-6'}`}>
        <div className={`flex flex-col gap-6 w-full ${isFullscreenMode ? '' : ''}`}>
          
          {/* Left Column: Player core and video specifications (col-span-8) */}
          <div className="w-full">

            {/* 1. NATIVE INTEGRATED YOUTUBE PLAYER CONTAINER */}
            <div 
              ref={containerRef}
              onMouseEnter={() => {
                setShowControls(true);
                resetControlsTimer();
              }}
              onMouseMove={() => {
                setShowControls(true);
                resetControlsTimer();
              }}
              onMouseLeave={() => {
                if (isPlaying) {
                  // delay hiding the controls or rely on controlsTimeout
                  if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
                  controlsTimeoutRef.current = setTimeout(() => {
                    setShowControls(false);
                  }, 2500); // 2.5 seconds!
                }
              }}
              className={`player-wrapper relative bg-zinc-950 transition-all duration-300 flex flex-col items-center justify-center group overflow-hidden select-none ${
                isFullscreenMode 
                  ? 'border-0' 
                  : 'w-full border border-white/5 aspect-[16/9] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] relative max-w-full'
              }`}
              style={{ 
                filter: `brightness(${brightness}%)`,
                position: isFullscreenMode ? 'fixed' : 'relative',
                top: isFullscreenMode ? (shouldRotate ? '50%' : '0') : undefined,
                left: isFullscreenMode ? (shouldRotate ? '50%' : '0') : undefined,
                width: isFullscreenMode 
                  ? (isNativeFsActive 
                      ? '100vw' 
                      : (shouldRotate ? '100vh' : '100vw')
                    )
                  : '100%',
                height: isFullscreenMode 
                  ? (isNativeFsActive 
                      ? '100vh' 
                      : (shouldRotate ? '100vw' : '100vh')
                    )
                  : 'auto',
                transform: isFullscreenMode 
                  ? (shouldRotate ? 'translate(-50%, -50%) rotate(90deg)' : 'none') 
                  : 'none',
                transformOrigin: (isFullscreenMode && shouldRotate) ? 'center center' : undefined,
                zIndex: isFullscreenMode ? 99999 : undefined,
                maxWidth: isFullscreenMode ? 'none' : '100%',
                aspectRatio: '16/9',
                overflow: 'hidden',
                background: '#000'
              }}
            >

              {/* [2] #yt-iframe-container (hosting #yt-iframe-player dynamically) */}
              <div 
                id="yt-iframe-container" 
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            pointerEvents: 'none',
            overflow: 'hidden'
          }}
        />

        {/* [3] Unified Touch/Gesture detection area (100% height overlay) */}
        <div 
          className="absolute inset-0 w-full h-full z-10 cursor-pointer select-none outline-none active:bg-transparent"
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse') {
              handlePointerStart(e.clientX, e.clientY);
            }
          }}
          onPointerMove={(e) => {
            if (e.pointerType === 'mouse' || isDragging) {
              handlePointerMove(e.clientY);
            }
          }}
          onPointerUp={() => {
            handlePointerEnd();
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            handlePointerStart(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            const t = e.touches[0];
            handlePointerMove(t.clientY);
          }}
          onTouchEnd={() => {
            handlePointerEnd();
          }}
          onClick={(e) => {
            handleSingleOrDoubleTap(e, e.clientX, e.clientY);
          }}
          style={{
            background: 'transparent',
            touchAction: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
        />

        {/* [4] Gestures overlay & feedback indicators */}
        {/* Brightness indicator (Left screen) */}
        {/* Side Sliders - Left Edge: Brightness Slider */}
        <AnimatePresence>
          {showBrightnessIndicator && (
            <motion.div 
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-30"
            >
              <Sun className="w-3.5 h-3.5 text-white" />
              <div 
                className="relative w-[1.5px] h-20 bg-white/20 rounded-full overflow-visible cursor-pointer py-1"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const pct = 1 - (clickY / rect.height);
                  const newBright = Math.max(30, Math.min(150, Math.round(30 + (pct * 120))));
                  handleBrightnessChange(newBright);
                }}
              >
                <div className="absolute bottom-0 left-0 right-0 bg-white rounded-full" style={{ height: `${((brightness - 30) / 120) * 100}%` }} />
                <div className="absolute w-2 h-2 bg-white rounded-full -left-[3px] shadow" style={{ bottom: `calc(${((brightness - 30) / 120) * 100}% - 4px)` }} />
              </div>
              <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-tight">Bright</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Volume indicator (Right screen) */}
        {/* Side Sliders - Right Edge: Volume Slider */}
        <AnimatePresence>
          {showVolumeIndicator && (
            <motion.div 
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-30"
            >
              <Volume2 className="w-3.5 h-3.5 text-white" />
              <div 
                className="relative w-[1.5px] h-20 bg-white/20 rounded-full overflow-visible cursor-pointer py-1"
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickY = e.clientY - rect.top;
                  const pct = 1 - (clickY / rect.height);
                  const newVol = Math.max(0, Math.min(100, Math.round(pct * 100)));
                  handleVolumeChange(newVol);
                }}
              >
                <div className="absolute bottom-0 left-0 right-0 bg-white rounded-full" style={{ height: `${volume}%` }} />
                <div className="absolute w-2 h-2 bg-white rounded-full -left-[3px] shadow" style={{ bottom: `calc(${volume}% - 4px)` }} />
              </div>
              <span className="text-[7px] font-mono text-zinc-400 uppercase tracking-tight">Volume</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Double Tap Seek Feedback Indicator bubbles */}
        <AnimatePresence>
          {showSeekOverlay && (
            <motion.div 
               initial={{ opacity: 0, scale: 0.8 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.8 }}
               className={`absolute z-30 bg-white/10 border border-white/15 backdrop-blur-md px-4 py-2 rounded-none flex flex-col items-center gap-1 pointer-events-none font-mono ${
                showSeekOverlay === 'backward' ? 'left-1/4' : 'right-1/4'
               }`}
            >
              <span className="text-[9px] font-bold text-white tracking-wider uppercase">
                 {showSeekOverlay === 'backward' ? '◀◀ 10s REWIND' : 'FORWARD 10s ▶▶'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Centered animative transient play/pause status bubble indicator */}
        <AnimatePresence>
          {transientAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeInOut" }}
              className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center z-35 pointer-events-none"
            >
              {transientAction === 'play' ? (
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              ) : (
                <Pause className="w-6 h-6 text-white fill-white" />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header HUD bar inside the video player */}
        <AnimatePresence>
          {(showControls || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="absolute top-0 left-0 w-full px-4 pt-4 pb-12 bg-gradient-to-b from-black/90 via-black/45 to-transparent z-25 flex items-center justify-between pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Side: Back Arrow Button and Title + Subtitle information */}
              <div className="flex items-center gap-3 min-w-0 flex-1 text-left">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onClose) onClose();
                  }}
                  className="p-1.5 hover:bg-white/10 rounded-full text-white active:scale-90 transition-all cursor-pointer flex-shrink-0"
                  title="Close and Go Back"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <div className="flex flex-col leading-tight min-w-0">
                  <h2 className="text-xs sm:text-sm font-bold text-white truncate drop-shadow">
                    {lecture.title || "Periodic Table and Chemistry Periodicity One-Shot"}
                  </h2>
                  <span className="text-[9px] sm:text-[10px] text-zinc-350 font-medium tracking-wide drop-shadow mt-0.5">
                    {(lecture.subject || "Chemistry")} • {(lecture.examType || "JEE")}
                  </span>
                </div>
              </div>

              {/* Right Side Tools: Settings only (Lock and Cast completely removed) */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Settings Cog Icon (Toggles custom Bottom-Sheet) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettingsPopup(!showSettingsPopup);
                    setActivePopupSection('main');
                  }}
                  className={`p-1.5 rounded-full text-white active:scale-95 transition-all cursor-pointer ${showSettingsPopup ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  title="Settings"
                >
                  <Settings className="w-4.5 h-4.5 text-white" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Central Minimalist Play/Pause backed by 10s Rewind & Fast-forward flanked options */}
        <AnimatePresence>
          {(showControls || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 m-auto flex items-center justify-center gap-6 z-30 pointer-events-auto h-16 w-60"
            >
              {/* Rewind 10s */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeekOffset('backward');
                }}
                className="w-12 h-12 rounded-full border border-white/30 bg-black/35 hover:bg-black/55 text-white flex items-center justify-center transition-all cursor-pointer relative hover:border-white/50 active:scale-95"
                title="Rewind 10s"
              >
                <RotateCcw className="w-6 h-6 stroke-[1.5]" />
                <span className="absolute text-[8px] font-sans font-bold mt-1.5">10</span>
              </button>

              {/* Central Play/Pause (Premium Hollow Ring Layout Matching Screenshot) */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayPause();
                }}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                key={isPlaying ? "playing" : "paused"}
                className="w-16 h-16 rounded-full border border-white/30 bg-black/35 hover:bg-black/55 text-white flex items-center justify-center transition-all cursor-pointer hover:border-white/50"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current text-white" />
                ) : (
                  <Play className="w-6 h-6 fill-current text-white ml-1" />
                )}
              </motion.button>

              {/* Fast Forward 10s */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeekOffset('forward');
                }}
                className="w-12 h-12 rounded-full border border-white/30 bg-black/35 hover:bg-black/55 text-white flex items-center justify-center transition-all cursor-pointer relative hover:border-white/50 active:scale-95"
                title="Forward 10s"
              >
                <RotateCw className="w-6 h-6 stroke-[1.5]" />
                <span className="absolute text-[8px] font-sans font-bold mt-1.5">10</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Time, Slider and Fullscreen HUD wrapper */}
        <AnimatePresence>
          {(showControls || !isPlaying) && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-0 left-0 w-full px-4 pt-10 pb-4 bg-gradient-to-t from-black/95 via-black/70 to-transparent z-25 flex flex-col gap-2.5 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Bottom Timeline Row containing Left Time + Red Track + Right Time + Fullscreen Button */}
              <div className="flex items-center gap-3.5 w-full select-none">
                {/* Current Time Stamp */}
                <span className="text-[11px] font-mono text-zinc-300 font-medium select-none min-w-[34px] text-left">
                  {formatSecToClock(currentTimeSec)}
                </span>
                
                {/* Slim Clickable Timeline Seek Slider with Circle handle indicator */}
                <div 
                  className="relative flex-1 h-1 bg-white/20 rounded-full cursor-pointer py-1.5 flex items-center group/timeline"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const width = rect.width;
                    const newPct = clickX / width;
                    const targetSecs = Math.max(0, Math.min(totalDurationSec, Math.floor(newPct * totalDurationSec)));
                    handleTimelineChange(targetSecs);
                  }}
                >
                  <div className="absolute left-0 right-0 h-1 bg-white/20 rounded-full" />
                  <div 
                    className="absolute left-0 h-1 bg-[#FF0000] rounded-full animate-none" 
                    style={{ width: `${progressPercent}%` }}
                  />
                  <div 
                    className="absolute w-3 h-3 rounded-full bg-[#FF0005] border border-white -translate-x-1/2 scale-100 group-hover/timeline:scale-125 transition-transform"
                    style={{ left: `${progressPercent}%` }}
                  />
                </div>

                {/* Total Duration Time Stamp */}
                <span className="text-[11px] font-mono text-zinc-300 font-medium select-none min-w-[34px] text-right">
                  {formatSecToClock(totalDurationSec)}
                </span>

                {/* Fullscreen corners Bracket maximize/minimize toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleScreenSim();
                  }}
                  className="p-1 hover:bg-white/10 rounded-lg text-white transition-all active:scale-90 cursor-pointer flex items-center justify-center shrink-0 ml-1.5"
                  title={isFullscreenMode ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreenMode ? (
                    <Minimize className="w-5 h-5 text-white" />
                  ) : (
                    <Maximize className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Playback Settings Bottom Sheet */}
        <AnimatePresence>
          {showSettingsPopup && (
            <>
              {/* Backdrop covering the visual player stage */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setShowSettingsPopup(false);
                  setActivePopupSection('main');
                }}
                className="absolute inset-0 bg-black/75 backdrop-blur-sm z-35"
              />

              {/* iOS style Slide-up Bottom-Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="absolute bottom-0 left-0 right-0 bg-zinc-950 border-t border-white/10 rounded-t-3xl p-5 z-40 select-none pb-6"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Horizontal handle pill indicator */}
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

                {activePopupSection === 'main' && (
                  <div className="space-y-1.5 text-left">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Playback Settings</span>
                      <button 
                        onClick={() => setShowSettingsPopup(false)}
                        className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/5"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Option Group: Quality */}
                    <button
                      onClick={() => setActivePopupSection('quality')}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-900 rounded-xl group-hover:bg-zinc-800 transition-colors">
                          <Tv className="w-4 h-4 text-zinc-300" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">Video Quality</span>
                          <span className="text-[10px] text-zinc-500 font-medium font-sans">Toggle stream target resolution</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-red-500">{autoQuality ? 'Auto (Recommended)' : quality}</span>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </button>

                    {/* Option Group: Speed */}
                    <button
                      onClick={() => setActivePopupSection('speed')}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-900 rounded-xl group-hover:bg-zinc-800 transition-colors">
                          <Clock className="w-4 h-4 text-zinc-300 animate-none" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">Playback Speed</span>
                          <span className="text-[10px] text-zinc-500 font-medium font-sans">Speed factor of voice & video</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-red-500">
                          {playbackSpeed === 1.0 ? 'Normal' : `${playbackSpeed}x`}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </button>

                    {/* Option Group: Auto Quality Switcher Toggle */}
                    <div className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3 text-left">
                        <div className="p-2 bg-zinc-900 rounded-xl">
                          <Sparkles className="w-4 h-4 text-zinc-300" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-white">Auto Quality Toggle</span>
                          <span className="text-[10px] text-zinc-500 font-medium font-sans">Synchronize quality to cellular bandwidth</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setAutoQuality(!autoQuality)}
                        className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 outline-none focus:outline-none ${autoQuality ? 'bg-red-650' : 'bg-zinc-800'}`}
                        style={{ outline: "none" }}
                      >
                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${autoQuality ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
                      </button>
                    </div>

                    {/* Option Group: Report Playback Issue */}
                    <button
                      onClick={() => {
                        setShowSettingsPopup(false);
                        setShowReportToast(true);
                        setTimeout(() => setShowReportToast(false), 3000);
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-red-500/10 hover:text-red-300 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-900 rounded-xl group-hover:bg-red-950/40 transition-colors">
                          <Info className="w-4 h-4 text-zinc-300 group-hover:text-red-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white group-hover:text-red-400">Report Playback Issue</span>
                          <span className="text-[10px] text-zinc-500 font-medium font-sans">File logs and request video rebuild</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-red-450" />
                    </button>
                  </div>
                )}

                {/* Subpanel: Quality Selection */}
                {activePopupSection === 'quality' && (
                  <div className="text-left space-y-1.5">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                      <button 
                        onClick={() => setActivePopupSection('main')}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white p-1 rounded-lg"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Select Video Quality</span>
                      <div className="w-[44px]" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['Auto', '1080p', '720p', '480p', '360p'].map((ql) => (
                        <button
                          key={ql}
                          onClick={() => {
                            handleQualitySelect(ql);
                            if (ql !== 'Auto') setAutoQuality(false);
                            else setAutoQuality(true);
                            setShowSettingsPopup(false);
                          }}
                          className={`py-3 px-4 rounded-xl text-center text-xs font-mono font-bold transition-all ${
                            (ql === 'Auto' && autoQuality) || (quality === ql && !autoQuality)
                              ? 'bg-red-650 text-white shadow-lg' 
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          {ql === 'Auto' ? 'Auto (Recommended)' : ql}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subpanel: Speed Selection */}
                {activePopupSection === 'speed' && (
                  <div className="text-left space-y-1.5">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
                      <button 
                        onClick={() => setActivePopupSection('main')}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white p-1 rounded-lg"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">Playback Speed</span>
                      <div className="w-[44px]" />
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => {
                            handleSpeedSelect(rate);
                            setShowSettingsPopup(false);
                          }}
                          className={`py-3 px-2 rounded-xl text-center text-xs font-mono font-bold transition-all ${
                            playbackSpeed === rate 
                              ? 'bg-red-650 text-white shadow-lg' 
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          {rate === 1.0 ? 'Normal' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Loading Spinner during ready wait state */}
        {!playerReady && (
          <div className="absolute inset-0 bg-[#08080A] flex flex-col items-center justify-center gap-3 z-0">
            <img 
              src={getLectureThumbnail(lecture)} 
              alt={lecture.title} 
              className="absolute inset-0 w-full h-full object-cover opacity-20 filter blur-sm"
              referrerPolicy="no-referrer"
            />
            <div className="w-10 h-10 border-2 border-red-650 border-t-transparent rounded-full animate-spin z-10" />
            <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest z-10">Initializing Custom Stream Engine...</p>
          </div>
        )}
      </div>

            {/* 4. PORTRAIT INFORMATION DETAILS PANEL LAYER SECTION (Refined 4-Row System) */}
      {!isFullscreenMode && (
        <div className="w-full px-4 py-3 flex flex-col space-y-3.5 text-left border-t border-white/5 bg-[#000000]">
          
          {authWarning && (
            <div className="p-2.5 bg-red-950/25 border border-red-500/20 text-red-200 text-xs rounded-xl font-mono text-center">
              ⚠️ {authWarning}
            </div>
          )}

          {/* ROW 1: Channel row (Avatar, Name, Subscribers count, Trust score, Follow button) */}
          <div className="flex items-center justify-between gap-3 py-1.5 border-b border-white/5 pb-3">
            <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
              <div className="relative shrink-0">
                <img 
                  src={channelInfo?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(lecture.teacherName || "Verified Educator")}&background=202024&color=ef4444&size=128&bold=true`} 
                  alt={channelInfo?.channelTitle || lecture.teacherName}
                  className="w-10 h-10 rounded-full object-cover border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border border-black flex items-center justify-center">
                  <span className="text-[7.5px] text-black font-extrabold pb-0.5">✓</span>
                </span>
              </div>
              <div className="text-left min-w-0 leading-tight">
                <h3 className="text-sm font-bold text-white truncate">
                  {channelInfo?.channelTitle || lecture.teacherName || "Verified Educator"}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[10.5px] text-zinc-400 font-medium">
                    {subscriberCountFormatted || "2.15M"} subscribers
                  </p>
                </div>
              </div>
            </div>

            {/* Accent 2 (Trust Score Circular Graph) moved to Row 1 center/right of center */}
            <div className="flex flex-col items-center shrink-0 select-none mr-1.5">
              <div className="relative w-9 h-9 flex items-center justify-center">
                <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background track: White */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15" 
                    fill="none" 
                    stroke="#FFFFFF" 
                    strokeWidth="3.2" 
                    strokeOpacity="0.1"
                  />
                  {/* Fill: Green */}
                  <circle 
                    cx="18" 
                    cy="18" 
                    r="15" 
                    fill="none" 
                    stroke="#22C55E" 
                    strokeWidth="3.2" 
                    strokeDasharray="94.2" 
                    strokeDashoffset={94.2 - (94.2 * (averageRating ? Number(averageRating) * 20 : 92)) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-mono font-extrabold text-[#FFFFFF] leading-none">
                    {Math.round(averageRating ? Number(averageRating) * 20 : 92)}%
                  </span>
                </div>
                {/* Tiny green check badge overlay */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border border-black flex items-center justify-center shadow">
                  <span className="text-[7.5px] text-black font-extrabold pb-0.5 font-sans">✓</span>
                </div>
              </div>
              <span className="text-[7px] font-extrabold text-zinc-500 font-mono uppercase tracking-wider mt-0.5">Trust Score</span>
            </div>

            <button 
              onClick={handleFollowToggle}
              className={`h-8 px-5 rounded-full text-xs font-bold cursor-pointer transition-all flex items-center justify-center shrink-0 ${
                isFollowed 
                  ? 'bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white' 
                  : 'bg-white text-black hover:bg-zinc-200 shadow'
              }`}
            >
              {isFollowed ? 'Following' : 'Follow'}
            </button>
          </div>

          {/* ROW 2: Tightly spaced horizontal row of outlined action buttons */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none select-none no-scrollbar border-b border-white/5 pb-3" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`h-7.5 px-4 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isLiked
                  ? 'bg-white text-black border-white shadow'
                  : 'bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className={`h-7.5 px-4 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isSaved
                  ? 'bg-white text-black border-white shadow'
                  : 'bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isSaved ? 'Saved to Board' : 'Save'}</span>
            </button>

            {/* Watch Later / Add to Playlist Queue Button */}
            <button
              onClick={handleWatchLaterToggle}
              className={`h-7.5 px-4 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isWatchLater
                  ? 'bg-white text-black border-white shadow'
                  : 'bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{isWatchLater ? 'In Queue' : 'Watch Later'}</span>
            </button>

            {/* Share Button with status feedback */}
            <button
              onClick={handleShare}
              className={`h-7.5 px-4 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                copiedLink
                  ? 'bg-[#22C55E] text-white border-[#22C55E]'
                  : 'bg-white/[0.04] border-white/10 text-white hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedLink ? 'Copied' : 'Share'}</span>
            </button>

            {/* Add Review Action */}
            <button
              onClick={() => {
                if (!user) {
                  showWarning("Please authenticate to write a review.");
                } else {
                  setShowAddReviewModal(true);
                }
              }}
              className="h-7.5 px-4 rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-semibold text-white hover:bg-white/[0.08] hover:border-white/20 flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Add Review</span>
            </button>
          </div>

          {/* ROW 3: Category tag, Video Title, Rating Row */}
          <div className="flex flex-col gap-1.5 py-1 text-left">
            <span className="text-[10px] font-bold text-[#FF0000] tracking-wider uppercase">
              {(lecture.subject || "Chemistry")} • {(lecture.examType || "JEE")}
            </span>
            <h1 className="text-base sm:text-lg font-bold text-white leading-snug tracking-tight select-text">
              {lecture.title || "Periodic Table and Chemistry Periodicity One-Shot"}
            </h1>
            
            <div 
              onClick={() => {
                setShowFullScreenReviews(true);
              }}
              className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white transition-all cursor-pointer w-fit mt-1.5 bg-zinc-900/40 border border-white/5 py-1.5 px-3.5 rounded-full hover:bg-zinc-900/80 active:scale-95"
            >
              <span className="font-extrabold text-white text-xs">{averageRating || "4.8"}</span>
              <div className="flex text-amber-500 gap-0.5 ml-0.5">
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current" />
                <Star className="w-3 h-3 fill-current animate-none" />
              </div>
              <span className="text-zinc-400 font-bold text-[10.5px] ml-1">
                ({localReviews.length ? `${localReviews.length} Student Reviews` : "18.7K Ratings"})
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-500 stroke-[2.5]" />
            </div>
          </div>

          {/* ROW 4: Expandable Description Card with smooth motion layout */}
          <motion.div
            layout
            initial={{ height: "auto" }}
            className="py-3.5 px-4 rounded-2xl bg-zinc-900/30 border border-white/5 text-left cursor-pointer transition-all hover:bg-zinc-900/60 mt-2 mb-3 select-none"
            onClick={() => setIsDescExpanded(!isDescExpanded)}
          >
            <motion.p 
              layout
              className={`text-xs text-zinc-350 leading-relaxed whitespace-pre-line ${!isDescExpanded ? 'line-clamp-2' : ''} font-sans`}
            >
              {lecture.description || "Complete periodicity in one shot with concepts, trends, exceptions and important JEE questions."}
            </motion.p>
            <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors">
              <span>{isDescExpanded ? 'Show Less' : 'More'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isDescExpanded ? 'rotate-90' : ''}`} />
            </div>
          </motion.div>
          </div>
        )}

      </div>

          {/* Right Column: Dynamic Lesson Recommendation Sidebar (stretches full width below player) */}
          {!isFullscreenMode && nextUpLessons && nextUpLessons.length > 0 && (
            <div className="w-full space-y-4 px-4 lg:px-0">
              <div className="bg-[#000000] border-t border-white/5 lg:border lg:border-neutral-900 rounded-3xl p-4 lg:p-5 space-y-4 text-left">
                {/* Vertical scroller/viewer stretched to match the width boundary of the player */}
                <div className="flex flex-col gap-3.5">
                  {nextUpLessons.map((lec) => {
                    const views = lec.viewsCount || Math.floor(Math.abs(lec.id.charCodeAt(0) * 12345) % 850000);
                    const formattedViews = formatViewsCount(views);
                    const timeAgo = getRelativeUploadTime(lec.publishDate || lec.createdAt);

                    return (
                      <div
                        key={lec.id}
                        onClick={() => {
                          if (onSelectLecture) onSelectLecture(lec);
                        }}
                        className="p-3 bg-zinc-950/20 border border-white/[0.03] hover:bg-zinc-900/40 hover:border-white/10 rounded-2xl flex gap-3.5 text-left transition-all cursor-pointer group shrink-0 relative"
                      >
                        {/* Video Thumbnail area with duration badge */}
                        <div className="relative w-[130px] xs:w-[140px] aspect-video bg-black overflow-hidden rounded-xl flex-shrink-0 border border-white/5 shadow-md">
                          <SafeImage
                            src={getLectureThumbnail(lec)}
                            alt={lec.title}
                            className="w-full h-full"
                            imageClassName="transition-transform duration-300 group-hover:scale-105"
                            variant="thumbnail"
                          />
                          
                          {/* Centered Play Button overlay loop */}
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/45 transition-colors" />
                          <div className="absolute inset-0 m-auto w-7 h-7 bg-black/60 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100 transition-all duration-200">
                            <Play className="w-3 h-3 fill-current text-white ml-0.5" />
                          </div>

                          <span className="absolute bottom-1 right-1.5 bg-black/90 px-1.5 py-0.5 font-mono text-[9px] font-bold text-zinc-100 rounded">
                            {lec.duration || "2:15:28"}
                          </span>
                        </div>
                        
                        {/* Right Text details column */}
                        <div className="flex-1 min-w-0 flex flex-col justify-center text-left">
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-[13px] font-bold text-zinc-100 leading-snug line-clamp-2 group-hover:text-red-500 transition-colors select-text">
                              {lec.title}
                            </h4>
                            
                            <span className="text-[10.5px] text-zinc-400 font-bold block mt-1 hover:text-white transition-colors">
                              {lec.teacherName || "Verified Educator"}
                            </span>

                            <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">
                              {formattedViews} • {timeAgo}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RATING MODAL WINDOWS */}
      <AnimatePresence>
        {showAddReviewModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-55 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#131316] border border-[#1E1E24] p-6 rounded-2xl text-left shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddReviewModal(false)}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white uppercase tracking-wide font-mono">Submit Verification Review</h3>
              </div>
              <p className="text-xs text-zinc-400 mb-4 font-sans leading-relaxed">
                Add your rating to update real-time statistics of <span className="text-red-500 font-bold">{lecture.teacherName}</span>. Your rating will modify trust aggregations immediately.
              </p>

              <form onSubmit={handleReviewSubmitAction} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Select Rating Star</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((starValue) => (
                      <button
                        key={starValue}
                        type="button"
                        onClick={() => setNewRating(starValue)}
                        className="p-1 rounded-xl cursor-pointer hover:bg-zinc-900 transition-colors"
                      >
                        <Star className={`w-8 h-8 ${newRating >= starValue ? 'text-amber-500 fill-current' : 'text-zinc-700'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Commentary Feedback</label>
                  <textarea
                    rows={3}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Describe your verification check. (E.g. Clear concepts, covers complete topics...)"
                    className="w-full bg-[#0A0A0B] border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 outline-none focus:border-red-500 font-sans placeholder-zinc-650 transition-colors resize-none animate-none"
                  />
                </div>

                <div className="flex items-center gap-2.5 p-3 bg-red-950/20 border border-red-950/15 rounded-xl">
                  <FileCheck2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span className="text-[9px] font-mono text-red-500 leading-normal">
                    This account is registered as a verified student participant. Your feedback is highly weighted in the algorithm of our trust score calculations.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full py-2.5 bg-red-650 text-white font-bold font-mono text-xs uppercase rounded-xl hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
                >
                  {reviewSubmitting ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      <span>Submitting Check...</span>
                    </>
                  ) : (
                    <span>Submit Review Check</span>
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATABLE REPORT SUCCESS TOAST NOTIFICATE */}
      <AnimatePresence>
        {showReportToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-55 bg-zinc-950 border border-white/10 p-4 rounded-2xl flex items-center gap-3 shadow-2xl backdrop-blur-md max-w-sm w-[90%]"
          >
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-bold text-white font-sans">Issue Reported Successfully</span>
              <span className="text-[10px] text-zinc-400 font-sans">Technical details & network logs synced</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DEDICATED FULL-SCREEN REVIEWS OVERLAY SECTION */}
      <AnimatePresence>
        {showFullScreenReviews && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden text-zinc-100 font-sans"
          >
            {/* Reviews Header bar */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur shrink-0">
              <button
                onClick={() => setShowFullScreenReviews(false)}
                className="p-1.5 hover:bg-white/10 rounded-full text-white transition-all active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-left">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Course Verification Reviews</h2>
                <p className="text-[10px] text-zinc-400">Student feedback and trust certificates for {lecture.teacherName || "Verified Educator"}</p>
              </div>
            </div>

            {/* Scrollable board content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              
              {/* Aggregation statistics widget */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-950/40 border border-white/5 p-5 rounded-3xl">
                
                {/* Visual stars summary */}
                <div className="flex flex-col items-center justify-center p-3 border-b md:border-b-0 md:border-r border-white/5 text-center">
                  <span className="text-4xl font-extrabold text-white font-sans">{averageRating || "4.8"}</span>
                  <div className="flex text-amber-500 gap-0.5 my-2">
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current" />
                    <Star className="w-4 h-4 fill-current animate-none" />
                  </div>
                  <span className="text-[11px] font-medium text-zinc-400">
                    Based on {localReviews.length ? `${localReviews.length} Student Reviews` : "18.7K Ratings"}
                  </span>
                </div>

                {/* Circular Trust score graph wrapper */}
                <div className="flex flex-col items-center justify-center p-3 border-b md:border-b-0 md:border-r border-white/5 text-center select-none">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeOpacity="0.08" />
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="15" 
                        fill="none" 
                        stroke="#22C55E" 
                        strokeWidth="2.5" 
                        strokeDasharray="94.2" 
                        strokeDashoffset={94.2 - (94.2 * (averageRating ? Number(averageRating) * 20 : 92)) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-mono font-bold text-white">
                        {Math.round(averageRating ? Number(averageRating) * 20 : 92)}%
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-white mt-2">Verified Trust Score</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 font-sans">Index based on verified student status</span>
                </div>

                {/* Distribution breakout bars */}
                <div className="flex flex-col justify-center p-3 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                    localReviews.forEach(r => {
                      const star = Math.max(1, Math.min(5, Math.floor(r.rating || 5)));
                      counts[star as 5 | 4 | 3 | 2 | 1]++;
                    });
                    const total = localReviews.length || 1;
                    const pct = localReviews.length 
                      ? Math.round((counts[stars as 5|4|3|2|1] / total) * 100) 
                      : (stars === 5 ? 75 : stars === 4 ? 15 : stars === 3 ? 6 : stars === 2 ? 3 : 1);

                    return (
                      <div key={stars} className="flex items-center gap-2 text-[11px]">
                        <span className="w-3 text-right font-semibold text-zinc-400">{stars}</span>
                        <Star className="w-3 h-3 text-zinc-500 fill-zinc-500 shrink-0" />
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-550 bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 text-left font-mono text-zinc-400">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Action trigger & Sorters category line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">Sort reviews:</span>
                  <div className="flex gap-1 bg-zinc-950 p-1 rounded-xl border border-white/15">
                    {(['newest', 'highest', 'lowest'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setReviewSort(mode)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all ${
                          reviewSort === mode 
                            ? 'bg-zinc-850 text-white shadow' 
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!user) {
                      showWarning("Please authenticate to submit your reviews.");
                    } else {
                      setShowAddReviewModal(true);
                    }
                  }}
                  className="px-4.5 py-2.5 bg-red-650 hover:bg-red-600 transition-colors text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Write or Submit Review</span>
                </button>
              </div>

              {/* Iterating scroll cards feed */}
              <div className="space-y-3 pb-16 text-left">
                {(() => {
                  const sorted = [...localReviews];
                  if (reviewSort === 'highest') {
                    sorted.sort((a, b) => (b.rating || 5) - (a.rating || 5));
                  } else if (reviewSort === 'lowest') {
                    sorted.sort((a, b) => (a.rating || 5) - (b.rating || 5));
                  } else {
                    sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
                  }

                  if (sorted.length > 0) {
                    return sorted.map((rev) => (
                      <div 
                        key={rev.id} 
                        className="p-4 bg-zinc-950/25 border border-white/5 rounded-2xl flex flex-col gap-2 transition-all hover:border-white/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-col leading-tight text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-xs">{rev.userDisplayName}</span>
                              <span className="text-[8px] bg-red-950/30 text-red-450 px-1.5 rounded border border-red-900/40 font-mono uppercase tracking-widest leading-none py-0.5">
                                Verified Student
                              </span>
                            </div>
                            <span className="text-[9px] text-zinc-500 font-medium font-mono mt-1">
                              {getRelativeUploadTime(rev.createdAt)}
                            </span>
                          </div>

                          <div className="flex gap-0.5 text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3 h-3 ${i < (rev.rating || 5) ? 'fill-current text-amber-550' : 'text-zinc-800'}`} 
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed font-sans mt-0.5 whitespace-pre-wrap">
                          {rev.comment}
                        </p>
                      </div>
                    ));
                  }

                  return (
                    <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-zinc-900/60 flex items-center justify-center text-zinc-500 border border-white/5 shadow">
                        <Star className="w-5 h-5 stroke-[1.5]" />
                      </div>
                      <h3 className="text-sm font-bold text-white">No Reviews Posted Yet</h3>
                      <p className="text-xs text-zinc-500 max-w-xs font-sans">Be the first verified student to rate this lecture and help track educator reliability statistics.</p>
                    </div>
                  );
                })()}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// STYLISH CUSTOM DATA HELPER UTILITY FUNCTIONS outside component
const formatViewsCount = (count?: number) => {
  if (!count) return "12.4K views";
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M views`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K views`;
  }
  return `${count} views`;
};

const getRelativeUploadTime = (dateStr?: string) => {
  if (!dateStr) return "3 months ago";
  try {
    const p = Date.parse(dateStr);
    if (isNaN(p)) return "2 months ago";
    const diffMs = Date.now() - p;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  } catch(e) {
    return "3 months ago";
  }
};
