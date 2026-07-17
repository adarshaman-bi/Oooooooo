import { useState, useEffect, useMemo } from 'react';
import { Search, BookOpen, Clock, Youtube, Sparkles, CheckCircle2, ChevronRight, GraduationCap, Play, CheckCircle, Building2, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import useSWR from 'swr';
import { SWR_KEYS, swrOptions, fetchActivePlaylists, fetchActiveTeachers, fetchActiveChannels, fetchActiveVideos } from '../utils/swrConfig';
import { supabase } from '../utils/supabaseClient';
import { mapVideoRow } from '../utils/youtubeUtils';
import { TEST_SERIES_CATALOG } from '../data/testSeriesData';
import { TestSeriesCard } from './TestSeries/TestSeriesCard';
import LectureCard from './LectureCard';
import { HorizontalRow, CardPop } from './HorizontalRow';
import { BatchCard } from './BatchCard';
import { InstituteCard } from './InstituteCard';
import { Batch } from '../types';
import TeacherCard from './TeacherCard';
import teachersData from '../config/teachersData.json';
import { ScorecardSummary } from './ScorecardSummary';

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
  onOpenBatch?: (batchId: string) => void;
  validatedBatches?: any[];
  batchSubjectCounts?: Record<string, number>;
  followedIds?: string[];
  handleFollowToggle?: (teacher: any) => any;
  videos: any[];
  playlists: any[];
  teachers: any[];
  channels: any[];
  institutes: any[];
}

