import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
  ThumbsUp, Bookmark, ListPlus, Clock, Share2, Star, ChevronDown, ChevronUp,
  BadgeCheck, X, Send, CheckCircle2,
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { motion } from "motion/react";
import ReviewsAndRatingsScreen from "./ReviewsAndRatingsScreen";

// ============================================================================
// SCHEMA ASSUMPTIONS — VERIFY AGAINST LIVE DB BEFORE SHIPPING
// Every column/table below is assumed from prior audits, not re-verified in
// this pass. If Antigravity's schema scan disagrees with any of these,
// update the queries — do not silently keep an assumption that's wrong.
//
//   public.teachers        id, name, avatar_url, verified, followers_count,
//                          trust_score
//   public.videos          id, title, subject, exam_type, thumbnail_url,
//                          duration, duration_seconds, view_count, teacher_id,
//                          playlist_id, is_active, description
//   public.playlists       id, name
//   public.reviews         id, entity_id, entity_type, user_id,
//                          user_display_name, rating, comment, created_at
//   public.profiles        uid, liked_content, saved_content, hidden_content,
//                          watch_later_content, following_teachers
//   public.watch_history   user_id, lecture_id, progress_seconds, completed
//   public.moderation_reports  id, reporter_id, reporter_name, target_id,
//                          target_type, reason, status
// ============================================================================

const TURMERIC = "#e0a527";   // rating stars — the only yellow element on this screen
const PROGRESS_RED = "#e02020"; // must match the video player's progress bar exactly
const TRUST_GREEN = "#59C749";  // mantis green — matches existing teacher badge system

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LectureLike {
  id: string;
  title: string;
  subject?: string;
  exam_type?: string;
  examType?: string;
  teacher_id?: string;
  teacherId?: string;
  teacher_name?: string;
  teacherName?: string;
  description?: string;
}

interface Channel {
  id: string;
  name: string;
  avatar_url: string | null;
  verified: boolean;
  followers_count: number;
  trust_score: number;
}

