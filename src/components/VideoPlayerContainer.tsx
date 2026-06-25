import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, 
  Sun, Settings, Lock, Unlock, ArrowLeft, MoreVertical, Flag, ShieldAlert,
  Info, Clock, ChevronRight
} from 'lucide-react';
import { Lecture } from '../types';
import { usePlayer } from '../context/PlayerContext';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface VideoPlayerContainerProps {
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

export default function VideoPlayerContainer({
  lecture,
  onClose,
  playlistLectures = [],
  onSelectLecture
}: VideoPlayerContainerProps) {
  // Video player API states
  const { isPlaying, setIsPlaying } = usePlayer();
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [totalDurationSec, setTotalDurationSec] = useState(1);
  const [bufferPercent, setBufferPercent] = useState(0);

  // Playback features
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [quality, setQuality] = useState<string>('1080p');
  const [isCaptionsOn, setIsCaptionsOn] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Gesture overlays
  const [brightness, setBrightness] = useState<number>(100);
  const [volume, setVolume] = useState<number>(85);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [showSeekOverlay, setShowSeekOverlay] = useState<'forward' | 'backward' | null>(null);

  // HUD controls
  const [showControls, setShowControls] = useState(true);
  const [showSettingsPopup, setShowSettingsPopup] = useState(false);
  const [showReportToast, setShowReportToast] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Dragging gestures values
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartValRef = useRef(0);
  const dragTypeRef = useRef<'brightness' | 'volume' | null>(null);

  const brightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset states on lecture change
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTimeSec(0);
    setBufferPercent(0);
    setTotalDurationSec(1);
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

  // Initialize YT Player
  useEffect(() => {
    let active = true;
    let playerInstance: any = null;
    let checkInterval: any = null;
    let initialized = false;

    const createPlayer = () => {
      if (!active || initialized) return;
      if (!window.YT || !window.YT.Player) return;

      initialized = true;
      const videoId = getYoutubeId(lecture.videoUrl);

      // Recreate iframe container to prevent API desync
      const container = document.getElementById('yt-iframe-container');
      if (container) {
        container.innerHTML = '<div id="yt-iframe-player" style="position: absolute; top:0; left:0; width:100%; height:100%; border:none; z-index:1; pointer-events:none;"></div>';
      }

      setPlayerReady(false);

      playerInstance = new window.YT.Player('yt-iframe-player', {
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
            event.target.setVolume(volume);
            event.target.setPlaybackRate(playbackSpeed);
            try {
              event.target.playVideo();
            } catch (err) {
              console.warn("Autoplay blocked:", err);
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
            } else if (event.data === 2) {
              setIsPlaying(false);
            } else if (event.data === 0) {
              setIsPlaying(false);
              // Auto play next video if in playlist
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
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          createPlayer();
        }
      }, 100);

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
      if (playerInstance && typeof playerInstance.destroy === 'function') {
        try {
          playerInstance.destroy();
        } catch (e) {
          console.warn("Player destroy failed:", e);
        }
      }
      ytPlayerRef.current = null;
      setPlayerReady(false);
    };
  }, [lecture]);

  // Sync timer logic for playback position and buffering
  useEffect(() => {
    const interval = setInterval(() => {
      if (ytPlayerRef.current && isPlaying && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const current = ytPlayerRef.current.getCurrentTime();
          const duration = ytPlayerRef.current.getDuration() || totalDurationSec;
          const loadedFraction = ytPlayerRef.current.getVideoLoadedFraction() || 0;

          setCurrentTimeSec(Math.floor(current));
          setTotalDurationSec(Math.floor(duration));
          setBufferPercent(Math.floor(loadedFraction * 100));
        } catch (e) {
          console.warn("Sync position failed:", e);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPlaying, totalDurationSec]);

  // Controls auto-hide timer
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (!isLocked && isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsPopup(false);
      }, 3500);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, isLocked]);

  // Seeking support
  const handleSeekToPercent = (pct: number) => {
    if (isLocked || !ytPlayerRef.current) return;
    const targetSec = Math.floor((pct / 100) * totalDurationSec);
    try {
      ytPlayerRef.current.seekTo(targetSec, true);
      setCurrentTimeSec(targetSec);
    } catch (e) {
      console.warn(e);
    }
    resetControlsTimer();
  };

  const handleSeekOffset = (direction: 'forward' | 'backward') => {
    if (isLocked || !ytPlayerRef.current) return;
    try {
      const current = ytPlayerRef.current.getCurrentTime();
      const duration = ytPlayerRef.current.getDuration() || totalDurationSec;
      let target = current + (direction === 'forward' ? 10 : -10);
      target = Math.max(0, Math.min(duration, target));

      ytPlayerRef.current.seekTo(target, true);
      setCurrentTimeSec(Math.floor(target));

      setShowSeekOverlay(direction);
      if (seekTimeoutRef.current) clearTimeout(seekTimeoutRef.current);
      seekTimeoutRef.current = setTimeout(() => {
        setShowSeekOverlay(null);
      }, 800);
    } catch (e) {
      console.warn(e);
    }
  };

  // Play / Pause
  const togglePlayPause = () => {
    if (isLocked || !ytPlayerRef.current) return;
    try {
      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn(e);
    }
    resetControlsTimer();
  };

  // Pointer drag/swipe engine (VLC style)
  const handlePointerDown = (clientX: number, clientY: number, target: HTMLElement) => {
    if (isLocked || !containerRef.current) return;
    // Don't trigger gesture if clicking active interactive items
    if (target.closest('button') || target.closest('input') || target.closest('.hud-control')) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const isLeftHalf = relativeX < rect.width / 2;

    isDraggingRef.current = true;
    dragStartYRef.current = clientY;

    if (isLeftHalf) {
      dragTypeRef.current = 'brightness';
      dragStartValRef.current = brightness;
      setShowBrightnessIndicator(true);
      setShowVolumeIndicator(false);
      if (brightTimeoutRef.current) clearTimeout(brightTimeoutRef.current);
      brightTimeoutRef.current = setTimeout(() => setShowBrightnessIndicator(false), 1500);
    } else {
      dragTypeRef.current = 'volume';
      dragStartValRef.current = volume;
      setShowVolumeIndicator(true);
      setShowBrightnessIndicator(false);
      if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
      volTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
    }
  };

  const handlePointerMove = (clientY: number) => {
    if (!isDraggingRef.current || !dragTypeRef.current) return;

    const deltaY = dragStartYRef.current - clientY;
    const sensitivity = 1.5; // Drag sensitivity
    const deltaPercent = Math.round(deltaY / sensitivity);

    if (dragTypeRef.current === 'brightness') {
      const newBright = Math.max(20, Math.min(100, dragStartValRef.current + deltaPercent));
      setBrightness(newBright);
      setShowBrightnessIndicator(true);
      if (brightTimeoutRef.current) clearTimeout(brightTimeoutRef.current);
      brightTimeoutRef.current = setTimeout(() => setShowBrightnessIndicator(false), 1500);
    } else if (dragTypeRef.current === 'volume') {
      const newVol = Math.max(0, Math.min(100, dragStartValRef.current + deltaPercent));
      setVolume(newVol);
      try {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
          ytPlayerRef.current.setVolume(newVol);
        }
      } catch (e) {
        console.warn(e);
      }
      setShowVolumeIndicator(true);
      if (volTimeoutRef.current) clearTimeout(volTimeoutRef.current);
      volTimeoutRef.current = setTimeout(() => setShowVolumeIndicator(false), 1500);
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    dragTypeRef.current = null;
  };

  // Double tap / Single click detection on video canvas
  const handleCanvasClick = (clientX: number, target: HTMLElement) => {
    if (isLocked || !containerRef.current) return;
    if (target.closest('button') || target.closest('input') || target.closest('.hud-control')) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const width = rect.width;

    // Double tap seeking check: Left 30% width or Right 30% width
    if (relativeX < width * 0.3) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        handleSeekOffset('backward');
        return;
      }
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        toggleControls();
      }, 250);
    } else if (relativeX > width * 0.7) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        handleSeekOffset('forward');
        return;
      }
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        toggleControls();
      }, 250);
    } else {
      // Center 40% is direct click-to-play/pause
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        togglePlayPause();
        return;
      }
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        toggleControls();
      }, 250);
    }
  };

  const toggleControls = () => {
    if (showControls) {
      setShowControls(false);
      setShowSettingsPopup(false);
    } else {
      resetControlsTimer();
    }
  };

  // Speed adjustments
  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    try {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
        ytPlayerRef.current.setPlaybackRate(speed);
      }
    } catch (e) {
      console.warn(e);
    }
    setShowSettingsPopup(false);
    resetControlsTimer();
  };

  // Fullscreen support
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.warn("Fullscreen request rejected:", err);
        });
      } else {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        });
      }
    } catch (e) {
      setIsFullscreen(!isFullscreen);
    }
    resetControlsTimer();
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = (secs: number): string => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);

    const sStr = s < 10 ? `0${s}` : `${s}`;
    if (h > 0) {
      const mStr = m < 10 ? `0${m}` : `${m}`;
      return `${h}:${mStr}:${sStr}`;
    }
    return `${m}:${sStr}`;
  };

  const progressPercent = totalDurationSec > 0 ? (currentTimeSec / totalDurationSec) * 100 : 0;

  return (
    <div 
      ref={containerRef}
      className={`relative w-full aspect-video bg-black overflow-hidden select-none group border border-white/[0.03] rounded-2xl ${
        isFullscreen ? 'rounded-none border-none h-screen w-screen max-w-none' : ''
      }`}
      onTouchStart={(e) => {
        resetControlsTimer();
        handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.target as HTMLElement);
      }}
      onTouchMove={(e) => {
        handlePointerMove(e.touches[0].clientY);
      }}
      onTouchEnd={handlePointerUp}
      onMouseDown={(e) => {
        resetControlsTimer();
        handlePointerDown(e.clientX, e.clientY, e.target as HTMLElement);
      }}
      onMouseMove={(e) => {
        handlePointerMove(e.clientY);
      }}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
    >
      {/* YT Iframe Container */}
      <div 
        id="yt-iframe-container" 
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Screen Brightness Overlay Div */}
      <div 
        className="absolute inset-0 bg-black pointer-events-none z-2"
        style={{ opacity: Math.max(0, (100 - brightness) / 100 * 0.75) }}
      />

      {/* Transparent Click Interceptor (Catches all video clicks/taps) */}
      <div 
        className="absolute inset-0 w-full h-full bg-transparent z-10 cursor-pointer"
        onClick={(e) => handleCanvasClick(e.clientX, e.target as HTMLElement)}
      />

      {/* REACTION: END-SCREEN/PAUSE RECOMMENDATION MASK */}
      {(!isPlaying && playerReady) && (
        <div className="absolute inset-0 w-full h-full bg-black/90 z-15 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center transition-all duration-300">
          <div className="max-w-md space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
              Biovised Shield
            </span>
            <h3 className="text-base font-bold text-white leading-snug">
              {lecture.title}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-sm">
              YouTube related recommendations have been shielded for distraction-free learning.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button 
                onClick={togglePlayPause}
                className="px-5 py-2 rounded-full bg-white text-black font-semibold text-xs transition hover:bg-zinc-200 cursor-pointer flex items-center gap-2 shadow"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume Lecture
              </button>
              {onClose && (
                <button 
                  onClick={onClose}
                  className="px-4 py-2 rounded-full bg-zinc-900 border border-white/10 text-white font-medium text-xs transition hover:bg-zinc-800 cursor-pointer"
                >
                  Go Back
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GESTURAL INDICATOR SLIDERS */}
      {/* 1. Left Side Brightness Gauge */}
      {showBrightnessIndicator && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 bg-black/80 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-3 z-30 shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          <Sun className="w-4 h-4 text-zinc-300" />
          <div className="w-1.5 h-20 bg-zinc-900 rounded-full relative overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 w-full bg-[#10B981] rounded-full transition-all duration-700 ease-out"
              style={{ height: `${brightness}%` }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-300">{brightness}%</span>
        </div>
      )}

      {/* 2. Right Side Volume Gauge */}
      {showVolumeIndicator && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 bg-black/80 border border-white/5 p-4 rounded-2xl flex flex-col items-center gap-3 z-30 shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-200">
          {volume === 0 ? <VolumeX className="w-4 h-4 text-zinc-300" /> : <Volume2 className="w-4 h-4 text-zinc-300" />}
          <div className="w-1.5 h-20 bg-zinc-900 rounded-full relative overflow-hidden">
            <div 
              className="absolute bottom-0 left-0 w-full bg-[#10B981] rounded-full transition-all duration-700 ease-out"
              style={{ height: `${volume}%` }}
            />
          </div>
          <span className="text-[10px] font-mono font-bold text-zinc-300">{volume}%</span>
        </div>
      )}

      {/* DOUBLE TAP ACTION SEEK GRAPHIC OVERLAYS */}
      {showSeekOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="bg-black/75 border border-white/10 px-5 py-4 rounded-full flex flex-col items-center justify-center gap-2 shadow-2xl scale-110 duration-200">
            {showSeekOverlay === 'backward' ? (
              <>
                <RotateCcw className="w-8 h-8 text-white animate-spin-reverse duration-1000" />
                <span className="text-xs font-mono font-extrabold text-white">-10s</span>
              </>
            ) : (
              <>
                <RotateCw className="w-8 h-8 text-white animate-spin duration-1000" />
                <span className="text-xs font-mono font-extrabold text-white">+10s</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* CUSTOM OVERLAY VIDEO CONTROLS (HUD) */}
      <div 
        className={`absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pb-5 pt-10 text-white transition-all duration-300 ${
          showControls && !isLocked ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Controls Row: Play/Pause, Skip back/forward, HUD Actions */}
        <div className="flex flex-col gap-4">
          
          {/* Timeline Seek-Track Bar (Signal Red / Tangerine Pairing) */}
          <div className="flex items-center gap-3">
            <span className="text-[10.5px] font-mono font-medium text-zinc-400 select-none">
              {formatTime(currentTimeSec)}
            </span>
            
            <div 
              className="hud-control relative flex-1 h-1.5 bg-[#18181B] rounded-full cursor-pointer overflow-visible"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const pct = (clickX / rect.width) * 100;
                handleSeekToPercent(pct);
              }}
            >
              {/* Buffered buffer bar (Tangerine) */}
              <div 
                className="absolute top-0 left-0 h-full bg-[#F97316]/50 rounded-full"
                style={{ width: `${Math.max(progressPercent, bufferPercent)}%` }}
              />
              
              {/* Played timeline (Signal Red) */}
              <div 
                className="absolute top-0 left-0 h-full bg-[#DC2626] rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
              
              {/* Seek handle dot (Clean white node) */}
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border border-black shadow pointer-events-none"
                style={{ left: `calc(${progressPercent}% - 7px)` }}
              />
            </div>

            <span className="text-[10.5px] font-mono font-medium text-zinc-400 select-none">
              {formatTime(totalDurationSec)}
            </span>

            <button 
              onClick={toggleFullscreen}
              className="hud-control p-1 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>

          {/* Buttons Navigation Ribbon */}
          <div className="flex items-center justify-between">
            {/* Playback Controls Group */}
            <div className="flex items-center gap-3.5">
              <button 
                onClick={togglePlayPause}
                className="hud-control p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition active:scale-95 flex items-center justify-center cursor-pointer shadow"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>

              <button 
                onClick={() => handleSeekOffset('backward')}
                className="hud-control p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
                title="Rewind 10s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button 
                onClick={() => handleSeekOffset('forward')}
                className="hud-control p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
                title="Forward 10s"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <button 
                  onClick={() => {
                    const newVol = volume === 0 ? 80 : 0;
                    setVolume(newVol);
                    if (ytPlayerRef.current) ytPlayerRef.current.setVolume(newVol);
                  }}
                  className="hud-control p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition"
                >
                  {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={volume}
                  onChange={(e) => {
                    const newVol = Number(e.target.value);
                    setVolume(newVol);
                    if (ytPlayerRef.current) ytPlayerRef.current.setVolume(newVol);
                  }}
                  className="hud-control w-14 accent-white h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Utility buttons row (Lock, Speed, Quality, Captions, Report) - Neutral Monochrome */}
            <div className="flex items-center gap-2">
              
              {/* Speed Controller */}
              <button 
                onClick={() => {
                  setShowSettingsPopup(!showSettingsPopup);
                  resetControlsTimer();
                }}
                className="hud-control flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{playbackSpeed}x</span>
              </button>

              {/* Quality indicator */}
              <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-zinc-400 uppercase">
                {quality}
              </span>

              {/* Captions Button */}
              <button 
                onClick={() => {
                  setIsCaptionsOn(!isCaptionsOn);
                  resetControlsTimer();
                }}
                className={`hud-control px-2.5 py-1 rounded-full border text-[10px] font-extrabold transition cursor-pointer ${
                  isCaptionsOn 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-zinc-400 border-white/10 hover:text-white'
                }`}
              >
                CC
              </button>

              {/* Report Button */}
              <button 
                onClick={() => {
                  setShowReportToast(true);
                  setTimeout(() => setShowReportToast(false), 3000);
                  resetControlsTimer();
                }}
                className="hud-control p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition"
                title="Report Video"
              >
                <Flag className="w-4 h-4" />
              </button>

              {/* Lock Button */}
              <button 
                onClick={() => {
                  setIsLocked(true);
                  setShowControls(false);
                }}
                className="hud-control p-1.5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition ml-1"
                title="Lock Controls"
              >
                <Lock className="w-4 h-4" />
              </button>

            </div>
          </div>
        </div>

      </div>

      {/* Speed Controller Settings Popup Overlay */}
      {showSettingsPopup && (
        <div className="absolute right-4 bottom-16 bg-black/95 border border-white/10 rounded-2xl p-2.5 w-44 z-40 shadow-2xl backdrop-blur">
          <span className="block px-3 py-1.5 text-[10px] font-extrabold font-mono text-zinc-500 uppercase tracking-widest border-b border-white/5 mb-1.5">
            Playback Speed
          </span>
          <div className="flex flex-col gap-0.5">
            {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                  playbackSpeed === speed 
                    ? 'bg-white text-black' 
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{speed === 1.0 ? 'Normal' : `${speed}x`}</span>
                {playbackSpeed === speed && <span className="text-[9px] font-extrabold">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lock Screen Indicator (Shown when locked, touch to unlock) */}
      {isLocked && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/25 pointer-events-auto">
          <button 
            onClick={() => {
              setIsLocked(false);
              setShowControls(true);
            }}
            className="p-4 rounded-full bg-black/95 border border-white/10 text-white shadow-2xl transition hover:scale-110 active:scale-95 cursor-pointer flex flex-col items-center gap-2"
          >
            <Unlock className="w-5 h-5 text-white" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Unlock Screen</span>
          </button>
        </div>
      )}

      {/* Video Report Toast */}
      {showReportToast && (
        <div className="absolute top-4 right-4 bg-zinc-900 border border-white/10 text-white px-3 py-2 rounded-xl flex items-center gap-2 z-40 shadow-xl text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200">
          <ShieldAlert className="w-4 h-4 text-[#10B981]" />
          <span>Lecture content flagged for review.</span>
        </div>
      )}

      {/* Header bar overlay (Shows back button and video title when controls visible) */}
      {showControls && !isLocked && (
        <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/85 via-black/35 to-transparent p-4 flex items-center justify-between text-white pointer-events-none">
          <div className="flex items-center gap-3 min-w-0 pointer-events-auto">
            {onClose && (
              <button 
                onClick={onClose}
                className="hud-control p-2 hover:bg-white/10 rounded-full text-zinc-300 hover:text-white transition active:scale-90 cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="text-left min-w-0">
              <h4 className="text-sm font-bold text-white truncate max-w-[280px] xs:max-w-[400px] md:max-w-xl">
                {lecture.title}
              </h4>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {lecture.subject} • {lecture.examType}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button className="hud-control p-1.5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition">
              <Settings className="w-4 h-4" />
            </button>
            <button className="hud-control p-1.5 hover:bg-white/10 rounded-lg text-zinc-300 hover:text-white transition">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