export default function HomeDashboard({ 
  onFocusSearch, 
  setActiveExploreTab, 
  onPlayVideo, 
  onSelectChannel,
  onOpenBatch,
  validatedBatches,
  batchSubjectCounts = {},
  followedIds = [],
  handleFollowToggle,
  videos,
  playlists,
  teachers,
  channels,
  institutes
}: HomeDashboardProps) {
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'playlist' | 'one_shot' | 'institute'>('playlist');
  const { user } = useAuth();
  const examText = user?.examType ? (user.examType === 'Both' ? 'JEE & NEET' : user.examType) : null;
  const targetYear = user?.appearingYear ? `Class of ${user.appearingYear}` : null;

  const displayBatches = validatedBatches || [];
  const dbTeachers = teachers || [];
  const showSkeleton = (videos || []).length === 0 && (playlists || []).length === 0;

  // Load Watch History from localStorage safely
  useEffect(() => {
    try {
      const historyStr = localStorage.getItem('biovised_verse_watch_history');
      let parsed = [];
      if (historyStr) {
        parsed = JSON.parse(historyStr);
      }
      
      if (!Array.isArray(parsed)) {
        parsed = [];
      }

      const normalized = parsed.map(item => {
        if (!item) return null;
        
        // If it uses nested 'video' format:
        if (item.video && typeof item.video === 'object') {
          const progressPercent = item.progressSeconds && item.durationSeconds
            ? Math.min(100, Math.round((item.progressSeconds / item.durationSeconds) * 100))
            : (item.progress && item.durationSeconds ? Math.min(100, Math.round((item.progress / item.durationSeconds) * 100)) : 50);

          return {
            id: item.id || item.videoId,
            videoId: item.videoId || item.id,
            title: item.video.title || item.title || '',
            channelName: item.video.channelName || item.video.teacherName || item.channelName || 'BIOVISED Educator',
            thumbnail: item.video.thumbnailUrl || item.video.thumbnail || item.thumbnail || '',
            progressPercent: progressPercent,
            duration: item.video.duration || '45:00',
            subject: item.video.subject || item.subject || 'Biology',
            lecturesRemaining: item.lecturesRemaining || 12,
            video: item.video
          };
        }
        
        // Direct format (as saved by VideoLibrary.tsx)
        const progressPercent = Math.min(100, Math.max(3, Math.round((item.progressSeconds / (item.durationSeconds || 1)) * 100)));
        const minutes = Math.floor((item.durationSeconds || 2700) / 60);
        const seconds = (item.durationSeconds || 2700) % 60;
        const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        // Create compatible video object for playing
        const companionVideo = {
          id: item.videoId,
          videoId: item.videoId,
          title: item.title,
          channelName: item.channelName,
          teacherName: item.channelName,
          thumbnail: item.thumbnail,
          playlistId: item.playlistId || '',
          subject: item.subject || 'Biology',
          durationSeconds: item.durationSeconds || 2700,
          duration: durationStr,
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

        return {
          id: item.videoId || item.id,
          videoId: item.videoId || item.id,
          title: item.title,
          channelName: item.channelName,
          thumbnail: item.thumbnail,
          progressPercent: progressPercent,
          duration: durationStr,
          subject: item.subject || 'Biology',
          lecturesRemaining: item.lecturesRemaining || 12,
          video: companionVideo
        };
      }).filter(Boolean);

      setWatchHistory(normalized);
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

  // Memoize filtered and sorted datasets to prevent heavy mappings and sorts on every render
  const filteredPlaylists = useMemo(() => {
    return (playlists || []).filter(p => {
      if (!p) return false;
      if (activeTab === 'playlist') {
        return p.contentType === 'playlist' || p.contentType === 'one_shot';
      }
      return p.contentType === activeTab;
    });
  }, [playlists, activeTab]);

  const recentlyAddedVideos = useMemo(() => {
    return [...videos]
      .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
      .slice(0, 10);
  }, [videos]);

  const trendingBiologyVideos = useMemo(() => {
    return [...videos]
      .filter(v => (v.subject || '').toLowerCase() === 'biology' || (v.title || '').toLowerCase().includes('biology'))
      .sort((a, b) => (b.viewsCount || b.viewCount || 0) - (a.viewsCount || a.viewCount || 0))
      .slice(0, 10);
  }, [videos]);

  const finalTrendingVideos = useMemo(() => {
    return trendingBiologyVideos.length > 0
      ? trendingBiologyVideos
      : [...videos].sort((a, b) => (b.viewsCount || b.viewCount || 0) - (a.viewsCount || a.viewCount || 0)).slice(0, 10);
  }, [videos, trendingBiologyVideos]);

  const handleTestSeriesClick = (testSeriesId: string) => {
    sessionStorage.setItem('biovised_selected_test_series_id', testSeriesId);
    setActiveExploreTab('tests');
  };

  return (
    <div className="w-full min-h-screen bg-black text-white font-sans pb-24 text-left max-w-full overflow-x-hidden relative">
      {/* Decorative premium background glows */}
      <div className="absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(circle_at_top,rgba(251,176,147,0.06),transparent_60%)] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <div style={{ position:'relative', width:'100%', maxWidth:'1280px', margin:'0 auto', padding:'2rem 1rem 1rem', zIndex:10 }}>
        <div style={{ position:'relative', overflow:'hidden', borderRadius:'16px', background:'linear-gradient(135deg,#0D0D0C,#000000,#0D0D0C)', border:'1px solid rgba(255,255,255,0.04)', boxShadow:'0 25px 80px rgba(0,0,0,0.95)', padding:'2rem' }} className="sm:p-8 md:p-10">
          <div style={{ position:'relative', zIndex:10, display:'flex', flexDirection:'column', gap:'1.5rem' }} className="lg:flex-row lg:items-center lg:gap-12">
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.625rem', marginBottom:'1.25rem' }}>
                <span style={{ width:'6px', height:'6px', borderRadius:'50%', backgroundColor:'#10B981', boxShadow:'0 0 6px rgba(16,185,129,0.5)' }} />
                <span style={{ fontSize:'11px', fontFamily:'monospace', color:'#71717A', letterSpacing:'0.1em', textTransform:'uppercase' }}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</span>
                <span style={{ width:'1px', height:'12px', backgroundColor:'#3F3F46' }} />
                <span style={{ fontSize:'10px', fontFamily:'monospace', color:'#52525B' }}>{examText || 'Curated Learning'}</span>
              </div>
              <h1 style={{ fontSize:'clamp(1.875rem,5vw,3rem)', fontWeight:900, letterSpacing:'-0.025em', color:'#FFFFFF', lineHeight:1.1, margin:0, marginBottom:'0.75rem' }}>
                Master <span style={{ color:'#FFB800' }}>{examText || 'Your Curriculum'}</span>
              </h1>
              <p style={{ fontSize:'14px', color:'#A1A1AA', lineHeight:1.625, maxWidth:'32rem', margin:0, marginBottom:'1rem' }}>
                {examText ? `${examText} playlists, top Kota educators, and targeted test series.` : 'Curated playlists, verified Kota educators, and smart test series to ace your exams.'}
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:'0.75rem' }}>
                <button onClick={onFocusSearch} style={{ display:'inline-flex', alignItems:'center', gap:'0.5rem', padding:'0.625rem 1.25rem', borderRadius:'0.5rem', backgroundColor:'#FFFFFF', color:'#000000', fontWeight:600, fontSize:'14px', border:'none', cursor:'pointer', transition:'all 0.3s' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <span>Start Learning</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
                <div style={{ display:'flex', alignItems:'center', gap:'0.25rem' }}>
                  <span style={{ fontSize:'10px', color:'#52525B', fontFamily:'monospace' }}>+2K active today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeletal state */}
      {showSkeleton ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 space-y-12 animate-pulse">
          {/* Educators Row Skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-40 bg-zinc-900 rounded" />
            <div className="flex gap-4 overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-900 shrink-0" />
              ))}
            </div>
          </div>
          {/* Playlists Row Skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-56 bg-zinc-900 rounded" />
            <div className="flex gap-5 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="w-64 h-36 bg-zinc-900 rounded-2xl shrink-0" />
              ))}
            </div>
          </div>
          {/* Batches Row Skeleton */}
          <div className="space-y-4">
            <div className="h-5 w-48 bg-zinc-900 rounded" />
            <div className="flex gap-5 overflow-hidden">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="w-80 h-44 bg-zinc-900 rounded-2xl shrink-0" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 space-y-6 md:space-y-8 pb-12 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
          
          {/* 1. Continue Watching */}
          {(watchHistory || []).length > 0 && (
            <div className="space-y-3.5 pt-4">
              {/* Header with icon, subtitle, and View All */}
              <div className="flex justify-between items-end pb-1 px-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 text-[#00D4AA]" />
                    <h2 className="text-sm sm:text-base font-extrabold tracking-wider text-white uppercase font-sans">
                      Continue Learning
                    </h2>
                  </div>
                  <p className="text-[10px] sm:text-xs text-zinc-500 font-medium font-sans">
                    Pick up where you left off
                  </p>
                </div>
                <button 
                  onClick={() => setActiveExploreTab('lecture')}
                  className="text-[10px] sm:text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1 uppercase tracking-widest cursor-pointer transition-colors"
                >
                  <span>VIEW ALL</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Horizontal Scroll Area */}
              <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-3 scrollbar-none snap-x scroll-smooth outline-none no-scrollbar">
                {(watchHistory || []).map((historyItem) => {
                  if (!historyItem) return null;

                  return (
                    <div key={historyItem.id} className="w-[280px] sm:w-[320px] shrink-0 snap-start flex flex-col group cursor-pointer" onClick={() => onPlayVideo(historyItem.video)}>
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0D0D0C] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all">
                        <img 
                          src={historyItem.thumbnail} 
                          alt={historyItem.title} 
                          className="w-full h-full object-cover group-hover:scale-102 transition-all duration-300"
                        />
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center transition-colors">
                          {/* Translucent Play Button in Center */}
                          <div className="w-10 h-10 rounded-full border border-white/60 bg-black/30 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-108 transition-transform">
                            <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Duration Badge bottom right */}
                        <div className="absolute bottom-2.5 right-2.5 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-white font-bold tracking-wider">
                          {historyItem.duration}
                        </div>
                      </div>

                      <div className="pt-2.5 pb-0.5 flex flex-col justify-between text-left space-y-1">
                        {/* Subject Pill & Lectures remaining */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold text-zinc-300 font-mono tracking-wider bg-[#0D0D0C] border border-zinc-800 px-2 py-0.5 rounded-md uppercase">
                            {historyItem.subject}
                          </span>
                          <span className="text-[10px] font-medium text-zinc-500 font-sans">
                            {historyItem.lecturesRemaining} Lectures Remaining
                          </span>
                        </div>

                        {/* Title of Video */}
                        <h4 className="text-xs sm:text-sm font-extrabold text-[#FFFFFF] line-clamp-1 leading-snug tracking-wide uppercase font-sans group-hover:text-zinc-200 transition-colors">
                          {historyItem.title}
                        </h4>

                        {/* Educator */}
                        <p className="text-xs text-zinc-400 font-sans">
                          by {historyItem.channelName}
                        </p>

                        {/* Progress bar container */}
                        <div className="space-y-1.5 pt-0.5">
                          <div className="flex justify-between items-center text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                            <span>PROGRESS</span>
                            <span className="text-[#FFFFFF]">{historyItem.progressPercent}%</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white transition-all duration-300"
                              style={{ width: `${historyItem.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Recommended Subject Playlists */}
          {(playlists || []).length > 0 && (
            <div className="pt-4 pb-2 border-t border-zinc-900/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-purple-400" />
                    <h2 className="text-sm sm:text-base font-extrabold tracking-wider text-white uppercase font-sans">
                      Playlists
                    </h2>
                  </div>
                </div>

                {/* Categorization tabs styled as high-end Apple TV control caps */}
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-900 shrink-0 self-start sm:self-auto">
                  <button
                    onClick={() => setActiveTab('playlist')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      activeTab === 'playlist' ? 'bg-[#18181B] border border-zinc-800 text-white font-bold shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Syllabus
                  </button>
                  <button
                    onClick={() => setActiveTab('one_shot')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      activeTab === 'one_shot' ? 'bg-[#18181B] border border-zinc-800 text-white font-bold shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    One-Shots
                  </button>
                  <button
                    onClick={() => setActiveTab('institute')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      activeTab === 'institute' ? 'bg-[#18181B] border border-zinc-800 text-white font-bold shadow-inner' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Kota Hubs
                  </button>
                </div>
              </div>

              {filteredPlaylists.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-neutral-900 bg-[#0D0D0C]">
                  <BookOpen className="w-10 h-10 text-neutral-800 mx-auto mb-2" />
                  <p className="text-xs font-mono text-zinc-500">No curations matched this preparation filter type yet.</p>
                </div>
              ) : (
                <div className="group/row relative w-full overflow-visible">
                  <div
                    className="w-full flex gap-4 sm:gap-6 overflow-x-auto overflow-y-visible py-4 scrollbar-none no-scrollbar snap-x scroll-smooth outline-none"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {filteredPlaylists.map((play) => {
                      if (!play) return null;
                      return (
                        <div key={play.id} className="shrink-0 snap-start select-none relative overflow-visible w-64 sm:w-72">
                          <CardPop
                            onClick={() => handlePlaylistClick(play.id)}
                            className="bg-transparent rounded-xl overflow-hidden cursor-pointer flex flex-col group text-left w-full"
                          >
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950">
                              <img
                                src={play.thumbnailUrl}
                                alt={play.title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                              />
                              <div className="absolute inset-0 bg-black/20" />
                              
                              {/* Playlist Layout Indicator Sheet */}
                              <div className="absolute right-0 inset-y-0 w-[28%] min-w-[75px] max-w-[96px] bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-center p-1 border-l border-zinc-900/50">
                                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white/80" />
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
                                <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors uppercase tracking-tight">
                                  {play.title}
                                </h4>
                                <div className="flex items-center justify-between mt-1 gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0 max-w-[45%]">
                                    {play.channelAvatar && (
                                      <img
                                        src={play.channelAvatar}
                                        alt={play.teacherName}
                                        className="w-4 h-4 rounded-full border border-zinc-800 flex-shrink-0 object-cover"
                                      />
                                    )}
                                    <p
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (play.channelId) {
                                          onSelectChannel?.(play.channelId, 'institute');
                                        } else if (play.teacherId) {
                                          onSelectChannel?.(play.teacherId, 'teacher');
                                        }
                                      }}
                                      className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest hover:text-[#f3b093] hover:underline cursor-pointer truncate"
                                    >
                                      {play.teacherName || 'Verified Educator'}
                                    </p>
                                  </div>
                                  <ScorecardSummary scorecard={play.scorecard} variant="inline" />
                                  {play.totalDurationSeconds > 0 && (
                                    <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-500 shrink-0">
                                      <Clock className="w-3 h-3 text-zinc-750" />
                                      <span>{formatDuration(play.totalDurationSeconds)}</span>
                                    </div>
                                  ) || <div className="text-[9px] font-mono text-[#00D4AA] font-bold shrink-0">VERIFIED</div>}
                                </div>
                              </div>
                            </div>
                          </CardPop>
                        </div>
                      );
                    })}
                    {/* Peek spacer at the right edge to support peeking of the next card */}
                    <div className="w-12 sm:w-20 shrink-0 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Recently Added Lectures */}
          {recentlyAddedVideos.length > 0 && (
            <HorizontalRow
              title="Lectures"
              icon={<Sparkles className="w-5 h-5 text-emerald-400" />}
              onSeeAllClick={() => setActiveExploreTab('lecture')}
            >
              {recentlyAddedVideos.map((lecture) => (
                <div key={lecture.id} className="w-64 sm:w-72">
                  <CardPop className="w-full">
                    <LectureCard 
                      lecture={lecture as any} 
                      onClick={() => onPlayVideo(lecture)} 
                    />
                  </CardPop>
                </div>
              ))}
            </HorizontalRow>
          )}

          {/* Teachers Section */}
          {teachersData.length > 0 && (
            <HorizontalRow
              title="Teachers"
              icon={<Users className="w-5 h-5 text-sky-400" />}
              onSeeAllClick={() => setActiveExploreTab('teachers')}
            >
              {teachersData.map((t) => {
                const dbTeacher = (dbTeachers || []).find(dbT => dbT.id === t.id);
                return (
                  <div key={t.id} className="w-[200px] sm:w-[240px]">
                    <CardPop className="w-full">
                      <TeacherCard
                        t={t}
                        dbTeacher={dbTeacher}
                        videos={videos || []}
                        followedIds={followedIds}
                        handleFollowToggle={handleFollowToggle}
                        setDetailModal={(modal) => onSelectChannel?.(modal.id, modal.type)}
                        onSelect={(id) => onSelectChannel?.(id, 'teacher')}
                      />
                    </CardPop>
                  </div>
                );
              })}
            </HorizontalRow>
          )}

          {/* 4. All India Test Series */}
          {TEST_SERIES_CATALOG.length > 0 && (
            <HorizontalRow
              title="Test Series"
              icon={<BookOpen className="w-5 h-5 text-purple-400" />}
              onSeeAllClick={() => setActiveExploreTab('tests')}
            >
              {TEST_SERIES_CATALOG.map((item) => (
                <div key={item.id} className="w-72 sm:w-80">
                  <CardPop className="w-full">
                    <TestSeriesCard 
                      item={item} 
                      onClick={() => handleTestSeriesClick(item.id)} 
                    />
                  </CardPop>
                </div>
              ))}
            </HorizontalRow>
          )}

          {/* 5. Coaching Batches */}
          {displayBatches.length > 0 && (
            <HorizontalRow
              title="Coaching Batches"
              icon={<GraduationCap className="w-5 h-5 text-indigo-400" />}
              onSeeAllClick={() => setActiveExploreTab('batches')}
            >
              {displayBatches.map((batch) => (
                <div key={batch.id} className="w-[300px] sm:w-[420px]">
                  <CardPop className="w-full">
                    <BatchCard
                      batch={batch}
                      subjectCount={batchSubjectCounts[batch.id] ?? batch.subjectCount}
                      onClick={() => {
                        if (onOpenBatch) {
                          // Open the batch detail modal directly (same as tapping from the full batch-list page)
                          onOpenBatch(batch.id);
                        } else {
                          // Fallback: navigate to batches tab
                          setActiveExploreTab('batches');
                        }
                      }}
                    />
                  </CardPop>
                </div>
              ))}
            </HorizontalRow>
          )}

          {/* 6. Verified Channels */}
          {(channels || []).length > 0 && (
            <HorizontalRow
              title="YouTube Channels"
              icon={<Youtube className="w-5 h-5 text-red-500" />}
              onSeeAllClick={() => setActiveExploreTab('playlists')}
            >
              {(channels || []).map((chan) => {
                if (!chan) return null;
                return (
                  <div key={chan.channelId} className="w-28 sm:w-32">
                    <CardPop
                      onClick={() => handleChannelClick(chan.channelId)}
                      className="w-full flex flex-col items-center text-center py-2 animate-none"
                    >
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-zinc-850 bg-zinc-950">
                        {chan.channelThumbnail ? (
                          <img 
                            src={chan.channelThumbnail} 
                            alt={chan.channelName} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-650 text-xs font-mono">
                            YT
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/10" />
                      </div>
                      <div className="mt-2.5 flex items-center justify-center gap-1 max-w-full px-1">
                        <span className="text-[10px] font-semibold text-zinc-250 truncate">
                          {chan.channelName}
                        </span>
                        <CheckCircle className="w-3 h-3 text-blue-400 shrink-0" />
                      </div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">
                        {formatSubscribers(chan.subscriberCount)} Subs
                      </span>
                    </CardPop>
                  </div>
                );
              })}
            </HorizontalRow>
          )}

          {/* 7. Verified Coaching Institutes */}
          {(institutes || []).length > 0 && (
            <HorizontalRow
              title="Verified Coaching Institutes"
              icon={<Building2 className="w-5 h-5 text-[#00D4AA]" />}
              onSeeAllClick={() => setActiveExploreTab('institutes')}
            >
              {(institutes || []).map((inst) => (
                <div key={inst.id} className="w-[280px] sm:w-[320px]">
                  <CardPop className="w-full">
                    <InstituteCard
                      institute={inst}
                      onViewHub={() => {
                        if (onSelectChannel) {
                          onSelectChannel(inst.id, 'institute');
                        }
                      }}
                    />
                  </CardPop>
                </div>
              ))}
            </HorizontalRow>
          )}

          {/* 8. Trending in Biology */}
          {finalTrendingVideos.length > 0 && (
            <HorizontalRow
              title="Biology"
              icon={<GraduationCap className="w-5 h-5 text-teal-400" />}
              onSeeAllClick={() => setActiveExploreTab('lecture')}
            >
              {finalTrendingVideos.map((lecture) => (
                <div key={lecture.id} className="w-64 sm:w-72">
                  <CardPop className="w-full">
                    <LectureCard 
                      lecture={lecture as any} 
                      onClick={() => onPlayVideo(lecture)} 
                    />
                  </CardPop>
                </div>
              ))}
            </HorizontalRow>
          )}

        </div>
      )}
    </div>
  );
}