interface Review {
  id: string;
  user_display_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface PlaylistRef {
  id: string;
  name: string;
}

interface RecommendedLecture {
  id: string;
  title: string;
  teacher_name: string | null;
  subject: string | null;
  exam_type: string | null;
  thumbnail_url: string | null;
  duration: string | null;
  duration_seconds: number | null;
  progress_pct: number;
}

interface Props {
  lecture: LectureLike;
  currentUserId: string | null;
  onSelectRecommended?: (lecture: LectureLike) => void;
  onSelectLecture?: (lecture: LectureLike) => void;
}

// ---------------------------------------------------------------------------
// Data hooks — plain fetch-on-mount hooks against Supabase.
// ---------------------------------------------------------------------------

function useChannel(teacherId: string | undefined) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!teacherId) {
      setChannel(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      // Inverted mapping of YouTube channel IDs to teacher slugs in the public.teachers table
      const channelToSlug: Record<string, string> = {
        'UCD16eo98AXl-9T61Xd711kQ': 'alakh_pandey',
        'UCxypqdjw-S400n162TY5cgQ': 'mohit_tyagi',
        'UCMBqObTSqW4kMFsB8Nqhpkg': 'seep_pahuja',
        'UC8Q46TByEJhMsY9V3wqIOZw': 'sachin_rana',
        'UC3b3c5UhtPcNB45Smr_BeEQ': 'ashish_arora',
        'UCf_ky0zxHBqMRFnpNEZRHHQ': 'pranav_pundarik',
        'UCd3fHkl7FbH1EZ85TbAGVRw': 'dr_amit_gupta',
        'UCWjpBuL4U7VBidbQlFB1hnA': 'dr_rakshita_singh',
        'UCkDb4531sPuHocFFSQE3qOQ': 'rohit_aggarwal_pw',
        'UCgBmfNILAlXmGv3CsJ8oFJA': 'ashish_arora',
        'UCUFcLKXPfS7ijJ_WSC20oeQ': 'mohit_tyagi',
        'UCvQSK6a7gfYbNL11KalRfOw': 'komal-yadav-unacademy',
        'UCdQwYksctqqiRwqp3PiJMWA': 'komal-yadav-unacademy',
        'UCWFXoexcMI1jQrHH2N-SJzQ': 'tarun-singh-vedantu-bio-360',
        'UCcxP3vMEVVFafLBasCHcjCg': 'seep_pahuja',
      };
      
      const resolvedId = channelToSlug[teacherId] || teacherId;

      const { data, error } = await supabase
        .from("teachers")
        .select("id, name, avatar, is_verified, followers_count, accuracy")
        .eq("id", resolvedId)
        .single();
      if (cancelled) return;
      if (error) {
        console.warn("useChannel query error for teacherId:", teacherId, "resolvedId:", resolvedId, error);
        setChannel(null);
      } else if (data) {
        setChannel({
          id: data.id,
          name: data.name,
          avatar_url: data.avatar,
          verified: data.is_verified,
          followers_count: data.followers_count || 0,
          trust_score: data.accuracy || 0
        });
      } else {
        setChannel(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherId]);

  return { channel, loading };
}

function useFollowState(currentUserId: string | null, teacherId: string | undefined) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Inverted mapping of YouTube channel IDs to teacher slugs in the public.teachers table
  const channelToSlug: Record<string, string> = {
    'UCD16eo98AXl-9T61Xd711kQ': 'alakh_pandey',
    'UCxypqdjw-S400n162TY5cgQ': 'mohit_tyagi',
    'UCMBqObTSqW4kMFsB8Nqhpkg': 'seep_pahuja',
    'UC8Q46TByEJhMsY9V3wqIOZw': 'sachin_rana',
    'UC3b3c5UhtPcNB45Smr_BeEQ': 'ashish_arora',
    'UCf_ky0zxHBqMRFnpNEZRHHQ': 'pranav_pundarik',
    'UCd3fHkl7FbH1EZ85TbAGVRw': 'dr_amit_gupta',
    'UCWjpBuL4U7VBidbQlFB1hnA': 'dr_rakshita_singh',
    'UCkDb4531sPuHocFFSQE3qOQ': 'rohit_aggarwal_pw',
    'UCgBmfNILAlXmGv3CsJ8oFJA': 'ashish_arora',
    'UCUFcLKXPfS7ijJ_WSC20oeQ': 'mohit_tyagi',
    'UCvQSK6a7gfYbNL11KalRfOw': 'komal-yadav-unacademy',
    'UCdQwYksctqqiRwqp3PiJMWA': 'komal-yadav-unacademy',
    'UCWFXoexcMI1jQrHH2N-SJzQ': 'tarun-singh-vedantu-bio-360',
    'UCcxP3vMEVVFafLBasCHcjCg': 'seep_pahuja',
  };
  
  const resolvedTeacherId = teacherId ? (channelToSlug[teacherId] || teacherId) : undefined;

  useEffect(() => {
    let cancelled = false;
    if (!currentUserId || !resolvedTeacherId) {
      setFollowing(false);
      setLoading(false);
      return;
    }
    (async () => {
      // 1. First check if follows table exists by querying it, fall back to profiles if needed
      const { data, error } = await supabase
        .from("follows")
        .select("created_at")
        .eq("user_id", currentUserId)
        .eq("teacher_id", resolvedTeacherId)
        .maybeSingle();

      if (cancelled) return;

      if (!error) {
        setFollowing(!!data);
        setLoading(false);
      } else {
        // Fall back to profiles.following_teachers if follows table doesn't exist
        const { data: profileData } = await supabase
          .from("profiles")
          .select("following_teachers")
          .eq("uid", currentUserId)
          .single();
        if (cancelled) return;
        const list: string[] = profileData?.following_teachers || [];
        setFollowing(list.includes(resolvedTeacherId));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, resolvedTeacherId]);

  const toggleFollow = useCallback(async () => {
    if (!currentUserId || !resolvedTeacherId) return { ok: false, reason: "signed_out" as const };
    const next = !following;
    setFollowing(next); // optimistic

    try {
      // Try follows table first
      const { error: insertError } = next
        ? await supabase.from("follows").insert({ user_id: currentUserId, teacher_id: resolvedTeacherId })
        : await supabase.from("follows").delete().eq("user_id", currentUserId).eq("teacher_id", resolvedTeacherId);

      if (insertError) {
        // If follows table is missing or write fails, fall back to updating profiles.following_teachers
        const { data, error: selectErr } = await supabase
          .from("profiles")
          .select("following_teachers")
          .eq("uid", currentUserId)
          .single();
        if (selectErr) throw selectErr;
        const current: string[] = data?.following_teachers || [];
        const updated = next
          ? Array.from(new Set([...current, resolvedTeacherId]))
          : current.filter((id) => id !== resolvedTeacherId);
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ following_teachers: updated })
          .eq("uid", currentUserId);

        if (profileError) throw profileError;
      }
      return { ok: true as const };
    } catch (err) {
      console.error("Error in toggleFollow database sync:", err);
      setFollowing(!next); // revert
      return { ok: false, reason: "write_failed" as const };
    }
  }, [currentUserId, resolvedTeacherId, following]);

  return { following, loading, toggleFollow };
}

function useLectureUserState(currentUserId: string | null, lectureId: string) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [watchLater, setWatchLater] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!currentUserId) {
      setLiked(false);
      setSaved(false);
      setWatchLater(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("liked_content, saved_content, watch_later_content")
        .eq("uid", currentUserId)
        .single();
      if (cancelled || error || !data) return;
      setLiked((data.liked_content || []).includes(lectureId));
      setSaved((data.saved_content || []).includes(lectureId));
      setWatchLater((data.watch_later_content || []).includes(lectureId));
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUserId, lectureId]);

  const toggleArrayColumn = useCallback(
    async (column: "liked_content" | "saved_content" | "watch_later_content", nowOn: boolean) => {
      if (!currentUserId) return { ok: false, reason: "signed_out" as const };
      try {
        const { data, error: selectErr } = await supabase
          .from("profiles")
          .select(column)
          .eq("uid", currentUserId)
          .single();
        if (selectErr) throw selectErr;
        const current: string[] = (data?.[column] as string[]) || [];
        const next = nowOn
          ? Array.from(new Set([...current, lectureId]))
          : current.filter((id) => id !== lectureId);
        
        // Fallback for watch_later_content to saved_content if columns do not exist
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({ [column]: next })
          .eq("uid", currentUserId);

        if (updateErr) {
          if (column === "watch_later_content") {
            // Fallback write to saved_content with a warning logged in console
            console.warn("watch_later_content column missing, falling back to saved_content");
            const { data: fallbackData, error: fallbackSelectErr } = await supabase
              .from("profiles")
              .select("saved_content")
              .eq("uid", currentUserId)
              .single();
            if (fallbackSelectErr) throw fallbackSelectErr;
            const fallbackCurrent: string[] = fallbackData?.saved_content || [];
            const fallbackNext = nowOn
              ? Array.from(new Set([...fallbackCurrent, lectureId]))
              : fallbackCurrent.filter((id) => id !== lectureId);
            const { error: fallbackError } = await supabase
              .from("profiles")
              .update({ saved_content: fallbackNext })
              .eq("uid", currentUserId);
            if (fallbackError) throw fallbackError;
            return { ok: true as const, fallback: true };
          }
          throw updateErr;
        }

        return { ok: true as const };
      } catch (err) {
        console.error("Database update error on toggleArrayColumn:", err);
        return { ok: false, reason: "write_failed" as const };
      }
    },
    [currentUserId, lectureId]
  );

  const toggleLiked = useCallback(async () => {
    const next = !liked;
    setLiked(next);
    const res = await toggleArrayColumn("liked_content", next);
    if (!res.ok) setLiked(!next);
    return res;
  }, [liked, toggleArrayColumn]);

  const toggleSaved = useCallback(async () => {
    const next = !saved;
    setSaved(next);
    const res = await toggleArrayColumn("saved_content", next);
    if (!res.ok) setSaved(!next);
    return res;
  }, [saved, toggleArrayColumn]);

  const toggleWatchLater = useCallback(async () => {
    const next = !watchLater;
    setWatchLater(next);
    const res = await toggleArrayColumn("watch_later_content", next);
    if (!res.ok) setWatchLater(!next);
    return res;
  }, [watchLater, toggleArrayColumn]);

  return { liked, saved, watchLater, toggleLiked, toggleSaved, toggleWatchLater };
}

