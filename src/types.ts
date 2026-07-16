export type UserRole = 'user' | 'teacher' | 'institute' | 'moderator' | 'admin' | 'super_admin';

/** Shared verification status across teachers, institutes, and content. */
export type VerificationStatus = 'verified' | 'pending' | 'rejected';

// Re-export TEACHER_TO_CHANNEL from the single source of truth.
// Import directly from 'src/config/constants' for new code.
export { TEACHER_TO_CHANNEL } from './config/constants';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  examType: 'JEE' | 'NEET' | 'Both' | string;
  createdAt: string;
  updatedAt: string;
  loginType?: 'email' | 'google' | 'guest' | string;
  appearingYear?: string;
  preferredSubjects?: string[];
  watchedContent?: string[];
  savedContent?: string[];
  hiddenContent?: string[];
  likedContent?: string[];
  watchLaterContent?: string[];
  onboardingCompleted?: boolean;
}

export interface Teacher {
  id: string;
  name: string;
  bio?: string;
  specialization?: string;
  avatar_url?: string;
  social_links?: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  title?: string;
  description?: string;
  thumbnail_url?: string;
  teacher_id?: string;
  source_type?: string;
  is_active?: boolean;
  publish_date?: string;
  [key: string]: unknown;
}

export interface TeacherProfile {
  id: string;
  name: string;
  avatar: string;
  /** Primary subject e.g. "Physics", "Chemistry", "Mathematics", "Biology" */
  subject: string;
  instituteId?: string;
  instituteName?: string;
  bio: string;
  rating: number;
  reviewCount: number;
  trustScore: number | null;
  followersCount: number;
  officialLinks: string[];
  subjects: string[];
  exams: string[];
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  verificationMethod?: string[];
  kgEntityId?: string;
  verificationProvenance?: string;
  youtubeChannelId?: string;
  officialWebsite?: string | null;
  socialProfiles?: string[];
  verificationSourceIds?: string[];
  createdAt: string;
  updatedAt?: string;
  previousInstitutes?: string[];
  teachingMode?: string;
  languages?: string[];
  features?: Record<string, unknown>;
}

