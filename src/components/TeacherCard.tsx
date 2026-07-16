import { useState, useEffect } from 'react';
import { fetchTeacherStats } from '../services/dbService';

interface TeacherCardProps {
  t: any;
  dbTeacher: any;
  videos: any[];
  followedIds: string[];
  handleFollowToggle: (teacher: any) => any;
  setDetailModal: (modal: any) => void;
  onSelect: (id: string) => void;
}

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
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#00acc1" />
          </linearGradient>
          <filter id={`ringGlow-${size}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={isSmall ? "1.5" : "3"} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={cxCy} cy={cxCy} r={radius} fill="none" stroke="rgba(34,211,238,0.1)" strokeWidth={strokeWidthBg} />
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
        <span className={`${fontSizeClass} font-bold text-trust`}>{score}%</span>
      </div>
    </div>
  );
};

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

const CustomCheckIcon = ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CustomClockIcon = ({ size = 15, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const TeacherCard = ({ t, dbTeacher, videos, followedIds = [], handleFollowToggle, setDetailModal, onSelect }: TeacherCardProps) => {
  const [followerCount, setFollowerCount] = useState<number>(0);
  const [reviewStats, setReviewStats] = useState<{ rating: number; trustScore: number; count: number } | null>(null);
  const [loadingFollowers, setLoadingFollowers] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  const avatarUrl = dbTeacher?.avatar || t.profile_photo_url || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150';
  const isFollowing = followedIds.includes(t.id);
  
  // 1. Live video count from current media nodes
  const teacherVideos = (videos || []).filter(v => v.teacherId === t.id || v.teacherName === t.full_name || (dbTeacher?.name && v.teacherName === dbTeacher.name));
  const videoCount = teacherVideos.length;
  const videoCountStr = videoCount >= 1000 ? `${(videoCount / 1000).toFixed(1)}K` : `${videoCount}`;

  // 2. Fetch live stats (followers & reviews) using consolidated service function
  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      setLoadingFollowers(true);
      setLoadingReviews(true);
      try {
        const teacherVideoIds = teacherVideos.map(v => v.id);
        const stats = await fetchTeacherStats(t.id, teacherVideoIds);
        if (active) {
          setFollowerCount(stats.followerCount);
          setReviewStats(stats.reviewStats);
        }
      } catch (err) {
        console.warn('Error loading stats in TeacherCard:', err);
      } finally {
        if (active) {
          setLoadingFollowers(false);
          setLoadingReviews(false);
        }
      }
    };
    loadStats();
    return () => { active = false; };
  }, [t.id, videos, followedIds]);

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
    handleFollowToggle?.(teacherObj);
  };

  const handleDMClick = () => {
    setDetailModal?.({ id: t.id, type: 'teacher' });
  };

  // Format student count dynamically
  const studentCountStr = followerCount >= 1000 ? `${(followerCount / 1000).toFixed(0)}K` : `${followerCount}`;

  return (
    <div className="card-enter w-full max-w-[240px] mx-auto rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden flex flex-col justify-between text-left h-full min-h-[360px]" style={{ background: '#000000' }}>
      
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
              <div className="flex flex-col items-center justify-center gap-2 h-24 w-full">
                <div className="w-12 h-12 rounded-full bg-zinc-800 animate-pulse skeleton" />
                <div className="w-16 h-2 rounded bg-zinc-800 animate-pulse skeleton" />
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

export default TeacherCard;