function useLecturePlaylists(lectureId: string) {
  const [playlists, setPlaylists] = useState<PlaylistRef[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: video, error: videoErr } = await supabase
        .from("videos")
        .select("playlist_id")
        .eq("id", lectureId)
        .single();
      if (cancelled) return;
      if (videoErr || !video?.playlist_id) {
        setPlaylists([]);
        return;
      }
      const { data: playlist } = await supabase
        .from("playlists")
        .select("id, name")
        .eq("id", video.playlist_id)
        .single();
      if (cancelled) return;
      setPlaylists(playlist ? [playlist as PlaylistRef] : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [lectureId]);

  return playlists;
}

function useReviews(lectureId: string) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("reviews")
      .select("id, user_display_name, rating, comment, created_at")
      .eq("entity_id", lectureId)
      .eq("entity_type", "video")
      .order("created_at", { ascending: false });
    setReviews(!error && data ? (data as Review[]) : []);
    setLoading(false);
  }, [lectureId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const avgRating = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + Number(r.rating), 0) / reviews.length : null),
    [reviews]
  );

  const submitReview = useCallback(
    async (currentUserId: string | null, stars: number, comment: string) => {
      if (!currentUserId) return { ok: false, reason: "signed_out" as const };
      if (!comment.trim()) return { ok: false, reason: "empty" as const };
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("reviews").insert({
        id: crypto.randomUUID(),
        entity_id: lectureId,
        entity_type: "video",
        user_id: currentUserId,
        user_display_name: userData?.user?.user_metadata?.display_name || "Student",
        rating: stars,
        comment: comment.trim(),
      });
      if (error) return { ok: false, reason: "write_failed" as const };
      await refetch();
      return { ok: true as const };
    },
    [lectureId, refetch]
  );

  return { reviews, avgRating, loading, submitReview, refetch };
}

