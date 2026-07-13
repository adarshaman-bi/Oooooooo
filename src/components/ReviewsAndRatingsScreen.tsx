import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft, Star, ThumbsUp, MessageSquare, ChevronDown, ChevronUp,
  X, Send, ShieldAlert, BadgeCheck, AlertCircle, Share2, CornerDownRight
} from "lucide-react";
import { supabase } from "../utils/supabaseClient";

const TURMERIC = "#e0a527";   // Rating stars color
const ACCENT_BLUE = "#3B82F6"; // Theme blue accent

interface Review {
  id: string;
  entity_id: string;
  entity_type: string;
  user_id: string;
  user_display_name: string;
  rating: number | null;
  comment: string;
  is_flagged: boolean;
  parent_id: string | null;
  created_at: string;
  // Sourced via join or local arrays
  upvote_count?: number;
  upvoted_users?: string[];
  depth?: number;
  replies?: Review[];
}

interface TrustScore {
  account_created_at: string;
  total_reviews: number;
  total_upvotes: number;
  flagged_count: number;
  has_spam_burst: boolean;
  is_top_contributor: boolean;
}

interface ReviewsAndRatingsScreenProps {
  lectureId: string;
  lectureTitle: string;
  currentUserId: string | null;
  currentUserProfile: any;
  onClose: () => void;
  initialRating?: number | null;
}

