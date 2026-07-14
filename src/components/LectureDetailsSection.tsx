import { useState, useEffect, useCallback, useMemo, useRef, memo } from "react";
import {
  ThumbsUp, Bookmark, ListPlus, Clock, Share2, Star, ChevronDown, ChevronUp,
  BadgeCheck, X, Send, CheckCircle2, MessageSquare, Pencil,
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";
import { motion } from "motion/react";
import ReviewsAndRatingsScreen, { StaggeredStars, InteractiveStars } from "./ReviewsAndRatingsScreen";

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
        console.error("Supabase error fetching teacher/channel details:", error);
        setChannel(null);
      } else if (data) {
        if (!data.name || !data.avatar) {
          console.error("Teacher details returned null/undefined: name =", data.name, ", avatar =", data.avatar);
        }
        setChannel({
          id: data.id,
          name: data.name || "BIOVISED Educator",
          avatar_url: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || 'Educator')}&background=202024&color=3B82F6&size=128&bold=true`,
          verified: !!data.is_verified,
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
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [composerInitialRating, setComposerInitialRating] = useState<number | null>(null);

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
        initialRating={composerInitialRating}
        onClose={() => {
          setShowReviewsScreen(false);
          setComposerInitialRating(null);
          refetch();
        }}
      />
    );
  }

  const spawnHearts = useCallback((x: number, y: number) => {
    const container = document.getElementById('likePopupContainer');
    if (!container) return;
    const emojis = ['❤️', '💖', '💕', '✨', '💗', '💓'];
    for (let i = 0; i < 14; i++) {
      const heart = document.createElement('div');
      heart.className = 'like-heart';
      heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      const angle = (Math.PI * 2 * i) / 14;
      const distance = 50 + Math.random() * 90;
      const tx = Math.cos(angle) * distance;
      const rot = (Math.random() - 0.5) * 360;
      heart.style.left = x + 'px';
      heart.style.top = y + 'px';
      heart.style.setProperty('--tx', tx + 'px');
      heart.style.setProperty('--rot', rot + 'deg');
      heart.style.fontSize = (16 + Math.random() * 18) + 'px';
      heart.style.animationDelay = (Math.random() * 0.15) + 's';
      container.appendChild(heart);
      setTimeout(() => heart.remove(), 1700);
    }
  }, []);

  const handleLikeClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const nextLiked = !liked;
    if (nextLiked) {
      spawnHearts(e.clientX, e.clientY);
    }
    const btn = document.getElementById('likeBtn');
    if (btn) {
      btn.classList.remove('pop');
      void btn.offsetWidth;
      btn.classList.add('pop');
      setTimeout(() => btn.classList.remove('pop'), 400);
    }
    requireAuth(toggleLiked)();
  }, [liked, requireAuth, toggleLiked, spawnHearts]);

  const handleSaveClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = document.getElementById('saveBtn');
    if (btn) {
      btn.classList.remove('pop');
      void btn.offsetWidth;
      btn.classList.add('pop');
      setTimeout(() => btn.classList.remove('pop'), 400);
    }
    requireAuth(toggleSaved)();
  }, [requireAuth, toggleSaved]);

  const handleWatchLaterClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = document.getElementById('wlBtn');
    if (btn) {
      btn.classList.remove('pop');
      void btn.offsetWidth;
      btn.classList.add('pop');
      setTimeout(() => btn.classList.remove('pop'), 400);
    }
    requireAuth(toggleWatchLater)();
  }, [requireAuth, toggleWatchLater]);

  const r = 20;
  const c = 2 * Math.PI * r;
  const trustValue = channel ? channel.trust_score : 0;
  const offset = c - (Math.max(0, Math.min(100, trustValue)) / 100) * c;
  const channelInitials = channel ? getInitials(channel.name) : "?";

  return (
    <div className="lecture-details-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .lecture-details-container {
          max-width: 640px;
          margin: 0 auto;
          padding: 12px 16px;
          background-color: #0f0f0f;
          color: #f1f1f1;
          font-family: 'Inter', sans-serif;
        }

        .lecture-details-container .video-title {
          font-size: 17px;
          font-weight: 600;
          line-height: 1.35;
          color: #f1f1f1;
          margin-bottom: 4px;
          text-align: left;
        }

        .lecture-details-container .video-meta {
          font-size: 13px;
          color: #aaa;
          margin-bottom: 14px;
          text-align: left;
        }

        .lecture-details-container .channel-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 10px;
          text-align: left;
        }

        .lecture-details-container .channel-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .lecture-details-container .channel-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          position: relative;
          box-shadow: 0 0 0 2px #0f0f0f, 0 0 0 3px #d4af37;
        }

        .lecture-details-container .channel-avatar .pw-text {
          font-size: 13px;
          font-weight: 800;
          letter-spacing: -0.5px;
          background: linear-gradient(135deg, #f4e058, #d4af37);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lecture-details-container .premium-badge {
          position: absolute;
          bottom: -3px;
          right: -3px;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #d4af37, #f4e058);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 4px rgba(212, 175, 55, 0.4);
          border: 1.5px solid #0f0f0f;
        }

        .lecture-details-container .premium-badge svg {
          width: 10px;
          height: 10px;
        }

        .lecture-details-container .channel-details {
          min-width: 0;
        }

        .lecture-details-container .channel-name {
          font-size: 13px;
          font-weight: 600;
          color: #f1f1f1;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .lecture-details-container .verified-badge {
          width: 14px;
          height: 14px;
          background: linear-gradient(135deg, #3ea6ff, #1a73e8);
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 0 6px rgba(62, 166, 255, 0.3);
        }

        .lecture-details-container .verified-badge svg {
          width: 9px;
          height: 9px;
        }

        .lecture-details-container .channel-subs {
          font-size: 12px;
          color: #aaa;
          margin-top: 1px;
        }

        .lecture-details-container .channel-right {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .lecture-details-container .trust-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }

        .lecture-details-container .trust-circle {
          width: 44px;
          height: 44px;
          position: relative;
        }

        .lecture-details-container .trust-circle svg {
          transform: rotate(-90deg);
        }

        .lecture-details-container .trust-circle .circle-bg {
          fill: none;
          stroke: #333;
          stroke-width: 3.5;
        }

        .lecture-details-container .trust-circle .circle-progress {
          fill: none;
          stroke: url(#trustGrad);
          stroke-width: 3.5;
          stroke-linecap: round;
          stroke-dasharray: 125.66;
          transition: stroke-dashoffset 0.35s;
        }

        .lecture-details-container .trust-value {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 11px;
          font-weight: 700;
          color: #f1f1f1;
        }

        .lecture-details-container .trust-label {
          font-size: 10px;
          color: #aaa;
        }

        .lecture-details-container .follow-btn {
          background: #3ea6ff;
          color: #000;
          border: none;
          padding: 8px 20px;
          border-radius: 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }

        .lecture-details-container .follow-btn:hover {
          background: #65b8ff;
        }

        .lecture-details-container .follow-btn.following {
          background: #333;
          color: #f1f1f1;
        }

        .lecture-details-container .action-buttons {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
          overflow-x: auto;
          padding-bottom: 2px;
          scrollbar-width: none;
        }

        .lecture-details-container .action-buttons::-webkit-scrollbar {
          display: none;
        }

        .lecture-details-container .action-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px solid #3a3a3a;
          color: #f1f1f1;
          padding: 7px 14px;
          border-radius: 18px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }

        .lecture-details-container .action-btn:hover {
          background: #272727;
        }

        .lecture-details-container .action-btn.active {
          background: #3ea6ff22;
          border-color: #3ea6ff;
          color: #3ea6ff;
        }

        .lecture-details-container .action-btn svg {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        .lecture-details-container .action-btn.pop {
          animation: btnPop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes btnPop {
          0% { transform: scale(1); }
          40% { transform: scale(0.88); }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .like-popup-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1000;
        }

        .like-heart {
          position: absolute;
          font-size: 24px;
          animation: floatHeart 1.5s ease-out forwards;
          pointer-events: none;
        }

        @keyframes floatHeart {
          0% { opacity: 1; transform: translate(0, 0) scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: translate(var(--tx), -100px) scale(1.2) rotate(var(--rot)); }
          100% { opacity: 0; transform: translate(calc(var(--tx) * 1.5), -250px) scale(0.8) rotate(calc(var(--rot) * 2)); }
        }

        /* ===== COMPACT RATING CARD - scaled down ~30% further as requested ===== */
        .lecture-details-container .rating-card {
          background: #1A1A1A;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 10px 11px;
          margin-bottom: 10px;
          cursor: pointer;
          transition: border-color 0.2s;
          text-align: left;
        }

        .lecture-details-container .rating-card:hover {
          border-color: rgba(255, 255, 255, 0.18);
        }

        .lecture-details-container .rating-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .lecture-details-container .rating-card-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .lecture-details-container .rating-card-right {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .lecture-details-container .add-review-label {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .lecture-details-container .add-review-label-text {
          font-size: 11px;
          font-weight: 600;
          color: #ffffff;
          line-height: 1;
        }

        .lecture-details-container .add-review-label-icon {
          color: #9CA3AF;
          display: flex;
          cursor: pointer;
          transition: color 0.2s;
          background: none;
          border: none;
          padding: 0;
        }

        .lecture-details-container .add-review-label-icon:hover {
          color: #ffffff;
        }

        .lecture-details-container .add-review-label-icon svg {
          width: 11px;
          height: 11px;
        }

        .lecture-details-container .rating-summary .score {
          font-size: 15px;
          font-weight: 700;
          color: #ffffff;
          line-height: 1;
        }

        .lecture-details-container .rating-summary .star-icon {
          width: 13px;
          height: 13px;
        }

        .lecture-details-container .rating-summary .count {
          font-size: 9px;
          color: #9CA3AF;
          font-weight: 400;
        }

        .lecture-details-container .card-stars {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }

        .lecture-details-container .card-star {
          cursor: pointer;
          transition: transform 0.15s;
          display: flex;
        }

        .lecture-details-container .card-star:hover {
          transform: scale(1.15);
        }

        .lecture-details-container .card-star svg {
          width: 17px;
          height: 17px;
        }

        .lecture-details-container .card-comment-field {
          width: 100%;
          background: #262626;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 7px;
          padding: 8px 10px;
          color: #ffffff;
          font-size: 9px;
          font-family: 'Inter', sans-serif;
          outline: none;
          pointer-events: none;
          margin-top: 10px;
        }

        .lecture-details-container .card-comment-field::placeholder {
          color: #737373;
        }

        .lecture-details-container .description {
          font-size: 13px;
          line-height: 1.5;
          color: #ccc;
          margin-bottom: 16px;
          text-align: left;
        }

        .lecture-details-container .description .desc-text {
          font-size: 13px;
          line-height: 1.5;
          color: #ccc;
          transition: all 0.2s;
        }

        .lecture-details-container .description .see-more-btn {
          background: none;
          border: none;
          color: #aaa;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 4px;
          padding: 0;
          display: flex;
          align-items: center;
          font-family: 'Inter', sans-serif;
        }

        .lecture-details-container .description .see-more-btn:hover {
          color: #f1f1f1;
        }

        .lecture-details-container .section-title {
          font-size: 15px;
          font-weight: 700;
          color: #f1f1f1;
          margin-bottom: 12px;
          text-align: left;
        }

        .lecture-details-container .lesson-item {
          display: flex;
          gap: 10px;
          margin-bottom: 14px;
          align-items: flex-start;
          text-align: left;
        }

        .lecture-details-container .lesson-thumb {
          position: relative;
          width: 150px;
          min-width: 150px;
          height: 84px;
          border-radius: 8px;
          overflow: hidden;
          background: #1a1a1a;
          cursor: pointer;
        }

        .lecture-details-container .lesson-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .lecture-details-container .play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          background: rgba(0,0,0,0.7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
        }

        .lecture-details-container .play-overlay svg {
          width: 14px;
          height: 14px;
          fill: #fff;
          margin-left: 2px;
        }

        .lecture-details-container .lesson-duration {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background: rgba(0,0,0,0.85);
          color: #fff;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 5px;
          border-radius: 3px;
        }

        .lecture-details-container .lesson-info {
          flex: 1;
          min-width: 0;
          padding-top: 2px;
        }

        .lecture-details-container .lesson-title {
          font-size: 13px;
          font-weight: 600;
          color: #f1f1f1;
          margin-bottom: 3px;
          line-height: 1.3;
        }

        .lecture-details-container .lesson-category {
          font-size: 11px;
          color: #aaa;
          margin-bottom: 6px;
        }

        .lecture-details-container .progress-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .lecture-details-container .progress-bar {
          flex: 1;
          height: 3px;
          background: #333;
          border-radius: 2px;
          overflow: hidden;
        }

        .lecture-details-container .progress-fill {
          height: 100%;
          background: #ff0000;
          border-radius: 2px;
          transition: width 1s ease;
        }

        .lecture-details-container .progress-percent {
          font-size: 11px;
          color: #aaa;
          min-width: 28px;
          text-align: right;
        }

        @media (max-width: 480px) {
          .lecture-details-container { padding: 10px 12px; }
          .lecture-details-container .video-title { font-size: 15px; }
          .lecture-details-container .rating-card { padding: 8px 10px; }
          .lecture-details-container .add-review-label-text { font-size: 10px; }
          .lecture-details-container .rating-summary .score { font-size: 14px; }
          .lecture-details-container .rating-summary .star-icon { width: 11px; height: 11px; }
          .lecture-details-container .rating-summary .count { font-size: 8px; }
          .lecture-details-container .card-star svg { width: 15px; height: 15px; }
          .lecture-details-container .lesson-thumb { width: 130px; min-width: 130px; height: 74px; }
        }
      ` }} />

      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="trustGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4caf50"/>
            <stop offset="100%" stopColor="#66bb6a"/>
          </linearGradient>
        </defs>
      </svg>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-white text-black text-[13px] font-medium px-4 py-2 rounded-full shadow-xl flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-500" /> {toast}
        </div>
      )}

      <h1 className="video-title">{lecture.title}</h1>
      <div className="video-meta">
        {[lecture.subject, lecture.examType || lecture.exam_type].filter(Boolean).join(" • ")}
      </div>

      <div className="channel-row">
        <div className="channel-info">
          <div className="channel-avatar">
            {channel && channel.avatar_url ? (
              <img
                src={channel.avatar_url}
                alt={channel.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <span className="pw-text">{channelInitials}</span>
            )}
            <div className="premium-badge">
              <svg viewBox="0 0 24 24" fill="#000">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
              </svg>
            </div>
          </div>
          <div className="channel-details">
            <div className="channel-name">
              {channel ? channel.name : "Loading..."}
              {channel && channel.verified && (
                <span className="verified-badge">
                  <svg viewBox="0 0 24 24" fill="#fff">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                  </svg>
                </span>
              )}
            </div>
            <div className="channel-subs">
              {channelLoading
                ? "Loading..."
                : `${channel ? channel.followers_count.toLocaleString() : "0"} subscribers`}
            </div>
          </div>
        </div>
        <div className="channel-right">
          <div className="trust-score">
            <div className="trust-circle">
              <svg width="44" height="44" viewBox="0 0 44 44">
                <circle className="circle-bg" cx="22" cy="22" r="20"/>
                <circle
                  className="circle-progress"
                  cx="22"
                  cy="22"
                  r="20"
                  style={{ strokeDashoffset: offset }}
                />
              </svg>
              <span className="trust-value">{channel ? channel.trust_score : 0}%</span>
            </div>
            <span className="trust-label">Trust Score</span>
          </div>
          <button
            className={`follow-btn ${following ? 'following' : ''}`}
            onClick={requireAuth(toggleFollow)}
          >
            {following ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      <div className="action-buttons">
        <button className={`action-btn ${liked ? 'active' : ''}`} id="likeBtn" onClick={handleLikeClick}>
          <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
          </svg>
          Like
        </button>
        <button className={`action-btn ${saved ? 'active' : ''}`} id="saveBtn" onClick={handleSaveClick}>
          <svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          Save
        </button>
        <button className="action-btn" onClick={() => { flashToast("Added to playlist"); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/>
            <line x1="3" y1="12" x2="3.01" y2="12"/>
            <line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
          Add to playlist
        </button>
        <button className={`action-btn ${watchLater ? 'active' : ''}`} id="wlBtn" onClick={handleWatchLaterClick}>
          <svg viewBox="0 0 24 24" fill={watchLater ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          Watch later
        </button>
        <button className="action-btn" onClick={shareLecture}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
            <polyline points="16 6 12 2 8 6"/>
            <line x1="12" y1="2" x2="12" y2="15"/>
          </svg>
          Share
        </button>
      </div>

      <div
        className="rating-card"
        onClick={() => {
          setComposerInitialRating(null);
          setShowReviewsScreen(true);
        }}
      >
        <div className="rating-card-top">
          <div className="rating-card-left">
            <div className="add-review-label">
              <span className="add-review-label-text">Add review</span>
              <button
                className="add-review-label-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setComposerInitialRating(null);
                  setShowReviewsScreen(true);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
            <div className="card-stars" onClick={(e) => e.stopPropagation()}>
              <InteractiveStars
                value={pendingRating || 0}
                onChange={(ratingVal) => {
                  setPendingRating(ratingVal);
                  setTimeout(() => {
                    setPendingRating(null);
                    setComposerInitialRating(ratingVal);
                    setShowReviewsScreen(true);
                  }, 250);
                }}
                size={17}
              />
            </div>
          </div>
          <div className="rating-card-right">
            <div className="rating-summary">
              <span className="score">{avgRating ? avgRating.toFixed(1) : "0.0"}</span>
              <svg className="star-icon" viewBox="0 0 24 24">
                <path fill="#FFC107" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="count">({reviews.length ? reviews.length.toLocaleString() : "0"} reviews)</span>
            </div>
          </div>
        </div>
        <input
          type="text"
          className="card-comment-field"
          placeholder="Share your thoughts about this video..."
          readOnly
        />
      </div>

      {lecture.description && (
        <div className="description">
          <p className={`desc-text ${descExpanded ? "" : "line-clamp-2"}`}>
            {lecture.description}
          </p>
          <button
            onClick={() => setDescExpanded((d) => !d)}
            className="see-more-btn"
          >
            {descExpanded ? "See less" : "See more ⌄"}
          </button>
        </div>
      )}

      <h2 className="section-title">Recommended Lessons ({recommended.length})</h2>

      {recommendedLoading ? (
        <div className="lessons-loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="lesson-item animate-pulse">
              <div className="lesson-thumb bg-white/10" style={{ width: '150px', height: '84px', borderRadius: '8px' }} />
              <div className="lesson-info">
                <div className="h-3.5 w-3/4 bg-white/10 rounded mb-2" />
                <div className="h-3 w-1/2 bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : recommended.length === 0 ? (
        <p className="text-white/40 text-[13px] font-mono text-left">No recommendations yet.</p>
      ) : (
        recommended.map((l) => (
          <div key={l.id} className="lesson-item" onClick={() => handleSelect(l)}>
            <div className="lesson-thumb">
              <img
                src={l.thumbnail_url || "https://image.qwenlm.ai/public_source/29098559-833f-40c2-bb9e-dac3880909af/1f2a9c4b2-94de-4b5a-880d-f6da9c48a149.png"}
                alt={l.title}
              />
              <div className="play-overlay">
                <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
              </div>
              {l.duration && <span className="lesson-duration">{l.duration}</span>}
            </div>
            <div className="lesson-info">
              <div className="lesson-title">{l.title}</div>
              <div className="lesson-category">
                {[l.subject, l.exam_type || (l as any).examType].filter(Boolean).join(" • ")}
              </div>
              <div className="progress-row">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${l.progress_pct}%` }} />
                </div>
                <span className="progress-percent">{l.progress_pct}%</span>
              </div>
            </div>
          </div>
        ))
      )}

      <div className="like-popup-container" id="likePopupContainer" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Channel Card & Fallback Avatar
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

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