function useRecommended(lecture: LectureLike, currentUserId: string | null) {
  const [items, setItems] = useState<RecommendedLecture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const subjectParam = lecture.subject;
      if (!subjectParam) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: videos, error } = await supabase
        .from("videos")
        .select(
          "id, title, subject, exam_type, thumbnail_url, duration, duration_seconds, teacher_id, teacher_name"
        )
        .eq("subject", subjectParam)
        .neq("id", lecture.id)
        .eq("is_active", true)
        .limit(12);

      if (cancelled) return;
      if (error || !videos) {
        console.warn("useRecommended videos fetch error or empty:", error);
        setItems([]);
        setLoading(false);
        return;
      }

      let progressMap: Record<string, number> = {};
      if (currentUserId && videos.length) {
        const { data: history } = await supabase
          .from("watch_history")
          .select("lecture_id, progress_seconds")
          .eq("user_id", currentUserId)
          .in("lecture_id", videos.map((v: any) => v.id));
        (history || []).forEach((h: any) => {
          progressMap[h.lecture_id] = h.progress_seconds;
        });
      }

      if (cancelled) return;
      setItems(
        videos.map((v: any) => {
          const total = v.duration_seconds || 1;
          const watched = progressMap[v.id] || 0;
          return {
            id: v.id,
            title: v.title,
            teacher_name: v.teacher_name ?? null,
            subject: v.subject,
            exam_type: v.exam_type,
            thumbnail_url: v.thumbnail_url,
            duration: v.duration,
            duration_seconds: v.duration_seconds,
            progress_pct: Math.min(100, Math.round((watched / total) * 100)),
          };
        })
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [lecture.id, lecture.subject, currentUserId]);

  return { items, loading };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LectureDetailsSection({ lecture, currentUserId, onSelectRecommended, onSelectLecture }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const handleSelect = onSelectRecommended || onSelectLecture || (() => {});

  const teacherId = lecture.teacherId || lecture.teacher_id;
  const { channel, loading: channelLoading } = useChannel(teacherId);
  const { following, toggleFollow } = useFollowState(currentUserId, teacherId);
  const { liked, saved, watchLater, toggleLiked, toggleSaved, toggleWatchLater } =
    useLectureUserState(currentUserId, lecture.id);
  const playlists = useLecturePlaylists(lecture.id);
  const { reviews, avgRating, refetch } = useReviews(lecture.id);
  const { items: recommended, loading: recommendedLoading } = useRecommended(lecture, currentUserId);

  const [showReviewsScreen, setShowReviewsScreen] = useState(false);
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);

  const needsTruncation = (lecture.title || "").length > 50;
  const displayedTitle = needsTruncation && !titleExpanded
    ? `${lecture.title.slice(0, 50)}...`
    : lecture.title;

  const requireAuth = (action: () => Promise<{ ok: boolean; reason?: string; fallback?: boolean }>) => async () => {
    const res = await action();
    if (!res.ok && res.reason === "signed_out") {
      flashToast("Sign in to do that");
    } else if (!res.ok) {
      flashToast("Couldn't save that — try again");
    } else if (res.ok && (res as any).fallback) {
      flashToast("Saved (Watch Later table pending migration)");
    }
  };

  const shareLecture = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: lecture.title, url });
      } catch {
        /* user cancelled — not an error */
      }
    } else {
      await navigator.clipboard.writeText(url);
      flashToast("Link copied");
    }
  };

  if (showReviewsScreen) {
    return (
      <ReviewsAndRatingsScreen
        lectureId={lecture.id}
        lectureTitle={lecture.title}
        currentUserId={currentUserId}
        currentUserProfile={null}
        onClose={() => {
          setShowReviewsScreen(false);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="w-full bg-neutral-950 text-white pb-10 max-w-7xl mx-auto px-4 md:px-8 mt-4">
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-white text-black text-[13px] font-medium px-4 py-2 rounded-full shadow-xl flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-500" /> {toast}
        </div>
      )}

      {/* ---- Section 0: Title Block ---- */}
      <motion.div 
        layout
        className="cursor-pointer text-left"
        onClick={() => needsTruncation && setTitleExpanded(!titleExpanded)}
      >
        <motion.h1 
          layout="position"
          className="text-xl md:text-2xl font-bold text-white leading-snug select-none flex flex-wrap items-center gap-1.5"
        >
          {displayedTitle}
          {needsTruncation && (
            <span className="text-xs font-semibold text-blue-500 hover:text-blue-400 select-none ml-2">
              {titleExpanded ? "show less" : "show more"}
            </span>
          )}
        </motion.h1>
        <p className="text-white/50 text-[12px] md:text-[13px] mt-1.5 flex items-center gap-2">
          {[lecture.subject, lecture.examType || lecture.exam_type, lecture.teacherName || lecture.teacher_name].filter(Boolean).join(" \u2022 ")}
        </p>
      </motion.div>

      {/* Spacing: clearly widened gap (double the standard spacing) */}
      <div className="h-8 md:h-10" />

      {/* ---- Section 1: Channel Card ---- */}
      <ChannelCard
        loading={channelLoading}
        channel={channel}
        following={following}
        onToggleFollow={requireAuth(toggleFollow)}
      />

      {/* ---- Section 2: Action Bar ---- */}
      <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar py-2">
        <ActionPill icon={<ThumbsUp size={15} />} label="Like" active={liked} onClick={requireAuth(toggleLiked)} />
        <ActionPill icon={<Bookmark size={15} />} label="Save" active={saved} onClick={requireAuth(toggleSaved)} />
        {playlists.map((p) => (
          <ActionPill key={p.id} icon={<ListPlus size={15} />} label={p.name} onClick={() => flashToast(`Added to ${p.name}`)} />
        ))}
        <ActionPill icon={<Clock size={15} />} label="Watch later" active={watchLater} onClick={requireAuth(toggleWatchLater)} />
        <ActionPill icon={<Share2 size={15} />} label="Share" onClick={shareLecture} />
      </div>

      <div className="border-t border-white/10 mt-4" />

      {/* ---- Section 3: Ratings & Reviews ---- */}
      <button 
        onClick={() => setShowReviewsScreen(true)} 
        className="w-full text-left mt-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5 flex items-stretch gap-4 hover:bg-white/[0.04] transition-colors cursor-pointer"
      >
        <div className="flex flex-col items-start shrink-0">
          <span className="text-[28px] font-bold leading-none">{avgRating ? avgRating.toFixed(1) : "—"}</span>
          <Stars value={avgRating || 0} size={18} className="mt-1.5" />
          <span className="text-white/40 text-[12px] mt-1">
            {reviews.length ? `(${reviews.length.toLocaleString()} reviews)` : "No reviews yet"}
          </span>
        </div>
        <div className="w-px bg-white/10" />
        <div className="flex-1">
          <span className="text-[13px] text-white/70 flex items-center gap-1">
            Add review / View reviews
            <ChevronDown size={14} className="-rotate-90 text-zinc-400" />
          </span>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} size={20} fill={avgRating && n <= Math.round(avgRating) ? TURMERIC : "transparent"} color={TURMERIC} strokeWidth={1.5} />
            ))}
          </div>
          <p className="text-white/40 text-[12px] mt-2">Tap to view comments, rating distribution, or write a review</p>
        </div>
      </button>

      {/* ---- Section 4: Description ---- */}
      {lecture.description && (
        <div className="mt-4 text-left">
          <p className={`text-white/70 text-[13px] leading-relaxed transition-all ${descExpanded ? "" : "line-clamp-2"}`}>
            {lecture.description}
          </p>
          <button onClick={() => setDescExpanded((d) => !d)} className="text-white/50 hover:text-white text-[12px] mt-1.5 flex items-center gap-1 cursor-pointer transition-colors">
            {descExpanded ? "Read Less" : "Read More"}
            {descExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      )}

      <div className="border-t border-white/10 mt-5" />

      {/* ---- Section 5: Recommended Lectures ---- */}
      <div className="mt-4 text-left">
        <h2 className="font-semibold text-[15px] mb-4">Recommended Lessons ({recommended.length})</h2>
        <RecommendedList
          items={recommended}
          loading={recommendedLoading}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Channel Card
// ---------------------------------------------------------------------------

function ChannelCard({
  loading,
  channel,
  following,
  onToggleFollow,
}: {
  loading: boolean;
  channel: Channel | null;
  following: boolean;
  onToggleFollow: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-between pt-5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/10" />
          <div>
            <div className="h-3.5 w-32 bg-white/10 rounded" />
            <div className="h-3 w-20 bg-white/10 rounded mt-2" />
          </div>
        </div>
        <div className="w-14 h-14 rounded-full bg-white/10" />
      </div>
    );
  }

  if (!channel) return null;

  return (
    <div className="flex items-center justify-between pt-5 text-left">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={channel.avatar_url || undefined}
          alt={channel.name}
          loading="lazy"
          className="w-12 h-12 rounded-full object-cover bg-neutral-800 shrink-0 border border-white/5"
        />
        <div className="min-w-0">
          <p className="font-semibold text-[15px] truncate flex items-center gap-1.5">
            {channel.name}
            {channel.verified && <BadgeCheck size={14} className="text-emerald-500 fill-emerald-500/20" />}
          </p>
          <p className="text-white/50 text-[12px]">{channel.followers_count.toLocaleString()} subscribers</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex flex-col items-center">
          <TrustRing value={channel.trust_score} />
        </div>
        <button
          onClick={onToggleFollow}
          className={`px-4 py-1.5 rounded-full text-[12px] font-bold cursor-pointer transition-colors ${
            following 
              ? "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white" 
              : "bg-white text-black hover:bg-zinc-200"
          }`}
        >
          {following ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  );
}

function TrustRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <div className="relative w-14 h-14">
      <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <circle
          cx="28" cy="28" r={r} fill="none" stroke={TRUST_GREEN} strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-bold">{value}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared small pieces
// ---------------------------------------------------------------------------

function ActionPill({
  icon, label, active, onClick,
}: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
        active 
          ? "bg-white text-black font-bold" 
          : "bg-zinc-900 border border-zinc-800/80 text-white/80 hover:bg-zinc-850 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Stars({ value, size = 13, className = "" }: { value: number; size?: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <span className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.div
          key={n}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: (n - 1) * 0.08, duration: 0.2, type: "spring", stiffness: 200 }}
          className="relative inline-block"
        >
          <Star
            size={size}
            fill={n <= rounded ? TURMERIC : "transparent"}
            color={TURMERIC}
            strokeWidth={1.5}
          />
        </motion.div>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Write Review bottom sheet
