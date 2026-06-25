import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SearchProvider, useSearch } from './context/SearchContext';
import { PlayerProvider, usePlayer } from './context/PlayerContext';
import Header from './components/Header';
import Footer from './components/Footer';
import SearchView from './components/SearchView';
import LectureCard from './components/LectureCard';
import TestSeriesDirectory from './components/TestSeriesDirectory';
import { TEST_SERIES_CATALOG } from './data/testSeriesData';
import HomeDashboard from './components/HomeDashboard';
import VideoPlayerContainer from './components/VideoPlayerContainer';
import LectureDetailView from './components/LectureDetailView';
import DetailsModal from './components/DetailsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { DynamicRating } from './components/DynamicRating';
import ProfileDashboard from './components/ProfileDashboard';
import ModeratorDashboard from './components/ModeratorDashboard';
import AdminEducators from './components/AdminEducators';
import TeacherProfileDetail from './components/TeacherProfileDetail';
import AuthModal from './components/AuthModal';
import OnboardingWizard from './components/OnboardingWizard';
import NotificationsDashboard from './components/NotificationsDashboard';
import SearchSpecsModal from './components/SearchSpecsModal';
import {
  personalizeLectures,
  personalizePlaylists,
  personalizeTeachers
} from './services/recommendationEngine';
import { supabase } from './utils/supabaseClient';
import {
  fetchTeachers,
  fetchInstitutes,
  fetchLectures,
  fetchPlaylists,
  fetchBatches,
  toggleFollow,
  fetchFollowingList,
  addRealNotification,
  deleteNotification,
  markNotificationAsRead,
  isStrategyOrHypeContent,
  isDurationBelow30Minutes
} from './services/dbService';
import { TeacherProfile, InstituteProfile, Lecture, Playlist, Batch, AppNotification, YouTubeVideo } from './types';
import YoutubeThumbnailImg from './components/YoutubeThumbnailImg';
import VideoLibrary from './components/VideoLibrary';
import teachersData from './config/teachersData.json';
import {
  Star,
  Award,
  BookOpen,
  Filter,
  CheckCircle,
  Play,
  User,
  Activity,
  Heart,
  ExternalLink,
  ChevronRight,
  Home,
  Search,
  Library,
  PlaySquare,
  GraduationCap,
  Sparkles,
  Globe,
  ShieldCheck,
  Users,
  ClipboardCheck,
  Layers,
  Video,
  Building2,
  ArrowLeft,
  X,
  SlidersHorizontal,
  EyeOff,
  Clock,
  Mic
} from 'lucide-react';
import { getPlaylistThumbnail, getLectureThumbnail } from './services/thumbnailHelper';
import { BatchCard } from './components/BatchCard';
import { InstituteCard } from './components/InstituteCard';

function LectureCardSkeleton() {
  return (
    <div className="bg-[#0E0E10] border border-zinc-900/90 rounded-2xl overflow-hidden flex flex-col justify-between h-full animate-pulse select-none">
      <div className="relative aspect-video bg-zinc-900/40" />
      <div className="p-4 space-y-3.5 flex-grow flex flex-col justify-between">
        <div className="space-y-2">
          <div className="h-3 bg-zinc-900/70 rounded w-5/6" />
          <div className="h-3 bg-zinc-900/70 rounded w-2/3" />
          <span className="flex items-center gap-2 pt-2">
            <span className="w-5 h-5 bg-zinc-900/70 rounded-full shrink-0" />
            <span className="h-2.5 bg-zinc-900/70 rounded w-2/5" />
          </span>
        </div>
        <span className="h-2.5 bg-zinc-900/40 rounded w-1/4 pt-1" />
      </div>
    </div>
  );
}

function TeacherCardSkeleton() {
  return (
    <div className="bg-[#111111] rounded-2xl p-3 flex flex-col justify-between gap-3 border border-zinc-900/80 animate-pulse select-none w-full max-w-[240px] mx-auto h-[220px]">
      <div className="flex items-start gap-3 justify-between">
        <div className="flex-1 flex flex-col items-center gap-2 max-w-[50%]">
          <div className="w-14 h-14 rounded-full bg-zinc-900/70" />
          <div className="h-2.5 bg-zinc-900/70 rounded w-2/3 mt-1" />
          <div className="h-2 bg-zinc-900/70 rounded w-1/2" />
        </div>
        <div className="flex-1 flex flex-col items-center gap-1.5 pt-1 max-w-[50%]">
          <div className="w-12 h-12 rounded-full bg-zinc-900/70" />
          <div className="h-2 bg-zinc-900/70 rounded w-2/3 mt-1" />
        </div>
      </div>
      <div className="pt-2 border-t border-[#262626] flex gap-2 mt-auto">
        <div className="h-6 bg-zinc-900/60 rounded-lg flex-1" />
        <div className="h-6 bg-zinc-900/60 rounded-lg w-10" />
      </div>
    </div>
  );
}

function BatchCardSkeleton() {
  return (
    <div className="bg-[#111111] rounded-2xl p-5 border border-zinc-900/80 animate-pulse space-y-4 select-none">
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-grow">
          <div className="h-3.5 bg-zinc-900/70 rounded w-3/4" />
          <div className="h-2.5 bg-zinc-900/70 rounded w-1/2" />
        </div>
        <div className="w-12 h-5 bg-zinc-900/70 rounded" />
      </div>
      <div className="space-y-2.5">
        <div className="h-2 bg-zinc-900/50 rounded w-full" />
        <div className="h-2 bg-zinc-900/50 rounded w-5/6" />
      </div>
      <div className="pt-4 border-t border-zinc-900/75 flex justify-between">
        <div className="h-3 bg-zinc-900/60 rounded w-1/4" />
        <div className="h-3 bg-zinc-900/40 rounded w-1/4" />
      </div>
    </div>
  );
}

function InstituteCardSkeleton() {
  return (
    <div className="bg-[#111111] border border-zinc-900 rounded-2xl p-5 animate-pulse flex flex-col justify-between h-full gap-4 select-none">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-zinc-900/70 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1 min-w-0 pt-1">
          <div className="h-3.5 bg-zinc-900/70 rounded w-3/4" />
          <div className="h-2.5 bg-zinc-900/70 rounded w-1/3" />
        </div>
      </div>
      <div className="h-10 bg-zinc-900/40 rounded w-full" />
    </div>
  );
}

/* ── TrustRing & Custom SVG Icons for Premium Teacher Cards ── */
const TrustRing = ({ score, size = 'large' }: { score: number; size?: 'small' | 'large' }) => {
  const isSmall = size === 'small';
  const radius = isSmall ? 22 : 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDrawn(true), 250);
    return () => clearTimeout(t);
  }, []);
  
  const ringSize = isSmall ? 64 : 108;
  const cxCy = isSmall ? 32 : 54;
  const strokeWidthBg = isSmall ? 6 : 12;
  const strokeWidthFg = isSmall ? 4 : 7;
  const fontSizeClass = isSmall ? "text-[11px]" : "text-3xl";

  return (
    <div className="relative flex items-center justify-center" style={{ width: ringSize, height: ringSize }}>
      <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ transform: 'rotate(-90deg)' }} className="ring-pulse">
        <defs>
          <linearGradient id={`mantisGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <filter id={`ringGlow-${size}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={isSmall ? "1.5" : "3"} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={cxCy} cy={cxCy} r={radius} fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth={strokeWidthBg} />
        <circle cx={cxCy} cy={cxCy} r={radius} fill="none" stroke="#FFFDF1" strokeWidth={strokeWidthFg} opacity="0.12" />
        <circle cx={cxCy} cy={cxCy} r={radius} fill="none" stroke={`url(#mantisGrad-${size})`} strokeWidth={strokeWidthFg} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={drawn ? offset : circumference}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          filter={`url(#ringGlow-${size})`} />
        <circle cx={cxCy} cy={cxCy} r={radius} fill="none" stroke="#FFFDF1" strokeWidth={isSmall ? 1 : 2} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={drawn ? offset : circumference}
          opacity="0.35"
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`${fontSizeClass} font-bold text-[#FFFDF1]`}>{score}%</span>
      </div>
    </div>
  );
};

const CustomUserCircleIcon = ({ size = 80, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="4" />
    <path d="M20 21a8 8 0 1 0-16 0" />
  </svg>
);

const CustomGraduationCapIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
  </svg>
);

const CustomShieldCheckIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const CustomStarIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CustomVideoIcon = ({ size = 22, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m16 13 5.223 3.486a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </svg>
);

const CustomUsersIcon = ({ size = 22, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const CustomMessageCircleIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </svg>
);

const CustomPlusIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CustomClockIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

interface TeacherCardProps {
  key?: any;
  t: any;
  dbTeacher: any;
  videos: any[];
  followedIds: string[];
  handleFollowToggle: (teacher: any) => any;
  setDetailModal: (modal: any) => void;
  onSelect: (id: string) => void;
}

const TeacherCard = ({ t, dbTeacher, videos, followedIds, handleFollowToggle, setDetailModal, onSelect }: TeacherCardProps) => {
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [reviewStats, setReviewStats] = useState<{ rating: number; trustScore: number; count: number } | null>(null);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  const avatarUrl = dbTeacher?.avatar || t.profile_photo_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150';
  const isFollowing = followedIds.includes(t.id);
  
  // 1. Live video count from current media nodes
  const teacherVideos = videos.filter(v => v.teacherId === t.id || v.teacherName === t.full_name || (dbTeacher?.name && v.teacherName === dbTeacher.name));
  const videoCount = teacherVideos.length;
  const videoCountStr = videoCount >= 1000 ? `${(videoCount / 1000).toFixed(1)}K` : `${videoCount}`;

  // 2. Fetch live follower count
  useEffect(() => {
    let active = true;
    const fetchCount = async () => {
      try {
        const { count, error } = await supabase
          .from('teacher_followers')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', t.id);
        
        if (error) {
          if (error.message?.includes('does not exist')) {
            if (active) {
              setFollowerCount(0);
              setLoadingFollowers(false);
            }
            return;
          }
          throw error;
        }
        if (active) {
          setFollowerCount(count || 0);
          setLoadingFollowers(false);
        }
      } catch (err) {
        if (active) {
          setFollowerCount(0);
          setLoadingFollowers(false);
        }
      }
    };
    fetchCount();
    return () => { active = false; };
  }, [t.id, followedIds]);

  // 3. Fetch reviews and compute Trust Score & Rating
  useEffect(() => {
    let active = true;
    const fetchReviews = async () => {
      try {
        const teacherVideoIds = teacherVideos.map(v => v.id);
        if (teacherVideoIds.length === 0) {
          if (active) {
            setReviewStats(null);
            setLoadingReviews(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('reviews')
          .select('rating')
          .eq('entity_type', 'video')
          .in('entity_id', teacherVideoIds);

        if (error) {
          if (error.message?.includes('does not exist')) {
            if (active) {
              setReviewStats(null);
              setLoadingReviews(false);
            }
            return;
          }
          throw error;
        }

        if (!data || data.length === 0) {
          if (active) {
            setReviewStats(null);
            setLoadingReviews(false);
          }
          return;
        }

        const ratings = data.map(r => Number(r.rating));
        const sum = ratings.reduce((acc, val) => acc + val, 0);
        const avg = sum / ratings.length;
        
        const positiveCount = ratings.filter(r => r >= 4.0).length;
        const trust = Math.round((positiveCount / ratings.length) * 100);

        if (active) {
          setReviewStats({
            rating: Math.round(avg * 10) / 10,
            trustScore: trust,
            count: ratings.length
          });
          setLoadingReviews(false);
        }
      } catch (err) {
        console.warn('Error fetching reviews:', err);
        if (active) {
          setReviewStats(null);
          setLoadingReviews(false);
        }
      }
    };
    fetchReviews();
    return () => { active = false; };
  }, [t.id, videos]);

  const handleFollowClick = () => {
    const teacherObj = dbTeacher || {
      id: t.id,
      name: t.full_name,
      avatar: avatarUrl,
      subject: t.subject,
      accuracy: reviewStats?.trustScore ?? 90,
      rating: reviewStats?.rating ?? 4.5,
      videoCount: videoCount,
      followersCount: followerCount,
      isVerified: true
    } as any;
    handleFollowToggle(teacherObj);
  };

  const handleDMClick = () => {
    setDetailModal({ id: t.id, type: 'teacher' });
  };

  // Format student count dynamically
  const studentCountStr = followerCount >= 1000 ? `${(followerCount / 1000).toFixed(0)}K` : `${followerCount}`;

  return (
    <div className="card-enter w-full max-w-[240px] mx-auto rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col justify-between text-left h-full" style={{ background: '#000000' }}>
      
      {/* ── Top Two-Column Section ── */}
      <div className="px-3 pt-4 pb-3 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => onSelect(t.id)}>
        <div className="flex items-start gap-4 justify-between">
          {/* Left Column - Profile */}
          <div className="flex-1 flex flex-col items-center gap-2 max-w-[50%]">
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center overflow-hidden border border-white/[0.08]">
              <img src={avatarUrl} alt={t.full_name} className="w-full h-full object-cover" />
            </div>
            <div className="flex items-center gap-1 justify-center w-full mt-1">
              <h2 className="text-[11px] font-bold text-white text-center truncate w-[85%]">{t.full_name}</h2>
              <CustomShieldCheckIcon size={12} className="text-[#3B82F6] shrink-0" />
            </div>
            <div className="flex items-center gap-1 justify-center w-full">
              <span className="text-[9px] text-[#A1A1AA] text-center truncate w-[85%]">{t.institute_name}</span>
              <CustomShieldCheckIcon size={10} className="text-[#3B82F6] shrink-0" />
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-white/[0.02] mt-1 shrink-0">
              <CustomGraduationCapIcon size={10} className="text-sky-300 shrink-0" />
              <span className="text-[8px] text-white font-medium uppercase tracking-wider">{t.subject}</span>
            </div>
            <div className="flex items-center gap-1 mt-1 shrink-0">
              <CustomClockIcon size={10} className="text-sky-300 shrink-0" />
              <span className="text-[9px] font-medium text-[#A1A1AA]">{t.years_of_experience ? `${t.years_of_experience} Yrs` : 'Exp'}</span>
            </div>
          </div>

          {/* Right Column - Trust Score */}
          <div className="flex-1 flex flex-col items-center gap-1.5 pt-1 max-w-[50%]">
            {reviewStats ? (
              <>
                <TrustRing score={reviewStats.trustScore} size="small" />
                <div className="flex items-center gap-1 justify-center mt-1">
                  <span className="text-[10px] font-semibold text-white">Trust Score</span>
                  <CustomShieldCheckIcon size={10} className="text-[#3B82F6]" />
                </div>
                <p className="text-[8px] text-[#A1A1AA] text-center">Based on {reviewStats.count} review{reviewStats.count === 1 ? '' : 's'}</p>
                <div className="flex items-center gap-1 mt-1 justify-center">
                  <CustomStarIcon size={14} className="text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white">{reviewStats.rating.toFixed(1)}</span>
                </div>
                <p className="text-[8px] text-[#A1A1AA]">({reviewStats.count} review{reviewStats.count === 1 ? '' : 's'})</p>
              </>
            ) : loadingReviews ? (
              <div className="flex flex-col items-center justify-center h-24 font-mono text-[8px] text-[#A1A1AA]">
                Analyzing...
              </div>
            ) : (
              <>
                <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
                  <svg width="64" height="64" viewBox="0 0 64 64" className="text-zinc-800">
                    <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-[#A1A1AA]">N/A</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 justify-center mt-1">
                  <span className="text-[10px] font-semibold text-[#A1A1AA]">Trust Score</span>
                </div>
                <p className="text-[8px] text-[#A1A1AA] text-center font-mono">No reviews</p>
                <div className="flex items-center gap-1 mt-1 justify-center text-zinc-550">
                  <CustomStarIcon size={14} className="text-zinc-700 shrink-0" />
                  <span className="text-xs font-mono text-[#A1A1AA]">N/A</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Divider */}
      <div className="border-t border-white/[0.08] mx-3" />

      {/* ── Stats Row ── */}
      <div className="px-3 py-3 flex items-center justify-around">
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <CustomVideoIcon size={16} className="text-white shrink-0" />
            <span className="text-sm font-bold text-white">{videoCountStr}</span>
          </div>
          <span className="text-[9px] text-[#A1A1AA]">Videos</span>
        </div>
        <div className="w-px h-6 bg-white/[0.08]" />
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <CustomUsersIcon size={16} className="text-white shrink-0" />
            <span className="text-sm font-bold text-white">{studentCountStr}</span>
          </div>
          <span className="text-[9px] text-[#A1A1AA]">Students</span>
        </div>
      </div>

      {/* ── CTA Row ── */}
      <div className="px-3 pb-3 pt-0.5">
        {!isFollowing ? (
          <button onClick={handleFollowClick}
            className="follow-btn w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs border border-[#93c5fd]/40 bg-[#93c5fd] text-slate-900 cursor-pointer">
            <CustomPlusIcon size={14} /> Follow
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleFollowClick}
              className="follow-btn flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs border following cursor-pointer font-semibold">
              <CustomCheckIcon size={14} /> Following
            </button>

            <button onClick={handleDMClick}
              className="outline-btn slide-in flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold text-gray-200 border border-white/10 bg-white/[0.03] cursor-pointer shrink-0">
              <CustomMessageCircleIcon size={14} />
              <span>DM</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomCheckIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function AppContent() {
  const { user, firebaseUser, isGuest, enableGuestMode, loading, setExamPreference, updatePreferences } = useAuth();
  const { activeLecture, setActiveLecture } = usePlayer();

  // Strip OAuth error parameters from the address bar immediately upon successful initialization
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      let updated = false;
      const paramsToRemove = ['error', 'error_description', 'error_code', 'error_uri'];
      paramsToRemove.forEach(param => {
        if (url.searchParams.has(param)) {
          url.searchParams.delete(param);
          updated = true;
        }
      });
      if (updated) {
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }
    } catch (e) {
      console.warn("Failed to strip OAuth parameters from URL:", e);
    }
  }, []);

  const [guestBypassed, setGuestBypassed] = useState(() => {
    try {
      return sessionStorage.getItem('biovised_guest_bypassed') === 'true';
    } catch {
      return false;
    }
  });

  // Control splash screen layers (shows on initial session load)
  const [showSplash, setShowSplash] = useState(() => {
    try {
      return !sessionStorage.getItem('biovised_splash_shown');
    } catch {
      return true;
    }
  });

  // Control initial loading state to prevent flash layout shifts
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Control core view layers
  const [currentView, setCurrentView] = useState<'explore' | 'profile' | 'moderator' | 'notifications' | 'search' | 'admin-educators' | 'teacher-detail'>('explore');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [activeExploreTab, setActiveExploreTab] = useState<'home' | 'teachers' | 'playlists' | 'tests' | 'batches' | 'lecture' | 'institutes'>('home');
  
  // Search history state for previous 15 days
  const [searchHistory, setSearchHistory] = useState<Array<{ query: string; ts: number }>>([]);

  // Modals managers
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState<{ id: string; type: 'teacher' | 'institute' } | null>(null);
  const [specsModalOpen, setSpecsModalOpen] = useState(false);

  // Database loaded sets initialized to safe empty arrays to prevent hydration mismatches
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [institutes, setInstitutes] = useState<InstituteProfile[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Safely restore cached datasets on initial client-only mount
  useEffect(() => {
    try {
      const cachedTeachers = localStorage.getItem('biovised_cached_teachers');
      if (cachedTeachers) setTeachers(JSON.parse(cachedTeachers));

      const cachedInstitutes = localStorage.getItem('biovised_cached_institutes');
      if (cachedInstitutes) setInstitutes(JSON.parse(cachedInstitutes));

      const cachedLectures = localStorage.getItem('biovised_cached_lectures');
      if (cachedLectures) setLectures(JSON.parse(cachedLectures));

      const cachedPlaylists = localStorage.getItem('biovised_cached_playlists');
      if (cachedPlaylists) setPlaylists(JSON.parse(cachedPlaylists));

      const cachedBatches = localStorage.getItem('biovised_cached_batches');
      if (cachedBatches) setBatches(JSON.parse(cachedBatches));

      const cachedExam = localStorage.getItem('biovised_onboarding_exam');
      if (cachedExam) {
        setExamFilter(cachedExam);
        setTestExamTag(cachedExam);
      }
    } catch (e) {
      console.warn("Error restoring local cached datasets:", e);
    }
  }, []);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [isLoadingLectures, setIsLoadingLectures] = useState(false);

  // Real-time notifications state & syncing hook
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!user || user.uid === 'guest') {
      setNotifications([]);
      return;
    }
    try {
      const stored = localStorage.getItem(`biovised_notifications_${user.uid}`);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        const welcomeNotifs: AppNotification[] = [
          {
            id: 'welcome_notif',
            userId: user.uid,
            title: 'Welcome to Biovised!',
            message: 'You have entered our premium visual stream environment. Explore verified, high-yield JEE & NEET ecosystem materials.',
            read: false,
            createdAt: new Date().toISOString(),
            type: 'system'
          }
        ];
        setNotifications(welcomeNotifs);
        localStorage.setItem(`biovised_notifications_${user.uid}`, JSON.stringify(welcomeNotifs));
      }
    } catch {
      setNotifications([]);
    }
  }, [user]);

  // Handle slide-off gesture dismiss
  const handleNotificationDismiss = async (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      if (user) {
        try { localStorage.setItem(`biovised_notifications_${user.uid}`, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
    try { await deleteNotification(notificationId); } catch {}
  };

  // Mark all notifications as read inside the dashboard
  const handleMarkAllNotificationsAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      if (user) {
        try { localStorage.setItem(`biovised_notifications_${user.uid}`, JSON.stringify(updated)); } catch {}
      }
      return updated;
    });
    try { await Promise.all(unread.map(n => markNotificationAsRead(n.id))); } catch {}
  };

  const isHandlingPopState = useRef(false);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isHandlingPopState.current = true;
      const state = event.state;
      if (state && typeof state === 'object' && 'currentView' in state) {
        setCurrentView(state.currentView);
        setActiveExploreTab(state.activeExploreTab);
        setActiveLecture(state.activeLecture);
        setDetailModal(state.detailModal);
        if ('selectedTeacherId' in state) {
          setSelectedTeacherId(state.selectedTeacherId);
        }
      } else {
        setCurrentView('explore');
        setActiveExploreTab('home');
        setActiveLecture(null);
        setDetailModal(null);
        setSelectedTeacherId(null);
      }
      setTimeout(() => {
        isHandlingPopState.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state || !('currentView' in window.history.state)) {
      window.history.replaceState({
        currentView,
        activeExploreTab,
        activeLecture,
        detailModal,
        selectedTeacherId
      }, '');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Synchronize URL path route for '/admin/educators' and '/teachers/:id'
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin/educators') {
      if (user) {
        if (user.email === 'adarshaman898@gmail.com' || user.role === 'admin' || user.role === 'moderator') {
          setCurrentView('admin-educators');
        } else {
          // Redirect to home if they are not allowed
          window.history.replaceState({}, document.title, '/');
          setCurrentView('explore');
        }
      } else if (!loading) {
        // Not logged in or guest: open authentication panel
        setAuthModalOpen(true);
      }
    } else if (path.startsWith('/teachers/')) {
      const slugOrId = path.substring('/teachers/'.length);
      if (slugOrId) {
        setSelectedTeacherId(slugOrId);
        setCurrentView('teacher-detail');
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (isHandlingPopState.current) return;

    const hState = window.history.state;
    const changed = !hState ||
      hState.currentView !== currentView ||
      hState.activeExploreTab !== activeExploreTab ||
      JSON.stringify(hState.activeLecture) !== JSON.stringify(activeLecture) ||
      JSON.stringify(hState.detailModal) !== JSON.stringify(detailModal) ||
      hState.selectedTeacherId !== selectedTeacherId;

    if (changed) {
      let urlPath = '/';
      if (currentView === 'admin-educators') {
        urlPath = '/admin/educators';
      } else if (currentView === 'teacher-detail' && selectedTeacherId) {
        urlPath = `/teachers/${selectedTeacherId}`;
      }
      window.history.pushState({
        currentView,
        activeExploreTab,
        activeLecture,
        detailModal,
        selectedTeacherId
      }, '', urlPath);
    }
  }, [currentView, activeExploreTab, activeLecture, detailModal, selectedTeacherId]);

  const handleBackNavigation = () => {
    if (window.history.state && window.history.length > 1) {
      window.history.back();
    } else {
      setActiveLecture(null);
      setDetailModal(null);
      setCurrentView('explore');
    }
  };

  // Resolve tap interaction of a notification element to route perfectly to content
  const handleNotificationClick = async (n: AppNotification) => {
    // Mark read in real-time
    if (!n.read) {
      await markNotificationAsRead(n.id);
    }

    const text = `${n.title} ${n.message}`.toLowerCase();

    // 1. Check for educators/teachers matching name
    const matchedTeacher = teachers.find(t => 
      text.includes(t.name.toLowerCase()) || 
      (n.senderName && t.name.toLowerCase() === n.senderName.toLowerCase()) ||
      t.id === n.senderId
    );
    if (matchedTeacher) {
      setCurrentView('explore');
      setActiveExploreTab('teachers');
      setDetailModal({ id: matchedTeacher.id, type: 'teacher' });
      return;
    }

    // 2. Check for institutes matching names
    const matchedInstitute = institutes.find(inst => 
      text.includes(inst.name.toLowerCase())
    );
    if (matchedInstitute) {
      setCurrentView('explore');
      setActiveExploreTab('institutes');
      setDetailModal({ id: matchedInstitute.id, type: 'institute' });
      return;
    }

    // 3. Check for specific curation lecture
    const matchedLecture = lectures.find(l => 
      text.includes(l.title.toLowerCase())
    );
    if (matchedLecture) {
      setCurrentView('explore');
      setActiveLecture(matchedLecture);
      return;
    }

    // 4. Check for playlists
    const matchedPlaylist = playlists.find(p => 
      text.includes(p.title.toLowerCase())
    );
    if (matchedPlaylist) {
      setCurrentView('explore');
      handleSelectPlaylist(matchedPlaylist);
      return;
    }

    // Structural Fallback routing based on notification type and keywords
    if (n.type === 'video' || text.includes('lecture') || text.includes('video') || text.includes('lesson')) {
      setCurrentView('explore');
      setActiveExploreTab('lecture');
    } else if (text.includes('test') || text.includes('exam')) {
      setCurrentView('explore');
      setActiveExploreTab('tests');
    } else if (text.includes('batch') || text.includes('cohort')) {
      setCurrentView('explore');
      setActiveExploreTab('batches');
    } else if (n.type === 'follow' || text.includes('educator') || text.includes('follow')) {
      setCurrentView('explore');
      setActiveExploreTab('teachers');
    } else if (n.type === 'review' || text.includes('trust score') || text.includes('rating') || text.includes('review')) {
      setCurrentView('profile');
    } else {
      setCurrentView('explore');
      setActiveExploreTab('home');
    }
  };

  const handleSelectPlaylist = async (p: Playlist) => {
    setIsLoadingLectures(true);
    try {
      const playlistId = p.youtubePlaylistId || p.id;
      const response = await fetch(`/api/youtube/lectures?playlistId=${playlistId}`);
      if (response.ok) {
        const resData = await response.json();
        if (resData.status === 'ok' && Array.isArray(resData.data) && resData.data.length > 0) {
          const fetchedLectures = resData.data.map((l: any) => ({
            ...l,
            playlistId: p.id
          }));

          const updatedLectures = [...lectures];
          fetchedLectures.forEach((fl: Lecture) => {
            if (!updatedLectures.some(ul => ul.id === fl.id)) {
              updatedLectures.push(fl);
            }
          });
          setLectures(updatedLectures);
          try {
            localStorage.setItem('biovised_cached_lectures', JSON.stringify(updatedLectures));
          } catch (e) {
            console.warn(e);
          }

          setActiveLecture(fetchedLectures[0]);
          setCurrentView('explore');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    } catch (error) {
      console.error("Failed dynamically fetching playlist videos:", error);
    } finally {
      setIsLoadingLectures(false);
    }

    // Fallback: pseudo-lecture player if the endpoint was empty or failed
    const pseudo: Lecture = {
      id: p.id,
      playlistId: p.id,
      title: p.title,
      description: p.description,
      videoUrl: p.youtubePlaylistId 
        ? `https://www.youtube.com/embed/videoseries?list=${p.youtubePlaylistId}`
        : `https://www.youtube.com/embed/videoseries?list=${p.id}`,
      thumbnailUrl: getPlaylistThumbnail(p),
      subject: p.subject,
      examType: p.examType,
      contentType: 'playlist',
      teacherId: p.teacherId,
      teacherName: p.teacherName,
      instituteId: p.instituteId,
      instituteName: p.instituteName,
      duration: `${p.lecturesCount || 0} Lectures`,
      viewsCount: 1540,
      likesCount: 120,
      createdAt: p.createdAt
    };
    setActiveLecture(pseudo);
    setCurrentView('explore');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dynamic search / filters state from Global Context-Aware Search Architecture
  const { searchQuery, setSearchQuery, activeCategory, setActiveCategory } = useSearch();

  // Sync active category inside the context whenever page view or class category tab changes
  useEffect(() => {
    const activeSegment = currentView === 'explore' ? activeExploreTab : currentView;
    setActiveCategory(activeSegment);
  }, [currentView, activeExploreTab, setActiveCategory]);

  // Dedicated Test section filters state
  const [testExamTag, setTestExamTag] = useState<string>('ALL');
  const [testDelivery, setTestDelivery] = useState<string>('ALL');
  const [testVerification, setTestVerification] = useState<string>('ALL');
  const [testMinRating, setTestMinRating] = useState<number>(0);
  const [testSortBy, setTestSortBy] = useState<'trustScore' | 'rating' | 'priceAsc' | 'priceDesc'>('trustScore');

  // Filter panel toggle & overlay states
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const startSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please try Chrome or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchQuery(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setSpeechError(event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Esc keyboard key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        setShowFilters(false);
        setSearchQuery('');
        setCurrentView('explore');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // CUSTOM SEARCH COMPLIANT STATES (Searches ONLY your local Firestore /videos collection)
  const [vidSearchSubject, setVidSearchSubject] = useState<string>('All');
  const [vidSearchChannel, setVidSearchChannel] = useState<string>('All');
  const [vidSearchDuration, setVidSearchDuration] = useState<string>('All');
  const [firestoreVideos, setFirestoreVideos] = useState<any[]>([]);
  const [isSyncingVideos, setIsSyncingVideos] = useState<boolean>(false);

  // STRICT VARIABLE NAME PRESERVATION
  const [testSeries, setTestSeries] = useState<any[]>([]);
  const [oneShotVideos, setOneShotVideos] = useState<Lecture[]>([]);
  const [videos, setVideos] = useState<Lecture[]>([]);

  const [subjectFilter, setSubjectFilter] = useState<string>('All');
  const [examFilter, setExamFilter] = useState<string>('NEET');
  const [contentTypeFilter, setContentTypeFilter] = useState<'All' | 'lecture' | 'oneshot'>('All');
  const [sortBy, setSortBy] = useState<'rating' | 'trustScore' | 'popularity'>('trustScore');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [serverSearchResults, setServerSearchResults] = useState<any[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [isLabourIllusionActive, setIsLabourIllusionActive] = useState(false);
  const [labourStatusMessage, setLabourStatusMessage] = useState('');
  const [labourProgress, setLabourProgress] = useState(0);
  const [searchedExternal, setSearchedExternal] = useState(false);
  const [externalCount, setExternalCount] = useState(0);
  const [hasExecutedSearch, setHasExecutedSearch] = useState<boolean>(false);

  const executeSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    
    setSearchQuery(trimmed);
    setHasExecutedSearch(true);
    setIsSearchingServer(true);
    setIsLabourIllusionActive(true);
    setLabourProgress(10);
    setLabourStatusMessage("Querying verified catalog databases...");
    
    // Save to history
    recordSearchQuery(trimmed);

    let finalResults: any[] = [];
    let extSearched = false;
    let extCount = 0;

    let illusionTimers: NodeJS.Timeout[] = [];
    const steps = [
      { delay: 250, progress: 35, msg: "Searching verified curriculum database..." },
      { delay: 500, progress: 65, msg: "Resolving educator profiles and ratings..." },
      { delay: 750, progress: 90, msg: "Retrieving mapped chapter lessons..." },
      { delay: 1000, progress: 100, msg: "Formatting results..." }
    ];

    steps.forEach(step => {
      const t = setTimeout(() => {
        setLabourProgress(step.progress);
        setLabourStatusMessage(step.msg);
        if (step.progress === 100) {
          setIsLabourIllusionActive(false);
          setServerSearchResults(finalResults);
          setSearchedExternal(extSearched);
          setExternalCount(extCount);
        }
      }, step.delay);
      illusionTimers.push(t);
    });

    fetch(`/api/search/global?q=${encodeURIComponent(trimmed)}&examType=${examFilter}&subject=${subjectFilter}&contentType=${contentTypeFilter}&activeTab=${activeExploreTab || 'home'}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          finalResults = data.results || [];
          extSearched = data.searchedExternal || false;
          extCount = data.externalCount || 0;
        }
      })
      .catch(err => console.error('[Global Search Sync Failed]:', err))
      .finally(() => {
        setIsSearchingServer(false);
      });
  };

  // PHASE 5: Server-side search API integration - suggestions only
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setServerSearchResults([]);
      setSearchSuggestions([]);
      setSearchedExternal(false);
      setExternalCount(0);
      setIsLabourIllusionActive(false);
      setHasExecutedSearch(false);
      return;
    }

    // Reset results flag if user edits/continues typing
    setHasExecutedSearch(false);

    // Fetch Prefix-Trie / Autocomplete suggestions from Live Real indexed titles (debounced by 300ms)
    const delayDebounce = setTimeout(() => {
      fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}&examType=${examFilter}`)
        .then(res => res.json())
        .then(data => {
          if (data.suggestions) {
            setSearchSuggestions(data.suggestions);
          }
        })
        .catch(err => console.warn('Suggestions fetch failed:', err));
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, examFilter]);

  // Trigger splash screen timer & force redirect on finish when auth loading is resolved
  useEffect(() => {
    if (showSplash && !loading) {
      const timer = setTimeout(() => {
        try {
          sessionStorage.setItem('biovised_splash_shown', 'true');
        } catch {}
        setShowSplash(false);
        // Recover state views from popstate history if they exist, instead of hard-redirecting to 'explore' / 'home'!
        const hState = window.history.state;
        if (hState && 'currentView' in hState) {
          setCurrentView(hState.currentView);
          setActiveExploreTab(hState.activeExploreTab);
          setActiveLecture(hState.activeLecture);
          setDetailModal(hState.detailModal);
        } else {
          setCurrentView('explore');
          setActiveExploreTab('home');
        }
      }, 500); // 500ms snappy response once loaded
      return () => clearTimeout(timer);
    }
  }, [showSplash, loading]);

  // Sync exam preferences when logged in or guest preference is loaded/updated
  useEffect(() => {
    if (user && user.examType) {
      const activeExam = user.examType === 'Both' ? 'NEET' : user.examType;
      localStorage.setItem('biovised_onboarding_exam', activeExam);
      setExamFilter(activeExam);
      setTestExamTag(activeExam);
    }
  }, [user]);

  // Load and sanitize Search History (expired > 15 days are removed)
  useEffect(() => {
    const fetchHistory = () => {
      let history: Array<{ query: string; ts: number }> = [];
      try {
        const stored = localStorage.getItem('biovised_search_history_v2');
        if (stored) history = JSON.parse(stored);
      } catch (err) {
        console.warn(err);
      }
      const now = Date.now();
      const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
      const filtered = history.filter(item => (now - item.ts) <= fifteenDaysMs);
      setSearchHistory(filtered);
    };
    fetchHistory();
  }, [currentView]);

  const recordSearchQuery = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const now = Date.now();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    let history: Array<{ query: string; ts: number }> = [];
    try {
      const stored = localStorage.getItem('biovised_search_history_v2');
      if (stored) history = JSON.parse(stored);
    } catch (err) {
      console.warn(err);
    }

    const cleaned = history.filter(item => {
      const isDuplicate = item.query.toLowerCase() === trimmed.toLowerCase();
      const isExpired = (now - item.ts) > fifteenDaysMs;
      return !isDuplicate && !isExpired;
    });

    const updated = [{ query: trimmed, ts: now }, ...cleaned].slice(0, 15);
    localStorage.setItem('biovised_search_history_v2', JSON.stringify(updated));
    setSearchHistory(updated);
  };

  const deleteSearchQuery = (query: string) => {
    let history: Array<{ query: string; ts: number }> = [];
    try {
      const stored = localStorage.getItem('biovised_search_history_v2');
      if (stored) history = JSON.parse(stored);
    } catch (err) {
      console.warn(err);
    }
    const updated = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    localStorage.setItem('biovised_search_history_v2', JSON.stringify(updated));
    setSearchHistory(updated);
  };

  // Initial load of directories (once on mount) with automatic background persistence synchronization
  useEffect(() => {
    const loadPlatformData = async () => {
      try {
        setIsInitialLoading(true);

        // Fetch parallel resources from Supabase with native catch/handlers
        const [
          { data: dbTeachers, error: errTeachers },
          { data: dbPlaylists, error: errPlaylists },
          { data: dbVideos, error: errVideos },
          { data: dbTestSeries, error: errTestSeries }
        ] = await Promise.all([
          supabase.from('teachers').select('*'),
          supabase.from('playlists').select('*'),
          supabase.from('videos').select('*'),
          supabase.from('test_series').select('*')
        ]);

        const isApiKeyError = 
          (errTeachers && errTeachers.message?.includes('Invalid API key')) ||
          (errPlaylists && errPlaylists.message?.includes('Invalid API key')) ||
          (errVideos && errVideos.message?.includes('Invalid API key')) ||
          (errTestSeries && errTestSeries.message?.includes('Invalid API key'));

        if (!isApiKeyError) {
          if (errTeachers) console.warn('[Supabase Teachers Fetch Error]:', errTeachers);
          if (errPlaylists) console.warn('[Supabase Playlists Fetch Error]:', errPlaylists);
          if (errVideos) console.warn('[Supabase Videos Fetch Error]:', errVideos);
          if (errTestSeries) console.warn('[Supabase TestSeries Fetch Error]:', errTestSeries);
        }

        // Fetch auxiliary legacy models (institutes, batches) from existing service helpers
        let auxiliaryInstitutes: InstituteProfile[] = [];
        let auxiliaryBatches: Batch[] = [];
        try {
          auxiliaryInstitutes = await fetchInstitutes().catch(() => []);
          auxiliaryBatches = await fetchBatches().catch(() => []);
        } catch (auxErr) {
          console.warn('[Auxiliary Services Resolution Error]:', auxErr);
        }

        // 1. Process & Map Teachers (Applying camelCase maps & optional chaining audit)
        const rawTeachers = dbTeachers || [];
        const sanitizedTeachers = rawTeachers.map((t: any) => ({
          id: t?.id,
          name: t?.name || '',
          avatar: t?.avatar || '',
          subject: t?.subject || '',
          subjects: t?.subjects || [t?.subject].filter(Boolean) || [],
          rating: t?.rating || 4.5,
          accuracy: t?.accuracy || 90,
          videoCount: t?.videoCount || t?.video_count || 0,
          followersCount: t?.followersCount || t?.followers_count || 0,
          bio: t?.bio || '',
          exams: t?.exams || ['JEE', 'NEET'],
          isVerified: t?.isVerified ?? t?.is_verified ?? true,
          reviewCount: t?.reviewCount || t?.review_count || 0,
          trustScore: t?.trustScore || t?.trust_score || null,
          officialLinks: t?.officialLinks || t?.official_links || [],
          createdAt: t?.createdAt || t?.created_at || new Date().toISOString()
        }));
        setTeachers(sanitizedTeachers);

        // 2. Process & Map Playlists
        const rawPlaylists = dbPlaylists || [];
        const sanitizedPlaylists = rawPlaylists.map((p: any) => {
          const matchedTeacher = sanitizedTeachers.find((t: any) => t.id === p.teacher_id || t.id === p.teacherId);
          return {
            id: p?.id,
            title: p?.title || '',
            category: p?.category || p?.subject || '',
            thumbnail: p?.thumbnail || p?.thumbnail_url || '',
            thumbnailUrl: p?.thumbnailUrl || p?.thumbnail || p?.thumbnail_url || '',
            description: p?.description || '',
            teacherId: p?.teacher_id || p?.teacherId || '',
            teacherName: p?.teacherName || matchedTeacher?.name || '',
            subject: p?.subject || p?.category || '',
            lecturesCount: p?.lecturesCount || p?.lectures_count || p?.videoCount || p?.video_count || p?.video_count || 0,
            examType: p?.examType || 'Both',
            examTags: p?.examTags || p?.exam_tags || ['JEE', 'NEET'],
            createdAt: p?.createdAt || p?.created_at || new Date().toISOString()
          };
        });
        setPlaylists(sanitizedPlaylists);

        // 3. Process & Map Videos
        const rawVideos = dbVideos || [];
        const sanitizedVideos = rawVideos.map((v: any) => {
          const matchedPlaylist = sanitizedPlaylists.find((p: any) => p.id === v.playlist_id || p.id === v.playlistId);
          const matchedTeacher = sanitizedTeachers.find((t: any) => t.id === (v.teacher_id || v.teacherId || matchedPlaylist?.teacherId));
          return {
            id: v?.id,
            title: v?.title || '',
            videoUrl: v?.videoUrl || v?.video_url || '',
            duration: v?.duration || '',
            category: v?.category || 'lecture',
            playlistId: v?.playlist_id || v?.playlistId || '',
            playlist_id: v?.playlist_id || v?.playlistId || '',
            viewsCount: v?.views || v?.viewsCount || v?.views_count || 0,
            likesCount: v?.likesCount || v?.likes_count || 0,
            thumbnailUrl: v?.thumbnailUrl || matchedPlaylist?.thumbnailUrl || '',
            subject: v?.subject || matchedPlaylist?.subject || '',
            examType: v?.examType || matchedPlaylist?.examType || 'Both',
            contentType: v?.contentType || v?.category || 'lecture',
            teacherId: v?.teacherId || v?.teacherId || matchedPlaylist?.teacherId || '',
            teacherName: v?.teacherName || matchedTeacher?.name || '',
            description: v?.description || 'Verified course chapter lecture.',
            createdAt: v?.createdAt || v?.created_at || new Date().toISOString()
          };
        });
        setVideos(sanitizedVideos);
        setLectures(sanitizedVideos);
        setFirestoreVideos(sanitizedVideos);

        // 4. Process & Map Test Series
        const rawTestSeries = dbTestSeries || [];
        const sanitizedTestSeries = rawTestSeries.map((ts: any) => ({
          id: ts?.id,
          title: ts?.title || ts?.name || '',
          totalTests: ts?.totalTests || ts?.total_tests || 20,
          category: ts?.category || 'NEET',
          price: ts?.price || 1499
        }));
        setTestSeries(sanitizedTestSeries);

        // 5. Build and set OneShotVideos filter array
        const oneshots = sanitizedVideos.filter((v: any) => v.contentType === 'oneshot' || v.category === 'oneshot');
        setOneShotVideos(oneshots);

        // 6. Set auxiliary structures
        if (auxiliaryInstitutes && auxiliaryInstitutes.length > 0) {
          setInstitutes(auxiliaryInstitutes);
        }
        if (auxiliaryBatches && auxiliaryBatches.length > 0) {
          setBatches(auxiliaryBatches);
        }

        // 7. Save mapped state profiles to client local fallback cache
        try {
          localStorage.setItem('biovised_cached_teachers', JSON.stringify(sanitizedTeachers));
          localStorage.setItem('biovised_cached_playlists', JSON.stringify(sanitizedPlaylists));
          localStorage.setItem('biovised_cached_lectures', JSON.stringify(sanitizedVideos));
          if (auxiliaryInstitutes && auxiliaryInstitutes.length > 0) {
            localStorage.setItem('biovised_cached_institutes', JSON.stringify(auxiliaryInstitutes));
          }
          if (auxiliaryBatches && auxiliaryBatches.length > 0) {
            localStorage.setItem('biovised_cached_batches', JSON.stringify(auxiliaryBatches));
          }
        } catch (e) {
          console.warn('[Storage Cache Sync Error]:', e);
        }

      } catch (err) {
        console.warn('Error resolving base datasets from Supabase/Firestore:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadPlatformData();
  }, []);

  // Sync user following list and handle view reset on sign out
  useEffect(() => {
    if (user) {
      fetchFollowingList().then(ids => setFollowedIds(ids));
    } else if (!loading) {
      // Completely logged out. Clear views to avoid rendering frozen dashboards.
      setCurrentView('explore');
      setActiveExploreTab('home');
      setActiveLecture(null);
      setDetailModal(null);
    }
  }, [user, loading]);

  // Real-time Played Video Feedback Loop
  useEffect(() => {
    if (activeLecture && user) {
      const watched = user.watchedContent || [];
      if (!watched.includes(activeLecture.id)) {
        updatePreferences({
          watchedContent: [...watched, activeLecture.id]
        }).catch(err => console.warn('History tracking failed:', err));
      }
    }
  }, [activeLecture, user]);

  const handleFollowToggle = async (t: TeacherProfile) => {
    if (isGuest || !user) {
      setAuthModalOpen(true);
      return;
    }
    const isFollowing = followedIds.includes(t.id);
    if (isFollowing) {
      setFollowedIds(prev => prev.filter(id => id !== t.id));
      setTeachers(prev => prev.map(teacher => {
        if (teacher.id === t.id) {
          return { ...teacher, followersCount: Math.max(0, (teacher.followersCount || 0) - 1) };
        }
        return teacher;
      }));
      await toggleFollow(t.id, t.name, t.avatar, isFollowing);
    } else {
      setFollowedIds(prev => [...prev, t.id]);
      setTeachers(prev => prev.map(teacher => {
        if (teacher.id === t.id) {
          return { ...teacher, followersCount: (teacher.followersCount || 0) + 1 };
        }
        return teacher;
      }));
      await toggleFollow(t.id, t.name, t.avatar, isFollowing);
      
      const newNotif: AppNotification = {
        id: `follow_${t.id}_${Date.now()}`,
        userId: user.uid,
        title: "New Educator Followed",
        message: `You have successfully subscribed to ${t.name}. Direct stream-alert triggers are active!`,
        read: false,
        createdAt: new Date().toISOString(),
        type: 'follow'
      };
      setNotifications(prev => {
        const updated = [newNotif, ...prev];
        try { localStorage.setItem(`biovised_notifications_${user.uid}`, JSON.stringify(updated)); } catch {}
        return updated;
      });

      try {
        await addRealNotification(
          "New Educator Followed",
          `You have successfully subscribed to ${t.name}. Direct stream-alert triggers are active!`,
          'follow'
        );
      } catch (err) {
        console.warn("Could not save cloud notification:", err);
      }
    }
  };

  // Filter application arrays through server search hits or local fallbacks
  const searchActive = currentView === 'search' && searchQuery.trim() !== '';

  const filteredTeachers = personalizeTeachers(
    searchActive
      ? (serverSearchResults.filter(r => r.type === 'teacher') as any[])
      : teachers.filter(t => {
          const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.subject.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesSubject = subjectFilter === 'All' || t.subject === subjectFilter;
          const matchesExam = examFilter === 'All' || t.exams?.includes(examFilter as any);
          return matchesSearch && matchesSubject && matchesExam;
        }),
    user,
    examFilter,
    subjectFilter
  ).sort((a, b) => {
    if (sortBy === 'rating') return b.rating - a.rating;
    if (sortBy === 'trustScore') return b.trustScore - a.trustScore;
    return b.followersCount - a.followersCount;
  }).filter(t => !verifiedOnly || (t.isVerified !== false && t.verified !== false && t.verificationStatus !== 'pending'));

  const getOneShotLecturesPerChapter = (list: Lecture[]): Lecture[] => {
    // 1. Filter out lectures that don't have thumbnails or are short < 30m or strategy/clickbait
    let validList = list.filter(l => 
      l.thumbnailUrl && 
      l.thumbnailUrl.trim() !== '' &&
      !isDurationBelow30Minutes(l.duration) &&
      !isStrategyOrHypeContent(l.title)
    );

    // Helper to parse duration to minutes
    const parseDurationToMinutes = (durationStr: string): number => {
      if (!durationStr) return 0;
      const dLower = durationStr.toLowerCase().trim();
      if (dLower.startsWith('pt')) {
        let minutes = 0;
        const hrsMatch = dLower.match(/(\d+)\s*h/);
        if (hrsMatch) minutes += parseInt(hrsMatch[1], 10) * 60;
        const minsMatch = dLower.match(/(\d+)\s*m/);
        if (minsMatch) minutes += parseInt(minsMatch[1], 10);
        return minutes;
      }
      let totalMinutes = 0;
      const hourMatch = dLower.match(/(\d+)\s*h/);
      if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
      const minMatch = dLower.match(/(\d+)\s*m/);
      if (minMatch) {
        totalMinutes += parseInt(minMatch[1], 10);
      } else if (!hourMatch) {
         const parts = dLower.split(':');
         if (parts.length === 3) {
           totalMinutes += parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
         } else if (parts.length === 2) {
           totalMinutes += parseInt(parts[0], 10);
         } else {
           const numericOnly = parseInt(dLower.replace(/[^\d]/g, ''), 10);
           if (!isNaN(numericOnly)) totalMinutes = numericOnly;
         }
      }
      return totalMinutes;
    };

    // Group by chapter
    const groups: Record<string, Lecture[]> = {};

    const guessChapter = (title: string): string => {
      const tLower = title.toLowerCase();
      const commonChapters = [
        "electrostatics", "current electricity", "magnetic effects", "induction", 
        "alternating current", "optics", "wave optics", "dual nature", "atoms", 
        "nuclei", "semiconductors", "kinematics", "laws of motion", "work power", 
        "rotational motion", "gravitation", "thermodynamics", "oscillations", "waves",
        "atomic structure", "chemical bonding", "states of matter", "equilibrium", 
        "redox", "coordination", "goc", "organic chemistry", "hydrocarbons", "amino", 
        "haloalkane", "haloarene", "alcohol", "phenol", "ether", "aldehyde", "ketone",
        "carboxylic", "biomolecule", "polymer", "solid state", "solution", 
        "electrochemistry", "kinetics", "surface chemistry", "diversity", "biology",
        "plant physiology", "human physiology", "reproduction", "genetics", "evolution"
      ];
      for (const ch of commonChapters) {
        if (tLower.includes(ch)) return ch;
      }
      return '';
    };

    validList.forEach(l => {
      let chName = (l.chapter || guessChapter(l.title)).trim();
      if (!chName) {
        chName = l.title.replace(/(?:part|pt|lecture|l|class|chap|chapter|part-|pt-)\s*([0-9]+)/ig, '').trim();
      }
      const key = chName.toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(l);
    });

    const bestLectures: Lecture[] = [];
    Object.keys(groups).forEach(key => {
      const candidates = groups[key];
      if (candidates.length === 0) return;

      // Sort candidate videos:
      // Priority 1: Prefer full length lectures longer than 3 hours (180 minutes)
      // Priority 2: Sort descending by duration
      // Priority 3: Sort descending by views count
      candidates.sort((a, b) => {
        const durA = parseDurationToMinutes(a.duration);
        const durB = parseDurationToMinutes(b.duration);

        const over3HrsA = durA >= 180 ? 1 : 0;
        const over3HrsB = durB >= 180 ? 1 : 0;

        if (over3HrsA !== over3HrsB) {
          return over3HrsB - over3HrsA; // Over 3 hrs comes first!
        }
        if (durA !== durB) {
          return durB - durA; // Longest first!
        }
        return (b.viewsCount || 0) - (a.viewsCount || 0); // Most viewed fallback
      });

      bestLectures.push(candidates[0]);
    });

    return bestLectures;
  };

  const rawFilteredLectures = (searchActive
    ? (serverSearchResults.filter(r => r.type === 'lecture') as any[])
    : lectures.filter(l => {
        // Simple filter of content type before personalization sorting
        const matchesContent = contentTypeFilter === 'All' || 
          l.contentType === contentTypeFilter || 
          (contentTypeFilter === 'lecture' && l.contentType === 'playlist');
        return matchesContent;
      })).filter(l => l.verified === true || l.verificationStatus === 'verified');

  const personalizedRawLectures = personalizeLectures(
    rawFilteredLectures,
    user,
    examFilter,
    subjectFilter,
    searchQuery
  );

  const filteredLectures = getOneShotLecturesPerChapter(personalizedRawLectures);

  const filteredInstitutes = (searchActive
    ? serverSearchResults.filter(r => r.type === 'institute')
    : institutes.filter(inst => {
        const matchesSearch = inst.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesExam = examFilter === 'All' || inst.exams?.includes(examFilter as any);
        return matchesSearch && matchesExam;
      })).filter(inst => !verifiedOnly || (inst.isVerified !== false && inst.verified !== false));

  const filteredPlaylists = personalizePlaylists(
    searchActive
      ? (serverSearchResults.filter(r => r.type === 'playlist') as any[])
      : playlists,
    user,
    examFilter,
    subjectFilter,
    searchQuery
  );

  const filteredBatches = (searchActive
    ? serverSearchResults.filter(r => r.type === 'batch')
    : batches.filter(b => {
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.description.toLowerCase().includes(searchQuery.toLowerCase());
        const currentExam = examFilter !== 'All' ? examFilter : (user?.examType || 'Both');
        if (currentExam !== 'Both' && currentExam !== 'All' && b.examType && b.examType !== 'Both' && b.examType !== 'All' && b.examType !== currentExam) {
          return false;
        }
        const matchesExam = examFilter === 'All' || b.examType === examFilter || b.examType === 'Both';
        const matchesSubject = subjectFilter === 'All' || b.subject === subjectFilter;
        return matchesSearch && matchesExam && matchesSubject;
      })).filter(b => !verifiedOnly || (b.verified !== false));

  const filteredTestSeries = (TEST_SERIES_CATALOG || []).filter(ts => {
    const matchesSearch = ts.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          ts.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ts.description.toLowerCase().includes(searchQuery.toLowerCase());
    const currentExam = examFilter !== 'All' ? examFilter : (user?.examType || 'Both');
    if (currentExam !== 'Both' && currentExam !== 'All' && ts.examType && ts.examType !== 'Both' && ts.examType !== 'All' && ts.examType !== currentExam) {
      return false;
    }
    return matchesSearch;
  });

  if (showSplash) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans selection:bg-white selection:text-black animate-fade-in">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center justify-center text-center px-4"
        >
          <h1 className="text-white text-4xl sm:text-6xl font-bold tracking-tight font-sans select-none">
            BioVised
          </h1>
          <p className="text-zinc-500 text-[10px] sm:text-xs tracking-widest uppercase mt-4 font-mono">
            JEE & NEET Discovery Platform
          </p>
          <div className="w-48 h-0.5 bg-zinc-900 rounded-full overflow-hidden mt-6 relative">
            <div className="absolute top-0 bottom-0 left-0 w-2/5 bg-white rounded-full animate-progress-slide" />
          </div>
        </motion.div>
      </div>
    );
  }

  // Gate check: If user is not authenticated and has not chosen guest mode yet, force them to land on the login page
  if (!loading && !firebaseUser && !guestBypassed) {
    return (
      <AuthModal
        isOpen={true}
        onClose={() => {}}
        isLandingPage={true}
        onGuestBypass={() => {
          try {
            sessionStorage.setItem('biovised_guest_bypassed', 'true');
          } catch {}
          setGuestBypassed(true);
        }}
      />
    );
  }

  // Onboarding walkthrough check for authenticated users
  if (!loading && firebaseUser && user && !user.onboardingCompleted && user.uid !== 'guest') {
    return <OnboardingWizard />;
  }



  const getCategorySuggestions = (tab: string) => {
    switch (tab) {
      case 'tests':
        return ["NEET Full", "Allen Major", "JEE Main Spec", "Physics Part Test", "Calculus Suite"];
      case 'teachers':
        return ["HC Verma", "NV Sir", "Organic Chemistry", "Biology Expert", "Aman Sir"];
      case 'playlists':
        return ["11th Physics", "Inorganic Series", "JEE Advanced Maths", "Full NEET Revision"];
      case 'batches':
        return ["Alpha Batch", "Target 2026", "Revision Cohort", "Crash Course"];
      case 'lecture':
        return ["Electrostatics", "Chemical Kinetics", "Rotational Motion", "Cell Division", "Photosynthesis"];
      case 'institutes':
        return ["Kota Hub", "Aakash Digital", "Motion Education", "Allen Classes"];
      default:
        return ["Physics", "Chemistry", "Maths", "Biology"];
    }
  };

  const getActiveSegmentMatchesCount = (tab: string) => {
    switch (tab) {
      case 'tests':
        return 16;
      case 'teachers':
        return filteredTeachers?.length || 0;
      case 'playlists':
        return filteredPlaylists?.length || 0;
      case 'batches':
        return filteredBatches?.length || 0;
      case 'lecture':
        return filteredLectures?.length || 0;
      case 'institutes':
        return filteredInstitutes?.length || 0;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col font-sans selection:bg-white selection:text-black transition-colors duration-200">
      
      {/* Loading lectures overlay */}
      {isLoadingLectures && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4 select-none">
          <div className="relative w-12 h-12 bg-white rounded-xl flex items-center justify-center animate-bounce shadow-2xl">
            <span className="text-black font-sans font-bold text-lg select-none">B</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 animate-pulse">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">Opening Playlist Channel</span>
            <span className="text-[10px] font-mono text-white uppercase tracking-wider">Syncing Lecture Nodes via YouTube API</span>
          </div>
          <div className="w-32 h-[1px] bg-neutral-900 relative overflow-hidden rounded-full mt-2">
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute left-0 top-0 bottom-0 w-12 bg-white rounded-full"
            />
          </div>
        </div>
      )}

      {/* Fixed top Header segment */}
      <Header
        onSearchChange={(q) => {
          setSearchQuery(q);
        }}
        onSearchSubmit={() => {}}
        onViewDashboard={(view) => {
          setCurrentView(view);
          if (view === 'explore') {
            setIsSearchFocused(false);
          }
        }}
        onLogoClick={() => {
          setSearchQuery('');
          setCurrentView('explore');
          setActiveExploreTab('home');
        }}
        currentView={currentView as any}
        searchVal={searchQuery}
        activeExploreTab={activeExploreTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        notifications={notifications}
        showFilters={showFilters}
        onToggleFilters={() => setSpecsModalOpen(true)}
        isFilterSupported={currentView === 'explore' || currentView === 'search'}
        onFocus={() => {
          if (currentView === 'explore') {
            setIsSearchFocused(true);
          }
        }}
        searchSuggestions={searchSuggestions}
        currentExamType={examFilter}
        onVoiceSearchClick={startSpeechRecognition}
      />

      {/* Modern Slide-Down Unified Multi-Filter Panel like YouTube but tailored to tabs */}
      <AnimatePresence>
        {showFilters && currentView === 'explore' && (
          <motion.div
            id="unified-multi-filter-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="bg-[#090909] border-b border-[#1A1A1A] overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-5 md:px-8 space-y-4 text-left">
              <div className="flex justify-between items-center pb-2 border-b border-[#141414]">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 flex-row">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  {activeExploreTab === 'tests' 
                    ? 'Target test matrix variables' 
                    : `Filter profile: ${activeExploreTab?.toUpperCase()}`
                  }
                </span>
                <button
                  onClick={() => {
                    const defaultExam = user?.examType === 'Both' ? 'NEET' : (user?.examType || 'NEET');
                    if (activeExploreTab === 'tests') {
                      setTestExamTag(defaultExam);
                      setTestDelivery('ALL');
                      setTestVerification('ALL');
                      setTestMinRating(0);
                    } else {
                      setSubjectFilter('All');
                      setExamFilter(defaultExam);
                      setContentTypeFilter('All');
                    }
                  }}
                  className="text-[10px] font-mono font-bold text-[#EEEEEE] hover:underline uppercase cursor-pointer"
                >
                  Reset Parameters
                </button>
              </div>

              {activeExploreTab === 'tests' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 text-xs text-zinc-350">

                  {/* Delivery Mode */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Delivery Mode</span>
                    <div className="flex flex-wrap gap-1">
                      {['ALL', 'ONLINE', 'OFFLINE'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => setTestDelivery(mode)}
                          className={`px-2.5 py-1 rounded text-[10px] font-medium border cursor-pointer select-none leading-none transition-colors ${
                            testDelivery === mode
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Verification status */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Verification</span>
                    <div className="flex flex-wrap gap-1">
                      {['ALL', 'VERIFIED', 'UNVERIFIED'].map(v => (
                        <button
                          key={v}
                          onClick={() => setTestVerification(v)}
                          className={`px-2.5 py-1 rounded text-[10px] font-medium border cursor-pointer select-none leading-none transition-colors ${
                            testVerification === v
                              ? 'bg-white text-black border-white'
                              : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {v === 'ALL' ? 'All' : v === 'VERIFIED' ? 'Verified' : 'Manual'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Rating Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Min Rating</span>
                    <div className="pt-1">
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.5"
                        value={testMinRating}
                        onChange={(e) => setTestMinRating(parseFloat(e.target.value))}
                        className="w-full accent-emerald-500 cursor-pointer h-1 bg-zinc-800 rounded-lg outline-none"
                      />
                      <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                        <span>Any</span>
                        <span className="text-emerald-400 font-bold">{testMinRating}★+</span>
                        <span>5★</span>
                      </div>
                    </div>
                  </div>

                  {/* Sort parameter */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Sort By</span>
                    <select
                      value={testSortBy}
                      onChange={(e) => setTestSortBy(e.target.value as any)}
                      className="bg-[#111113] border border-zinc-850 rounded px-2.5 py-1.5 text-[11px] font-sans text-zinc-300 outline-none w-full"
                    >
                      <option value="trustScore">Trust Score (High)</option>
                      <option value="rating">Rating (High to Low)</option>
                      <option value="priceAsc">Price (Low to High)</option>
                      <option value="priceDesc">Price (High to Low)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs text-zinc-350">
                  {/* Subject selector */}
                  {activeExploreTab !== 'batches' && activeExploreTab !== 'institutes' && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Preferred Subject</span>
                      <div className="flex flex-wrap gap-1">
                        {['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'].map(sub => (
                          <button
                            key={sub}
                            onClick={() => setSubjectFilter(sub)}
                            className={`px-2.5 py-1 rounded text-[10px] font-medium border cursor-pointer select-none leading-none transition-all ${
                              subjectFilter === sub
                                ? 'bg-white text-black border-white'
                                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}



                  {/* Format selector for lectures tab */}
                  {activeExploreTab === 'lecture' && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider block">Lesson Format</span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { id: 'All', label: 'All Lectures' },
                          { id: 'lecture', label: 'Standard Chapters' },
                          { id: 'oneshot', label: 'One-shots Only' }
                        ].map(ct => (
                          <button
                            key={ct.id}
                            onClick={() => setContentTypeFilter(ct.id as any)}
                            className={`px-2.5 py-1 rounded text-[10px] font-medium border cursor-pointer select-none leading-none transition-all ${
                              contentTypeFilter === ct.id
                                ? 'bg-white text-black border-white'
                                : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {ct.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className={`flex-1 ${activeLecture ? 'pb-0' : 'pb-32'}`}>
          
          {/* Main conditional views manager */}
          {currentView === 'search' ? (
            <SearchView
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              hasExecutedSearch={hasExecutedSearch}
              setHasExecutedSearch={setHasExecutedSearch}
              setCurrentView={setCurrentView}
              searchSuggestions={searchSuggestions}
              executeSearch={executeSearch}
              speechError={speechError}
              setSpeechError={setSpeechError}
              startSpeechRecognition={startSpeechRecognition}
              isLabourIllusionActive={isLabourIllusionActive}
              labourProgress={labourProgress}
              labourStatusMessage={labourStatusMessage}
              serverSearchResults={serverSearchResults}
              testSeries={TEST_SERIES_CATALOG}
              teachers={teachers}
              followedIds={followedIds}
              handleFollowToggle={handleFollowToggle}
              setDetailModal={setDetailModal}
              recordSearchQuery={recordSearchQuery}
              setActiveLecture={setActiveLecture}
              handleSelectPlaylist={handleSelectPlaylist}
              setActiveExploreTab={setActiveExploreTab}
            />
          ) : currentView === 'profile' && user ? (
            <ProfileDashboard
              onSelectLecture={(lec) => {
                setActiveLecture(lec);
                setCurrentView('explore');
              }}
              onOpenTeacher={(teacherId) => setDetailModal({ id: teacherId, type: 'teacher' })}
              activeLecture={activeLecture}
              onLogoutSuccess={() => setCurrentView('explore')}
              onNavigate={(view) => setCurrentView(view)}
            />
          ) : currentView === 'moderator' && user?.email === 'adarshaman898@gmail.com' ? (
            <ModeratorDashboard />
          ) : currentView === 'admin-educators' && user && (user.email === 'adarshaman898@gmail.com' || user.role === 'admin' || user.role === 'moderator') ? (
            <AdminEducators
              onBack={() => handleBackNavigation()}
              userEmail={user.email}
            />
          ) : currentView === 'teacher-detail' && selectedTeacherId ? (
            <TeacherProfileDetail
              teacherId={selectedTeacherId}
              onBack={() => handleBackNavigation()}
              followedIds={followedIds}
              handleFollowToggle={handleFollowToggle}
              setDetailModal={setDetailModal}
            />
          ) : currentView === 'notifications' ? (
            <div className="max-w-4xl mx-auto px-4 py-4 space-y-6 text-left pb-24 min-h-[80vh]">
              <NotificationsDashboard
                notifications={notifications}
                onDismiss={handleNotificationDismiss}
                onNotificationClick={handleNotificationClick}
                onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                onViewDashboard={(view) => {
                  if (view === 'explore') {
                    handleBackNavigation();
                  } else {
                    setCurrentView(view as any);
                  }
                }}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            </div>
          ) : (
            // Explore View (Main Discovery Screen)
            <>
              {activeLecture ? (
                /* Dedicated Video Player View (Plays in its own clean page to prevent design collapse) */
                <ErrorBoundary>
                  <div className="min-h-[80vh] flex flex-col pb-4 text-left">
                    <div className="w-full max-w-7xl mx-auto px-4 py-4">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Video Player Column */}
                        <div className="lg:col-span-2 space-y-4">
                          <VideoPlayerContainer
                            lecture={activeLecture}
                            onClose={handleBackNavigation}
                            playlistLectures={lectures.filter(l => l.playlistId === activeLecture.playlistId)}
                            onSelectLecture={setActiveLecture}
                          />
                          {/* Detail view below player on mobile */}
                          <div className="block lg:hidden">
                            <LectureDetailView
                              lecture={activeLecture}
                              onSelectLecture={setActiveLecture}
                              onClose={handleBackNavigation}
                              onOpenAuth={() => setAuthModalOpen(true)}
                            />
                          </div>
                        </div>

                        {/* Detail view sidebar on desktop */}
                        <div className="hidden lg:block lg:col-span-1">
                          <LectureDetailView
                            lecture={activeLecture}
                            onSelectLecture={setActiveLecture}
                            onClose={handleBackNavigation}
                            onOpenAuth={() => setAuthModalOpen(true)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </ErrorBoundary>
              ) : (
                <>

              {/* Main Tab Controller Content */}
                  {activeExploreTab === 'home' && (
                    <HomeDashboard
                      onFocusSearch={() => {
                        setCurrentView('search');
                        setIsSearchFocused(true);
                      }}
                    />
                  )}

              {activeExploreTab === 'lecture' && (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 pb-24 text-left">
                  {/* Search Video Lectures list results */}
                  <section className="space-y-6">
                    <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                      <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-zinc-400" /> Channel Chapters & Lectures ({filteredLectures.length})
                      </h3>
                    </div>

                    {isInitialLoading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in">
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <LectureCardSkeleton key={idx} />
                        ))}
                      </div>
                    ) : filteredLectures.length === 0 ? (
                      <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">No video lessons registered matching search parameter bounds.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredLectures.map((lec) => {
                          const formattedSub = "182K";
                          const lectureDto = {
                            ...lec,
                            channel: {
                              id: lec.teacherId || 'unknown',
                              name: lec.teacherName || 'Verified Educator',
                              avatarUrl: null,
                              bannerUrl: null,
                              subscriberCountRaw: 182000,
                              subscriberCountFormatted: formattedSub
                            }
                          };

                          return (
                            <LectureCard
                              key={lec.id}
                              lecture={lectureDto as any}
                              onClick={() => {
                                recordSearchQuery(searchQuery);
                                setActiveLecture(lec);
                                setCurrentView('explore');
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeExploreTab === 'teachers' && (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-24 text-left">
                  {/* Banner deleted per UI/UX Refactor */}

                  {isInitialLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
                      {Array.from({ length: 12 }).map((_, idx) => (
                        <TeacherCardSkeleton key={idx} />
                      ))}
                    </div>
                  ) : (() => {
                    const filteredStaticTeachers = teachersData.filter(t => {
                      const matchesSearch = t.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                           t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                           t.institute_name.toLowerCase().includes(searchQuery.toLowerCase());
                      const matchesSubject = subjectFilter === 'All' || t.subject === subjectFilter;
                      
                      const dbTeacher = teachers.find(dbT => dbT.id === t.id);
                      const matchesExam = examFilter === 'All' || !dbTeacher || dbTeacher.exams?.includes(examFilter as any);
                      
                      return matchesSearch && matchesSubject && matchesExam;
                    });
                    
                    if (filteredStaticTeachers.length === 0) {
                      return <p className="text-xs text-zinc-500 py-10 text-center font-mono">No educators listed matching criteria.</p>;
                    }
                    
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-7xl mx-auto px-4">
                        {filteredStaticTeachers.map((t) => {
                          const dbTeacher = teachers.find(dbT => dbT.id === t.id);
                          return (
                            <TeacherCard
                              key={t.id}
                              t={t}
                              dbTeacher={dbTeacher}
                              videos={videos}
                              followedIds={followedIds}
                              handleFollowToggle={handleFollowToggle}
                              setDetailModal={setDetailModal}
                              onSelect={(id) => {
                                setSelectedTeacherId(id);
                                setCurrentView('teacher-detail');
                              }}
                            />
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activeExploreTab === 'playlists' && (
                <VideoLibrary onBackToHome={() => setActiveExploreTab('home')} />
              )}

              {activeExploreTab === 'batches' && (
                <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-24 text-left">
                  <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-zinc-400" /> REGISTERED LIVE COURSE BATCHES ({filteredBatches.length})
                    </h3>
                  </div>

                  {isInitialLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 animate-fade-in">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <BatchCardSkeleton key={idx} />
                      ))}
                    </div>
                  ) : filteredBatches.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">No live student cohorts or batches match the selected criteria.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 p-0.5">
                      {filteredBatches.map((b) => (
                        <BatchCard
                          key={b.id}
                          batch={b}
                          onClick={() => setDetailModal({ id: b.id, type: 'batch' as any })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeExploreTab === 'tests' && (
                <TestSeriesDirectory 
                  searchQuery={searchQuery}
                  selectedExamTag={testExamTag}
                  setSelectedExamTag={setTestExamTag}
                  selectedDelivery={testDelivery}
                  setSelectedDelivery={setTestDelivery}
                  selectedVerification={testVerification}
                  setSelectedVerification={setTestVerification}
                  minRating={testMinRating}
                  setMinRating={setTestMinRating}
                  sortBy={testSortBy}
                  setSortBy={setTestSortBy}
                />
              )}

              {activeExploreTab === 'institutes' && (
                <div id="institutes-directory-root" className="max-w-7xl mx-auto px-4 py-8 space-y-6 pb-24 text-left font-sans">
                  <div className="flex justify-between items-center pb-3 border-b border-[#1A1A1A]">
                    <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-zinc-400" /> NEET & JEE VERIFIED ACADEMIC CHANNELS ({filteredInstitutes.length})
                    </h3>
                  </div>

                  {isInitialLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <InstituteCardSkeleton key={idx} />
                      ))}
                    </div>
                  ) : filteredInstitutes.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">No affiliated academies match the selected criteria.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredInstitutes.map((inst) => (
                        <InstituteCard
                          key={inst.id}
                          institute={inst}
                          onViewHub={() => setDetailModal({ id: inst.id, type: 'institute' })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

            </>
          )}

              {/* Exact Mock Screenshot Match Footer Navigation Bar (Hidden when activeLecture is playing to block distraction) */}
              {!activeLecture && (
                <Footer
                  currentView={currentView}
                  activeExploreTab={activeExploreTab}
                  onTabSelect={(tabId) => {
                    setCurrentView('explore');
                    setActiveExploreTab(tabId);
                    setSearchQuery('');
                    setShowFilters(false);
                    setIsSearchFocused(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}
            </>
          )}

        </main>

      {/* Structured details review modal view */}
      {detailModal && (
        <DetailsModal
          isOpen={!!detailModal}
          onClose={handleBackNavigation}
          targetType={detailModal.type}
          targetId={detailModal.id}
          onSelectLecture={(lec) => {
            setActiveLecture(lec);
            setCurrentView('explore');
          }}
        />
      )}

      {/* Authorized Popup user overlays */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <SearchSpecsModal
        isOpen={specsModalOpen}
        onClose={() => setSpecsModalOpen(false)}
        subjectFilter={subjectFilter as any}
        setSubjectFilter={setSubjectFilter as any}
        examFilter={examFilter}
        setExamFilter={setExamFilter}
        contentTypeFilter={contentTypeFilter as any}
        setContentTypeFilter={setContentTypeFilter as any}
        sortBy={sortBy as any}
        setSortBy={setSortBy as any}
        searchQuery={searchQuery}
        verifiedOnly={verifiedOnly}
        setVerifiedOnly={setVerifiedOnly}
        activeExploreTab={activeExploreTab}
        testExamTag={testExamTag}
        setTestExamTag={setTestExamTag}
        testDelivery={testDelivery}
        setTestDelivery={setTestDelivery}
        testVerification={testVerification}
        setTestVerification={setTestVerification}
        testMinRating={testMinRating}
        setTestMinRating={setTestMinRating}
        testSortBy={testSortBy}
        setTestSortBy={setTestSortBy}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <PlayerProvider>
          <AppContent />
        </PlayerProvider>
      </SearchProvider>
    </AuthProvider>
  );
}