export interface InstituteProfile {
  id: string;
  name: string;
  logo: string;
  bannerUrl?: string;
  description: string;
  rating: number;
  reviewCount: number;
  trustScore: number;
  followersCount: number;
  officialLinks: string[];
  exams: string[];
  isVerified: boolean;
  verificationStatus?: VerificationStatus;
  verificationMethod?: string[];
  kgEntityId?: string;
  verificationProvenance?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LectureWithChannelDTO {
  id: string;
  title: string;
  thumbnailUrl: string;
  channel: {
    id: string;
    name: string;
    avatarUrl: string;
    bannerUrl: string | null;
    subscriberCountRaw: number;
    subscriberCountFormatted: string;
  };
  rating?: number | null;
  trustScore?: number | null;
  reviewCount?: number;
  scorecard?: RatingScorecard;
}

export interface RatingScorecard {
  rating: number | null;
  trustScore: number | null;
  reviewCount: number;
  positiveReviewCount: number;
  sourceEntityIds: string[];
}

export interface Lecture {
  id: string;
  title: string;
  description: string;
  /** YouTube embed URL or platform URL */
  videoUrl: string;
  thumbnailUrl: string;
  subject: string;
  examType: 'JEE' | 'NEET' | 'Both';
  contentType: 'playlist' | 'oneshot' | 'lecture';
  teacherId: string;
  teacherName: string;
  instituteId?: string;
  instituteName?: string;
  playlistId?: string;
  duration: string;
  viewsCount: number;
  likesCount: number;
  publishDate?: string;
  createdAt: string;
  youtubeVideoId?: string;
  chapter?: string | null;
  durationSec?: number;
  language?: string | null;
  source?: 'youtube' | 'platform';
  verificationStatus?: VerificationStatus;
  exams?: string[];
  rating?: number | null;
  trustScore?: number | null;
  reviewCount?: number;
  scorecard?: RatingScorecard;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId?: string;
  channelName?: string;
  lecturesCount: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  subject: string;
  examType: 'JEE' | 'NEET' | 'Both';
  examTypes?: string[];
  isActive?: boolean;
  youtubePlaylistId?: string;
  teacherId?: string;
  teacherName?: string;
  instituteId?: string;
  instituteName?: string;
  contentType?: 'playlist' | 'one_shot' | 'institute';
  showOnHome?: boolean;
  rating?: number | null;
  trustScore?: number | null;
  reviewCount?: number;
  scorecard?: RatingScorecard;
}



export interface YouTubeChannel {
  id: string; // channelId
  channelId: string;
  channelName: string;
  channelHandle: string;
  channelThumbnail: string;
  bannerUrl: string | null;
  subscriberCount: number;
  description: string;
  addedBy: string;
  addedAt: string;
  lastSynced: string;
  isActive: boolean;
  tags: string[];
  totalVideos: number;
  totalPlaylists: number;
}

export interface YouTubeVideo {
  id: string; // videoId
  videoId: string;
  playlistId: string;
  channelId: string;
  channelName: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  position: number;
  subject: string;
  topic: string;
  examTags: string[];
  chapter?: string;
  isActive: boolean;
  importedAt: string;
}

export interface YouTubeSyncLog {
  id: string;
  type: 'channel' | 'playlist' | 'video' | string;
  targetId: string;
  status: 'success' | 'failed' | 'partial' | string;
  videosImported: number;
  playlistsImported: number;
  apiUnitsUsed: number;
  error?: string;
  triggeredBy: string;
  timestamp: string;
}

export interface IngestionLog {
  id: string;
  taskType: 'FetchPlaylists' | 'FetchPlaylistVideos' | 'VerifyTeacher';
  targetId: string;
  status: 'pending' | 'completed' | 'failed';
  attempts: number;
  startedAt: string;
  endedAt: string | null;
  error: string | null;
}

export interface IngestionControl {
  id: string;
  phase: number;
  playlistsImported: number;
  lecturesImported: number;
  approved: boolean;
  nextPhaseStart: string | null;
}

export interface BatchSubject {
  id: string;
  batchId: string;
  subject: string;
  teacherId: string | null;
  teacherName: string | null;
  playlistId: string | null;
  playlistTitle: string | null;
  examType: 'JEE' | 'NEET' | 'Both';
  sortOrder: number;
  createdAt: string;
  rating?: number | null;
  trustScore?: number | null;
  reviewCount?: number;
  scorecard?: RatingScorecard;
  lectureCount?: number;
  lectures?: Lecture[];
}

export interface Batch {
  id: string;
  name: string;
  description: string;
  examType: 'JEE' | 'NEET' | 'Both' | string;
  channelName: string;
  isActive: boolean;
  price?: number;
  createdAt: string;
  imageUrl?: string;
  // Legacy / DetailsModal-compat fields
  instituteId?: string;
  instituteName?: string;
  teachers?: string[];
  subject?: string;
  startDate?: string;
  endDate?: string;
  discountCode?: string;
  couponCode?: string;
  link?: string;
  verified?: boolean;
  rating?: number;
  trustScore?: number;
  reviewCount?: number;
  scorecard?: RatingScorecard;
  totalLectureCount?: number;
  // Hydrated subjects (populated by fetchBatchSubjects)
  subjects?: BatchSubject[];
}

export interface Review {
  id: string;
  userId: string;
  userDisplayName: string;
  targetId: string; // Teacher ID or Institute ID
  targetType: 'teacher' | 'institute' | 'testSeries' | 'video' | 'playlist' | 'batch';
  rating: number;
  comment: string;
  trustImpact: number;
  isVerifiedStudent: boolean;
  createdAt: string;
  // Phase 4 additions:
  lectureRef?: string;
  teacherRef?: string | null;
  source?: 'youtube' | 'platform';
  sourceCommentId?: string | null;
  userIdOrHandle?: string;
  text?: string;
  flagged?: boolean;
}

export interface EntityTrustScoreBreakdown {
  entityId: string;
  profileCompleteness: number; // 0-3 (3% max)
  verifiedCredentials: number; // 0-14 (Student Completion 14% max)
  officialLinksScore: number;  // 0-2 (Official Instructor Link 2% max)
  reviewReliability: number;   // 0-40 (Verified Student Reviews 40% max)
  contentConsistency: number;  // 0-1 (Content Consistency 1% max)
  communityEngagement: number; // 0-40 (Community Engagement 40% max)
  totalScore: number;          // Cumulative 0-100
  updatedAt: string;
  partial?: boolean;
}

export interface WatchHistoryItem {
  id: string;
  userId: string;
  lectureId: string;
  lectureTitle: string;
  thumbnailUrl: string;
  progressSeconds: number;
  durationString: string;
  completed: boolean;
  updatedAt: string;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterName: string;
  targetId: string; // ID of the offensive post, user, review, etc.
  targetType: 'teacher' | 'institute' | 'review' | 'lecture';
  reason: string;
  details: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolution?: string;
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'system' | 'follow' | 'video' | 'review';
  senderId?: string;
  senderName?: string;
  read: boolean;
  createdAt: string;
}

export type ExamTag = "NEET" | "JEE Main" | "JEE Advanced" | "CUET";

export interface ReviewSnippet {
  text: string;          // <=15 words, paraphrased in your own words — never copy-paste
  author?: string;        // first name/initial only if shown publicly
  source: string;          // e.g. "Google Reviews", "Play Store", "Justdial"
  sourceUrl: string;
  date?: string;           // ISO date if shown
}

export interface TrustScoreBreakdown {
  ratingScore: number;       // 0-40
  reviewVolumeScore: number; // 0-25
  longevityScore: number;    // 0-15
  transparencyScore: number; // 0-10
  sourceDiversityScore: number; // 0-10
  total: number;             // sum, 0-100
}

export interface TestSeriesEntry {
  id: string;                 // slug, e.g. "allen-aiats-offline"
  name: string;                // exact product name
  provider: string;            // parent brand
  type: "online" | "offline";
  examTags: ExamTag[];
  shortDescription: string;    // <=20 words, plain language
  longDescription: string;     // 3-4 sentences, plain language
  testFormat: "OMR" | "Online Proctored" | "App-based" | "Hybrid";
  testCount: number | null;
  syllabusCoverage: string[];
  validity: string | null;
  price: { amount: number; currency: "INR"; unit?: string } | "free" | "bundled" | null;
  languages: string[];
  features: string[];          // e.g. ["All India Rank", "Video Solutions"]
  bannerUrl: string | null;
  thumbnailUrl: string | null;
  logo: string | null;
  imageSourceUrl: string | null;
  officialUrl: string;
  sourceUrl?: string;
  locations?: string[];        // offline only
  rating: number | null;       // 0-5
  reviewCount: number | null;
  reviews: ReviewSnippet[];     // 0-3
  trustScore: number | null;    // 0-100
  trustScoreBreakdown: TrustScoreBreakdown | null;
  verifiedDate: string;          // ISO date research was done
  needsManualVerification: boolean;
  verificationNotes?: string;

  // Compatibility fields
  delivery?: "online" | "offline";
  examType?: string;
  examsCovered?: string[];
  oneLineDescription?: string;
  description?: string;
  isVerified?: boolean;
  officialLinks?: string[];
  centers?: string[];
  subjects?: string[];
  dateChecked?: string;
}

export type TestSeries = TestSeriesEntry;
export type TestSeriesReview = ReviewSnippet;
