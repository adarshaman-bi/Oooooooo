import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { TeacherProfile } from '../types';
import TeacherProfileSkeleton from './skeletons/TeacherProfileSkeleton';
import teachersDiscography from '../config/teachersDiscography.json';
import { 
  MapPin, 
  Calendar, 
  ExternalLink, 
  Share2, 
  MessageSquare, 
  GraduationCap, 
  ShieldCheck, 
  CheckCircle, 
  Video, 
  Users, 
  Star, 
  Play,
  ArrowLeft,
  Youtube,
  ArrowRight
} from 'lucide-react';
import { LecturesGrid } from './LecturesGrid';
import { usePlayer } from '../context/PlayerContext';

const BG = "#000000";
const CARD = "#0D0D0C";
const BORDER = "#1A1A1A";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_SEC = "#A0A0A0";
const TEAL = "#FFFFFF";

interface TeacherProfileCacheEntry {
  dbTeacher: TeacherProfile | null;
  followerCount: number;
  reviewStats: { rating: number; trustScore: number; count: number } | null;
  reviewsList: any[];
  ytChannelInfo: any;
  ytLectures: any[];
  timestamp: number;
}

const profileCache: Record<string, TeacherProfileCacheEntry> = {};

const formatViews = (views: any) => {
  if (typeof views === 'string') return views;
  if (typeof views === 'number') {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(0)}K`;
    return `${views}`;
  }
  return null;
};

interface TeacherProfileDetailProps {
  teacherId: string;
  onBack: () => void;
  followedIds: string[];
  handleFollowToggle: (teacher: any) => void;
  setDetailModal: (modal: any) => void;
}

export default function TeacherProfileDetail({
  teacherId,
  onBack,
  followedIds,
  handleFollowToggle,
  setDetailModal
}: TeacherProfileDetailProps) {
  const [activeTab, setActiveTab] = useState("Overview");
  const { setActiveVideoId, setActiveLecture } = usePlayer();
  const cache = profileCache[teacherId];

  const [dbTeacher, setDbTeacher] = useState<TeacherProfile | null>(cache ? cache.dbTeacher : null);
  const [loadingTeacher, setLoadingTeacher] = useState(!cache);

  // Stats
  const [followerCount, setFollowerCount] = useState<number>(cache ? cache.followerCount : 0);
  const [loadingFollowers, setLoadingFollowers] = useState(!cache);
  const [reviewStats, setReviewStats] = useState<{ rating: number; trustScore: number; count: number } | null>(cache ? cache.reviewStats : null);
  const [loadingReviews, setLoadingReviews] = useState(!cache);
  const [reviewsList, setReviewsList] = useState<any[]>(cache ? cache.reviewsList : []);

  // YouTube proxy data
  const [ytChannelInfo, setYtChannelInfo] = useState<any>(cache ? cache.ytChannelInfo : null);
  const [loadingYtChannel, setLoadingYtChannel] = useState(ytChannelInfo ? false : !cache);
  const [ytLectures, setYtLectures] = useState<any[]>(cache ? cache.ytLectures : []);
  const [loadingYtLectures, setLoadingYtLectures] = useState(ytLectures ? false : !cache);

  // Caching effect on teacherId change
  useEffect(() => {
    const freshCache = profileCache[teacherId];
    if (freshCache) {
      setDbTeacher(freshCache.dbTeacher);
      setLoadingTeacher(false);
      setFollowerCount(freshCache.followerCount);
      setLoadingFollowers(false);
      setReviewStats(freshCache.reviewStats);
      setLoadingReviews(false);
      setReviewsList(freshCache.reviewsList);
      setYtChannelInfo(freshCache.ytChannelInfo);
      setLoadingYtChannel(false);
      setYtLectures(freshCache.ytLectures);
      setLoadingYtLectures(false);
    } else {
      setDbTeacher(null);
      setLoadingTeacher(true);
      setFollowerCount(0);
      setLoadingFollowers(true);
      setReviewStats(null);
      setLoadingReviews(true);
      setReviewsList([]);
      setYtChannelInfo(null);
      setLoadingYtChannel(false);
      setYtLectures([]);
      setLoadingYtLectures(false);
    }
  }, [teacherId]);

  const isFollowing = followedIds.includes(teacherId);

  // 1. Fetch Teacher info from Supabase
  useEffect(() => {
    let active = true;
    const fetchTeacher = async () => {
      if (!profileCache[teacherId] || !profileCache[teacherId].dbTeacher) {
        setLoadingTeacher(true);
      }
      try {
        const { data, error } = await supabase
          .from('teachers')
          .select('*')
          .eq('id', teacherId)
          .maybeSingle();

        if (error) throw error;
        if (data && active) {
          const feat = data.features || {};
          const profileData = {
            id: data.id,
            name: data.name || '',
            avatar: data.avatar || '',
            subject: data.subject || '',
            subjects: Array.isArray(data.subjects) ? data.subjects : [data.subject].filter(Boolean),
            rating: Number(data.rating) || 0,
            reviewCount: Number(feat.reviewCount) || 0,
            trustScore: Number(feat.trustScore) || null,
            followersCount: data.followers_count || 0,
            officialLinks: Array.isArray(feat.officialLinks) ? feat.officialLinks : [],
            bio: data.bio || '',
            exams: Array.isArray(data.exams) ? data.exams : ['JEE', 'NEET'],
            isVerified: data.is_verified ?? true,
            youtubeChannelId: feat.youtubeChannelId || '',
            previousInstitutes: Array.isArray(feat.previous_institutes) ? feat.previous_institutes : [],
            teachingMode: typeof feat.teaching_mode === 'string' ? feat.teaching_mode : '',
            languages: Array.isArray(feat.languages) ? feat.languages : [],
            features: feat
          } as TeacherProfile;
          
          setDbTeacher(profileData);

          profileCache[teacherId] = {
            ...(profileCache[teacherId] || { followerCount: 0, reviewStats: null, reviewsList: [], ytChannelInfo: null, ytLectures: [], timestamp: Date.now() }),
            dbTeacher: profileData,
            timestamp: Date.now()
          };
        }
      } catch (err) {
        console.error('Error fetching teacher detail:', err);
      } finally {
        if (active) setLoadingTeacher(false);
      }
    };

    fetchTeacher();
    return () => { active = false; };
  }, [teacherId]);

  // 2. Fetch Live follower count
  useEffect(() => {
    let active = true;
    const fetchFollowerCount = async () => {
      if (!profileCache[teacherId] || profileCache[teacherId].followerCount === undefined) {
        setLoadingFollowers(true);
      }
      try {
        const { count, error } = await supabase
          .from('teacher_followers')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', teacherId);

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

          profileCache[teacherId] = {
            ...(profileCache[teacherId] || { dbTeacher: null, reviewStats: null, reviewsList: [], ytChannelInfo: null, ytLectures: [], timestamp: Date.now() }),
            followerCount: count || 0,
            timestamp: Date.now()
          };
        }
      } catch (err) {
        console.error('Error fetching follower count:', err);
        if (active) {
          setFollowerCount(0);
          setLoadingFollowers(false);
        }
      }
    };

    fetchFollowerCount();
    return () => { active = false; };
  }, [teacherId, followedIds]);

  // 3. Fetch reviews and calculate dynamic Trust Score & Star Ratings
  useEffect(() => {
    let active = true;
    const fetchReviewsAndStats = async () => {
      if (!profileCache[teacherId] || !profileCache[teacherId].reviewStats) {
        setLoadingReviews(true);
      }
      try {
        // A. Load all videos matching teacher
        const { data: dbVideos, error: vidErr } = await supabase
          .from('videos')
          .select('id, title, teacher_id, teacher_name')
          .or(`teacher_id.eq.${teacherId},teacher_name.eq.${dbTeacher?.name || ''}`);

        if (vidErr) {
          if (vidErr.message?.includes('does not exist')) {
            if (active) {
              setReviewStats(null);
              setReviewsList([]);
              setLoadingReviews(false);
            }
            return;
          }
          throw vidErr;
        }

        const videoIds = (dbVideos || []).map(v => v.id);
        if (videoIds.length === 0) {
          if (active) {
            setReviewStats(null);
            setReviewsList([]);
            setLoadingReviews(false);
          }
          return;
        }

        // B. Fetch Reviews
        const { data: reviewsData, error: revErr } = await supabase
          .from('reviews')
          .select('id, video_id:entity_id, rating, review_text:comment, created_at, user_id')
          .eq('entity_type', 'video')
          .in('entity_id', videoIds);

        if (revErr) {
          if (revErr.message?.includes('does not exist')) {
            if (active) {
              setReviewStats(null);
              setReviewsList([]);
              setLoadingReviews(false);
            }
            return;
          }
          throw revErr;
        }

        if (!reviewsData || reviewsData.length === 0) {
          if (active) {
            setReviewStats(null);
            setReviewsList([]);
            setLoadingReviews(false);
          }
          return;
        }

        // C. Calculate Dynamic Averages
        const ratings = reviewsData.map(r => Number(r.rating));
        const sum = ratings.reduce((acc, val) => acc + val, 0);
        const avg = sum / ratings.length;
        const positiveCount = ratings.filter(r => r >= 4.0).length;
        const trust = Math.round((positiveCount / ratings.length) * 100);

        if (active) {
          const stats = {
            rating: Math.round(avg * 10) / 10,
            trustScore: trust,
            count: ratings.length
          };
          setReviewStats(stats);
          setReviewsList(reviewsData);
          setLoadingReviews(false);

          profileCache[teacherId] = {
            ...(profileCache[teacherId] || { dbTeacher: null, followerCount: 0, ytChannelInfo: null, ytLectures: [], timestamp: Date.now() }),
            reviewStats: stats,
            reviewsList: reviewsData,
            timestamp: Date.now()
          };
        }
      } catch (err) {
        console.error('Error fetching review statistics:', err);
        if (active) {
          setReviewStats(null);
          setReviewsList([]);
          setLoadingReviews(false);
        }
      }
    };

    if (dbTeacher) {
      fetchReviewsAndStats();
    }
    return () => { active = false; };
  }, [teacherId, dbTeacher]);

  // 4. Fetch YouTube data from port 3001 Express proxy (Bypassed if discography exists)
  useEffect(() => {
    let active = true;
    const ytChannelId = dbTeacher?.youtubeChannelId;
    if (!ytChannelId) return;

    // Check if teacher has local discography override
    const dbNameClean = dbTeacher?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/gg/g, 'g').replace(/z/g, 's');
    const hasDiscography = dbNameClean && teachersDiscography.some(item => {
      const cleanDisc = item.teacher_name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/gg/g, 'g').replace(/z/g, 's');
      return dbNameClean === cleanDisc || dbNameClean.includes(cleanDisc) || cleanDisc.includes(dbNameClean);
    });

    if (hasDiscography) {
      return;
    }

    const fetchChannelInfo = async () => {
      if (!profileCache[teacherId] || !profileCache[teacherId].ytChannelInfo) {
        setLoadingYtChannel(true);
      }
      try {
        const res = await fetch(`http://localhost:3001/api/youtube/channel/${ytChannelId}`);
        if (!res.ok) throw new Error('Failed to fetch channel from proxy');
        const payload = await res.json();
        if (active && payload.status === 'ok') {
          const playlists = payload.data?.playlists || [];
          const resolvedPlaylists = await Promise.all(playlists.map(async (p: any) => {
            const hasPlaceholder = !p.thumbnail || p.thumbnail.includes('/vi/PL') || p.thumbnail.includes('placeholder');
            if (hasPlaceholder) {
              try {
                const lecRes = await fetch(`/api/teachers/${p.id}/lectures`);
                const lecPayload = await lecRes.json();
                if (lecPayload.success && lecPayload.data && lecPayload.data.length > 0) {
                  const firstVideoId = lecPayload.data[0].id;
                  p.thumbnail = `https://i.ytimg.com/vi/${firstVideoId}/maxresdefault.jpg`;
                }
              } catch (err) {
                console.warn(`Could not resolve playlist thumbnail:`, err);
              }
            }
            return p;
          }));

          const updatedChannelData = {
            ...payload.data,
            playlists: resolvedPlaylists
          };

          setYtChannelInfo(updatedChannelData);

          profileCache[teacherId] = {
            ...(profileCache[teacherId] || { dbTeacher: null, followerCount: 0, reviewStats: null, reviewsList: [], ytLectures: [], timestamp: Date.now() }),
            ytChannelInfo: updatedChannelData,
            timestamp: Date.now()
          };
        }
      } catch (err) {
        console.error('Error loading channel info from proxy:', err);
      } finally {
        if (active) setLoadingYtChannel(false);
      }
    };

    const fetchChannelLectures = async () => {
      if (!profileCache[teacherId] || !profileCache[teacherId].ytLectures) {
        setLoadingYtLectures(true);
      }
      try {
        const res = await fetch(`http://localhost:3001/api/youtube/lectures/${ytChannelId}`);
        if (!res.ok) throw new Error('Failed to fetch uploaded videos from proxy');
        const payload = await res.json();
        if (active && payload.status === 'ok') {
          const lecturesData = payload.data || [];
          setYtLectures(lecturesData);

          profileCache[teacherId] = {
            ...(profileCache[teacherId] || { dbTeacher: null, followerCount: 0, reviewStats: null, reviewsList: [], ytChannelInfo: null, timestamp: Date.now() }),
            ytLectures: lecturesData,
            timestamp: Date.now()
          };
        }
      } catch (err) {
        console.error('Error loading uploads from proxy:', err);
      } finally {
        if (active) setLoadingYtLectures(false);
      }
    };

    fetchChannelInfo();
    fetchChannelLectures();

    return () => { active = false; };
  }, [dbTeacher?.youtubeChannelId]);

  // 4b. Local Discography Loader
  useEffect(() => {
    if (!dbTeacher?.name) return;

    const dbNameClean = dbTeacher.name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/gg/g, 'g').replace(/z/g, 's');
    const discMatch = teachersDiscography.find(item => {
      const cleanDisc = item.teacher_name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/gg/g, 'g').replace(/z/g, 's');
      return dbNameClean === cleanDisc || dbNameClean.includes(cleanDisc) || cleanDisc.includes(dbNameClean);
    });

    if (discMatch) {
      const loadResolvedPlaylists = async () => {
        const playlists = discMatch.verified_master_catalog.playlists;
        const resolved = await Promise.all(playlists.map(async (p: any) => {
          let thumbnail = p.thumbnail_url;
          const hasPlaceholder = !thumbnail || thumbnail.includes('/vi/PL') || thumbnail.includes('placeholder');
          if (hasPlaceholder) {
            try {
              const res = await fetch(`/api/teachers/${p.playlist_id}/lectures`);
              const payload = await res.json();
              if (payload.success && payload.data && payload.data.length > 0) {
                const firstVideoId = payload.data[0].id;
                thumbnail = `https://i.ytimg.com/vi/${firstVideoId}/maxresdefault.jpg`;
              }
            } catch (err) {
              console.warn(`Could not resolve playlist thumbnail for ${p.playlist_id}:`, err);
            }
          }
          return {
            id: p.playlist_id,
            title: p.playlist_title,
            thumbnail: thumbnail,
            lectures_count: p.video_count,
            origin_channel_name: p.origin_channel_name
          };
        }));

        const mappedLectures = discMatch.verified_master_catalog.standalone_lectures_and_one_shots.map(v => ({
          id: v.video_id,
          title: v.video_title,
          thumbnail: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400',
          duration: v.duration,
          viewsCount: v.view_count_approx,
          publishedAt: v.published_at,
          origin_channel_name: v.origin_channel_name
        }));

        const firstLive = discMatch.verified_master_catalog.live_broadcast_hubs?.[0];
        const mappedLiveStream = firstLive ? {
          videoId: firstLive.video_id,
          title: firstLive.stream_title,
          thumbnail: 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=400',
          origin_channel_name: firstLive.origin_channel_name
        } : null;

        setYtChannelInfo({
          playlists: resolved,
          liveStream: mappedLiveStream
        });
        setYtLectures(mappedLectures);
        setLoadingYtChannel(false);
        setLoadingYtLectures(false);
      };
      loadResolvedPlaylists();
    }
  }, [dbTeacher?.name]);

  const handlePlaylistClick = async (playlistId: string) => {
    try {
      const res = await fetch(`/api/teachers/${playlistId}/lectures`);
      const payload = await res.json();
      if (payload.success && payload.data && payload.data.length > 0) {
        const firstVideo = payload.data[0];
        setActiveVideoId(firstVideo.id);
        setActiveLecture({
          id: firstVideo.id,
          title: firstVideo.title,
          description: firstVideo.description || 'Verified course chapter lecture.',
          videoUrl: `https://www.youtube.com/embed/${firstVideo.id}`,
          thumbnailUrl: firstVideo.thumbnail,
          duration: firstVideo.duration || '30m',
          viewsCount: firstVideo.viewsCount || 0,
          likesCount: 0,
          createdAt: firstVideo.publishedAt || new Date().toISOString(),
          subject: dbTeacher?.subject || 'Academic',
          examType: dbTeacher?.exams?.[0] || 'Both',
          contentType: 'playlist',
          teacherId: dbTeacher?.id || '',
          teacherName: dbTeacher?.name || '',
          playlistId: playlistId
        });
      }
    } catch (err) {
      console.error("Failed to load playlist lectures on click:", err);
    }
  };

  const handleFollowClick = () => {
    if (!dbTeacher) return;
    const teacherObj = {
      id: dbTeacher.id,
      name: dbTeacher.name,
      avatar: dbTeacher.avatar,
      subject: dbTeacher.subject,
      accuracy: reviewStats?.trustScore ?? 90,
      rating: reviewStats?.rating ?? 4.5,
      followersCount: followerCount,
      isVerified: dbTeacher.isVerified
    } as any;
    handleFollowToggle(teacherObj);
  };

  const handleDMClick = () => {
    setDetailModal({ id: teacherId, type: 'teacher' });
  };

  const getInitials = (nameStr: string) => {
    const parts = nameStr.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = ["#7C3AED", "#0891B2", "#B45309", "#DC2626", "#059669", "#2563EB"];
    return colors[index % colors.length];
  };

  if (loadingTeacher) {
    return <TeacherProfileSkeleton />;
  }

  if (!dbTeacher) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-center font-mono">
        <p className="text-sm text-zinc-400">Educator profile not found.</p>
        <button onClick={onBack} className="text-xs text-[#00D4AA] flex items-center gap-1.5 hover:underline bg-none border-none cursor-pointer">
          <ArrowLeft size={14} /> Back to Directory
        </button>
      </div>
    );
  }

  // Format stats values
  const videosCountStr = ytChannelInfo?.videoCount !== undefined 
    ? (ytChannelInfo.videoCount >= 1000 ? `${(ytChannelInfo.videoCount / 1000).toFixed(1)}K` : `${ytChannelInfo.videoCount}`)
    : '0';

  const studentsCountStr = followerCount >= 1000 ? `${(followerCount / 1000).toFixed(0)}K` : `${followerCount}`;
  const trustScoreStr = reviewStats ? `${reviewStats.trustScore}` : 'N/A';
  const ratingStr = reviewStats ? `${reviewStats.rating.toFixed(1)}` : 'N/A';
  const ratingsLabel = reviewStats ? `${reviewStats.count} review${reviewStats.count === 1 ? '' : 's'}` : 'No reviews';

  // Subsections definitions
  const currentInst = dbTeacher?.instituteName || "Verified Academy";
  const prevInsts = dbTeacher?.previousInstitutes || [];
  
  const ExperienceTimeline = [
    { 
      role: `${dbTeacher?.subject || "Subject"} Educator`, 
      org: currentInst, 
      period: "2020 – Present", 
      desc: `Teaching ${dbTeacher?.subject || "subject"} to JEE & NEET aspirants at ${currentInst}. Covers core syllabus with structured lectures.` 
    },
    ...prevInsts.map(inst => ({
      role: `Former ${dbTeacher?.subject || "Subject"} Educator`,
      org: inst,
      period: "Prior Tenure",
      desc: `Taught ${dbTeacher?.subject || "subject"} and mentored board and competitive exam aspirants at ${inst}.`
    }))
  ];

  return (
    <div style={{ background: BG, minHeight: '100vh', fontFamily: 'Inter, sans-serif' }} className="pb-20 text-left select-none">
      {/* ── Top Custom Header Bar ── */}
      <div className="px-6 md:px-16 py-4 flex items-center gap-4 border-b border-[#1A1A1A]">
        <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors cursor-pointer mr-2 flex items-center gap-1 bg-transparent border-none">
          <ArrowLeft size={16} />
          <span className="text-xs font-semibold uppercase tracking-wider font-mono">Back</span>
        </button>
        <div className="h-4 w-px bg-[#1A1A1A]" />
        <span className="text-xs text-zinc-500 font-mono">Teachers / {dbTeacher.name}</span>
      </div>

      {/* ── Hero Banner Section ── */}
      <section style={{ background: CARD, borderBottom: `1px solid ${BORDER}` }} className="w-full px-6 md:px-16 py-12 relative overflow-hidden">
        {/* Subtle chemistry formula texture */}
        <div
          style={{
            position: "absolute", inset: 0, opacity: 0.02, pointerEvents: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='180'%3E%3Ctext x='10' y='28' font-size='10' fill='white' font-family='monospace'%3EH%E2%82%82O%3C/text%3E%3Ctext x='70' y='55' font-size='9' fill='white' font-family='monospace'%3ENaCl%3C/text%3E%3Ctext x='140' y='30' font-size='10' fill='white' font-family='monospace'%3ECH%E2%82%84%3C/text%3E%3Ctext x='10' y='90' font-size='9' fill='white' font-family='monospace'%3EC%E2%82%86H%E2%82%81%E2%82%82O%E2%82%86%3C/text%3E%3Ctext x='110' y='80' font-size='10' fill='white' font-family='monospace'%3ECO%E2%82%82%3C/text%3E%3Ctext x='30' y='130' font-size='10' fill='white' font-family='monospace'%3EH%E2%82%82SO%E2%82%84%3C/text%3E%3Ctext x='130' y='120' font-size='9' fill='white' font-family='monospace'%3ENH%E2%82%83%3C/text%3E%3Ctext x='60' y='165' font-size='10' fill='white' font-family='monospace'%3EHCl%3C/text%3E%3Ctext x='170' y='155' font-size='9' fill='white' font-family='monospace'%3EO%E2%82%82%3C/text%3E%3C/svg%3E")`,
            backgroundSize: "280px 200px",
          }}
        />

        <div className="flex flex-col md:flex-row gap-8 md:gap-12 relative z-10">
          {/* Photo */}
          <div className="shrink-0 mx-auto md:mx-0">
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-full md:rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-zinc-900">
              <img
                src={dbTeacher.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300'}
                alt={dbTeacher.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300';
                }}
              />
            </div>
          </div>

          {/* Info */}
          <div className="flex flex-col gap-3 flex-1 justify-center text-center md:text-left">
            <div className="flex items-center gap-2.5 justify-center md:justify-start">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {dbTeacher.name}
              </h1>
              {dbTeacher.isVerified && <CheckCircle size={20} className="text-[#00D4AA] shrink-0" />}
            </div>

            <p style={{ color: TEXT_SEC }} className="text-sm font-medium">{dbTeacher.subject} Educator</p>

            <div className="flex items-center gap-1.5 justify-center md:justify-start">
              <ShieldCheck size={14} className="text-[#00D4AA]" />
              <span style={{ color: TEXT_SEC }} className="text-xs">{dbTeacher.instituteName || "Verified Biovised Academy"}</span>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-4 justify-center md:justify-start flex-wrap text-xs text-zinc-400 font-mono mt-1">
              <div className="flex items-center gap-1.5">
                <Calendar size={12} className="text-zinc-500" />
                <span>Experience: {dbTeacher.createdAt ? 'Active' : 'Experienced'}</span>
              </div>
              <div className="hidden md:block h-3 w-px bg-zinc-800" />
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-zinc-500" />
                <span>India</span>
              </div>
              {dbTeacher.youtubeChannelId && (
                <>
                  <div className="hidden md:block h-3 w-px bg-zinc-800" />
                  <div className="flex items-center gap-1.5">
                    <ExternalLink size={12} className="text-zinc-500" />
                    <span className="truncate max-w-[200px]">youtube.com/channel/{dbTeacher.youtubeChannelId}</span>
                  </div>
                </>
              )}
            </div>

            {/* Bio */}
            <p style={{ color: TEXT_SEC }} className="text-xs md:text-sm max-w-xl leading-relaxed mt-2 mx-auto md:mx-0">
              {dbTeacher.bio || `Expert coaching for ${dbTeacher.exams?.join(' & ') || 'NEET/JEE'} Chemistry. High-quality study plans, mock solutions, and dedicated doubts resolution.`}
            </p>

            {/* Subject specialization chip */}
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
              {dbTeacher.subjects?.map((subj) => (
                <span
                  key={subj}
                  style={{ background: "#0D0D0C", border: "1px solid #1A1A1A", color: TEXT_PRIMARY }}
                  className="rounded-full text-[10px] uppercase font-bold tracking-wider px-3 py-1 flex items-center gap-1"
                >
                  <GraduationCap size={10} />
                  {subj}
                </span>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-4 justify-center md:justify-start">
              <button
                onClick={handleFollowClick}
                className={`follow-btn flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-none ${
                  isFollowing ? 'bg-[#0D0D0C] text-[#FFFFFF] border border-[#1A1A1A]' : 'bg-[#FFFFFF] text-[#000000] hover:bg-zinc-200'
                }`}
              >
                <CheckCircle size={14} />
                {isFollowing ? 'Following' : 'Follow'}
              </button>
              
              <button
                onClick={handleDMClick}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#0D0D0C] text-[#FFFFFF] border border-[#1A1A1A] hover:bg-zinc-900 transition-all cursor-pointer"
              >
                <MessageSquare size={14} />
                Message
              </button>

              <button
                style={{ border: `1px solid ${BORDER}` }}
                className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer bg-transparent"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Teacher profile link copied to clipboard!');
                }}
              >
                <Share2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Ribbon Section ── */}
      <div style={{ background: "#111214", borderBottom: `1px solid ${BORDER}` }} className="w-full grid grid-cols-2 md:grid-cols-5 text-center font-mono">
        {/* Videos count */}
        <div style={{ borderRight: `1px solid ${BORDER}` }} className="flex flex-col items-center py-6 gap-1 border-b md:border-b-0 border-[#1D1F24]">
          <Video size={14} className="text-zinc-500" />
          <div className="flex items-baseline mt-1">
            <span style={{ color: TEXT_PRIMARY }} className="text-xl md:text-2xl font-bold">{videosCountStr}</span>
          </div>
          <span style={{ color: TEXT_SEC }} className="text-[10px] uppercase tracking-wider">Total Videos</span>
        </div>

        {/* Followers count */}
        <div style={{ borderRight: `1px solid ${BORDER}` }} className="flex flex-col items-center py-6 gap-1 border-b md:border-b-0 border-[#1D1F24]">
          <Users size={14} className="text-zinc-500" />
          <div className="flex items-baseline mt-1">
            <span style={{ color: TEXT_PRIMARY }} className="text-xl md:text-2xl font-bold">
              {loadingFollowers ? '...' : studentsCountStr}
            </span>
          </div>
          <span style={{ color: TEXT_SEC }} className="text-[10px] uppercase tracking-wider">Followers</span>
        </div>

        {/* Rating */}
        <div style={{ borderRight: `1px solid ${BORDER}` }} className="flex flex-col items-center py-6 gap-1">
          <Star size={14} className="text-amber-500 fill-amber-500" />
          <div className="flex items-baseline mt-1">
            <span style={{ color: TEXT_PRIMARY }} className="text-xl md:text-2xl font-bold">
              {loadingReviews ? '...' : ratingStr}
            </span>
          </div>
          <span style={{ color: TEXT_SEC }} className="text-[10px] uppercase tracking-wider">{ratingsLabel}</span>
        </div>

        {/* Trust Score */}
        <div style={{ borderRight: `1px solid ${BORDER}` }} className="flex flex-col items-center py-6 gap-1">
          <ShieldCheck size={14} className="text-emerald-500" />
          <div className="flex items-baseline mt-1">
            <span className="text-xl md:text-2xl font-bold text-emerald-500">
              {loadingReviews ? '...' : trustScoreStr}
            </span>
            {reviewStats && <span className="text-zinc-500 text-xs font-normal">/100</span>}
          </div>
          <span style={{ color: TEXT_SEC }} className="text-[10px] uppercase tracking-wider">Trust Score</span>
        </div>

        {/* Verified Status */}
        <div className="flex flex-col items-center py-6 gap-1 col-span-2 md:col-span-1">
          <ShieldCheck size={14} className="text-[#FFFFFF]" />
          <div className="flex items-baseline mt-1">
            <span className="text-xl md:text-2xl font-bold text-[#FFFFFF]">Verified</span>
          </div>
          <span style={{ color: TEXT_SEC }} className="text-[10px] uppercase tracking-wider">Educator</span>
        </div>
      </div>

      {/* ── Sub Navigation Tabs row ── */}
      <div style={{ background: "#0D0D0C", borderBottom: `1px solid ${BORDER}` }} className="w-full flex px-6 md:px-16 overflow-x-auto">
        {["Overview", "Experience", "Lectures", "Live", "Playlists", "About"].map((tab) => {
          const isActive = tab === activeTab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                color: isActive ? TEXT_PRIMARY : TEXT_SEC,
                borderBottomColor: isActive ? "#FFFFFF" : "transparent",
              }}
              className="px-4 height-[46px] py-3 text-xs md:text-sm font-semibold border-b-2 bg-transparent border-none cursor-pointer mr-2 transition-all shrink-0 hover:text-white"
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ── Tab Views Contents ── */}
      <div className="px-6 md:px-16 py-8">
        
        {/* OVERVIEW TAB */}
        {activeTab === "Overview" && (
          <div className="space-y-10">
            {/* Reviews Shelf */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 style={{ color: TEXT_PRIMARY }} className="text-base font-semibold">Student Reviews</h2>
                  {reviewStats && (
                    <div style={{ background: "#F5A62314", border: "1px solid #F5A62325" }} className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold text-amber-500">
                      <Star size={11} className="fill-amber-500" />
                      <span>{reviewStats.rating.toFixed(1)}</span>
                      <span className="text-zinc-500 font-normal">· {reviewStats.count} review{reviewStats.count === 1 ? '' : 's'}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setDetailModal({ id: teacherId, type: 'teacher' })}
                  className="px-4 py-1.5 rounded-full text-xs font-bold bg-[#FAFBFB] text-[#070707] hover:bg-zinc-100 transition-all cursor-pointer border-none"
                >
                  + Add Review
                </button>
              </div>

              {loadingReviews ? (
                <div className="text-xs text-zinc-500 font-mono animate-pulse">Retrieving dynamic reviews...</div>
              ) : reviewsList.length === 0 ? (
                <p className="text-xs text-zinc-500 font-mono">No review comments left by student learners yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {reviewsList.slice(0, 4).map((r, i) => (
                    <div
                      key={r.id || i}
                      style={{ background: "#111214", border: `1px solid ${BORDER}` }}
                      className="rounded-xl p-4 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          style={{ background: getAvatarColor(i) }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        >
                          {r.user_id ? getInitials(r.user_id) : 'ST'}
                        </div>
                        <div>
                          <div style={{ color: TEXT_PRIMARY }} className="text-xs font-bold">Learner</div>
                          <div style={{ color: TEXT_SEC }} className="text-[10px]">Verified Student</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex gap-0.5">
                          {Array.from({ length: Math.round(Number(r.rating)) }).map((_, j) => (
                            <Star key={j} size={10} className="text-amber-500 fill-amber-500" />
                          ))}
                        </div>
                        <span className="text-[9px] text-zinc-600 font-mono">
                          {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'recent'}
                        </span>
                      </div>

                      <p style={{ color: TEXT_SEC }} className="text-xs leading-relaxed mt-1">
                        {r.review_text || "Outstanding course series! Highly recommended."}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Popular Playlists Shelf */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 style={{ color: TEXT_PRIMARY }} className="text-base font-semibold">Popular Playlist Chapters</h3>
                <button onClick={() => setActiveTab("Playlists")} className="text-[#00D4AA] text-xs bg-transparent border-none cursor-pointer flex items-center gap-1 hover:underline">
                  View all playlists <ArrowRight size={12} />
                </button>
              </div>

              {loadingYtChannel ? (
                <div className="text-xs text-zinc-500 font-mono animate-pulse">Syncing playlist structures...</div>
              ) : !ytChannelInfo?.playlists || ytChannelInfo.playlists.length === 0 ? (
                <p className="text-xs text-zinc-500 font-mono">No playlists found for this channel.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {ytChannelInfo.playlists.slice(0, 6).map((p: any, i: number) => (
                    <div key={p.id || i} className="group cursor-pointer" onClick={() => handlePlaylistClick(p.id)}>
                      <div className="relative rounded-lg overflow-hidden aspect-video bg-zinc-900 border border-white/5">
                        <img src={p.thumbnail || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400'} alt={p.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div style={{ background: 'rgba(0,0,0,0.5)' }} className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                            <Play size={12} className="text-zinc-950 fill-zinc-950 ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <p style={{ color: TEXT_PRIMARY }} className="text-xs font-semibold mt-2 line-clamp-1 group-hover:text-[#00D4AA]">{p.title}</p>
                      <div className="flex items-center flex-wrap gap-1 mt-0.5 text-[9px] font-mono font-semibold uppercase tracking-wider">
                        {p.origin_channel_name && (
                          <span className="bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded">
                            [{p.origin_channel_name}]
                          </span>
                        )}
                        <span style={{ color: TEXT_SEC }} className="text-[10px]">Playlist</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPERIENCE TAB */}
        {activeTab === "Experience" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}` }} className="rounded-2xl p-6 md:p-8 max-w-2xl">
            <h2 style={{ color: TEXT_PRIMARY }} className="text-base font-semibold mb-6">Teaching Experience</h2>
            {ExperienceTimeline.map((exp, i) => (
              <div key={i} className="flex gap-4 mb-6 last:mb-0">
                <div style={{ background: "#00D4AA12", border: `1px solid #00D4AA25` }} className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base">
                  🎓
                </div>
                <div>
                  <div style={{ color: TEXT_PRIMARY }} className="text-sm font-semibold">{exp.role}</div>
                  <div style={{ color: TEXT_SEC }} className="text-xs mt-0.5">{exp.org} · {exp.period}</div>
                  <p style={{ color: TEXT_SEC }} className="text-xs leading-relaxed mt-2">{exp.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LECTURES TAB */}
        {activeTab === "Lectures" && (
          <div className="space-y-4">
            {dbTeacher?.youtubeChannelId ? (
              <LecturesGrid playlistId={dbTeacher.youtubeChannelId} />
            ) : (
              <p className="text-xs text-zinc-500 font-mono">No YouTube Channel ID configured for this educator.</p>
            )}
          </div>
        )}

        {/* LIVE TAB */}
        {activeTab === "Live" && (
          <div className="space-y-4">
            <h3 style={{ color: TEXT_PRIMARY }} className="text-base font-semibold">Active Broadcasts</h3>
            {loadingYtChannel ? (
              <div className="text-xs text-zinc-500 font-mono animate-pulse">Checking broadcast servers...</div>
            ) : ytChannelInfo?.liveStream ? (
              <div 
                className="max-w-md group cursor-pointer"
                onClick={() => {
                  if (ytChannelInfo.liveStream.videoId) {
                    setActiveVideoId(ytChannelInfo.liveStream.videoId);
                    setActiveLecture({
                      id: ytChannelInfo.liveStream.videoId,
                      title: ytChannelInfo.liveStream.title,
                      description: 'Live Broadcast session.',
                      videoUrl: `https://www.youtube.com/embed/${ytChannelInfo.liveStream.videoId}`,
                      thumbnailUrl: ytChannelInfo.liveStream.thumbnail,
                      duration: 'Live',
                      viewsCount: 0,
                      likesCount: 0,
                      createdAt: new Date().toISOString(),
                      subject: dbTeacher?.subject || 'Academic',
                      examType: dbTeacher?.exams?.[0] || 'Both',
                      contentType: 'oneshot',
                      teacherId: dbTeacher?.id || '',
                      teacherName: dbTeacher?.name || ''
                    });
                  }
                }}
              >
                <div className="relative rounded-xl overflow-hidden aspect-video bg-zinc-900 border border-red-500/20">
                  <img src={ytChannelInfo.liveStream.thumbnail} alt={ytChannelInfo.liveStream.title} className="w-full h-full object-cover" />
                  
                  <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    <span>LIVE STREAMING</span>
                  </div>
                </div>
                <h4 style={{ color: TEXT_PRIMARY }} className="text-sm font-semibold mt-3 group-hover:text-[#00D4AA]">{ytChannelInfo.liveStream.title}</h4>
                <p style={{ color: TEXT_SEC }} className="text-xs font-mono mt-1">Click to join active live broadcast session.</p>
              </div>
            ) : (
              <div style={{ background: CARD, border: `1px solid ${BORDER}` }} className="rounded-xl p-8 max-w-md text-center">
                <span className="text-xl">📡</span>
                <h4 className="text-sm font-semibold mt-3 text-zinc-400">Offline</h4>
                <p className="text-xs text-zinc-500 mt-1">This educator is currently offline. Active live lecture sessions will show up here.</p>
              </div>
            )}
          </div>
        )}

        {/* PLAYLISTS TAB */}
        {activeTab === "Playlists" && (
          <div className="space-y-4">
            <h3 style={{ color: TEXT_PRIMARY }} className="text-base font-semibold">Course Playlists</h3>
            
            {loadingYtChannel ? (
              <div className="text-xs text-zinc-500 font-mono animate-pulse">Retrieving playlists...</div>
            ) : !ytChannelInfo?.playlists || ytChannelInfo.playlists.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono">No playlists found.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                {ytChannelInfo.playlists.map((p: any, i: number) => (
                  <div key={p.id || i} className="group cursor-pointer" onClick={() => handlePlaylistClick(p.id)}>
                    <div className="relative rounded-lg overflow-hidden aspect-video bg-zinc-900 border border-white/5">
                      <img src={p.thumbnail || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400'} alt={p.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                          <Play size={12} className="text-zinc-950 fill-zinc-950 ml-0.5" />
                        </div>
                      </div>
                    </div>
                    <p style={{ color: TEXT_PRIMARY }} className="text-xs font-semibold mt-2 line-clamp-2 leading-snug group-hover:text-[#00D4AA]">{p.title}</p>
                    <div className="flex items-center flex-wrap gap-1 mt-1 text-[9px] font-mono font-semibold uppercase tracking-wider">
                      {p.origin_channel_name && (
                        <span className="bg-zinc-800 text-zinc-400 px-1 py-0.5 rounded">
                          [{p.origin_channel_name}]
                        </span>
                      )}
                      <span style={{ color: TEXT_SEC }} className="text-[10px]">Playlist</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === "About" && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}` }} className="rounded-2xl p-6 md:p-8 max-w-2xl space-y-6">
            <div>
              <h2 style={{ color: TEXT_PRIMARY }} className="text-base font-semibold mb-2">About {dbTeacher.name}</h2>
              <p style={{ color: TEXT_SEC }} className="text-xs md:text-sm leading-relaxed">
                {dbTeacher.bio || `${dbTeacher.name} is a dedicated educator specializing in ${dbTeacher.subject} content prep, with top-tier academic review metrics.`}
              </p>
            </div>

            <div className="border-t border-[#1A1A1A] pt-4 grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-zinc-500">Subject</span>
                <p style={{ color: TEXT_PRIMARY }} className="font-semibold mt-0.5">{dbTeacher.subject}</p>
              </div>
              <div>
                <span className="text-zinc-500">Verification</span>
                <p style={{ color: TEAL }} className="font-semibold mt-0.5">Verified Member</p>
              </div>
              <div>
                <span className="text-zinc-500">Target Exams</span>
                <p style={{ color: TEXT_PRIMARY }} className="font-semibold mt-0.5">{dbTeacher.exams?.join(', ') || 'JEE/NEET'}</p>
              </div>
              <div>
                <span className="text-zinc-500">YouTube Channel</span>
                <p style={{ color: TEXT_PRIMARY }} className="font-semibold mt-0.5 truncate max-w-[200px]">
                  {dbTeacher.youtubeChannelId || 'None'}
                </p>
              </div>
              {dbTeacher.teachingMode && (
                <div>
                  <span className="text-zinc-500">Teaching Mode</span>
                  <p style={{ color: TEXT_PRIMARY }} className="font-semibold mt-0.5">{dbTeacher.teachingMode}</p>
                </div>
              )}
              {dbTeacher.languages && dbTeacher.languages.length > 0 && (
                <div>
                  <span className="text-zinc-500">Languages</span>
                  <p style={{ color: TEXT_PRIMARY }} className="font-semibold mt-0.5">{dbTeacher.languages.join(', ')}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