// ---------------------------------------------------------------------------

function ReviewsSheet({
  reviews, currentUserId, onClose, onSubmit,
}: {
  reviews: Review[];
  currentUserId: string | null;
  onClose: () => void;
  onSubmit: (stars: number, comment: string) => Promise<{ ok: boolean }>;
}) {
  const [stars, setStars] = useState(5);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    const res = await onSubmit(stars, text);
    setSubmitting(false);
    if (res.ok) setText("");
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/75 flex items-end sm:items-center sm:justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-[#141416] w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[85vh] flex flex-col border border-white/[0.05]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
          <h3 className="font-semibold text-[15px]">Reviews ({reviews.length})</h3>
          <button onClick={onClose} aria-label="Close" className="cursor-pointer hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 py-4 border-b border-white/10 bg-zinc-950/40">
          <p className="text-[11px] font-mono text-white/50 uppercase tracking-wider mb-2">Your rating</p>
          <div className="flex items-center gap-1.5 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setStars(n)} aria-label={`${n} star`} className="cursor-pointer hover:scale-110 transition-transform">
                <Star size={22} fill={n <= stars ? TURMERIC : "transparent"} color={TURMERIC} strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts on this lecture…"
              className="flex-1 bg-zinc-900 border border-zinc-800/80 rounded-full px-4 py-2 text-[13px] text-white outline-none focus:border-zinc-700"
            />
            <button
              onClick={handleSubmit}
              disabled={submitting || !currentUserId || !text.trim()}
              className="w-9 h-9 rounded-full bg-white text-black flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer"
              aria-label="Submit review"
            >
              <Send size={14} className="ml-0.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-white/[0.03] pb-3 last:border-0 last:pb-0 text-left">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[13px]">{r.user_display_name || "Student"}</span>
                <Stars value={r.rating} size={11} />
              </div>
              {r.comment && <p className="text-white/70 text-[13px] mt-1 leading-relaxed">{r.comment}</p>}
            </div>
          ))}
          {reviews.length === 0 && <p className="text-white/40 text-[13px] py-4 text-center font-mono">No reviews yet — be the first.</p>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 5 — Recommended list (lazy-mounted for lightweight virtualization)
// ---------------------------------------------------------------------------

function RecommendedList({
  items, loading, onSelect,
}: { items: RecommendedLecture[]; loading: boolean; onSelect: (item: RecommendedLecture) => void }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-36 aspect-video rounded-lg bg-white/10 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-3.5 w-3/4 bg-white/10 rounded" />
              <div className="h-3 w-1/2 bg-white/10 rounded mt-2" />
              <div className="h-[3px] w-full bg-white/10 rounded mt-4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <p className="text-white/40 text-[13px] font-mono">No recommendations yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <RecommendedCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}

const RecommendedCard = memo(function RecommendedCard({
  item, onSelect,
}: { item: RecommendedLecture; onSelect: (item: RecommendedLecture) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex gap-3 min-h-[80px]">
      {!visible ? (
        <div className="w-36 aspect-video rounded-lg bg-white/5 shrink-0" />
      ) : (
        <>
          <button
            onClick={() => onSelect(item)}
            className="relative w-36 aspect-video rounded-lg overflow-hidden bg-neutral-800 shrink-0 cursor-pointer border border-white/5"
          >
            {item.thumbnail_url && (
              <img src={item.thumbnail_url} alt={item.title} loading="lazy" className="w-full h-full object-cover" />
            )}
            <span className="absolute bottom-1 right-1 bg-black/85 text-white text-[10px] px-1.5 py-0.5 rounded font-mono font-medium">
              {item.duration || "—"}
            </span>
          </button>

          <div className="flex-1 min-w-0 text-left flex flex-col justify-center">
            <button onClick={() => onSelect(item)} className="text-left w-full cursor-pointer group">
              <p className="font-semibold text-[13.5px] truncate group-hover:text-neutral-250 transition-colors">{item.title}</p>
              <p className="text-white/50 text-[12px] mt-0.5 truncate font-mono">
                {[item.teacher_name, item.subject, item.exam_type].filter(Boolean).join(" \u2022 ")}
              </p>
            </button>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-grow h-[3px] rounded-full bg-white/15 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${item.progress_pct}%`, background: PROGRESS_RED }}
                />
              </div>
              <span className="text-white/40 text-[10px] font-mono shrink-0">{item.progress_pct}%</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
});