// ---------------------------------------------------------------------------
// Helper: format relative time (e.g., "2 days ago")
// ---------------------------------------------------------------------------
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // Fallback to formatted date
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Helper: initials avatar generator
// ---------------------------------------------------------------------------
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatProfileAge(dateString: string): string {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `Member since ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ---------------------------------------------------------------------------
export function StaggeredStars({ value, size = 22, className = "" }: { value: number; size?: number; className?: string }) {
  const rounded = Math.round(value);
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.div
          key={n}
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: (n - 1) * 0.08, duration: 0.2, type: "spring", stiffness: 200 }}
        >
          <Star
            size={size}
            fill={n <= rounded ? TURMERIC : "transparent"}
            color={n <= rounded ? TURMERIC : "rgba(255, 255, 255, 0.2)"}
            strokeWidth={2.2}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Interactive star selector
// ---------------------------------------------------------------------------
export function InteractiveStars({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (val: number) => void;
  size?: number;
}) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const activeVal = hoverValue !== null ? hoverValue : value;

  return (
    <div className="flex items-center gap-2.5 py-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHoverValue(n)}
          onMouseLeave={() => setHoverValue(null)}
          whileTap={{ scale: 0.85 }}
          animate={{
            scale: activeVal >= n ? [1, 1.15, 1] : 1,
          }}
          transition={{ duration: 0.15 }}
          className="cursor-pointer focus:outline-none"
        >
          <Star
            size={size}
            fill={activeVal >= n ? TURMERIC : "transparent"}
            color={activeVal >= n ? TURMERIC : "rgba(255, 255, 255, 0.2)"}
            strokeWidth={2.2}
          />
        </motion.button>
      ))}
    </div>
  );
}


export default function ReviewsAndRatingsScreen({
  lectureId,
  lectureTitle,
  currentUserId,
  currentUserProfile,
  onClose,
  initialRating = null,
}: ReviewsAndRatingsScreenProps) {
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [profile, setProfile] = useState<any>(currentUserProfile || null);

  useEffect(() => {
    if (currentUserProfile) {
      setProfile(currentUserProfile);
      return;
    }
    if (!currentUserId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("uid", currentUserId)
        .single();
      if (data) {
        setProfile(data);
      } else {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setProfile({
            display_name: userData.user.user_metadata?.display_name || "Student"
          });
        }
      }
    })();
  }, [currentUserId, currentUserProfile]);
  const [loading, setLoading] = useState(true);
  const [filterStar, setFilterStar] = useState<number | null>(null); // null = All
  const [sortBy, setSortBy] = useState<"helpful" | "recent" | "highest" | "lowest">("helpful");
  const [showComposer, setShowComposer] = useState(!!initialRating);
  const [composerInitialRating, setComposerInitialRating] = useState<number | null>(initialRating);
  const [activeThreadRoot, setActiveThreadRoot] = useState<Review | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadReplies, setThreadReplies] = useState<Review[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Cache for trust scores to avoid redundant queries
  const trustCache = useRef<Record<string, TrustScore>>({});
  const [trustScores, setTrustScores] = useState<Record<string, TrustScore>>({});

  const flashToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Fetch all reviews and replies for analytics and root list
  const fetchAllReviews = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch reviews
      const { data: reviewsData, error: reviewsErr } = await supabase
        .from("reviews")
        .select("*, review_upvotes(user_id)")
        .eq("entity_id", lectureId)
        .eq("entity_type", "video");

      if (reviewsErr) throw reviewsErr;

      const mapped = (reviewsData || []).map((r: any) => ({
        id: r.id,
        entity_id: r.entity_id,
        entity_type: r.entity_type,
        user_id: r.user_id,
        user_display_name: r.user_display_name,
        rating: r.rating !== null ? Number(r.rating) : null,
        comment: r.comment || "",
        is_flagged: !!r.is_flagged,
        parent_id: r.parent_id,
        created_at: r.created_at,
        upvote_count: r.review_upvotes ? r.review_upvotes.length : 0,
        upvoted_users: r.review_upvotes ? r.review_upvotes.map((uv: any) => uv.user_id) : [],
      }));

      setReviewsList(mapped);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      flashToast("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [lectureId, flashToast]);

  useEffect(() => {
    fetchAllReviews();
  }, [fetchAllReviews]);

  // Fetch trust score for a reviewer
  const fetchTrustScore = useCallback(async (userId: string) => {
    if (trustCache.current[userId]) {
      setTrustScores((prev) => ({ ...prev, [userId]: trustCache.current[userId] }));
      return;
    }
    try {
      const { data, error } = await supabase.rpc("get_reviewer_trust_score", {
        reviewer_id: userId,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        const score = data[0] as TrustScore;
        trustCache.current[userId] = score;
        setTrustScores((prev) => ({ ...prev, [userId]: score }));
      }
    } catch (err) {
      console.warn("Failed to fetch trust score for user:", userId, err);
    }
  }, []);

  // Root reviews computed from the full reviews list
  const rootReviews = useMemo(() => {
    return reviewsList.filter((r) => r.parent_id === null);
  }, [reviewsList]);

  // Computed counts for replies
  const repliesCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    reviewsList.forEach((r) => {
      if (r.parent_id) {
        map[r.parent_id] = (map[r.parent_id] || 0) + 1;
      }
    });
    return map;
  }, [reviewsList]);

  // Analytics Computations
  const ratingsOnly = useMemo(() => rootReviews.filter((r) => r.rating !== null), [rootReviews]);
  
  const averageRating = useMemo(() => {
    if (!ratingsOnly.length) return 0;
    return ratingsOnly.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingsOnly.length;
  }, [ratingsOnly]);

  const audienceScore = useMemo(() => {
    if (!ratingsOnly.length) return 0;
    const positive = ratingsOnly.filter((r) => (r.rating || 0) >= 4).length;
    return Math.round((positive / ratingsOnly.length) * 100);
  }, [ratingsOnly]);

  const distributionCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingsOnly.forEach((r) => {
      const val = Math.round(r.rating || 5) as 5 | 4 | 3 | 2 | 1;
      if (counts[val] !== undefined) {
        counts[val]++;
      }
    });
    return counts;
  }, [ratingsOnly]);

  // Filter & Sort root reviews
  const filteredAndSortedReviews = useMemo(() => {
    let result = [...rootReviews];

    // Filter
    if (filterStar !== null) {
      result = result.filter((r) => r.rating !== null && Math.round(r.rating) === filterStar);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "helpful") {
        return (b.upvote_count || 0) - (a.upvote_count || 0);
      }
      if (sortBy === "recent") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === "highest") {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortBy === "lowest") {
        return (a.rating || 0) - (b.rating || 0);
      }
      return 0;
    });

    return result;
  }, [rootReviews, filterStar, sortBy]);

  // Handle Review Upvote
  const handleUpvote = useCallback(async (reviewId: string) => {
    if (!currentUserId) {
      flashToast("Sign in to upvote reviews");
      return;
    }

    const reviewIndex = reviewsList.findIndex((r) => r.id === reviewId);
    if (reviewIndex === -1) return;

    const review = reviewsList[reviewIndex];
    const upvoted = review.upvoted_users?.includes(currentUserId);
    const nextUpvotedUsers = upvoted
      ? review.upvoted_users?.filter((uid) => uid !== currentUserId) || []
      : [...(review.upvoted_users || []), currentUserId];
    
    const nextUpvoteCount = nextUpvotedUsers.length;

    // Optimistic Update
    setReviewsList((prev) => {
      const copy = [...prev];
      copy[reviewIndex] = {
        ...review,
        upvote_count: nextUpvoteCount,
        upvoted_users: nextUpvotedUsers,
      };
      return copy;
    });

    // Sync active thread root if it is matching
    if (activeThreadRoot && activeThreadRoot.id === reviewId) {
      setActiveThreadRoot((prev) => prev ? {
        ...prev,
        upvote_count: nextUpvoteCount,
        upvoted_users: nextUpvotedUsers,
      } : null);
    }

    try {
      if (upvoted) {
        // Delete upvote row
        const { error } = await supabase
          .from("review_upvotes")
          .delete()
          .eq("review_id", reviewId)
          .eq("user_id", currentUserId);
        if (error) throw error;
      } else {
        // Insert upvote row
        const { error } = await supabase
          .from("review_upvotes")
          .insert({ review_id: reviewId, user_id: currentUserId });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Upvote failed:", err);
      flashToast("Action failed — try again");
      
      // Revert optimistic state
      setReviewsList((prev) => {
        const copy = [...prev];
        copy[reviewIndex] = review;
        return copy;
      });
      if (activeThreadRoot && activeThreadRoot.id === reviewId) {
        setActiveThreadRoot(review);
      }
    }
  }, [currentUserId, reviewsList, activeThreadRoot, flashToast]);

  // Load full recursive thread for detailed threaded comment view
  const loadThread = useCallback(async (rootId: string) => {
    setThreadLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_review_thread", {
        root_id: rootId,
      });
      if (error) throw error;

      // Map replies
      const mappedReplies = (data || []).map((r: any) => ({
        id: r.id,
        entity_id: r.entity_id,
        entity_type: r.entity_type,
        user_id: r.user_id,
        user_display_name: r.user_display_name,
        rating: r.rating !== null ? Number(r.rating) : null,
        comment: r.comment || "",
        is_flagged: !!r.is_flagged,
        parent_id: r.parent_id,
        created_at: r.created_at,
        depth: r.depth,
        upvote_count: Number(r.upvote_count),
        upvoted_users: [], // Sourced separate or handle local
      }));

      // Fetch user upvotes states for this thread
      if (currentUserId && mappedReplies.length) {
        const { data: userUpvotes } = await supabase
          .from("review_upvotes")
          .select("review_id")
          .eq("user_id", currentUserId)
          .in("review_id", mappedReplies.map((r: any) => r.id));

        const upvotedIds = new Set((userUpvotes || []).map((uv: any) => uv.review_id));
        mappedReplies.forEach((r: any) => {
          if (upvotedIds.has(r.id)) {
            r.upvoted_users = [currentUserId];
          }
        });
      }

      setThreadReplies(mappedReplies);
    } catch (err) {
      console.error("Failed to load thread:", err);
      flashToast("Could not load comments thread");
    } finally {
      setThreadLoading(false);
    }
  }, [currentUserId, flashToast]);

  // Submit a reply comment
  const handlePostReply = useCallback(async (parentId: string, commentText: string) => {
    if (!currentUserId) {
      flashToast("Sign in to reply");
      return;
    }
    if (!commentText.trim()) return;

    const newReplyId = crypto.randomUUID();
    const displayName = profile?.display_name || "Student";
    const timestamp = new Date().toISOString();

    const optimisticReply: Review = {
      id: newReplyId,
      entity_id: lectureId,
      entity_type: "video",
      user_id: currentUserId,
      user_display_name: displayName,
      rating: null,
      comment: commentText.trim(),
      is_flagged: false,
      parent_id: parentId,
      created_at: timestamp,
      upvote_count: 0,
      upvoted_users: [],
      depth: activeThreadRoot ? (threadReplies.find(r => r.id === parentId)?.depth || 0) + 1 : 1
    };

    // Update Local States
    setThreadReplies((prev) => [...prev, optimisticReply]);
    
    try {
      const { error } = await supabase.from("reviews").insert({
        id: newReplyId,
        entity_id: lectureId,
        entity_type: "video",
        user_id: currentUserId,
        user_display_name: displayName,
        rating: null,
        comment: commentText.trim(),
        parent_id: parentId,
      });

      if (error) throw error;
      flashToast("Reply posted");
      fetchAllReviews();
    } catch (err) {
      console.error("Reply insert failed:", err);
      flashToast("Failed to post reply");
      setThreadReplies((prev) => prev.filter(r => r.id !== newReplyId));
    }
  }, [currentUserId, profile, lectureId, activeThreadRoot, threadReplies, flashToast, fetchAllReviews]);

  // Submit root review
  const handlePostReview = useCallback(async (stars: number, comment: string) => {
    if (!currentUserId) {
      flashToast("Sign in to leave a review");
      return;
    }
    const displayName = profile?.display_name || "Student";
    const reviewId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const optimisticReview: Review = {
      id: reviewId,
      entity_id: lectureId,
      entity_type: "video",
      user_id: currentUserId,
      user_display_name: displayName,
      rating: stars,
      comment: comment.trim(),
      is_flagged: false,
      parent_id: null,
      created_at: timestamp,
      upvote_count: 0,
      upvoted_users: []
    };

    setReviewsList((prev) => [optimisticReview, ...prev]);
    setShowComposer(false);

    try {
      const { error } = await supabase.from("reviews").insert({
        id: reviewId,
        entity_id: lectureId,
        entity_type: "video",
        user_id: currentUserId,
        user_display_name: displayName,
        rating: stars,
        comment: comment.trim(),
      });
      if (error) throw error;
      flashToast("Review posted successfully!");
      fetchAllReviews();
    } catch (err) {
      console.error("Review creation failed:", err);
      flashToast("Failed to post review");
      setReviewsList((prev) => prev.filter(r => r.id !== reviewId));
    }
  }, [currentUserId, profile, lectureId, fetchAllReviews, flashToast]);

  // Delete review or reply
  const handleDeleteReview = useCallback(async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    // Optimistic Delete
    setReviewsList((prev) => prev.filter((r) => r.id !== reviewId));
    setThreadReplies((prev) => prev.filter((r) => r.id !== reviewId));

    try {
      const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
      if (error) throw error;
      flashToast("Deleted successfully");
      fetchAllReviews();
    } catch (err) {
      console.error("Delete review failed:", err);
      flashToast("Failed to delete");
      fetchAllReviews();
    }
  }, [fetchAllReviews, flashToast]);

  return (
    <div className="fixed inset-0 z-55 bg-[#08080A] text-white flex flex-col font-sans">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-white text-black text-xs font-semibold px-4.5 py-2.5 rounded-full shadow-2xl flex items-center gap-2"
          >
            <AlertCircle size={14} className="text-emerald-500" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 bg-[#0E0E0F]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-zinc-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="text-left">
            <h2 className="font-bold text-sm md:text-base leading-tight">Reviews & Ratings</h2>
            <p className="text-white/40 text-[10px] md:text-[11px] truncate max-w-[240px] md:max-w-[400px]">{lectureTitle}</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (!currentUserId) flashToast("Sign in to review");
            else setShowComposer(true);
          }}
          className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] transition-colors cursor-pointer animate-none"
        >
          Write a Review
        </button>
      </header>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-[#08080A] flex flex-col md:flex-row">
        {activeThreadRoot ? (
          /* SCREEN 3: Threaded Replies View */
          <ThreadView
            rootReview={activeThreadRoot}
            replies={threadReplies}
            currentUserId={currentUserId}
            loading={threadLoading}
            onBack={() => setActiveThreadRoot(null)}
            onUpvote={handleUpvote}
            onPostReply={handlePostReply}
            onDelete={handleDeleteReview}
            fetchTrust={fetchTrustScore}
            trustScores={trustScores}
            onSubThread={(node) => {
              setActiveThreadRoot(node);
              loadThread(node.id);
            }}
          />
        ) : (
          /* SCREEN 1: Reviews Overview & Root List */
          <OverviewAndList
            rootReviews={filteredAndSortedReviews}
            allRootReviewsCount={rootReviews.length}
            loading={loading}
            averageRating={averageRating}
            audienceScore={audienceScore}
            distribution={distributionCounts}
            filterStar={filterStar}
            setFilterStar={setFilterStar}
            sortBy={sortBy}
            setSortBy={setSortBy}
            onUpvote={handleUpvote}
            onSelectThread={(rev) => {
              setActiveThreadRoot(rev);
              loadThread(rev.id);
            }}
            repliesCountMap={repliesCountMap}
            currentUserId={currentUserId}
            onDelete={handleDeleteReview}
            fetchTrust={fetchTrustScore}
            trustScores={trustScores}
          />
        )}
      </div>

      {/* SCREEN 4: Write Review Composer Overlay */}
      <AnimatePresence>
        {showComposer && (
          <WriteReviewComposer
            initialRating={composerInitialRating || 5}
            onSubmit={handlePostReview}
            onClose={() => {
              setShowComposer(false);
              setComposerInitialRating(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen 1 Layout Component: Overview and list panel
// ---------------------------------------------------------------------------
function OverviewAndList({
  rootReviews,
  allRootReviewsCount,
  loading,
  averageRating,
  audienceScore,
  distribution,
  filterStar,
  setFilterStar,
  sortBy,
  setSortBy,
  onUpvote,
  onSelectThread,
  repliesCountMap,
  currentUserId,
  onDelete,
  fetchTrust,
  trustScores,
}: {
  rootReviews: Review[];
  allRootReviewsCount: number;
  loading: boolean;
  averageRating: number;
  audienceScore: number;
  distribution: Record<number, number>;
  filterStar: number | null;
  setFilterStar: (star: number | null) => void;
  sortBy: string;
  setSortBy: (sort: any) => void;
  onUpvote: (id: string) => void;
  onSelectThread: (rev: Review) => void;
  repliesCountMap: Record<string, number>;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  fetchTrust: (userId: string) => void;
  trustScores: Record<string, TrustScore>;
}) {
  const [visibleCount, setVisibleCount] = useState(10);
  const totalStarReviews = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;

  const paginatedReviews = useMemo(() => {
    return rootReviews.slice(0, visibleCount);
  }, [rootReviews, visibleCount]);

  return (
    <div className="w-full flex flex-col md:flex-row flex-1">
      {/* Analytics Panel */}
      <div className="w-full md:w-80 border-r border-white/5 bg-[#0E0E0F] p-5 flex flex-col gap-6 shrink-0 text-left">
        <div>
          <h3 className="text-white/40 text-[11px] font-mono uppercase tracking-wider">Audience Rating</h3>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1.5">
                <span className="text-3xl font-extrabold">{audienceScore}%</span>
                <span className="text-xl">🍅</span>
              </div>
              <span className="text-white/40 text-[10px] mt-0.5">Audience Score</span>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-extrabold">{averageRating ? averageRating.toFixed(1) : "0.0"}</span>
                {averageRating ? (
                  <Star size={18} fill={TURMERIC} color={TURMERIC} className="mb-1" />
                ) : (
                  <div className="flex gap-0.5 ml-1 mb-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} size={12} fill="transparent" color="rgba(255, 255, 255, 0.25)" strokeWidth={2.2} />
                    ))}
                  </div>
                )}
              </div>
              <span className="text-white/40 text-[10px] mt-0.5">{allRootReviewsCount} ratings</span>
            </div>
          </div>
        </div>

        {/* Staggered Stars display */}
        <div className="py-1">
          <StaggeredStars value={averageRating} />
        </div>

        {/* Distribution Bars */}
        <div className="flex flex-col gap-2.5">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[stars] || 0;
            const pct = Math.round((count / totalStarReviews) * 100);
            return (
              <button
                key={stars}
                onClick={() => setFilterStar(filterStar === stars ? null : stars)}
                className={`w-full flex items-center gap-3 text-left group hover:opacity-100 transition-opacity cursor-pointer ${
                  filterStar === stars ? "opacity-100" : filterStar !== null ? "opacity-40" : "opacity-80"
                }`}
              >
                <span className="w-6 text-zinc-400 font-mono text-[12px] font-bold flex items-center gap-0.5 shrink-0">
                  {stars}★
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/5 relative overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#e0a527]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-right text-zinc-500 font-mono text-[11px] shrink-0">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reviews List Column */}
      <div className="flex-1 flex flex-col p-5 bg-[#08080A]">
        {/* Filters and sorting toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/5 text-left shrink-0">
          {/* Star Filter Chips */}
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFilterStar(null)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                filterStar === null
                  ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                  : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white"
              }`}
            >
              All ({allRootReviewsCount})
            </button>
            {[5, 4, 3, 2, 1].map((s) => {
              const active = filterStar === s;
              const count = distribution[s] || 0;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStar(active ? null : s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                    active
                      ? "bg-blue-600/10 border-blue-500/30 text-blue-400"
                      : "bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-white"
                  }`}
                >
                  {s}★ ({count})
                </button>
              );
            })}
          </div>

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Sort:</span>
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs text-white/80 font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer focus:border-zinc-700"
              >
                <option value="helpful">Most Helpful</option>
                <option value="recent">Most Recent</option>
                <option value="highest">Highest Rating</option>
                <option value="lowest">Lowest Rating</option>
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 min-h-0">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-4 bg-white/[0.01] border border-white/5 rounded-xl h-28" />
              ))}
            </div>
          ) : reviewsList.length === 0 ? (
            <div className="py-16 px-4 text-center border border-white/5 bg-white/[0.01] rounded-2xl flex flex-col items-center justify-center">
              <MessageSquare size={28} className="text-white/20 mb-3" />
              <p className="font-bold text-sm text-white/80">No reviews yet</p>
              <p className="text-white/40 text-xs mt-1 max-w-[260px] mx-auto leading-relaxed">
                Be the first to share your thoughts and rate this lecture!
              </p>
              <button
                onClick={() => {
                  if (!currentUserId) flashToast("Sign in to review");
                  else setShowComposer(true);
                }}
                className="mt-4 px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] transition-colors cursor-pointer"
              >
                Write a Review
              </button>
            </div>
          ) : rootReviews.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-white/40 text-[13px] font-mono">No reviews found matching filters.</p>
            </div>
          ) : (
            <>
              {paginatedReviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  currentUserId={currentUserId}
                  onUpvote={onUpvote}
                  onSelect={onSelectThread}
                  onDelete={onDelete}
                  repliesCount={repliesCountMap[r.id] || 0}
                  fetchTrust={fetchTrust}
                  trustScore={trustScores[r.user_id]}
                />
              ))}

              {rootReviews.length > visibleCount && (
                <button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  className="w-full py-2.5 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Show More Reviews
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card component for root review card
// ---------------------------------------------------------------------------
function ReviewCard({
  review,
  currentUserId,
  onUpvote,
  onSelect,
  onDelete,
  repliesCount,
  fetchTrust,
  trustScore,
}: {
  review: Review;
  currentUserId: string | null;
  onUpvote: (id: string) => void;
  onSelect?: (rev: Review) => void;
  onDelete: (id: string) => void;
  repliesCount?: number;
  fetchTrust: (userId: string) => void;
  trustScore: TrustScore | undefined;
}) {
  const [showFullTimestamp, setShowFullTimestamp] = useState(false);
  const upvoted = review.upvoted_users?.includes(currentUserId || "");

  useEffect(() => {
    fetchTrust(review.user_id);
  }, [review.user_id, fetchTrust]);

  return (
    <div className="p-4 border border-white/5 bg-white/[0.01] rounded-xl text-left hover:bg-white/[0.02] transition-colors relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
            {getInitials(review.user_display_name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs md:text-sm text-white/95">{review.user_display_name}</span>
              
              {/* Trust badges */}
              {trustScore?.is_top_contributor && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#e0a527] bg-[#e0a527]/10 px-1.5 py-0.5 rounded">
                  <BadgeCheck size={10} /> Top Contributor
                </span>
              )}
            </div>
            
            {/* Account Profile Age and Timestamp */}
            <div className="flex items-center gap-2 text-[10px] text-white/30 mt-0.5 select-none">
              <span
                onClick={() => setShowFullTimestamp(!showFullTimestamp)}
                className="cursor-pointer underline hover:text-white/60"
              >
                {showFullTimestamp ? new Date(review.created_at).toLocaleString() : formatRelativeTime(review.created_at)}
              </span>
              <span>•</span>
              <span>
                {trustScore ? formatProfileAge(trustScore.account_created_at) : "..."}
              </span>
            </div>
          </div>
        </div>

        {/* Option overflow for Author Delete */}
        {currentUserId === review.user_id && (
          <button
            onClick={() => onDelete(review.id)}
            className="text-white/20 hover:text-red-400 p-1 cursor-pointer transition-colors"
            title="Delete Comment"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Review Content */}
      <div className="mt-3">
        {review.rating !== null && (
          <div className="mb-1.5">
            <StaggeredStars value={review.rating || 0} size={13} />
          </div>
        )}
        <p className="text-white/80 text-[13px] leading-relaxed whitespace-pre-wrap">{review.comment}</p>
      </div>

      {/* Action panel */}
      <div className="mt-4 flex items-center gap-4 border-t border-white/[0.03] pt-3 shrink-0">
        {/* Upvote button with scale bounce */}
        <motion.button
          onClick={() => onUpvote(review.id)}
          whileTap={{ scale: 0.8 }}
          animate={{ scale: upvoted ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-1.5 text-[11px] font-bold cursor-pointer transition-colors ${
            upvoted ? "text-blue-500" : "text-white/50 hover:text-white"
          }`}
        >
          <ThumbsUp size={12} fill={upvoted ? ACCENT_BLUE : "transparent"} />
          <span>{review.upvote_count || 0}</span>
        </motion.button>

        {/* Reply button */}
        {onSelect && (
          <motion.button
            onClick={() => onSelect(review)}
            whileTap={{ scale: 0.85 }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-white/50 hover:text-white cursor-pointer transition-colors"
          >
            <MessageSquare size={12} />
            <span>Reply {repliesCount ? `(${repliesCount})` : ""}</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen 3: Reddit-style threaded comments view
// ---------------------------------------------------------------------------
function ThreadView({
  rootReview,
  replies,
  currentUserId,
  loading,
  onBack,
  onUpvote,
  onPostReply,
  onDelete,
  fetchTrust,
  trustScores,
  onSubThread,
}: {
  rootReview: Review;
  replies: Review[];
  currentUserId: string | null;
  loading: boolean;
  onBack: () => void;
  onUpvote: (id: string) => void;
  onPostReply: (parentId: string, text: string) => Promise<void>;
  onDelete: (id: string) => void;
  fetchTrust: (userId: string) => void;
  trustScores: Record<string, TrustScore>;
  onSubThread: (node: Review) => void;
}) {
  const [replyTarget, setReplyTarget] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const composerInputRef = useRef<HTMLInputElement>(null);

  // Group thread into a tree structure
  const threadTree = useMemo(() => {
    if (!replies.length) return [];
    
    const nodeMap: Record<string, Review & { replies: Review[] }> = {};
    const rootNodes: (Review & { replies: Review[] })[] = [];

    // Initialize map
    replies.forEach((r) => {
      nodeMap[r.id] = { ...r, replies: [] };
    });

    // Populate tree relations
    replies.forEach((r) => {
      const node = nodeMap[r.id];
      if (r.parent_id && nodeMap[r.parent_id]) {
        nodeMap[r.parent_id].replies.push(node);
      } else {
        if (r.id === rootReview.id) {
          rootNodes.push(node);
        }
      }
    });

    return rootNodes;
  }, [replies, rootReview.id]);

  // Scroll to composer and focus input
  const handleInitiateReply = (node: Review) => {
    setReplyTarget(node);
    setTimeout(() => {
      composerInputRef.current?.focus();
    }, 100);
  };

  const handlePost = async () => {
    if (!replyText.trim()) return;
    const targetId = replyTarget ? replyTarget.id : rootReview.id;
    setSubmittingReply(true);
    await onPostReply(targetId, replyText);
    setReplyText("");
    setSubmittingReply(false);
    setReplyTarget(null);
  };

  return (
    <div className="flex-grow flex flex-col bg-[#08080A] h-full w-full relative">
      {/* Sub Header for Thread navigation */}
      <div className="h-10 border-b border-white/5 flex items-center px-4 shrink-0 bg-[#0E0E0F]">
        <button onClick={onBack} className="text-zinc-500 hover:text-white text-xs font-bold flex items-center gap-1 cursor-pointer">
          <ArrowLeft size={12} /> Back to all reviews
        </button>
      </div>

      {/* Replies Thread display */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 pb-28 min-h-0 select-text">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Parent review card */}
            <ReviewCard
              review={rootReview}
              currentUserId={currentUserId}
              onUpvote={onUpvote}
              onDelete={onDelete}
              fetchTrust={fetchTrust}
              trustScore={trustScores[rootReview.user_id]}
            />

            <div className="w-full text-left font-semibold text-zinc-400 text-xs px-1 border-b border-white/5 pb-2">
              Replies
            </div>

            {/* Render recursive reply nodes */}
            {threadTree.map((rootNode) => (
              <div key={rootNode.id} className="mt-2">
                {rootNode.replies.map((reply) => (
                  <ThreadNodeComponent
                    key={reply.id}
                    node={reply}
                    currentUserId={currentUserId}
                    onUpvote={onUpvote}
                    onInitiateReply={handleInitiateReply}
                    onDelete={onDelete}
                    fetchTrust={fetchTrust}
                    trustScores={trustScores}
                    onSubThread={onSubThread}
                  />
                ))}
                {rootNode.replies.length === 0 && (
                  <p className="text-white/30 text-xs text-center py-6">No replies yet. Be the first to start the thread!</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sticky Bottom Reply Composer */}
      <div className="absolute bottom-0 inset-x-0 bg-[#0E0E0F] border-t border-white/5 px-4 py-3 shrink-0 flex flex-col gap-1.5 z-10">
        {replyTarget && (
          <div className="flex items-center justify-between text-xs text-zinc-400 bg-white/[0.02] px-3 py-1 rounded">
            <span>Replying to <span className="font-semibold text-white">@{replyTarget.user_display_name}</span></span>
            <button onClick={() => setReplyTarget(null)} className="text-zinc-500 hover:text-white cursor-pointer">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={composerInputRef}
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={replyTarget ? `Reply to @${replyTarget.user_display_name}...` : "Write a reply to this review..."}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4.5 py-2 text-sm text-white outline-none focus:border-blue-500 transition-colors"
            onKeyDown={(e) => e.key === "Enter" && handlePost()}
          />
          <button
            onClick={handlePost}
            disabled={submittingReply || !replyText.trim() || !currentUserId}
            className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 disabled:opacity-40 disabled:hover:bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </div>
        {!currentUserId && (
          <p className="text-[10px] text-zinc-500 text-center mt-0.5">Please sign in to write comments.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread node component for Reddit nested comments rendering
// ---------------------------------------------------------------------------
function ThreadNodeComponent({
  node,
  currentUserId,
  onUpvote,
  onInitiateReply,
  onDelete,
  fetchTrust,
  trustScores,
  onSubThread,
}: {
  node: Review;
  currentUserId: string | null;
  onUpvote: (id: string) => void;
  onInitiateReply: (node: Review) => void;
  onDelete: (id: string) => void;
  fetchTrust: (userId: string) => void;
  trustScores: Record<string, TrustScore>;
  onSubThread: (node: Review) => void;
}) {
  const upvoted = node.upvoted_users?.includes(currentUserId || "");
  const currentDepth = node.depth || 1;
  const trustScore = trustScores[node.user_id];

  useEffect(() => {
    fetchTrust(node.user_id);
  }, [node.user_id, fetchTrust]);

  // Indent margins
  const indentClass = "pl-4 md:pl-6 border-l border-white/10 mt-3 text-left relative hover:border-blue-500/30 transition-colors";

  // Capped depth limits: Reddit-style "continue thread"
  if (currentDepth > 3) {
    return (
      <div className="pl-4 mt-2">
        <button
          onClick={() => onSubThread(node)}
          className="text-xs text-blue-400 hover:underline flex items-center gap-1.5 py-1.5 cursor-pointer font-semibold"
        >
          <CornerDownRight size={12} /> Continue this thread
        </button>
      </div>
    );
  }

  return (
    <div className={indentClass}>
      {/* Connector line overlay indicator */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">
            {getInitials(node.user_display_name)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-xs text-white/90">{node.user_display_name}</span>
              {trustScore?.is_top_contributor && (
                <span className="text-[8px] font-bold text-[#e0a527] bg-[#e0a527]/10 px-1 py-0.2 rounded">
                  Top Contributor
                </span>
              )}
            </div>
            <span 
              onClick={() => setShowFullTimestamp(!showFullTimestamp)}
              className="text-[9px] text-white/30 hover:text-white/60 cursor-pointer block select-none"
            >
              {showFullTimestamp ? new Date(node.created_at).toLocaleString() : formatRelativeTime(node.created_at)}
            </span>
          </div>
        </div>

        {currentUserId === node.user_id && (
          <button
            onClick={() => onDelete(node.id)}
            className="text-white/20 hover:text-red-400 p-1 cursor-pointer transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>

      <div className="mt-2 pl-8">
        <p className="text-white/80 text-xs md:text-[13px] leading-relaxed whitespace-pre-wrap">{node.comment}</p>
      </div>

      <div className="mt-3 pl-8 flex items-center gap-4 shrink-0">
        {/* Upvote */}
        <motion.button
          onClick={() => onUpvote(node.id)}
          whileTap={{ scale: 0.85 }}
          animate={{ scale: upvoted ? [1, 1.25, 1] : 1 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center gap-1 text-[10px] font-bold cursor-pointer transition-colors ${
            upvoted ? "text-blue-500" : "text-white/40 hover:text-white"
          }`}
        >
          <ThumbsUp size={10} fill={upvoted ? ACCENT_BLUE : "transparent"} />
          <span>{node.upvote_count || 0}</span>
        </motion.button>

        {/* Reply */}
        <motion.button
          onClick={() => onInitiateReply(node)}
          whileTap={{ scale: 0.85 }}
          className="text-[10px] font-bold text-white/40 hover:text-white cursor-pointer transition-colors"
        >
          Reply
        </motion.button>
      </div>

      {/* Render children replies */}
      {node.replies && node.replies.map((reply) => (
        <ThreadNodeComponent
          key={reply.id}
          node={reply}
          currentUserId={currentUserId}
          onUpvote={onUpvote}
          onInitiateReply={onInitiateReply}
          onDelete={onDelete}
          fetchTrust={fetchTrust}
          trustScores={trustScores}
          onSubThread={onSubThread}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Screen 4: Full screen write & rate composer overlay
// ---------------------------------------------------------------------------
function WriteReviewComposer({
  initialRating = 5,
  onSubmit,
  onClose,
}: {
  initialRating?: number;
  onSubmit: (stars: number, comment: string) => Promise<void>;
  onClose: () => void;
}) {
  const [stars, setStars] = useState(initialRating);
  const [text, setText] = useState("");
  const [helpfulToggle, setHelpfulToggle] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handlePost = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await onSubmit(stars, text);
    setSubmitting(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 220 }}
      className="fixed inset-0 z-[60] bg-[#08080A] text-white flex flex-col"
    >
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-4">
        <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white cursor-pointer">
          <X size={20} />
        </button>
        <span className="font-bold text-sm">Write a Review</span>
        <button
          onClick={handlePost}
          disabled={submitting || !text.trim()}
          className="px-4 py-1.5 rounded-full text-xs font-bold text-white bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-40 transition-colors cursor-pointer"
        >
          {submitting ? "Posting..." : "Post Review"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-5 text-left space-y-6">
        <div>
          <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider block mb-2">Tap to Rate</label>
          <InteractiveStars value={stars} onChange={setStars} />
        </div>

        <div>
          <label className="text-[11px] font-mono text-white/50 uppercase tracking-wider block mb-2">Your Review</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What did you think of this lecture? Help other students by sharing your honest feedback..."
            rows={6}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm text-white outline-none focus:border-blue-500 transition-colors resize-none"
          />
        </div>

        {/* Helpful option toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
          <div>
            <p className="text-xs font-bold">Mark as helpful to others</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Recommended reviews are boosted in sorting weight.</p>
          </div>
          <button
            type="button"
            onClick={() => setHelpfulToggle(!helpfulToggle)}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none flex items-center ${
              helpfulToggle ? "bg-[#3B82F6] justify-end" : "bg-zinc-800 justify-start"
            }`}
          >
            <motion.div layout className="w-5 h-5 rounded-full bg-white shadow" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
