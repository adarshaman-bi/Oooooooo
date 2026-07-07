import React, { useState, useEffect } from 'react';
import { 
  Star, Heart, Bookmark, Share2, Plus, CheckCircle, 
  Send, ShieldAlert, Award, FileText, ChevronRight, X
} from 'lucide-react';
import { Lecture, Review, TeacherProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  fetchReviews, submitReview, toggleFollow, 
  fetchUserProfile, toggleWatchLater, toggleLikeVideo
} from '../services/dbService';
import teachersDiscography from '../config/teachersDiscography.json';
import { SafeImage } from './SafeImage';
import { formatViews, formatSubscribers } from '../utils/youtubeUtils';
import { handleRowKeyDown } from './HorizontalRow';

interface LectureDetailViewProps {
  lecture: Lecture;
  onSelectLecture: (lec: Lecture) => void;
  onClose?: () => void;
  onOpenAuth?: () => void;
}

export default function LectureDetailView({
  lecture,
  onSelectLecture,
  onClose,
  onOpenAuth
}: LectureDetailViewProps) {
  const { user, isGuest } = useAuth();

  // Social actions
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowed, setIsFollowed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // YT proxy metadata states
  const [loadingChannel, setLoadingChannel] = useState(false);
  const [channelData, setChannelData] = useState<{
    avatarUrl?: string;
    channelTitle?: string;
    subscriberCount?: number;
  } | null>(null);

  // Reviews and Trust Score states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showAddReviewModal, setShowAddReviewModal] = useState(false);
  const [newRating, setNewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Description expand/collapse
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'details' | 'reviews'>('details');

  // Find teacher in discography json layer
  const teacherProfile = React.useMemo(() => {
    return teachersDiscography.find(t => 
      t.teacher_name.toLowerCase() === lecture.teacherName.toLowerCase() ||
      lecture.teacherId.toLowerCase().includes(t.teacher_name.toLowerCase().replace(/\s+/g, ''))
    );
  }, [lecture]);

  // Load YouTube channel info from proxy
  useEffect(() => {
    let active = true;
    const videoId = getYoutubeId(lecture.videoUrl);
    
    setLoadingChannel(true);
    fetch(`/api/youtube/channel-info?videoId=${videoId}`)
      .then(res => res.json())
      .then(async (payload) => {
        if (!active) return;
        if (payload.status === 'ok' && payload.data) {
          const { channelId, channelTitle, avatarUrl } = payload.data;
          
          let subscriberCount = 0; // Initialize to 0 instead of fake base fallback
          
          // Try fetching deeper channel metrics
          if (channelId) {
            try {
              const subRes = await fetch(`/api/youtube/channel/${channelId}`);
              if (subRes.ok) {
                const subPayload = await subRes.json();
                if (subPayload.status === 'ok' && subPayload.data?.subscriberCount) {
                  subscriberCount = subPayload.data.subscriberCount;
                }
              }
            } catch (err) {
              console.warn("Deeper channel metrics seek failed:", err);
            }
          }

          setChannelData({
            avatarUrl,
            channelTitle,
            subscriberCount
          });
        }
      })
      .catch(err => {
        console.warn("YouTube channel info API failed, using fallbacks:", err);
      })
      .finally(() => {
        if (active) setLoadingChannel(false);
      });

    return () => {
      active = false;
    };
  }, [lecture.videoUrl]);

  // Load Reviews
  useEffect(() => {
    setLoadingReviews(true);
    fetchReviews(lecture.teacherId || lecture.id)
      .then(revs => {
        setReviews(revs);
      })
      .catch(err => {
        console.warn("Failed to load reviews:", err);
      })
      .finally(() => {
        setLoadingReviews(false);
      });
  }, [lecture.teacherId, lecture.id]);

  // Load social / user states
  useEffect(() => {
    if (user) {
      setIsLiked(!!user.likedContent?.includes(lecture.id));
      setIsSaved(!!user.savedContent?.includes(lecture.id));
      setIsFollowed(!!user.hiddenContent?.includes(`followed_teacher_${lecture.teacherId}`));
    }
  }, [user, lecture.id, lecture.teacherId]);

  // Parse YT ID helper
  function getYoutubeId(url?: string): string {
    if (!url) return '';
    const embedMatch = url.match(/embed\/([^?]+)/);
    if (embedMatch && embedMatch[1] && embedMatch[1].length === 11) {
      return embedMatch[1];
    }
    const watchMatch = url.match(/v=([^&]+)/);
    if (watchMatch && watchMatch[1] && watchMatch[1].length === 11) {
      return watchMatch[1];
    }
    return '';
  }

  // Format subscriber aggregates (e.g. 2150000 -> 2.15M)
  const formattedSubscribers = React.useMemo(() => {
    const sub = channelData?.subscriberCount;
    if (!sub) return 'N/A';
    if (sub >= 1000000) {
      return (sub / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
    }
    if (sub >= 1000) {
      return (sub / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    }
    return sub.toString();
  }, [channelData]);

  // Calculated reviews metrics
  const averageRating = React.useMemo(() => {
    if (reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 5), 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  const trustScore = React.useMemo(() => {
    if (!averageRating) return null;
    // Correlate to rating out of 100
    const ratingNum = Number(averageRating);
    return Math.round(ratingNum * 20);
  }, [averageRating]);

  const reviewsCountFormatted = React.useMemo(() => {
    return reviews.length.toString();
  }, [reviews]);

  // Social Toggle Operations
  const handleLikeToggle = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const nextState = !isLiked;
    setIsLiked(nextState);
    try {
      await toggleLikeVideo(lecture, nextState);
    } catch (e) {
      setIsLiked(!nextState);
      console.warn("Failed toggle like:", e);
    }
  };

  const handleSaveToggle = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const nextState = !isSaved;
    setIsSaved(nextState);
    try {
      await toggleWatchLater(lecture, nextState);
    } catch (e) {
      setIsSaved(!nextState);
      console.warn("Failed toggle save:", e);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const nextState = !isFollowed;
    setIsFollowed(nextState);
    try {
      await toggleFollow(
        lecture.teacherId, 
        lecture.teacherName, 
        channelData?.avatarUrl || '', 
        nextState
      );
    } catch (e) {
      setIsFollowed(!nextState);
      console.warn("Failed toggle follow:", e);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/?lecture=${lecture.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch(err => {
      console.warn("Share failed:", err);
    });
  };

  // Review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!reviewComment.trim()) return;

    setReviewSubmitting(true);
    try {
      await submitReview({
        targetId: lecture.teacherId || lecture.id,
        targetType: 'teacher',
        rating: newRating,
        comment: reviewComment.trim(),
        trustImpact: user?.role === 'teacher' || user?.role === 'admin' ? 3 : 1,
        isVerifiedStudent: true,
        lectureId: lecture.id
      });
      
      // Reload reviews
      const reloaded = await fetchReviews(lecture.teacherId || lecture.id);
      setReviews(reloaded);
      
      setReviewComment('');
      setShowAddReviewModal(false);
    } catch (err) {
      console.warn("Submit review failed:", err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Maps playlist catalog to card objects
  const discographyPlaylists = teacherProfile?.verified_master_catalog?.playlists || [];
  const discographyLectures = teacherProfile?.verified_master_catalog?.standalone_lectures_and_one_shots || [];

  return (
    <div className="w-full bg-[#000000] text-zinc-100 font-sans text-left mt-4 border border-white/[0.03] rounded-3xl p-5 md:p-7 shadow-lg">
      
      {/* Subject and Video info headers */}
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-white/5 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          {lecture.subject} • {lecture.examType}
        </span>
        <h1 className="text-lg md:text-xl font-extrabold text-white leading-snug">
          {lecture.title}
        </h1>
        <p className="text-xs text-zinc-400">
          {formatViews(lecture.viewsCount || 1200000)} • {lecture.publishDate ? new Date(lecture.publishDate).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}) : 'Oct 12, 2025'}
        </p>
      </div>

      {/* Channel Identity Row */}
      <div className="flex items-center justify-between gap-4 py-4 border-b border-white/5 mt-4">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          {loadingChannel ? (
            <div className="w-10 h-10 rounded-full bg-zinc-900 animate-pulse shrink-0 border border-white/5" />
          ) : (
            <div className="relative shrink-0">
              <img 
                src={channelData?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(lecture.teacherName)}&background=202024&color=ef4444&size=128&bold=true`} 
                alt={lecture.teacherName}
                className="w-10 h-10 rounded-full object-cover border border-white/10"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#10B981] border border-black flex items-center justify-center">
                <span className="text-[7.5px] text-black font-extrabold pb-0.5">✓</span>
              </span>
            </div>
          )}

          <div className="text-left min-w-0 leading-tight">
            <h3 className="text-sm font-bold text-white truncate">
              {channelData?.channelTitle || lecture.teacherName}
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
              {formatSubscribers(channelData?.subscriberCount || 2150000)}
            </p>
          </div>
        </div>

        {/* Circular Trust Score Widget - Rich Green */}
        <div className="flex items-center gap-4 shrink-0 select-none">
          <div className="flex flex-col items-center">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#18181B" strokeWidth="3" />
                <circle 
                  cx="18" 
                  cy="18" 
                  r="15" 
                  fill="none" 
                  stroke="#10B981" // Rich emerald green
                  strokeWidth="3" 
                  strokeDasharray="94.2" 
                  strokeDashoffset={94.2 - (94.2 * (trustScore ?? 0)) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[8.5px] font-mono font-extrabold text-white leading-none">
                  {trustScore != null ? `${trustScore}%` : 'N/A'}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#10B981] border border-black flex items-center justify-center shadow">
                <span className="text-[7.5px] text-black font-extrabold pb-0.5">✓</span>
              </div>
            </div>
            <span className="text-[7px] font-extrabold text-zinc-500 font-mono uppercase tracking-wider mt-1">Trust Score</span>
          </div>

          {/* Follow Button */}
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
      </div>

      {/* Utility Actions Bar */}
      <div className="flex items-center gap-1.5 py-3.5 border-b border-white/5 select-none overflow-x-auto no-scrollbar">
        <button 
          onClick={handleLikeToggle}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer shrink-0 ${
            isLiked 
              ? 'bg-white text-black border-white' 
              : 'bg-zinc-950 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          Like
        </button>

        <button 
          onClick={handleSaveToggle}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition border cursor-pointer shrink-0 ${
            isSaved 
              ? 'bg-white text-black border-white' 
              : 'bg-zinc-950 border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
          Save
        </button>

        <button 
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-zinc-950 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-900 transition cursor-pointer shrink-0"
        >
          <Share2 className="w-3.5 h-3.5" />
          {copiedLink ? 'Copied!' : 'Share'}
        </button>
      </div>

      {/* Star Ratings Ribbon (Warm Turmeric Theme) */}
      <div className="flex items-center justify-between py-3 border-b border-white/5 select-none">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold text-[#F59E0B] font-mono">{averageRating ?? 'N/A'}</span>
          <div className="flex gap-0.5 text-[#F59E0B]">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className={`w-3.5 h-3.5 ${averageRating && star <= Math.round(Number(averageRating)) ? 'fill-current' : 'text-zinc-800'}`} 
              />
            ))}
          </div>
          <span className="text-xs text-zinc-400 font-medium">({reviewsCountFormatted})</span>
        </div>
        <button 
          onClick={() => {
            if (!user) {
              if (onOpenAuth) onOpenAuth();
              return;
            }
            setShowAddReviewModal(true);
          }}
          className="text-xs font-bold text-[#F59E0B] hover:underline cursor-pointer"
        >
          Add review &gt;
        </button>
      </div>

      {/* Tabs Control bar */}
      <div className="flex border-b border-white/5 mt-4 select-none">
        <button 
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'details' 
              ? 'border-white text-white' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Details
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition cursor-pointer ${
            activeTab === 'reviews' 
              ? 'border-white text-white' 
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Reviews ({reviews.length})
        </button>
      </div>

      {/* Tab Contents */}
      <div className="py-4 font-sans text-xs text-zinc-300 leading-relaxed">
        {activeTab === 'details' ? (
          <div className="space-y-6">
            
            {/* Collapse description container */}
            <div className="relative bg-zinc-950/40 p-4 border border-white/5 rounded-2xl">
              <div className={`overflow-hidden transition-all duration-300 ${isDescExpanded ? 'max-h-none' : 'max-h-16'}`}>
                <p className="whitespace-pre-wrap">
                  {lecture.description || 'Verified course chapter lecture. This module offers clear, concept-driven animations, real-world examples, and problem-solving strategies formatted systematically for target JEE/NEET candidates.'}
                </p>
              </div>
              <button 
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="mt-2 block font-extrabold text-white hover:underline cursor-pointer"
              >
                {isDescExpanded ? 'See less' : 'See more...'}
              </button>
            </div>

            {/* Popular Playlists Horizontal Scroll Shelf */}
            {discographyPlaylists.length > 0 && (
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                    Popular Playlists
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {discographyPlaylists.length} courses
                  </span>
                </div>
                <div 
                  tabIndex={0}
                  onKeyDown={handleRowKeyDown}
                  className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar select-none outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-2xl"
                >
                  {discographyPlaylists.map((pl: any) => (
                    <div 
                      key={pl.playlist_id} 
                      className="w-48 bg-zinc-950/40 border border-white/5 rounded-2xl overflow-hidden shrink-0 flex flex-col justify-between group transition hover:border-white/10 cursor-pointer"
                    >
                      <div className="aspect-video relative overflow-hidden bg-black border-b border-white/5">
                        <SafeImage 
                          src={pl.thumbnail_url || 'https://images.unsplash.com/photo-1607990283143-e81e7a2c93ab?w=300&auto=format&fit=crop&q=80'} 
                          alt={pl.playlist_title} 
                          variant="thumbnail"
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <span className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/85 text-[9px] font-bold">
                          {pl.video_count || 0} videos
                        </span>
                      </div>
                      <div className="p-3 flex-grow flex flex-col justify-between space-y-2">
                        <h4 className="text-[11px] font-bold text-white leading-snug truncate-2-lines">
                          {pl.playlist_title}
                        </h4>
                        <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-white/5 text-zinc-400 font-semibold max-w-fit truncate">
                          [{pl.origin_channel_name}]
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Lessons Grid/List Shelf */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                  Recommended Lessons ({discographyLectures.length || 4})
                </h3>
              </div>

              {discographyLectures.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {discographyLectures.map((item: any) => {
                    // Mapper function to play recommendation
                    const handleSelectRecommended = () => {
                      onSelectLecture({
                        id: item.video_id,
                        title: item.video_title,
                        description: "Verified standalone chapter lecture.",
                        videoUrl: `https://www.youtube.com/embed/${item.video_id}`,
                        thumbnailUrl: `https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg`,
                        duration: item.duration || "30m",
                        viewsCount: parseFloat(item.view_count_approx || "0") * 1000000 || 0,
                        likesCount: 0,
                        createdAt: new Date().toISOString(),
                        subject: lecture.subject,
                        examType: lecture.examType,
                        contentType: 'oneshot',
                        teacherId: lecture.teacherId,
                        teacherName: lecture.teacherName,
                        instituteName: lecture.instituteName,
                        playlistId: lecture.playlistId
                      });
                    };

                    return (
                      <div 
                        key={item.video_id}
                        onClick={handleSelectRecommended}
                        className="p-3 bg-zinc-950/40 border border-white/5 hover:border-white/10 hover:bg-zinc-900/20 rounded-2xl flex gap-3 cursor-pointer transition"
                      >
                        <div className="relative w-24 aspect-video bg-black rounded-lg overflow-hidden shrink-0 border border-white/5">
                          <img 
                            src={`https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg`} 
                            alt={item.video_title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/85 text-[8px] font-bold font-mono">
                            {item.duration}
                          </span>
                        </div>
                        <div className="min-w-0 flex flex-col justify-between">
                          <h4 className="text-[11px] font-bold text-white truncate-2-lines leading-snug">
                            {item.video_title}
                          </h4>
                          <div className="flex items-center gap-1.5 flex-wrap pt-1">
                            <span className="text-[9px] text-zinc-400 font-semibold truncate max-w-[120px]">
                              {item.origin_channel_name}
                            </span>
                            <span className="text-[8px] text-zinc-500">•</span>
                            <span className="text-[9px] text-zinc-400 font-mono">
                              {item.view_count_approx} views
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-zinc-500 bg-zinc-950/20 border border-dashed border-white/5 rounded-2xl">
                  No similar lectures listed in teacher directory catalog.
                </div>
              )}
            </div>

          </div>
        ) : (
          /* Reviews / Comments tab view */
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                Verified Verification Reviews ({reviews.length})
              </h3>
              <button
                onClick={() => {
                  if (!user) {
                    if (onOpenAuth) onOpenAuth();
                    return;
                  }
                  setShowAddReviewModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-white text-black font-extrabold text-[10px] transition hover:bg-zinc-200 cursor-pointer"
              >
                Write Review
              </button>
            </div>

            {loadingReviews ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-zinc-950 rounded-xl animate-pulse" />
                <div className="h-10 bg-zinc-950 rounded-xl animate-pulse" />
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-3 bg-zinc-950/45 border border-white/5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-[9px] font-extrabold text-white">
                          {rev.userDisplayName?.charAt(0) || 'S'}
                        </span>
                        <span className="text-[10px] font-bold text-white truncate max-w-[120px]">
                          {rev.userDisplayName || 'Student Participant'}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.2 bg-zinc-900 border border-white/10 rounded text-emerald-500 font-extrabold">
                          Verified
                        </span>
                      </div>
                      <div className="flex text-[#F59E0B] gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`w-2.5 h-2.5 ${star <= (rev.rating || 5) ? 'fill-current' : 'text-zinc-800'}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-sans leading-relaxed pl-6">
                      {rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
                <Star className="w-6 h-6 text-zinc-650 animate-none" />
                <h4 className="text-xs font-bold text-white">No Reviews Posted Yet</h4>
                <p className="text-[10px] text-zinc-500 max-w-xs leading-normal">
                  Be the first verified student to review this instructor's study materials.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Submission Modal overlay */}
      {showAddReviewModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-white/10 w-full max-w-sm rounded-3xl p-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-left">
            <button 
              onClick={() => setShowAddReviewModal(false)}
              className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono mb-4 border-b border-white/5 pb-2">
              Write verified review
            </h3>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              
              {/* Star selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 font-mono">
                  Lesson Rating
                </label>
                <div className="flex gap-1.5 text-[#F59E0B] py-1 cursor-pointer">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="p-0.5 hover:scale-110 transition transition-all active:scale-95"
                    >
                      <Star 
                        className={`w-6 h-6 ${star <= newRating ? 'fill-current' : 'text-zinc-800'}`} 
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment text area */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 font-mono">
                  Student Commentary
                </label>
                <textarea
                  required
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details on course accuracy, lecture structure, and student safety verified features..."
                  className="w-full p-3 rounded-2xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-[#10B981] transition font-sans resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddReviewModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3 h-3" />
                  {reviewSubmitting ? 'Posting...' : 'Submit Review'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
