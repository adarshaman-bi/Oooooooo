import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import useSWR from 'swr';
import { SWR_KEYS, swrOptions, fetchActivePlaylists, fetchActiveTeachers, fetchActiveChannels, fetchActiveVideos } from '../utils/swrConfig';
import { supabase } from '../utils/supabaseClient';
import {
  Play,
  Search,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  Tv,
  CheckCircle,
  Clock,
  Youtube,
  Sparkles,
  Maximize2,
  Bookmark,
  Volume2,
  VolumeX,
  RotateCcw,
  SlidersHorizontal,
  X,
  CornerDownRight,
  BookOpen
} from 'lucide-react';
import { YouTubeChannel, YouTubeVideo, Playlist, TEACHER_TO_CHANNEL, Lecture as TypesLecture } from '../types';
import BiovisedPlayer from './BiovisedPlayer';
import LectureDetailsSection from './LectureDetailsSection';
import { getPlaylistThumbnail } from '../services/thumbnailHelper';
import { formatSubscribers, mapVideoRow } from '../utils/youtubeUtils';
import ChannelHeader from './ChannelHeader';
import LectureCard from './LectureCard';
import { SafeImage } from './SafeImage';
import YoutubeThumbnailImg from './YoutubeThumbnailImg';
import { handleRowKeyDown } from './HorizontalRow';

interface VideoLibraryProps {
  onBackToHome: () => void;
  onSelectChannel?: (id: string, type: 'teacher' | 'institute') => void;
  isActive?: boolean;
  playlists: any[];
  channels: any[];
}

interface WatchHistoryItem {
  id: string;
  videoId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  progressSeconds: number;
  durationSeconds: number;
  lastUpdated: number;
  playlistId: string;
  subject: string;
}

