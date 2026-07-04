/**
 * Application-wide constants.
 * This is the SINGLE SOURCE OF TRUTH for all magic values, keys, and mappings.
 * Do not hardcode these values in individual component or service files.
 */

// ─── Teacher → YouTube Channel ID mapping ────────────────────────────────────
// Used to resolve channel IDs for teachers whose playlists don't store channelId
// in the database (avoids a schema change).
export const TEACHER_TO_CHANNEL: Record<string, string> = {
  alakh_pandey:      'UCD16eo98AXl-9T61Xd711kQ',
  mohit_tyagi:       'UCxypqdjw-S400n162TY5cgQ',
  seep_pahuja:       'UCMBqObTSqW4kMFsB8Nqhpkg',
  sachin_rana:       'UC8Q46TByEJhMsY9V3wqIOZw',
  ashish_arora:      'UC3b3c5UhtPcNB45Smr_BeEQ',
  pranav_pundarik:   'UCf_ky0zxHBqMRFnpNEZRHHQ',
  dr_amit_gupta:     'UCd3fHkl7FbH1EZ85TbAGVRw',
  dr_rakshita_singh: 'UCWjpBuL4U7VBidbQlFB1hnA',
  akansha_karnwal:   'UC8Q46TByEJhMsY9V3wqIOZw',
  rohit_aggarwal_pw: 'UCkDb4531sPuHocFFSQE3qOQ',
};

// ─── LocalStorage Keys ────────────────────────────────────────────────────────
// Define all localStorage keys as constants to prevent typo-based bugs.
export const LS_KEYS = {
  GUEST_UID:           'biovised_guest_uid',
  GUEST_NAME:          'biovised_guest_display_name',
  GUEST_PHOTO:         'biovised_guest_photo_url',
  GUEST_EXAM:          'biovised_guest_exam_type',
  GUEST_SUBJECTS:      'biovised_guest_subjects',
  GUEST_YEAR:          'biovised_guest_appearing_year',
  GUEST_BYPASSED:      'biovised_guest_bypassed',
  ONBOARDING_EXAM:     'biovised_onboarding_exam',
  SPLASH_SHOWN:        'biovised_splash_shown',
  CACHED_TEACHERS:     'biovised_cached_teachers',
  CACHED_INSTITUTES:   'biovised_cached_institutes',
  CACHED_LECTURES:     'biovised_cached_lectures',
  CACHED_PLAYLISTS:    'biovised_cached_playlists',
  CACHED_BATCHES:      'biovised_cached_batches',
  NOTIFICATIONS:       'biovised_notifications_',  // append user.uid
} as const;

// ─── Data Defaults ────────────────────────────────────────────────────────────
// Explicit defaults for database fields. These are intentionally conservative.
export const DATA_DEFAULTS = {
  TRUST_SCORE:        null as number | null,  // never fabricate a trust score
  IS_VERIFIED:        false,                  // unset = not verified, never assume true
  EXAM_TYPES:         [] as string[],
  APPEARING_YEAR:     new Date().getFullYear().toString(),
  WATCH_HISTORY_MAX:  20,
  DB_FETCH_LIMIT:     100,
  PLAYLIST_FETCH_LIMIT: 200,
} as const;

// ─── YouTube / Media ──────────────────────────────────────────────────────────
export const YT = {
  THUMBNAIL_URL:     (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  EMBED_URL:         (videoId: string) => `https://www.youtube.com/embed/${videoId}`,
  PLAYLIST_EMBED:    (playlistId: string) => `https://www.youtube.com/embed/videoseries?list=${playlistId}`,
  WATCH_URL:         (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`,
  /** Minimum character length for a plausible real API key */
  API_KEY_MIN_LEN:   30,
} as const;

// ─── API Paths ────────────────────────────────────────────────────────────────
// Centralise all backend API paths so renaming a route is a one-line change.
export const API = {
  YOUTUBE: {
    CHANNELS:         '/api/youtube/channels',
    CHANNEL:          (id: string) => `/api/youtube/channel/${id}`,
    LECTURES:         (playlistId: string) => `/api/youtube/lectures/${playlistId}`,
    PLAYLISTS_SYNC:   '/api/youtube/playlists/sync',
    PLAYLISTS_IMPORT: '/api/youtube/playlists/import',
    ADMIN_CHANNELS:   '/api/youtube/admin-channels',
    ADMIN_PLAYLISTS:  '/api/youtube/admin-playlists',
    ADMIN_VIDEOS:     '/api/youtube/admin-videos',
    ADMIN_LOGS:       '/api/youtube/admin-logs',
  },
  TEACHERS: {
    LECTURES:         (playlistId: string) => `/api/teachers/${playlistId}/lectures`,
  },
  MODERATOR: {
    REVIEW_UNFLAG:    (id: string) => `/api/moderator/reviews/${id}/unflag`,
    REVIEW_DELETE:    (id: string) => `/api/moderator/reviews/${id}`,
  },
} as const;

// ─── Trust Score Weights ──────────────────────────────────────────────────────
// Changing trust score formula = changing these constants, not hunting inline numbers.
export const TRUST_SCORE_WEIGHTS = {
  PROFILE_COMPLETENESS:  3,
  VERIFIED_CREDENTIALS:  14,
  OFFICIAL_LINKS:        2,
  REVIEW_RELIABILITY:    40,
  CONTENT_CONSISTENCY:   1,
  COMMUNITY_ENGAGEMENT:  40,
} as const;

// ─── Price Display ────────────────────────────────────────────────────────────
/** Multiplier used to show a crossed-out "original" price vs. the discounted price. */
export const ORIGINAL_PRICE_MULTIPLIER = 1.2;

// ─── View Names ───────────────────────────────────────────────────────────────
export type ViewName =
  | 'explore'
  | 'profile'
  | 'moderator'
  | 'notifications'
  | 'search'
  | 'admin-educators'
  | 'teacher-detail';

export type ExploreTab =
  | 'home'
  | 'teachers'
  | 'playlists'
  | 'tests'
  | 'batches'
  | 'lecture'
  | 'institutes';
