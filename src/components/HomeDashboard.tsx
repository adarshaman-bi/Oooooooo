import { useState, useEffect } from 'react';
import { Search, BookOpen, Clock, Youtube, Sparkles, CheckCircle2, ChevronRight, GraduationCap } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'motion/react';
import useSWR from 'swr';
import { SWR_KEYS, swrOptions, fetchActivePlaylists, fetchActiveTeachers, fetchActiveChannels } from '../utils/swrConfig';

// Initialize supabase locally in component
const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

interface HomeDashboardProps {
  onFocusSearch: () => void;
  setActiveExploreTab: (tab: any) => void;
  onPlayVideo: (video: any) => void;
  onSelectChannel?: (id: string, type: 'teacher' | 'institute') => void;
}

export default function HomeDashboard({ onFocusSearch, setActiveExploreTab, onPlayVideo, onSelectChannel }: HomeDashboardProps) {
  const [channels, setChannels] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'playlist' | 'one_shot' | 'institute'>('playlist');

  // SWR Caching Layer
  const { data: chanData, isLoading: channelsLoading } = useSWR(SWR_KEYS.CHANNELS, fetchActiveChannels, swrOptions);
  const { data: playData, isLoading: playlistsLoading } = useSWR(SWR_KEYS.PLAYLISTS, fetchActivePlaylists, swrOptions);

  const loading = channelsLoading || playlistsLoading;

  // Process Channels
  useEffect(() => {
    if (chanData) {
      setChannels(chanData.map(ch => ({
        channelId: ch?.id || '',
        channelName: ch?.name || 'Verified Educator',
        channelThumbnail: ch?.avatar || '',
        subscriberCount: parseInt(ch?.subscribers, 10) || 120000,
        description: ch?.description || 'Verified JEE & NEET Educator'
      })));
    }
  }, [chanData]);

  // Process Playlists
  useEffect(() => {
    if (playData) {
      const processPlaylists = async () => {
        const mapped = playData.map((p: any) => {
          const titleLower = (p?.title || '').toLowerCase();
          let resolvedContentType = p?.content_type || 'playlist';
          if (!p?.content_type) {
            if (titleLower.includes('one shot') || titleLower.includes('oneshot') || titleLower.includes('complete revision')) {
              resolvedContentType = 'one_shot';
            } else if (titleLower.includes('allen') || titleLower.includes('pw') || titleLower.includes('unacademy') || titleLower.includes('competishun')) {
              resolvedContentType = 'institute';
            }
          }
          return {
            id: p?.id || '',
            title: p?.title || '',
            description: p?.description || '',
            thumbnailUrl: p?.cover_thumbnail_url || p?.thumbnail || '',
            lecturesCount: p?.lectures_count || 0,
            subject: p?.category || '',
            examType: p?.exam_type || 'Both',
            teacherId: p?.teacher_id || '',
            teacherName: p?.channel_title || '',
            channelId: p?.channel_id || '',
            contentType: resolvedContentType,
            totalDurationSeconds: p?.total_duration_seconds || 0,
            createdAt: p?.created_at || new Date().toISOString(),
            updatedAt: p?.updated_at || p?.created_at || new Date().toISOString()
          };
        });

        // Resolve teacherName fallback if channel_title is empty
        const { data: teacherData } = await supabase.from('teachers').select('id, name');
        const teacherMap = new Map();
        for (const t of (teacherData || [])) {
          teacherMap.set(t.id, t.name);
        }

        for (const m of mapped) {
          if (!m.teacherName && m.teacherId) {
            m.teacherName = teacherMap.get(m.teacherId) || 'Verified Educator';
          }
        }

        const sorted = mapped.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        setPlaylists(sorted);
      };

      processPlaylists();
    }
  }, [playData]);

  // Load Watch History from localStorage safely
  useEffect(() => {
    try {
      const historyStr = localStorage.getItem('biovised_verse_watch_history');
      if (historyStr) {
        const parsed = JSON.parse(historyStr);
        if (Array.isArray(parsed)) {
          const validHistory = parsed.filter(item => 
            item && 
            item.id && 
            item.video && 
            typeof item.video === 'object' && 
            item.video.title
          );
          setWatchHistory(validHistory.slice(0, 4));
        } else {
          setWatchHistory([]);
        }
      } else {
        setWatchHistory([]);
      }
    } catch (e) {
      console.warn('Error parsing watch history from localStorage:', e);
      setWatchHistory([]);
    }
  }, []);

  const handleChannelClick = (channelId: string) => {
    if (!channelId) return;
    sessionStorage.setItem('biovised_selected_channel_id', channelId);
    setActiveExploreTab('playlists');
  };

  const handlePlaylistClick = (playlistId: string) => {
    if (!playlistId) return;
    sessionStorage.setItem('biovised_selected_playlist_id', playlistId);
    setActiveExploreTab('playlists');
  };

  const formatSubscribers = (count: number) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const filteredPlaylists = (playlists || []).filter(p => {
    if (!p) return false;
    if (activeTab === 'playlist') {
      return p.contentType === 'playlist' || p.contentType === 'one_shot';
    }
    return p.contentType === activeTab;
  });

  return (
    <div className="w-full min-h-screen bg-black text-white font-sans pb-24 text-left">
      {/* Decorative premium background glows */}
      <div className="absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(circle_at_top,rgba(251,176,147,0.06),transparent_60%)] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Hero / Search branding */}
      <div className="relative pt-20 pb-16 px-4 flex flex-col items-center justify-center text-center z-10 max-w-4xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#18181B]/80 border border-zinc-800 text-[10px] font-mono text-amber-300/90 uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-amber-400" /> Premium Kota Curriculum
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-orange-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
              BioVised
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto uppercase tracking-wide font-mono">
            High-Yield Academic Discovery Ecosystem
          </p>
        </motion.div>

        {/* Minimalist Centered Search Input Box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="w-full max-w-xl mt-8 relative"
        >
          <div 
            onClick={onFocusSearch}
            className="w-full flex items-center bg-[#09090B]/85 border border-zinc-800/80 hover:border-zinc-700/80 rounded-2xl py-4 px-5 cursor-pointer transition-all duration-300 hover:shadow-[0_0_30px_rgba(251,176,147,0.04)]"
          >
            <Search className="w-4 h-4 text-zinc-550 mr-3 shrink-0" />
            <input
              type="text"
              readOnly
              placeholder="Search playlists, lessons, test topics, or teachers..."
              className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none cursor-pointer"
            />
          </div>
        </motion.div>

        {/* Search Hints */}
        <div className="flex flex-wrap gap-2 justify-center pt-5">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-900">
            JEE & NEET Focused
          </span>
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider bg-zinc-950 px-2.5 py-1.5 rounded border border-zinc-900">
            Kota Catalogs
          </span>
        </div>
      </div>

      {/* Loading Skeletal state */}
      {loading ? (
        <div className="max-w-7xl mx-auto px-8 py-6 space-y-12">
          <div className="space-y-4">
            <div className="h-6 w-48 bg-zinc-900 rounded animate-pulse" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-24 h-24 rounded-full bg-zinc-900 animate-pulse shrink-0" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 space-y-16">
          
          {/* 2. Youtube Channel Sync Slider */}
          {(channels || []).length > 0 && (
            <div className="py-6 px-4 sm:px-8 max-w-7xl mx-auto border-t border-zinc-900/60">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <h2 className="text-lg font-bold tracking-tight text-white uppercase font-sans">Verified Channels</h2>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Slider view</span>
              </div>
              
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none snap-x scroll-smooth">
                {(channels || []).map((chan) => {
                  if (!chan) return null;
                  return (
                    <div
                      key={chan.channelId}
                      onClick={() => handleChannelClick(chan.channelId)}
                      className="w-28 sm:w-32 shrink-0 snap-start flex flex-col items-center text-center cursor-pointer group"
                    >
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-zinc-800 bg-zinc-950 group-hover:border-amber-300 transition-all duration-300">
                        {chan.channelThumbnail ? (
                          <img 
                            src={chan.channelThumbnail} 
                            alt={chan.channelName} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-650 text-xs font-mono">
                            YT
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-300" />
                      </div>
                      <div className="mt-3 flex items-center justify-center gap-1 max-w-full px-1">
                        <span className="text-[11px] font-semibold text-zinc-250 truncate group-hover:text-white transition-colors">
                          {chan.channelName}
                        </span>
                        <CheckCircle2 className="w-3 h-3 text-blue-400 shrink-0" />
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                        {formatSubscribers(chan.subscriberCount)} Subs
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Continue Watching */}
          {(watchHistory || []).length > 0 && (
            <div className="py-6 px-4 sm:px-8 max-w-7xl mx-auto border-t border-zinc-900/60">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg font-bold tracking-tight text-white uppercase font-sans">Continue Your Preparation</h2>
                </div>
                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Watch history</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                {(watchHistory || []).map((historyItem) => {
                  if (!historyItem || !historyItem.video) return null;
                  const progressPercentage = Math.min(
                    Math.round((historyItem.progress / (historyItem.durationSeconds || 1)) * 100) || 0,
                    100
                  );

                  return (
                    <div
                      key={historyItem.id}
                      onClick={() => onPlayVideo(historyItem.video)}
                      className="bg-[#09090B]/60 border border-zinc-900 rounded-xl overflow-hidden cursor-pointer group flex flex-col hover:border-zinc-800 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                    >
                      <div className="relative aspect-video w-full bg-zinc-950">
                        <img 
                          src={historyItem.video.thumbnailUrl || `https://i.ytimg.com/vi/${historyItem.id}/hqdefault.jpg`} 
                          alt={historyItem.video.title} 
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        
                        {/* Custom video duration badge */}
                        <div className="absolute bottom-2 right-2 bg-black/85 px-1.5 py-0.5 rounded text-[9px] font-mono text-zinc-300">
                          {historyItem.video.duration || '0:00'}
                        </div>

                        {/* Progress Bar overlay */}
                        <div className="absolute bottom-0 inset-x-0 h-1 bg-zinc-800/85">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-400 to-amber-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2 text-left">
                        <div className="space-y-1">
                          <h4 className="text-[11px] font-semibold text-zinc-100 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                            {historyItem.video.title}
                          </h4>
                          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                            {historyItem.video.teacherName || 'Verified Educator'}
                          </p>
                        </div>
                        <div className="flex justify-between items-center pt-1 text-[9px] font-mono text-zinc-500">
                          <span>{progressPercentage}% Completed</span>
                          <span className="flex items-center gap-0.5 text-zinc-400 group-hover:text-amber-300 transition-colors">
                            Resume <ChevronRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Recommended Full Subject Playlists */}
          {(playlists || []).length > 0 && (
            <div className="py-6 px-4 sm:px-8 max-w-7xl mx-auto border-t border-zinc-900/60">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 border-b border-[#1A1A1A] pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-400" />
                  <h2 className="text-lg font-bold tracking-tight text-white uppercase font-sans">Recommended Subject Playlists</h2>
                </div>
                
                {/* Categorization tabs */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-900 shrink-0 self-start md:self-auto">
                  <button
                    onClick={() => setActiveTab('playlist')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all duration-200 ${
                      activeTab === 'playlist' ? 'bg-[#18181B] border border-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Syllabus
                  </button>
                  <button
                    onClick={() => setActiveTab('one_shot')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all duration-200 ${
                      activeTab === 'one_shot' ? 'bg-[#18181B] border border-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    One-Shots
                  </button>
                  <button
                    onClick={() => setActiveTab('institute')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-mono uppercase tracking-wider transition-all duration-200 ${
                      activeTab === 'institute' ? 'bg-[#18181B] border border-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Kota Hubs
                  </button>
                </div>
              </div>

              {filteredPlaylists.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-neutral-900 bg-[#09090A]">
                  <BookOpen className="w-10 h-10 text-neutral-800 mx-auto mb-2" />
                  <p className="text-xs font-mono text-zinc-500">No curations matched this preparation filter type yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredPlaylists.map((play) => {
                    if (!play) return null;
                    return (
                      <div
                        key={play.id}
                        onClick={() => handlePlaylistClick(play.id)}
                        className="bg-transparent rounded-xl overflow-hidden cursor-pointer flex flex-col group text-left"
                      >
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950 group-hover:border-zinc-800 transition-all duration-300">
                          <img
                            src={play.thumbnailUrl}
                            alt={play.title}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                          
                          {/* Playlist Layout Indicator Sheet */}
                          <div className="absolute right-0 inset-y-0 w-24 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-center space-y-1.5 border-l border-zinc-900/50">
                            <BookOpen className="w-5 h-5 text-white/80" />
                            <div className="space-y-0.5">
                              <span className="text-xs font-mono font-bold text-white block">{play.lecturesCount}</span>
                              <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest block">Lectures</span>
                            </div>
                          </div>

                          {/* Top Subject Tag overlay */}
                          <div className="absolute top-2 left-2 bg-[#0d0d0c]/80 backdrop-blur-sm border border-zinc-800/80 px-2 py-0.5 rounded text-[8px] font-mono text-zinc-300 uppercase tracking-wider">
                            {play.subject}
                          </div>
                        </div>

                        <div className="pt-3 px-1 space-y-1.5 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors">
                              {play.title}
                            </h4>
                            <div className="flex items-center justify-between mt-1">
                              <p
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (play.channelId) {
                                    onSelectChannel?.(play.channelId, 'institute');
                                  } else if (play.teacherId) {
                                    onSelectChannel?.(play.teacherId, 'teacher');
                                  }
                                }}
                                className="text-[9px] font-mono text-zinc-550 uppercase tracking-widest hover:text-[#f3b093] hover:underline cursor-pointer"
                              >
                                {play.teacherName || 'Verified Educator'}
                              </p>
                              {play.totalDurationSeconds > 0 && (
                                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-550">
                                  <Clock className="w-3 h-3 text-zinc-650" />
                                  <span>{formatDuration(play.totalDurationSeconds)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