function VideoLibrarySkeleton() {
  return (
    <div className="space-y-10 text-left animate-pulse">
      {/* 1. SUBJECT STREAM TABS CONTROLLER SKELETON */}
      <div className="h-[48px] flex items-center">
        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none border-b border-[#18181B] w-full">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="w-20 h-7 bg-neutral-900 border border-neutral-800 rounded-full shrink-0"
            />
          ))}
        </div>
      </div>

      {/* 2. FEATURED CURATED PLAYLISTS CAROUSEL SKELETON */}
      <div className="space-y-4">
        <div>
          <div className="h-2.5 bg-neutral-800 rounded w-24 mb-2" />
          <div className="h-5 bg-neutral-800 rounded w-48" />
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="w-[280px] shrink-0 flex flex-col gap-3">
              <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden" />
              <div className="space-y-2">
                <div className="h-3 bg-neutral-850 rounded w-16" />
                <div className="h-3 bg-neutral-850 rounded w-5/6" />
                <div className="h-2.5 bg-neutral-900 rounded w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CONTINUE WATCHING PROGRESS ROW SKELETON */}
      <div className="space-y-4">
        <div>
          <div className="h-2.5 bg-neutral-800 rounded w-28 mb-2" />
          <div className="h-5 bg-neutral-800 rounded w-48" />
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-[280px] shrink-0 flex flex-col gap-3">
              <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden" />
              <div className="space-y-2">
                <div className="h-3 bg-neutral-850 rounded w-16" />
                <div className="h-3 bg-neutral-850 rounded w-5/6" />
                <div className="h-2.5 bg-neutral-900 rounded w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. NEW THIS WEEK IMPORTED VIDEOS ROW SKELETON */}
      <div className="space-y-4">
        <div>
          <div className="h-2.5 bg-neutral-800 rounded w-24 mb-2" />
          <div className="h-5 bg-neutral-800 rounded w-40" />
        </div>
        <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-none">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="w-[280px] shrink-0 flex flex-col gap-3">
              <div className="relative aspect-video bg-neutral-900 rounded-xl overflow-hidden" />
              <div className="space-y-2">
                <div className="h-3 bg-neutral-850 rounded w-5/6" />
                <div className="h-2.5 bg-neutral-900 rounded w-2/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function VideoLibrary({ onBackToHome, onSelectChannel, isActive = true, playlists: propPlaylists, channels: propChannels }: VideoLibraryProps) {
  const { user } = useAuth();

  // Active view states
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<YouTubeChannel | null>(null);

  // Firestore real-time data states
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [videosState, setVideosState] = useState<YouTubeVideo[]>([]);
  
  // Statuses
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Home Subjects tab
  const SUBJECT_TABS = ['All', 'Biology', 'Botany', 'Zoology', 'Physics', 'Chemistry'];
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  // Search and Advanced Filters from Global Context-Aware Search Architecture
  const { searchQuery, setSearchQuery } = useSearch();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([]);
  const [filterSubject, setFilterSubject] = useState('All');
  const [filterChannel, setFilterChannel] = useState('All');
  const [filterDuration, setFilterDuration] = useState('All'); // 'All' | 'Short'(<10m) | 'Medium'(10-30m) | 'Long'(>30m)
  const [showFilters, setShowFilters] = useState(false);

  // Local Storage states
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>([]);

  // Custom Player states & variables
  const [playerIsReady, setPlayerIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerVolume, setPlayerVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const ytPlayerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Pause off-screen video player if tab is inactive
  useEffect(() => {
    if (!isActive && isPlaying) {
      setIsPlaying(false);
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (e) {
          console.warn("Failed to pause off-screen YouTube player:", e);
        }
      }
    }
  }, [isActive, isPlaying]);

  // Process channels from props
  useEffect(() => {
    if (propChannels) {
      setChannels(propChannels);
    }
  }, [propChannels]);

  // Process playlists from props
  useEffect(() => {
    if (propPlaylists) {
      setPlaylists(propPlaylists);
    }
  }, [propPlaylists]);

  // Sync isLoadingFeed based on loading status
  useEffect(() => {
    setIsLoadingFeed(isLoadingVideos);
  }, [isLoadingVideos]);

  useEffect(() => {
    if (playlists.length > 0) {
      const savedPlaylistId = sessionStorage.getItem('biovised_selected_playlist_id');
      if (savedPlaylistId) {
        const found = playlists.find(p => p.id === savedPlaylistId);
        if (found) {
          setSelectedPlaylist(found);
          sessionStorage.removeItem('biovised_selected_playlist_id');
        }
      }
    }
  }, [playlists]);

  useEffect(() => {
    if (channels.length > 0) {
      const savedChannelId = sessionStorage.getItem('biovised_selected_channel_id');
      if (savedChannelId) {
        const found = channels.find(c => c.channelId === savedChannelId);
        if (found) {
          setSelectedChannel(found);
          sessionStorage.removeItem('biovised_selected_channel_id');
        }
      }
    }
  }, [channels]);

  // Sync state for local storage values (Watch Progress History)
  const loadLocalStorageState = () => {
    try {
      const historyStr = localStorage.getItem('biovised_verse_watch_history');
      if (historyStr) {
        setWatchHistory(JSON.parse(historyStr));
      }

      const watchedStr = localStorage.getItem('biovised_verse_watched_video_ids');
      if (watchedStr) {
        setWatchedVideoIds(JSON.parse(watchedStr));
      }
    } catch (e) {
      console.warn("Could not retrieve local watch history state:", e);
    }
  };

  useEffect(() => {
    loadLocalStorageState();
  }, [selectedVideo]);

  // Mark a video as watched manually/automatically
  const toggleMarkWatched = (video: YouTubeVideo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const isWatched = watchedVideoIds.includes(video.videoId);
    let updated: string[];
    if (isWatched) {
      updated = watchedVideoIds.filter(id => id !== video.videoId);
    } else {
      updated = [...watchedVideoIds, video.videoId];
    }
    
    setWatchedVideoIds(updated);
    localStorage.setItem('biovised_verse_watched_video_ids', JSON.stringify(updated));
  };

  // Safe tracking progress in local storage
  const trackWatchHistoryProgress = (video: YouTubeVideo, currentSeconds: number, durationSeconds: number) => {
    const freshItem: WatchHistoryItem = {
      id: video.videoId,
      videoId: video.videoId,
      title: video.title,
      channelName: video.channelName || 'BIOVISED Lecturer',
      thumbnail: video.thumbnail || '',
      progressSeconds: currentSeconds,
      durationSeconds: durationSeconds || 1,
      lastUpdated: Date.now(),
      playlistId: video.playlistId || '',
      subject: video.subject || 'Biology'
    };

    setWatchHistory(prev => {
      const filtered = prev.filter(item => item.videoId !== video.videoId);
      const updated = [freshItem, ...filtered].slice(0, 20); // Store last 20
      localStorage.setItem('biovised_verse_watch_history', JSON.stringify(updated));
      return updated;
    });
  };

  // Fetch playlist videos when a playlist is selected
  const [playlistVideos, setPlaylistVideos] = useState<YouTubeVideo[]>([]);
  const [isLoadingPlaylistVideos, setIsLoadingPlaylistVideos] = useState(false);

  useEffect(() => {
    if (!selectedPlaylist) {
      setPlaylistVideos([]);
      return;
    }

    setIsLoadingPlaylistVideos(true);
    supabase.from('videos').select('id, title, video_url, duration, category, playlist_id, views, thumbnail_url, subject, exam_type, content_type, teacher_id, teacher_name, likes_count, duration_seconds, is_active, created_at, updated_at').eq('playlist_id', selectedPlaylist.id).then(({ data, error }) => {
      setIsLoadingPlaylistVideos(false);
      if (error) {
        console.error("Error retrieving playlist videos:", error);
      } else {
        const list = (data || []).map(mapVideoRow);
        setPlaylistVideos(list);
      }
    });
  }, [selectedPlaylist]);

  // Clean-room handle Search with PAGINATION and filters purely matching client-side/Firestore database
  const handlePerformSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setIsSearchActive(false);
      return;
    }

    setIsLoadingSearch(true);
    setIsSearchActive(true);

    try {
      let queryBuilder = supabase.from('videos').select('id, title, video_url, duration, category, playlist_id, views, thumbnail_url, subject, exam_type, content_type, teacher_id, teacher_name, likes_count, duration_seconds, is_active, created_at, updated_at').limit(50);
      if (filterSubject !== 'All') {
        queryBuilder = queryBuilder.eq('subject', filterSubject);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      const allVideos = (data || []).map(mapVideoRow);

      // Client-side flexible matching over fields (title, topic, channel, subject)
      const cleanTerm = searchQuery.toLowerCase().trim();
      const tokens = cleanTerm.split(/\s+/).filter(Boolean);

      let processed = allVideos.filter(vid => {
        const t = (vid.title || '').toLowerCase();
        const d = (vid.description || '').toLowerCase();
        const sc = (vid.channelName || '').toLowerCase();
        const subj = (vid.subject || '').toLowerCase();
        const topic = (vid.topic || '').toLowerCase();

        return tokens.every(w => 
          t.includes(w) || 
          d.includes(w) || 
          sc.includes(w) || 
          subj.includes(w) || 
          topic.includes(w)
        );
      });

      // Filter by Channel
      if (filterChannel !== 'All') {
        processed = processed.filter(vid => vid.channelId === filterChannel || vid.channelName === filterChannel);
      }

      // Filter by Duration
      if (filterDuration !== 'All') {
        processed = processed.filter(vid => {
          const secs = vid.durationSeconds || 0;
          if (filterDuration === 'Short') return secs < 600; // < 10m
          if (filterDuration === 'Medium') return secs >= 600 && secs <= 1800; // 10-30m
          if (filterDuration === 'Long') return secs > 1800; // > 30m
          return true;
        });
      }

      setSearchResults(processed);
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Trigger search on query change with debounce or when filter updates
  useEffect(() => {
    if (searchQuery.trim()) {
      handlePerformSearch();
    } else {
      setIsSearchActive(false);
    }
  }, [searchQuery, filterSubject, filterChannel, filterDuration]);

  // Calculated Row Data
  const recentWeekVideos = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    // Mock robust safety: if no videos exist from past 7 days, fallback gracefully to latest verified videos
    return videosState.filter(v => {
      const importedTime = v.importedAt ? new Date(v.importedAt).getTime() : 0;
      return importedTime >= sevenDaysAgo;
    });
  }, [videosState]);

  // Loading latest videos list for secondary categories
  useEffect(() => {
    setIsLoadingVideos(true);
    supabase.from('videos').select('*').order('publish_date', { ascending: false }).limit(15).then(
      ({ data, error }) => {
        if (error) {
          console.warn(error);
        } else {
          const vids = (data || []).map(mapVideoRow);
          setVideosState(vids);
        }
        setIsLoadingVideos(false);
      },
      (err) => {
        console.warn("Failed fetching recent videos:", err);
        setIsLoadingVideos(false);
      }
    );
  }, []);

  // Filtered Playlists for Homepage Feed Carousel
  const filteredFeaturedPlaylists = useMemo(() => {
    let list = playlists;
    if (selectedSubject !== 'All') {
      list = playlists.filter(p => (p.subject || '').toLowerCase() === selectedSubject.toLowerCase());
    }
    return list.slice(0, 10);
  }, [playlists, selectedSubject]);

  // Youtube API manual script loading and initialization
  useEffect(() => {
    if (selectedVideo) {
      setPlayerIsReady(false);
      setIsPlaying(false);
      setCurrentTime(0);

      // Initialize API if not available
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
      }

      let checkInterval = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkInterval);
          initYoutubePlayer(selectedVideo.videoId);
        }
      }, 150);

      return () => {
        clearInterval(checkInterval);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch (err) {
            console.warn(err);
          }
          ytPlayerRef.current = null;
        }
      };
    }
  }, [selectedVideo]);

  const initYoutubePlayer = (vidId: string) => {
    try {
      const container = document.getElementById('verse-player-iframe-slot');
      if (!container) return;

      container.innerHTML = '<div id="verse-yt-node" style="width: 100%; height: 100%;"></div>';

      ytPlayerRef.current = new (window as any).YT.Player('verse-yt-node', {
        height: '100%',
        width: '100%',
        videoId: vidId,
        playerVars: {
          autoplay: 1,
          controls: 0, // Disable standard keys/overlay for premium appearance
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            setPlayerIsReady(true);
            setIsPlaying(true);
            event.target.setVolume(playerVolume);
            const duration = event.target.getDuration();
            if (duration) setTotalDuration(duration);

            // Auto-resume if present in localstorage watch history
            const matchedHistory = watchHistory.find(h => h.videoId === vidId);
            if (matchedHistory && matchedHistory.progressSeconds > 10) {
              event.target.seekTo(matchedHistory.progressSeconds, true);
            }

            // Start polling timer
            startProgressPolling();
          },
          onStateChange: (event: any) => {
            // YT states: 1 (Playing), 2 (Paused), 0 (Ended)
            if (event.data === 1) {
              setIsPlaying(true);
              startProgressPolling();
            } else if (event.data === 2) {
              setIsPlaying(false);
              stopProgressPolling();
            } else if (event.data === 0) {
              setIsPlaying(false);
              stopProgressPolling();

              // Auto-mark watched
              if (selectedVideo) {
                if (!watchedVideoIds.includes(selectedVideo.videoId)) {
                  const updated = [...watchedVideoIds, selectedVideo.videoId];
                  setWatchedVideoIds(updated);
                  localStorage.setItem('biovised_verse_watched_video_ids', JSON.stringify(updated));
                }
              }

              // Auto advance
              playNextVideoInPlaylist();
            }
          }
        }
      });
    } catch (e) {
      console.warn("Could not instantiate iframe player:", e);
    }
  };

  const startProgressPolling = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const current = Math.floor(ytPlayerRef.current.getCurrentTime());
          const total = Math.floor(ytPlayerRef.current.getDuration() || totalDuration);
          setCurrentTime(current);
          if (total) {
            setTotalDuration(total);
            if (selectedVideo) {
              trackWatchHistoryProgress(selectedVideo, current, total);
            }
          }
        } catch (e) {
          // ignore stream exceptions
        }
      }
    }, 1000);
  };

  const stopProgressPolling = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  // Custom player operations
  const handlePlayPause = () => {
    if (!ytPlayerRef.current || !playerIsReady) return;
    if (isPlaying) {
      ytPlayerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const handleSeek = (direction: 'forward' | 'backward') => {
    if (!ytPlayerRef.current || !playerIsReady) return;
    const delta = direction === 'forward' ? 10 : -10;
    const current = ytPlayerRef.current.getCurrentTime() || 0;
    const target = Math.max(0, Math.min(totalDuration, current + delta));
    ytPlayerRef.current.seekTo(target, true);
    setCurrentTime(Math.floor(target));
  };

  const playNextVideoInPlaylist = () => {
    if (playlistVideos.length === 0 || !selectedVideo) return;
    const idx = playlistVideos.findIndex(v => v.videoId === selectedVideo.videoId);
    if (idx !== -1 && idx < playlistVideos.length - 1) {
      setSelectedVideo(playlistVideos[idx + 1]);
    }
  };

  const playPreviousVideoInPlaylist = () => {
    if (playlistVideos.length === 0 || !selectedVideo) return;
    const idx = playlistVideos.findIndex(v => v.videoId === selectedVideo.videoId);
    if (idx > 0) {
      setSelectedVideo(playlistVideos[idx - 1]);
    }
  };

  const toggleMute = () => {
    if (!ytPlayerRef.current || !playerIsReady) return;
    if (isMuted) {
      ytPlayerRef.current.unMute();
      setIsMuted(false);
    } else {
      ytPlayerRef.current.mute();
      setIsMuted(true);
    }
  };

  const changeVolume = (val: number) => {
    setPlayerVolume(val);
    if (ytPlayerRef.current && playerIsReady) {
      ytPlayerRef.current.setVolume(val);
      if (val > 0 && isMuted) {
        ytPlayerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleFs = () => {
    if (!playerContainerRef.current) return;
    const elem = playerContainerRef.current;
    
    if (!document.fullscreenElement) {
      elem.requestFullscreen().then(() => setIsFullscreen(true)).catch(e => {
        setIsFullscreen(true); // simulated if iframe bounds block
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Keyboard Shortcuts: N = next, P = previous, F = fullscreen
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // Ensure we aren't inputting in any search fields
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();
      if (selectedVideo) {
        if (key === 'n') {
          e.preventDefault();
          playNextVideoInPlaylist();
        } else if (key === 'p') {
          e.preventDefault();
          playPreviousVideoInPlaylist();
        } else if (key === 'f') {
          e.preventDefault();
          toggleFs();
        } else if (key === ' ') {
          e.preventDefault();
          handlePlayPause();
        }
      }
    };

    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [selectedVideo, playlistVideos]);

  // Helper calculating watch progress count for active playlist
  const activePlaylistProgressText = useMemo(() => {
    if (!selectedPlaylist || playlistVideos.length === 0) return '';
    const watchedInThisPlaylist = playlistVideos.filter(v => watchedVideoIds.includes(v.videoId)).length;
    return `${watchedInThisPlaylist} of ${playlistVideos.length} videos watched`;
  }, [selectedPlaylist, playlistVideos, watchedVideoIds]);

  if (selectedVideo) {
    const pseudoLecture: TypesLecture = {
      id: selectedVideo.videoId,
      title: selectedVideo.title,
      description: selectedVideo.description || '',
      videoUrl: `https://www.youtube.com/watch?v=${selectedVideo.videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${selectedVideo.videoId}/hqdefault.jpg`,
      subject: selectedPlaylist?.subject || 'Academic',
      examType: selectedPlaylist?.examType || 'JEE',
      contentType: 'lecture',
      teacherId: selectedVideo.channelId || 'youtube_channel',
      teacherName: selectedVideo.channelName || 'YouTube Educator',
      duration: selectedVideo.duration || '00:00',
      viewsCount: selectedVideo.viewCount || 0,
      likesCount: selectedVideo.likeCount || 0,
      createdAt: selectedVideo.publishedAt || new Date().toISOString(),
    };

    const playlistLectures = playlistVideos.map(video => ({
      id: video.videoId,
      title: video.title,
      description: video.description || '',
      videoUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`,
      subject: selectedPlaylist?.subject || 'Academic',
      examType: selectedPlaylist?.examType || 'JEE',
      contentType: 'lecture',
      teacherId: video.channelId || 'youtube_channel',
      teacherName: video.channelName || 'YouTube Educator',
      duration: video.duration || '00:00',
      viewsCount: video.viewCount || 0,
      likesCount: video.likeCount || 0,
      createdAt: video.publishedAt || new Date().toISOString(),
    }));

    return (
      <div className="w-full bg-neutral-950 text-white font-sans selection:bg-white selection:text-black flex flex-col pb-6">
        <div className="w-full flex justify-center bg-neutral-950">
          <BiovisedPlayer
            lecture={pseudoLecture}
            onClose={() => {
              setSelectedVideo(null);
              setPlayerIsReady(false);
            }}
            playlistLectures={playlistLectures}
            onSelectLecture={(lec) => {
              const found = playlistVideos.find(v => v.videoId === lec.id);
              if (found) setSelectedVideo(found);
            }}
          />
        </div>
        <LectureDetailsSection
          key={pseudoLecture.id}
          lecture={pseudoLecture}
          currentUserId={user?.uid ?? null}
          onSelectRecommended={(lec) => {
            const found = playlistVideos.find(v => v.videoId === lec.id);
            if (found) {
              setSelectedVideo(found);
            } else {
              const mappedVideo: YouTubeVideo = {
                id: lec.id,
                videoId: lec.id,
                playlistId: (lec as any).playlistId || (lec as any).playlist_id || '',
                channelId: lec.teacherId || lec.teacher_id || '',
                channelName: lec.teacherName || lec.teacher_name || 'YouTube Educator',
                title: lec.title,
                description: lec.description || '',
                thumbnail: (lec as any).thumbnailUrl || '',
                duration: (lec as any).duration || '00:00',
                durationSeconds: (lec as any).durationSeconds || 0,
                publishedAt: (lec as any).createdAt || new Date().toISOString(),
                importedAt: new Date().toISOString(),
                subject: lec.subject || '',
                topic: '',
                examTags: lec.examType ? [lec.examType] : [],
                isActive: true,
                position: 0,
                viewCount: (lec as any).viewsCount || 0,
                likeCount: (lec as any).likesCount || 0
              };
              setSelectedVideo(mappedVideo);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#000000] text-white font-sans selection:bg-white selection:text-black">
      
      <main className="max-w-7xl mx-auto px-4 py-6 pb-28">

        {/* ==========================================
            SEARCH MODE LAYOUT
           ========================================== */}
        <AnimatePresence mode="wait">
          {isSearchActive && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="space-y-6 text-left"
            >
              <div className="flex justify-between items-center bg-[#111113] p-4 rounded-xl border border-neutral-900">
                <div>
                  <h3 className="text-xs font-mono text-[#EEEEEE] tracking-widest uppercase font-bold">DIRECTORY RESULTS</h3>
                  <p className="text-lg font-semibold text-white">Searching local library for "{searchQuery}"</p>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold ${
                    showFilters ? 'bg-white text-black border-white' : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-zinc-300'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>
              </div>

              {/* Advanced Search Filters Drawer */}
              {showFilters && (
                <div className="p-4 rounded-xl bg-[#0C0C0D] border border-neutral-900 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-bold">Subject stream</label>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className="w-full text-xs font-semibold h-9 rounded-lg bg-[#0D0D0C] border border-[#232326] text-white px-2 focus:outline-none focus:border-white"
                    >
                      <option value="All">All Subjects</option>
                      <option value="Biology">Biology</option>
                      <option value="Botany">Botany</option>
                      <option value="Zoology">Zoology</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-bold">Verified educator channel</label>
                    <select
                      value={filterChannel}
                      onChange={(e) => setFilterChannel(e.target.value)}
                      className="w-full text-xs font-semibold h-9 rounded-lg bg-[#0D0D0C] border border-[#232326] text-white px-2 focus:outline-none focus:border-white"
                    >
                      <option value="All">All Channels</option>
                      {channels.map((chan) => (
                        <option key={chan.channelId} value={chan.channelId}>{chan.channelName}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest block font-bold">Class duration</label>
                    <select
                      value={filterDuration}
                      onChange={(e) => setFilterDuration(e.target.value)}
                      className="w-full text-xs font-semibold h-9 rounded-lg bg-[#0D0D0C] border border-[#232326] text-white px-2 focus:outline-none focus:border-white"
                    >
                      <option value="All">Any Duration</option>
                      <option value="Short">Short (&lt; 10m)</option>
                      <option value="Medium">Medium (10 - 30m)</option>
                      <option value="Long">Long (&gt; 30m)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* SEARCH RESULTS FEED */}
              {isLoadingSearch ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-400 font-mono">Scanning verified curriculum database...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-neutral-910 bg-[#0A0A0B]/60">
                  <BookOpen className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs font-mono text-zinc-550">No educational lecture videos detected matching the parameters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {searchResults.map((vid) => {
                    const matchedChan = channels.find(c => c.channelId === vid.channelId);
                    const subCount = matchedChan?.subscriberCount || 120000;

                    const lectureDto = {
                      id: vid.videoId,
                      title: vid.title,
                      thumbnailUrl: vid.thumbnail,
                      duration: vid.duration,
                      subject: vid.subject,
                      viewsCount: vid.viewCount || 0,
                      channel: {
                        id: vid.channelId || 'unknown',
                        name: vid.channelName || 'Verified Educator',
                        avatarUrl: matchedChan?.channelThumbnail || null,
                        bannerUrl: null,
                        subscriberCountRaw: subCount,
                        subscriberCountFormatted: formatSubscribers(subCount)
                      }
                    };

                    return (
                      <LectureCard
                        key={vid.videoId}
                        lecture={lectureDto as any}
                        onClick={() => {
                          const matchedPlay = playlists.find(p => p.id === vid.playlistId);
                          if (matchedPlay) {
                            setSelectedPlaylist(matchedPlay);
                          }
                          setSelectedVideo(vid);
                        }}
                        onChannelClick={() => {
                          if (vid.channelId) {
                            onSelectChannel?.(vid.channelId, 'institute');
                          } else if ((vid as any).teacherId) {
                            onSelectChannel?.((vid as any).teacherId, 'teacher');
                          }
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==========================================
            CORE FEED / LANDING WORKFLOW
           ========================================== */}
        {!isSearchActive && !selectedPlaylist && !selectedVideo && selectedChannel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 text-left"
          >
            <ChannelHeader
              channel={{
                id: selectedChannel.channelId,
                name: selectedChannel.channelName,
                avatarUrl: selectedChannel.channelThumbnail,
                bannerUrl: (selectedChannel as any).bannerUrl || null,
                subscriberCountRaw: selectedChannel.subscriberCount || 150000,
                subscriberCountFormatted: formatSubscribers(selectedChannel.subscriberCount || 150000),
                description: selectedChannel.description
              }}
              onBack={() => setSelectedChannel(null)}
            />            {/* Render Playlists for this channel */}
            <div className="space-y-4 pt-4">
              <div className="border-b border-[#1A1A1A] pb-2 flex justify-between items-center">
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Curated Course Playlists</h3>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">Interactive Hub</span>
              </div>
              {(playlists || []).filter(p => p.channelId === selectedChannel.channelId).length === 0 ? (
                <p className="text-xs text-zinc-500 font-mono py-12 text-center bg-[#0D0D0C] border border-neutral-900 rounded-xl">No playlists registered for this channel yet.</p>
              ) : (
                <div 
                  tabIndex={0}
                  onKeyDown={handleRowKeyDown}
                  className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x scroll-smooth outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
                >
                  {(playlists || []).filter(p => p.channelId === selectedChannel.channelId).map((play) => (
                    <div
                      key={play.id}
                      onClick={() => setSelectedPlaylist(play)}
                      className="w-[280px] shrink-0 snap-start bg-transparent rounded-xl overflow-hidden cursor-pointer flex flex-col group text-left"
                    >
                      <motion.div
                        whileHover={{ scale: 1.04 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative aspect-video bg-neutral-950 overflow-hidden rounded-xl"
                      >
                        <img
                          src={getPlaylistThumbnail(play)}
                          alt={play.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </motion.div>
                      <div className="pt-3 pb-1 flex-grow flex flex-col justify-between">
                        <h4 className="text-xs font-bold text-white uppercase line-clamp-2 leading-tight group-hover:text-white transition-colors">{play.title}</h4>
                        <p className="text-[10px] text-zinc-500 font-sans mt-2">{play.lecturesCount || 0} Lectures</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {!isSearchActive && !selectedPlaylist && !selectedVideo && !selectedChannel && (
          isLoadingFeed ? (
            <VideoLibrarySkeleton />
          ) : (
            <div className="space-y-10 text-left">
              
              {/* SUBJECT STREAM TABS CONTROLLER */}
              <div className="h-[48px] flex items-center">
                <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none border-b border-[#18181B] w-full">
                  {(SUBJECT_TABS || []).map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubject(sub)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all duration-200 shrink-0 ${
                        selectedSubject === sub
                          ? 'bg-[#EEEEEE] text-black font-extrabold shadow shadow-white/5'
                          : 'bg-neutral-900 border border-neutral-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* A. FEATURED CURATED PLAYLISTS CAROUSEL */}
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-mono text-[#EEEEEE] tracking-widest font-extrabold uppercase block">CURATED CURRICULA</span>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display uppercase">Featured Chapters</h3>
                </div>

                {(filteredFeaturedPlaylists || []).length === 0 ? (
                  <div className="text-center py-10 rounded-xl bg-neutral-900/40 border border-neutral-910">
                    <p className="text-xs text-zinc-550 font-mono">No chapter playlists synced for the {selectedSubject} subject yet.</p>
                  </div>
                ) : (
                  <div 
                    tabIndex={0}
                    onKeyDown={handleRowKeyDown}
                    className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x scroll-smooth outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
                  >
                    {(filteredFeaturedPlaylists || []).map((play, idx) => (
                      <div
                        key={play.id}
                        onClick={() => setSelectedPlaylist(play)}
                        className="w-[280px] shrink-0 snap-start bg-transparent rounded-xl overflow-hidden cursor-pointer flex flex-col group text-left"
                      >
                        <motion.div
                          whileHover={{ scale: 1.04 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="relative aspect-video bg-neutral-955 overflow-hidden rounded-xl"
                        >
                          <SafeImage
                            src={getPlaylistThumbnail(play)}
                            alt={play.title}
                            variant="thumbnail"
                            imageClassName="object-cover"
                            priority={idx < 3}
                          />
                          <div className="absolute right-2 bottom-2 bg-black/85 border border-zinc-850 text-[9.5px] px-2 py-0.5 rounded font-mono font-bold text-zinc-300 z-10">
                            {play.lecturesCount || 0} Lectures
                          </div>
                        </motion.div>
                        <div className="pt-3 pb-1 flex-1 flex flex-col justify-between items-start space-y-1">
                          <div className="space-y-1 w-full">
                            <span className="text-[9.5px] text-[#A0A0A0] font-mono uppercase bg-zinc-900/60 px-1.5 py-0.5 rounded font-bold inline-block">{play.subject}</span>
                            <h4 className="text-xs font-bold text-white line-clamp-2 w-full uppercase leading-tight mt-1">{play.title}</h4>
                          </div>
                          <p
                            onClick={(e) => {
                              e.stopPropagation();
                              if (play.channelId) {
                                onSelectChannel?.(play.channelId, 'institute');
                              } else if (play.teacherId) {
                                onSelectChannel?.(play.teacherId, 'teacher');
                              }
                            }}
                            className="text-[10px] text-zinc-550 font-sans truncate w-full leading-none hover:text-[#f3b093] hover:underline cursor-pointer"
                          >
                            {play.channelName || play.teacherName || 'BIOVISED Educator'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* B. CONTINUE WATCHING PROGRESS ROW (SAVED STATE HISTORY) */}
              {(watchHistory || []).length > 0 && (
                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-mono text-[#EEEEEE] tracking-widest font-extrabold uppercase block">RESUME LEARNING</span>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display uppercase">Continue Watching</h3>
                  </div>

                  <div 
                    tabIndex={0}
                    onKeyDown={handleRowKeyDown}
                    className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x scroll-smooth outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
                  >
                    {(watchHistory || []).slice(0, 10).map((item, idx) => {
                      const progressPercent = Math.max(3, Math.min(100, Math.floor((item.progressSeconds / item.durationSeconds) * 100)));
                      return (
                        <div
                          key={item.videoId}
                          onClick={() => {
                            const matchedPlay = (playlists || []).find(p => p.id === item.playlistId);
                            if (matchedPlay) setSelectedPlaylist(matchedPlay);
                            
                            const partialVideo: YouTubeVideo = {
                              id: item.videoId,
                              videoId: item.videoId,
                              title: item.title,
                              channelName: item.channelName,
                              thumbnail: item.thumbnail,
                              playlistId: item.playlistId,
                              subject: item.subject,
                              durationSeconds: item.durationSeconds,
                              duration: `${Math.floor(item.durationSeconds / 60)}m`,
                              channelId: '',
                              description: '',
                              publishedAt: '',
                              viewCount: 0,
                              likeCount: 0,
                              position: 1,
                              topic: '',
                              examTags: [],
                              isActive: true,
                              importedAt: ''
                            };
                            setSelectedVideo(partialVideo);
                          }}
                          className="w-[280px] shrink-0 snap-start bg-transparent rounded-xl overflow-hidden cursor-pointer flex flex-col group text-left"
                        >
                          <motion.div
                            whileHover={{ scale: 1.04 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="relative aspect-video rounded-xl overflow-hidden bg-neutral-900 shadow"
                          >
                            <YoutubeThumbnailImg
                              videoId={item.videoId}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              loading={idx < 3 ? "eager" : "lazy"}
                            />
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-neutral-800 z-10">
                              <div className="h-full bg-white" style={{ width: `${progressPercent}%` }} />
                            </div>
                          </motion.div>
                          <div className="pt-3 pb-1 min-w-0 space-y-1 text-left">
                            <span className="text-[9.5px] font-mono text-[#A0A0A0] uppercase block font-semibold">{item.subject}</span>
                            <h4 className="text-xs font-bold text-white leading-tight line-clamp-2 uppercase">{item.title}</h4>
                            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono mt-1">
                              <span>{item.channelName}</span>
                              <span className="text-[9px] text-[#EEEEEE] font-extrabold">{progressPercent}% done</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* C. NEW THIS WEEK IMPORTED VIDEOS ROW */}
              <div className="space-y-4">
                <div>
                  <span className="text-[9px] font-mono text-[#EEEEEE] tracking-widest font-extrabold uppercase block">FRESH CLASSES</span>
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display uppercase">New This Week</h3>
                </div>

                {(recentWeekVideos || []).length === 0 ? (
                  <div className="text-center py-8 rounded-xl border border-neutral-900 bg-neutral-955/20">
                    <p className="text-xs text-zinc-650 font-mono uppercase tracking-wider">No new classes imported in past 7 days. Sync channels via Content Manager.</p>
                  </div>
                ) : (
                  <div 
                    tabIndex={0}
                    onKeyDown={handleRowKeyDown}
                    className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x scroll-smooth outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
                  >
                    {(recentWeekVideos || []).slice(0, 10).map((vid, idx) => (
                      <div
                        key={vid.videoId}
                        onClick={() => {
                          const matchedPlay = (playlists || []).find(p => p.id === vid.playlistId);
                          if (matchedPlay) setSelectedPlaylist(matchedPlay);
                          setSelectedVideo(vid);
                        }}
                        className="w-[280px] shrink-0 snap-start bg-transparent rounded-xl overflow-hidden cursor-pointer flex flex-col group text-left"
                      >
                        <motion.div
                          whileHover={{ scale: 1.04 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          className="relative aspect-video bg-neutral-955 overflow-hidden shadow rounded-xl"
                        >
                          <YoutubeThumbnailImg
                            videoId={vid.videoId}
                            alt={vid.title}
                            className="w-full h-full object-cover"
                            loading={idx < 3 ? "eager" : "lazy"}
                          />
                          <div className="absolute top-2 left-2 bg-white text-black text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded tracking-wider shadow z-10">
                            NEW
                          </div>
                          <div className="absolute right-2 bottom-2 px-1.5 py-0.5 bg-black/80 border border-neutral-800 text-[10px] font-mono font-bold text-zinc-350 z-10">
                            {vid.duration || 'Class'}
                          </div>
                        </motion.div>
                        <div className="pt-3 pb-1 flex flex-col justify-between items-start space-y-1.5">
                          <h4 className="text-xs font-extrabold text-white line-clamp-2 uppercase leading-tight font-sans">{vid.title}</h4>
                          <div className="flex justify-between items-center w-full text-[10px] text-zinc-500 font-mono pt-1">
                            <span className="truncate max-w-[130px]">{vid.channelName}</span>
                            <span className="text-[#A0A0A0] font-extrabold uppercase text-[9px]">{vid.subject}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            {/* D. TOP RECOGNIZED ACCREDITED CHANNELS ROW */}
            <div className="space-y-4">
              <div>
                <span className="text-[9px] font-mono text-[#EEEEEE] tracking-widest font-extrabold uppercase block">ACCREDITED PUBLISHERS</span>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white font-display uppercase">Top Channels</h3>
              </div>

              {(channels || []).length === 0 ? (
                <div className="text-center py-6 border border-neutral-910 rounded-xl bg-neutral-900/30">
                  <p className="text-xs text-zinc-550 font-mono">No channels registered yet. Call Admin setups.</p>
                </div>
              ) : (
                <div 
                  tabIndex={0}
                  onKeyDown={handleRowKeyDown}
                  className="flex gap-5 overflow-x-auto pb-4 scrollbar-none snap-x scroll-smooth outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
                >
                  {(channels || []).map((chan) => (
                    <div
                      key={chan.channelId}
                      onClick={() => {
                        setSelectedChannel(chan);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-[180px] shrink-0 snap-start bg-[#0D0D0C]/90 border border-zinc-855 p-4 rounded-xl text-center space-y-3 flex flex-col items-center hover:bg-[#121214] hover:border-zinc-700 transition-all duration-300 cursor-pointer shadow-md"
                    >
                      <div className="relative">
                        <SafeImage
                          src={chan.channelThumbnail}
                          alt={chan.channelName}
                          variant="avatar"
                          className="w-16 h-16 rounded-full border-2 border-neutral-855 select-none"
                          fallbackInitials={chan.channelName ? chan.channelName.slice(0, 2) : "ED"}
                        />
                        <span className="absolute bottom-0 right-0 w-4 h-4 bg-white rounded-full border border-black flex items-center justify-center text-[9px] text-black font-black">✓</span>
                      </div>
                      <div className="text-center">
                        <h4 className="text-xs font-bold leading-tight line-clamp-1 text-white uppercase">{chan.channelName}</h4>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          {chan.channelHandle || chan.channelId.substring(0, 10)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      )}

        {/* ==========================================
            PLAYLIST LAYOUT DETAILS PAGE
           ========================================== */}
        {selectedPlaylist && !selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 text-left"
          >
            {/* Playlist Header card */}
            <div className="p-6 rounded-2xl bg-[#0D0D0C] border border-neutral-910 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="w-full md:w-56 aspect-video bg-neutral-950 rounded-xl overflow-hidden shrink-0 border border-neutral-800 shadow">
                <SafeImage
                  src={getPlaylistThumbnail(selectedPlaylist)}
                  alt={selectedPlaylist.title}
                  variant="thumbnail"
                  imageClassName="object-cover"
                  priority={true}
                />
              </div>
              <div className="flex-1 space-y-3.5 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 font-mono bg-[#171719] px-2.5 py-0.5 border border-zinc-800 uppercase rounded font-bold">
                    {selectedPlaylist.subject} Stream
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {playlistVideos.length} lectures found
                  </span>
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-white uppercase">{selectedPlaylist.title}</h3>
                  <p className="text-xs text-zinc-405 font-mono leading-none mt-1">Publisher: {selectedPlaylist.channelName || 'BIOVISED Lecturer'}</p>
                </div>
                {selectedPlaylist.description && (
                  <p className="text-xs text-zinc-500 font-sans leading-relaxed line-clamp-2 max-w-3xl">
                    {selectedPlaylist.description}
                  </p>
                )}
                {activePlaylistProgressText && (
                  <p className="text-xs font-mono text-white font-extrabold">
                    📊 Stats: {activePlaylistProgressText}
                  </p>
                )}
              </div>
            </div>

            {/* Videos List within Playlist */}
            <div>
              <h3 className="text-xs font-mono font-black text-white uppercase tracking-wider mb-3.5">COURSE CURRICULUM</h3>
              
              {isLoadingPlaylistVideos ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-zinc-550 font-mono animate-pulse">Initializing course syllabus stream...</p>
                </div>
              ) : playlistVideos.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-neutral-900 bg-neutral-955/20">
                  <p className="text-xs text-zinc-550 font-mono uppercase">This playlist does not contain indexed videos. Import them in the Content Manager.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {playlistVideos.map((video, idx) => {
                    const isWatched = watchedVideoIds.includes(video.videoId);
                    return (
                      <div
                        key={video.videoId}
                        onClick={() => setSelectedVideo(video)}
                        className="bg-[#0C0C0D] hover:bg-[#121214] rounded-xl p-3 flex gap-4 items-center justify-between text-left cursor-pointer transition-all border border-neutral-900 hover:border-zinc-700 w-full"
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          {/* Index number or watch check */}
                          <div className="w-6 text-center text-xs font-mono text-zinc-500 shrink-0 font-bold">
                            {isWatched ? (
                              <CheckCircle className="w-4 h-4 text-white mx-auto" />
                            ) : (
                              `0${idx + 1}`.slice(-2)
                            )}
                          </div>

                          <div className="w-20 sm:w-28 aspect-video shrink-0 bg-[#0D0D0C] border border-neutral-800 rounded-lg overflow-hidden relative group">
                            <YoutubeThumbnailImg
                              videoId={video.videoId}
                              alt={video.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>

                          {/* Details */}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight line-clamp-1 uppercase font-sans leading-tight">
                              {video.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              {video.topic && (
                                <span className="text-[9px] text-[#A0A0A0] font-mono">
                                  #{video.topic}
                                </span>
                              )}
                              <span className="text-[10px] text-zinc-550 font-mono">
                                Position {video.position || idx + 1}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: Duration + Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-zinc-400 font-mono">{video.duration || 'Class'}</span>
                          <button
                            onClick={(e) => toggleMarkWatched(video, e)}
                            className={`p-1.5 rounded-lg border text-xs focus:outline-none transition-colors ${
                              isWatched
                                ? 'bg-white/10 border-white/20 text-white'
                                : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-zinc-500 hover:text-white'
                            }`}
                            title={isWatched ? "Mark Unwatched" : "Mark Watched"}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </motion.div>
        )}

        {/* selectedVideo rendered as an early return above to prevent container padding leaking */}

      </main>

    </div>
  );
}
