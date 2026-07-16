import { supabase } from '../utils/supabaseClient';
import {
  TeacherProfile,
  InstituteProfile,
  Lecture,
  Playlist,
  Batch,
  BatchSubject,
  Review,
  EntityTrustScoreBreakdown as TrustScoreBreakdown,
  WatchHistoryItem,
  ModerationReport,
  AppNotification,
  UserProfile,
  IngestionLog,
  IngestionControl,
  YouTubeChannel,
  YouTubeVideo,
  YouTubeSyncLog,
  TEACHER_TO_CHANNEL,
  RatingScorecard
} from '../types';
import { DATA_DEFAULTS } from '../config/constants';

// ─── Utility ──────────────────────────────────────────────────────────────────
/** True if this error is a Supabase placeholder/offline error that should be silent. */
function isIgnorableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('Invalid API key') || msg.includes('placeholder');
}

// ─── Row mappers ─────────────────────────────────────────────────────────────
// Each mapper converts a raw Supabase DB row into a typed frontend model.
// Extract once here — do NOT copy-paste these in component files.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTeacherRow(t: Record<string, any>): TeacherProfile {
  const feat = t.features || {};
  return {
    id: t.id,
    name: t.name || '',
    avatar: t.avatar || '',
    subject: t.subject || '',
    subjects: Array.isArray(t.subjects) ? t.subjects : [t.subject].filter(Boolean),
    rating: Number(t.rating) || 0,
    reviewCount: Number(feat.reviewCount) || 0,
    // Never fabricate a trust score — null means "not enough data"
    trustScore: feat.trustScore != null ? Number(feat.trustScore) : DATA_DEFAULTS.TRUST_SCORE,
    followersCount: t.followers_count || 0,
    officialLinks: Array.isArray(feat.officialLinks) ? feat.officialLinks : [],
    bio: t.bio || '',
    exams: Array.isArray(t.exams) ? t.exams : DATA_DEFAULTS.EXAM_TYPES,
    // Default to false — unset DB value means NOT verified
    isVerified: t.is_verified ?? DATA_DEFAULTS.IS_VERIFIED,
    createdAt: t.created_at || new Date().toISOString(),
    verificationStatus: feat.verificationStatus,
    verificationMethod: feat.verificationMethod || [],
    kgEntityId: feat.kgEntityId || '',
    verificationProvenance: feat.verificationProvenance || '',
    youtubeChannelId: feat.youtubeChannelId || '',
    officialWebsite: feat.officialWebsite ?? null,
    socialProfiles: feat.socialProfiles || [],
    verificationSourceIds: feat.verificationSourceIds || [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInstituteRow(inst: Record<string, any>): InstituteProfile {
  return {
    id: inst.id,
    name: inst.name || '',
    logo: inst.logo || '',
    description: inst.description || '',
    rating: Number(inst.rating) || 0,
    reviewCount: inst.review_count || 0,
    trustScore: inst.trust_score ?? DATA_DEFAULTS.TRUST_SCORE ?? 0,
    followersCount: inst.followers_count || 0,
    officialLinks: inst.official_links || [],
    exams: inst.exams || DATA_DEFAULTS.EXAM_TYPES,
    isVerified: inst.is_verified ?? DATA_DEFAULTS.IS_VERIFIED,
    createdAt: inst.created_at || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReviewRow(r: Record<string, any>): Review {
  const feat = r.features || {};
  return {
    id: r.id,
    targetId: r.entity_id,
    targetType: r.entity_type as any,
    userId: r.user_id,
    userDisplayName: r.user_display_name || 'Anonymous Student',
    rating: Number(r.rating) || 5.0,
    comment: r.comment || '',
    flagged: r.is_flagged || false,
    trustImpact: Number(feat.trustImpact) || 0,
    isVerifiedStudent: Boolean(feat.isVerifiedStudent) || false,
    lectureRef: feat.lectureRef || '',
    teacherRef: feat.teacherRef || null,
    source: feat.source || 'platform',
    sourceCommentId: feat.sourceCommentId || null,
    userIdOrHandle: feat.userIdOrHandle || '',
    text: feat.text || r.comment || '',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

// Helper to get active user ID from Supabase
async function getUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch (error) {
    console.error('Error fetching session from Supabase:', error);
    return null;
  }
}

// USERS SERVICE
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('uid, email, display_name, role, exam_type, appearing_year, preferred_subjects, watched_content, saved_content, hidden_content, liked_content, onboarding_completed, login_type, created_at, updated_at')
      .eq('uid', uid)
      .single();
    if (error) {
      if (!isIgnorableError(error)) {
        console.warn('Supabase profile query returned error or empty:', error.message);
      }
      return null;
    }
    if (data) {
      return {
        uid: data.uid,
        email: data.email,
        displayName: data.display_name,
        role: data.role,
        examType: data.exam_type,
        appearingYear: data.appearing_year,
        preferredSubjects: data.preferred_subjects || [],
        watchedContent: data.watched_content || [],
        savedContent: data.saved_content || [],
        hiddenContent: data.hidden_content || [],
        likedContent: data.liked_content || [],
        onboardingCompleted: data.onboarding_completed || false,
        loginType: data.login_type,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as UserProfile;
    }
    return null;
  } catch (error: unknown) {
    if (!isIgnorableError(error)) {
      console.error('Error fetching profile from Supabase:', error);
    }
    return null;
  }
}

export async function createUserProfile(profile: Partial<UserProfile>): Promise<void> {
  if (!profile.uid) return;
  try {
    const now = new Date().toISOString();
    // SECURITY: Client-side profile creation always uses role='user'.
    // Privileged roles can only be granted via service-role / dashboard, never from the SPA.
    const dbProfile = {
      uid: profile.uid,
      email: profile.email || '',
      display_name: profile.displayName || 'Guest User',
      role: 'user',
      exam_type: profile.examType || 'Both',
      appearing_year: profile.appearingYear || DATA_DEFAULTS.APPEARING_YEAR,
      preferred_subjects: profile.preferredSubjects || [],
      watched_content: profile.watchedContent || [],
      saved_content: profile.savedContent || [],
      hidden_content: profile.hiddenContent || [],
      liked_content: profile.likedContent || [],
      onboarding_completed: profile.onboardingCompleted || false,
      login_type: profile.loginType || 'email',
      created_at: now,
      updated_at: now,
    };
    // Use insert-only when possible; avoid upsert overwriting an admin role with 'user'.
    const { data: existing } = await supabase
      .from('profiles')
      .select('uid')
      .eq('uid', profile.uid)
      .maybeSingle();

    if (existing) {
      // Profile already exists — do not overwrite role or core identity fields
      return;
    }

    const { error } = await supabase.from('profiles').insert(dbProfile);
    if (error && !isIgnorableError(error)) {
      console.error('Error creating profile in Supabase:', error);
    }
  } catch (error: unknown) {
    if (!isIgnorableError(error)) {
      console.error('Error creating profile in Supabase:', error);
    }
  }
}

export async function updateUserExamPreference(uid: string, examType: 'JEE' | 'NEET' | 'Both' | string): Promise<void> {
  try {
    const { error } = await supabase.from('profiles').update({
      exam_type: examType,
      updated_at: new Date().toISOString(),
    }).eq('uid', uid);
    if (error && !isIgnorableError(error)) console.error('Error updating exam pref:', error);
  } catch (error: unknown) {
    if (!isIgnorableError(error)) console.error('Error updating exam pref:', error);
  }
}

export async function updateUserPreferences(uid: string, preferences: Partial<UserProfile>): Promise<void> {
  try {
    // Allowlist only safe preference fields — never role, uid, email, created_at
    const dbPayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (preferences.displayName !== undefined)       dbPayload.display_name = preferences.displayName;
    if (preferences.examType !== undefined)           dbPayload.exam_type = preferences.examType;
    if (preferences.appearingYear !== undefined)      dbPayload.appearing_year = preferences.appearingYear;
    if (preferences.preferredSubjects !== undefined)  dbPayload.preferred_subjects = preferences.preferredSubjects;
    if (preferences.watchedContent !== undefined)     dbPayload.watched_content = preferences.watchedContent;
    if (preferences.savedContent !== undefined)       dbPayload.saved_content = preferences.savedContent;
    if (preferences.hiddenContent !== undefined)      dbPayload.hidden_content = preferences.hiddenContent;
    if (preferences.likedContent !== undefined)       dbPayload.liked_content = preferences.likedContent;
    if (preferences.onboardingCompleted !== undefined) dbPayload.onboarding_completed = preferences.onboardingCompleted;
    // Explicitly strip privilege / identity fields if present on Partial
    delete (dbPayload as Record<string, unknown>).role;
    delete (dbPayload as Record<string, unknown>).uid;
    delete (dbPayload as Record<string, unknown>).email;

    const { error } = await supabase.from('profiles').update(dbPayload).eq('uid', uid);
    if (error && !isIgnorableError(error)) console.error('Error updating preferences:', error);
  } catch (error: unknown) {
    if (!isIgnorableError(error)) console.error('Error updating preferences:', error);
  }
}

// TEACHERS SERVICE
export async function fetchTeachers(filters?: {
  subject?: string;
  examType?: string;
  minTrustScore?: number;
  minRating?: number;
}): Promise<TeacherProfile[]> {
  try {
    // Build server-side filters where possible to avoid full-table scans
    let query = supabase.from('teachers').select('*');
    if (filters?.subject && filters.subject !== 'All') {
      query = query.eq('subject', filters.subject);
    }
    const { data, error } = await query;
    if (error) throw error;

    let teachers = (data || []).map(mapTeacherRow);

    // Client-side filters for fields not easily queryable server-side
    if (filters?.examType && filters.examType !== 'All') {
      teachers = teachers.filter(t => t.exams?.includes(filters.examType!));
    }
    if (filters?.minTrustScore) {
      teachers = teachers.filter(t => (t.trustScore ?? 0) >= filters.minTrustScore!);
    }
    if (filters?.minRating) {
      teachers = teachers.filter(t => t.rating >= filters.minRating!);
    }
    return teachers;
  } catch (error: unknown) {
    if (!isIgnorableError(error)) console.error('Supabase fetchTeachers error:', error);
    return [];
  }
}

export async function fetchTeacherById(id: string): Promise<TeacherProfile | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase.from('teachers').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return null;
    return mapTeacherRow(data);
  } catch (error: unknown) {
    if (!isIgnorableError(error)) console.error(`Supabase fetchTeacherById error [${id}]:`, error);
    return null;
  }
}

// INSTITUTES SERVICE
export async function fetchInstitutes(): Promise<InstituteProfile[]> {
  try {
    const { data, error } = await supabase.from('institutes').select('*');
    if (error) throw error;
    return (data || []).map(mapInstituteRow);
  } catch (error: unknown) {
    if (!isIgnorableError(error)) console.error('Supabase fetchInstitutes error:', error);
    return [];
  }
}

export async function fetchInstituteById(id: string): Promise<InstituteProfile | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase.from('institutes').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return null;
    return mapInstituteRow(data);
  } catch (error: unknown) {
    if (!isIgnorableError(error)) console.error(`Supabase fetchInstituteById error [${id}]:`, error);
    return null;
  }
}

// LECTURES SERVICE
const STRATEGY_KEYWORDS = [
  'strategy', 'strategies', 'motivation', 'motivational', 
  'how to crack', 'how to clear', 'preparation tips', 'tips & tricks',
  'tips and tricks', 'roadmap', 'last minute', 'study plan', 
  'cut-off', 'cutoff', 'marks vs rank', 'rank predictor', 'secrets of success',
  'jee strategy', 'neet strategy', 'preparation guide', 'timetable', 'time table',
  'leak', 'leaked', 'shocking', 'exposed', 'scam', 'do not miss', 'must watch',
  'guaranteed marks', 'cheat codes', 'cheat code', 'fail', 'crying',
  'emotional', 'sorry', 'insane', 'magic', 'magical', 'giveaway', 'surprise',
  'short', 'shorts', 'reel', 'reels', 'clip', 'clips', 'tiktok'
];

export function isStrategyOrHypeContent(title: string): boolean {
  if (!title) return false;
  const tLower = title.toLowerCase();
  return STRATEGY_KEYWORDS.some(keyword => tLower.includes(keyword));
}

export function isDurationBelow30Minutes(durationStr: string): boolean {
  if (!durationStr) return true;
  const dLower = durationStr.toLowerCase().trim();
  
  if (dLower.startsWith('pt')) {
    let minutes = 0;
    const hourMatch = dLower.match(/(\d+)\s*h/);
    if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;
    const minMatch = dLower.match(/(\d+)\s*m/);
    if (minMatch) minutes += parseInt(minMatch[1], 10);
    return minutes < 30;
  }

  let totalMinutes = 0;
  const hourMatch = dLower.match(/(\d+)\s*h/);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }
  
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
      if (!isNaN(numericOnly)) {
        totalMinutes = numericOnly;
      }
    }
  }
  return totalMinutes < 30;
}

export async function fetchLectures(filters?: {
  subject?: string;
  examType?: string;
  contentType?: 'lecture' | 'oneshot' | 'playlist';
  teacherId?: string;
  instituteId?: string;
  includeUnverified?: boolean;
}): Promise<Lecture[]> {
  try {
    // Apply server-side filters where possible
    let query = supabase.from('videos').select('*').limit(DATA_DEFAULTS.DB_FETCH_LIMIT);
    if (filters?.teacherId) query = query.eq('teacher_id', filters.teacherId);
    if (filters?.instituteId) query = query.eq('institute_id', filters.instituteId);
    if (filters?.subject && filters.subject !== 'All') query = query.eq('subject', filters.subject);
    const { data, error } = await query;
    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lectures = (data || []).map((v: Record<string, any>) => ({
      id: v.id,
      title: v.title || '',
      description: v.description || '',
      videoUrl: v.video_url || '',
      thumbnailUrl: v.thumbnail_url || '',
      subject: v.subject || '',
      examType: v.exam_type || 'Both',
      contentType: v.content_type || 'lecture',
      teacherId: v.teacher_id || '',
      teacherName: v.teacher_name || '',
      instituteId: v.institute_id || '',
      instituteName: v.institute_name || '',
      playlistId: v.playlist_id || '',
      duration: v.duration || '',
      viewsCount: v.views || 0,
      likesCount: v.likes_count || 0,
      publishDate: v.publish_date,
      createdAt: v.created_at || new Date().toISOString(),
    } as Lecture));

    // Quality filters
    lectures = lectures.filter(l =>
      l.thumbnailUrl &&
      l.thumbnailUrl.trim() !== '' &&
      !isDurationBelow30Minutes(l.duration) &&
      !isStrategyOrHypeContent(l.title)
    );

    if (filters?.examType && filters.examType !== 'All') {
      lectures = lectures.filter(l => l.examType === filters.examType || l.examType === 'Both');
    }
    if (filters?.contentType) {
      // Fix: 'lecture' filter should NOT include 'playlist' content
      lectures = lectures.filter(l => l.contentType === filters.contentType);
    }
    return lectures;
  } catch (error: unknown) {
    if (!isIgnorableError(error)) console.error('Supabase fetchLectures error:', error);
    return [];
  }
}

// PLAYLISTS SERVICE
export async function fetchPlaylists(filters?: {
  subject?: string;
  examType?: string;
  teacherId?: string;
}): Promise<Playlist[]> {
  try {
    const { data, error } = await supabase.from('playlists').select('*').gt('lectures_count', 0);
    if (error) throw error;
    
    let playlists = (data || []).map((p: any) => {
      const titleLower = (p.title || '').toLowerCase();
      let resolvedContentType = p.content_type || 'playlist';
      if (!p.content_type) {
        if (titleLower.includes('one shot') || titleLower.includes('oneshot') || titleLower.includes('complete revision')) {
          resolvedContentType = 'one_shot';
        } else if (titleLower.includes('allen') || titleLower.includes('pw') || titleLower.includes('unacademy') || titleLower.includes('competishun')) {
          resolvedContentType = 'institute';
        }
      }
      const resolvedShowOnHome = p.show_on_home !== undefined ? p.show_on_home : true;

      return {
        id: p.id,
        title: p.title || '',
        description: p.description || '',
        thumbnailUrl: p.thumbnail || '',
        lecturesCount: p.lectures_count || 0,
        subject: p.category || '',
        examType: p.exam_type || 'Both',
        teacherId: p.teacher_id || '',
        createdAt: p.created_at || new Date().toISOString(),
        contentType: resolvedContentType,
        showOnHome: resolvedShowOnHome
      } as Playlist;
    });

    if (filters) {
      if (filters.subject && filters.subject !== 'All') {
        playlists = playlists.filter(p => p.subject === filters.subject);
      }
      if (filters.examType && filters.examType !== 'All') {
        playlists = playlists.filter(p => p.examType === filters.examType || p.examType === 'Both');
      }
      if (filters.teacherId) {
        playlists = playlists.filter(p => p.teacherId === filters.teacherId);
      }
    }
    return playlists;
  } catch (error) {
    console.error('Supabase fetchPlaylists error:', error);
    return [];
  }
}

export async function fetchPlaylistById(id: string): Promise<Playlist | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase.from('playlists').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) return null;
    return {
      id: data.id,
      title: data.title || '',
      description: data.description || '',
      thumbnailUrl: data.thumbnail || '',
      lecturesCount: data.lectures_count || 0,
      subject: data.category || '',
      examType: data.exam_type || 'Both',
      teacherId: data.teacher_id || '',
      createdAt: data.created_at || new Date().toISOString()
    };
  } catch (error) {
    console.error(`Supabase fetchPlaylistById error [${id}]:`, error);
    return null;
  }
}

// BATCHES SERVICE
export async function fetchBatches(instituteId?: string): Promise<Batch[]> {
  try {
    let query = supabase.from('batches').select('*').eq('is_active', true);
    if (instituteId) {
      query = query.eq('institute_id', instituteId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((b: any) => {
      const feat = b.features || {};
      return {
        id: b.id,
        name: b.name || '',
        description: b.description || feat.description || '',
        channelName: b.channel_name || feat.channelName || '',
        examType: (b.exam_type || feat.examType || 'Both') as 'JEE' | 'NEET' | 'Both',
        isActive: b.is_active !== false,
        price: Number(b.price) || 0,
        imageUrl: b.image_url || feat.imageUrl || '',
        createdAt: b.created_at || new Date().toISOString(),
        // Legacy compat
        instituteId: b.institute_id || '',
        instituteName: b.institute_name || '',
        teachers: Array.isArray(feat.teachers) ? feat.teachers : (b.teacher_name ? [b.teacher_name] : []),
        subject: b.subject || '',
        startDate: feat.startDate || b.created_at || new Date().toISOString(),
        endDate: feat.endDate || b.created_at || new Date().toISOString(),
        couponCode: feat.couponCode || '',
        link: feat.link || '',
        verified: feat.verified || false,
      } as Batch;
    });
  } catch (error) {
    console.error('Supabase fetchBatches error:', error);
    return [];
  }
}

export async function fetchBatchSubjects(batchId: string): Promise<BatchSubject[]> {
  try {
    const { data, error } = await supabase
      .from('batch_subjects')
      .select('*')
      .eq('batch_id', batchId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      batchId: row.batch_id,
      subject: row.subject,
      teacherId: row.teacher_id || null,
      teacherName: row.teacher_name || null,
      playlistId: row.playlist_id || null,
      playlistTitle: row.playlist_title || null,
      examType: (row.exam_type || 'Both') as 'JEE' | 'NEET' | 'Both',
      sortOrder: row.sort_order || 0,
      createdAt: row.created_at || new Date().toISOString(),
    } as BatchSubject));
  } catch (error) {
    console.error(`Supabase fetchBatchSubjects error [${batchId}]:`, error);
    return [];
  }
}

export async function fetchBatchById(id: string): Promise<Batch | null> {
  if (!id) return null;
  try {
    const { data, error } = await supabase.from('batches').select('*').eq('id', id);
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;
    const feat = row.features || {};
    return {
      id: row.id,
      name: row.name || '',
      description: row.description || feat.description || '',
      channelName: row.channel_name || feat.channelName || '',
      examType: (row.exam_type || feat.examType || 'Both') as 'JEE' | 'NEET' | 'Both',
      isActive: row.is_active !== false,
      price: Number(row.price) || 0,
      imageUrl: row.image_url || feat.imageUrl || '',
      createdAt: row.created_at || new Date().toISOString(),
      // Legacy compat
      instituteId: row.institute_id || '',
      instituteName: row.institute_name || '',
      teachers: Array.isArray(feat.teachers) ? feat.teachers : (row.teacher_name ? [row.teacher_name] : []),
      subject: row.subject || '',
      startDate: feat.startDate || row.created_at || new Date().toISOString(),
      endDate: feat.endDate || row.created_at || new Date().toISOString(),
      couponCode: feat.couponCode || '',
      link: feat.link || '',
      verified: feat.verified || false,
    } as Batch;
  } catch (error) {
    console.error(`Supabase fetchBatchById error [${id}]:`, error);
    return null;
  }
}


// REVIEWS & TRUST SCORE SERVICE
export async function fetchReviews(targetId: string): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('entity_id', targetId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapReviewRow);
  } catch (error) {
    console.error(`Supabase fetchReviews error [${targetId}]:`, error);
    return [];
  }
}

export async function submitReview(reviewData: Omit<Review, 'id' | 'createdAt' | 'userId' | 'userDisplayName'> & { 
  lectureId?: string 
}): Promise<void> {
  try {
    const uid = await getUserId();
    if (!uid) return;
    
    // Get profile display name
    const profile = await fetchUserProfile(uid);
    const displayName = profile?.displayName || 'Pupil';

    const id = `review_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const reviewRecord = {
      id,
      entity_id: reviewData.targetId,
      entity_type: reviewData.targetType,
      user_id: uid,
      user_display_name: displayName,
      rating: reviewData.rating,
      comment: reviewData.comment || '',
      is_flagged: false,
      features: {
        trustImpact: reviewData.trustImpact || 0,
        isVerifiedStudent: reviewData.isVerifiedStudent || false,
        lectureRef: reviewData.lectureRef || reviewData.lectureId || '',
        teacherRef: reviewData.teacherRef || null,
        source: reviewData.source || 'platform',
        sourceCommentId: reviewData.sourceCommentId || null,
        userIdOrHandle: reviewData.userIdOrHandle || '',
        text: reviewData.text || reviewData.comment || ''
      },
      created_at: new Date().toISOString()
    };
    await supabase.from('reviews').insert(reviewRecord);
  } catch (error) {
    console.error('Supabase submitReview error:', error);
  }
}

export async function unflagReview(reviewId: string): Promise<void> {
  try {
    await supabase.from('reviews').update({ is_flagged: false }).eq('id', reviewId);
  } catch (error) {
    console.error('Supabase unflagReview error:', error);
  }
}

export async function deleteReview(reviewId: string): Promise<void> {
  try {
    await supabase.from('reviews').delete().eq('id', reviewId);
  } catch (error) {
    console.error('Supabase deleteReview error:', error);
  }
}

export async function fetchFlaggedReviews(): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('is_flagged', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(mapReviewRow);
  } catch (error) {
    console.error('Supabase fetchFlaggedReviews error:', error);
    return [];
  }
}

export async function fetchTrustScore(entityId: string): Promise<TrustScoreBreakdown | null> {
  try {
    const reviews = await fetchReviews(entityId);
    
    let isVerified = false;
    let hasOfficialLinks = false;
    let hasBioOrDesc = false;
    let hasAvatarOrLogo = false;

    const { data: teacherData } = await supabase
      .from('teachers')
      .select('is_verified, bio, avatar, features')
      .eq('id', entityId)
      .maybeSingle();

    if (teacherData) {
      isVerified = !!teacherData.is_verified;
      hasOfficialLinks = Array.isArray(teacherData.features?.officialLinks) && teacherData.features.officialLinks.length > 0;
      hasBioOrDesc = !!teacherData.bio;
      hasAvatarOrLogo = !!teacherData.avatar;
    } else {
      const { data: instData } = await supabase
        .from('institutes')
        .select('is_verified, description, logo, official_links, features')
        .eq('id', entityId)
        .maybeSingle();
      if (instData) {
        isVerified = !!instData.is_verified;
        hasOfficialLinks = (Array.isArray(instData.official_links) && instData.official_links.length > 0) || (instData.features && Array.isArray(instData.features.officialLinks) && instData.features.officialLinks.length > 0);
        hasBioOrDesc = !!instData.description;
        hasAvatarOrLogo = !!instData.logo;
      }
    }

    const profileCompleteness = (hasBioOrDesc ? 1 : 0) + (hasAvatarOrLogo ? 1 : 0) + 1; // 1 to 3
    const verifiedCredentials = isVerified ? 14 : 4; // 14 max
    const officialLinksScore = hasOfficialLinks ? 2 : 0; // 2 max
    
    const reviewReliability = Math.min(40, 10 + reviews.length * 3);
    const contentConsistency = 1; // 1 max
    
    const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) : 4.5;
    const communityEngagement = Math.min(40, Math.floor(avgRating * 8));

    const totalScore = profileCompleteness + verifiedCredentials + officialLinksScore + reviewReliability + contentConsistency + communityEngagement;

    return {
      entityId,
      profileCompleteness,
      verifiedCredentials,
      officialLinksScore,
      reviewReliability,
      contentConsistency,
      communityEngagement,
      totalScore: Math.min(100, totalScore),
      updatedAt: new Date().toISOString()
    } as any;
  } catch (error) {
    console.error('Supabase fetchTrustScore error:', error);
    return null;
  }
}

export async function recalibrateTrustScore(entityId: string, entityType: 'teacher' | 'institute'): Promise<TrustScoreBreakdown> {
  const scoreBreakdown = await fetchTrustScore(entityId);
  const finalScore = scoreBreakdown?.totalScore || 90;
  try {
    if (entityType === 'teacher') {
      const { data: existing } = await supabase.from('teachers').select('features').eq('id', entityId).maybeSingle();
      const feat = existing?.features || {};
      const newFeat = { ...feat, trustScore: finalScore };
      await supabase.from('teachers').update({ features: newFeat }).eq('id', entityId);
    } else {
      const { data: existing } = await supabase.from('institutes').select('features').eq('id', entityId).maybeSingle();
      const feat = existing?.features || {};
      const newFeat = { ...feat, trustScore: finalScore };
      await supabase.from('institutes').update({ features: newFeat }).eq('id', entityId);
    }
  } catch (err) {
    console.error('Failed to update entity trustScore:', err);
  }
  return scoreBreakdown || {
    entityId,
    profileCompleteness: 3,
    verifiedCredentials: 14,
    officialLinksScore: 2,
    reviewReliability: 35,
    contentConsistency: 1,
    communityEngagement: 35,
    totalScore: 90,
    updatedAt: new Date().toISOString()
  } as any;
}

// FOLLOWING SERVICE
export async function toggleFollow(entityId: string, entityName: string, entityAvatar: string, isFollowing: boolean): Promise<void> {
  try {
    const uid = await getUserId();
    if (!uid) return;
    
    // Retrieve profile to update preferred_subjects or a following list
    const { data: profileData, error: profileError } = await supabase.from('profiles').select('preferred_subjects').eq('uid', uid).single();
    if (profileError) throw profileError;

    let subjects = profileData.preferred_subjects || [];
    if (isFollowing) {
      subjects = subjects.filter((id: string) => id !== entityId);
    } else {
      if (!subjects.includes(entityId)) {
        subjects.push(entityId);
      }
    }
    await supabase.from('profiles').update({ preferred_subjects: subjects }).eq('uid', uid);

    // Synchronize followers_count in the teachers table
    const { data: teacherData } = await supabase.from('teachers').select('followers_count').eq('id', entityId).maybeSingle();
    if (teacherData) {
      const currentFollowers = teacherData.followers_count || 0;
      const newFollowers = isFollowing ? Math.max(0, currentFollowers - 1) : currentFollowers + 1;
      await supabase.from('teachers').update({ followers_count: newFollowers }).eq('id', entityId);
    }

    // Synchronize relation inside the teacher_followers table
    try {
      if (isFollowing) {
        await supabase.from('teacher_followers').delete().eq('teacher_id', entityId).eq('user_id', uid);
      } else {
        await supabase.from('teacher_followers').insert({ teacher_id: entityId, user_id: uid });
      }
    } catch (tblErr) {
      console.warn('[teacher_followers update failed]:', tblErr);
    }
  } catch (error) {
    console.error('Supabase toggleFollow error:', error);
  }
}

export async function fetchFollowingList(): Promise<string[]> {
  try {
    const uid = await getUserId();
    if (!uid) return [];
    const { data, error } = await supabase.from('profiles').select('preferred_subjects').eq('uid', uid).single();
    if (error) throw error;
    return data?.preferred_subjects || [];
  } catch (error) {
    console.error('Supabase fetchFollowingList error:', error);
    return [];
  }
}

// WATCH LATER (SAVED) SERVICE
export async function toggleWatchLater(lecture: Lecture, isBookmarked: boolean): Promise<void> {
  try {
    const uid = await getUserId();
    if (!uid) return;
    const { data, error } = await supabase.from('profiles').select('saved_content').eq('uid', uid).single();
    if (error) throw error;
    let saved = data?.saved_content || [];
    if (isBookmarked) {
      saved = saved.filter((id: string) => id !== lecture.id);
    } else {
      if (!saved.includes(lecture.id)) {
        saved.push(lecture.id);
      }
    }
    await supabase.from('profiles').update({ saved_content: saved }).eq('uid', uid);
  } catch (error) {
    console.error('Supabase toggleWatchLater error:', error);
  }
}

export async function fetchWatchLaterIds(): Promise<string[]> {
  try {
    const uid = await getUserId();
    if (!uid) return [];
    const { data, error } = await supabase.from('profiles').select('saved_content').eq('uid', uid).single();
    if (error) throw error;
    return data?.saved_content || [];
  } catch (error) {
    console.error('Supabase fetchWatchLaterIds error:', error);
    return [];
  }
}

export async function fetchWatchLaterLectures(): Promise<Lecture[]> {
  try {
    const ids = await fetchWatchLaterIds();
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from('videos').select('*').in('id', ids);
    if (error) throw error;
    return (data || []).map((v: any) => ({
      id: v.id,
      title: v.title || '',
      description: v.description || '',
      videoUrl: v.video_url || '',
      thumbnailUrl: v.thumbnail_url || '',
      subject: v.subject || '',
      examType: v.exam_type || 'Both',
      contentType: v.content_type || 'lecture',
      teacherId: v.teacher_id || '',
      teacherName: v.teacher_name || '',
      instituteId: v.institute_id || '',
      instituteName: v.institute_name || '',
      playlistId: v.playlist_id || '',
      duration: v.duration || '',
      viewsCount: v.views || 0,
      likesCount: v.likes_count || 0,
      publishDate: v.publish_date,
      createdAt: v.created_at || new Date().toISOString()
    } as Lecture));
  } catch (error) {
    console.error('Supabase fetchWatchLaterLectures error:', error);
    return [];
  }
}

// LIKED LECTURES SERVICE
export async function toggleLikeVideo(lecture: Lecture, isLiked: boolean): Promise<void> {
  try {
    const uid = await getUserId();
    if (!uid) return;
    const { data, error } = await supabase.from('profiles').select('liked_content').eq('uid', uid).single();
    if (error) throw error;
    let liked = data?.liked_content || [];
    if (isLiked) {
      liked = liked.filter((id: string) => id !== lecture.id);
    } else {
      if (!liked.includes(lecture.id)) {
        liked.push(lecture.id);
      }
    }
    await supabase.from('profiles').update({ liked_content: liked }).eq('uid', uid);
  } catch (error) {
    console.error('Supabase toggleLikeVideo error:', error);
  }
}

export async function fetchLikedLecturesIds(): Promise<string[]> {
  try {
    const uid = await getUserId();
    if (!uid) return [];
    const { data, error } = await supabase.from('profiles').select('liked_content').eq('uid', uid).single();
    if (error) throw error;
    return data?.liked_content || [];
  } catch (error) {
    console.error('Supabase fetchLikedLecturesIds error:', error);
    return [];
  }
}

// WATCH HISTORY SERVICE
export async function trackWatchProgress(lecture: Lecture, progressSeconds: number, completed: boolean): Promise<void> {
  try {
    const uid = await getUserId();
    if (!uid) return;
    const id = `watch_${uid}_${lecture.id}`;
    const watchRecord = {
      id,
      user_id: uid,
      lecture_id: lecture.id,
      progress_seconds: progressSeconds,
      completed,
      updated_at: new Date().toISOString()
    };
    await supabase.from('watch_history').upsert(watchRecord);
  } catch (error) {
    console.error('Supabase trackWatchProgress error:', error);
  }
}

export async function fetchWatchHistory(): Promise<WatchHistoryItem[]> {
  try {
    const uid = await getUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    
    const historyItems = data || [];
    if (historyItems.length === 0) return [];

    const lectureIds = Array.from(new Set(historyItems.map((h: any) => h.lecture_id)));
    
    // Fetch video details
    const { data: videoData, error: videoError } = await supabase
      .from('videos')
      .select('id, title, thumbnail_url, duration')
      .in('id', lectureIds);

    const videoMap = new Map<string, any>();
    if (!videoError && videoData) {
      videoData.forEach((v: any) => {
        videoMap.set(v.id, v);
      });
    }

    return historyItems.map((h: any) => {
      const video = videoMap.get(h.lecture_id) || {};
      return {
        id: h.id,
        userId: h.user_id,
        lectureId: h.lecture_id,
        lectureTitle: video.title || 'Unknown Lecture',
        thumbnailUrl: video.thumbnail_url || '',
        progressSeconds: Number(h.progress_seconds) || 0,
        durationString: video.duration || '0:00',
        completed: !!h.completed,
        updatedAt: h.updated_at || new Date().toISOString()
      } as WatchHistoryItem;
    });
  } catch (error) {
    console.error('Supabase fetchWatchHistory error:', error);
    return [];
  }
}

// MODERATION & REPORTS
export async function submitReport(reportData: Omit<ModerationReport, 'id' | 'reporterId' | 'reporterName' | 'status' | 'createdAt'>): Promise<void> {
  try {
    const uid = await getUserId();
    if (!uid) return;
    const profile = await fetchUserProfile(uid);
    const id = `report_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const reportRecord = {
      id,
      reporter_id: uid,
      reporter_name: profile?.displayName || 'Anonymous Candidate',
      target_id: reportData.targetId,
      target_type: reportData.targetType,
      reason: reportData.reason,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    await supabase.from('moderation_reports').insert(reportRecord);
  } catch (error) {
    console.error('Supabase submitReport error:', error);
  }
}

export async function fetchModerationReports(): Promise<ModerationReport[]> {
  try {
    const { data, error } = await supabase
      .from('moderation_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: r.reporter_name || 'Anonymous Candidate',
      targetId: r.target_id,
      targetType: r.target_type as any,
      reason: r.reason || '',
      details: r.commentary || '',
      status: (['pending', 'resolved', 'dismissed'].includes(r.status) ? r.status : 'pending') as 'pending' | 'resolved' | 'dismissed',
      resolution: r.commentary || '',
      createdAt: r.created_at || new Date().toISOString()
    } as ModerationReport));
  } catch (error) {
    console.error('Supabase fetchModerationReports error:', error);
    return [];
  }
}

export async function resolveModerationReport(reportId: string, action: 'resolved' | 'dismissed', commentary: string): Promise<void> {
  try {
    await supabase
      .from('moderation_reports')
      .update({ status: action, commentary })
      .eq('id', reportId);
  } catch (error) {
    console.error('Supabase resolveModerationReport error:', error);
  }
}

// NOTIFICATIONS SERVICE
export async function fetchNotifications(): Promise<AppNotification[]> {
  try {
    const uid = await getUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      title: n.title,
      message: n.message,
      type: (['system', 'follow', 'video', 'review'].includes(n.type) ? n.type : 'system') as any,
      read: n.is_read || false,
      createdAt: n.created_at || new Date().toISOString()
    } as AppNotification));
  } catch (error) {
    console.error('Supabase fetchNotifications error:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
  } catch (error) {
    console.error('Supabase markNotificationAsRead error:', error);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await supabase.from('notifications').delete().eq('id', notificationId);
  } catch (error) {
    console.error('Supabase deleteNotification error:', error);
  }
}

export async function addRealNotification(
  userId: string,
  title: string,
  message: string,
  type: AppNotification['type'] = 'system'
): Promise<void> {
  try {
    const id = `noti_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const notification = {
      id,
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString()
    };
    await supabase.from('notifications').insert(notification);
  } catch (error) {
    console.error('Supabase addRealNotification error:', error);
  }
}

// ADMIN & CRAWLER SERVICES
export async function saveImportedPlaylist(playlist: Playlist): Promise<void> {
  try {
    const dbPlaylist = {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description || '',
      thumbnail: playlist.thumbnailUrl || '',
      lectures_count: playlist.lecturesCount || 0,
      category: playlist.subject,
      exam_type: playlist.examType || 'Both',
      teacher_id: playlist.teacherId,
      created_at: playlist.createdAt || new Date().toISOString()
    };
    await supabase.from('playlists').upsert(dbPlaylist);
  } catch (error) {
    console.error('Supabase saveImportedPlaylist error:', error);
    throw error;
  }
}

export async function saveImportedLectures(lectures: Lecture[]): Promise<void> {
  try {
    const dbLectures = lectures.map(l => ({
      id: l.id,
      title: l.title,
      description: l.description || '',
      video_url: l.videoUrl,
      thumbnail_url: l.thumbnailUrl,
      subject: l.subject,
      exam_type: l.examType || 'Both',
      content_type: l.contentType || 'lecture',
      teacher_id: l.teacherId,
      teacher_name: l.teacherName,
      institute_id: l.instituteId || '',
      institute_name: l.instituteName || '',
      playlist_id: l.playlistId || '',
      duration: l.duration || '1h 15m',
      views: l.viewsCount || 0,
      likes_count: l.likesCount || 0,
      publish_date: l.publishDate,
      created_at: l.createdAt || new Date().toISOString()
    }));
    for (const item of dbLectures) {
      await supabase.from('videos').upsert(item);
    }
  } catch (error) {
    console.error('Supabase saveImportedLectures error:', error);
    throw error;
  }
}

export async function updateTeacherVerification(teacherId: string, updates: Partial<TeacherProfile>): Promise<void> {
  try {
    const dbUpdates: any = {};
    if (updates.isVerified !== undefined) dbUpdates.is_verified = updates.isVerified;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.followersCount !== undefined) dbUpdates.followers_count = updates.followersCount;
    await supabase.from('teachers').update(dbUpdates).eq('id', teacherId);
  } catch (error) {
    console.error('Supabase updateTeacherVerification error:', error);
  }
}

export async function updateInstituteVerification(instId: string, updates: Partial<InstituteProfile>): Promise<void> {
  try {
    const dbUpdates: any = {};
    if (updates.isVerified !== undefined) dbUpdates.is_verified = updates.isVerified;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    await supabase.from('institutes').update(dbUpdates).eq('id', instId);
  } catch (error) {
    console.error('Supabase updateInstituteVerification error:', error);
  }
}

export async function createIngestionLog(log: Omit<IngestionLog, 'id'>): Promise<string> {
  try {
    const id = `log_${Date.now()}`;
    const dbLog = {
      id,
      started_at: log.startedAt,
      ended_at: log.endedAt,
      status: log.status,
      logs: {
        taskType: log.taskType,
        targetId: log.targetId,
        attempts: log.attempts,
        error: log.error
      }
    };
    await supabase.from('ingestion_logs').insert(dbLog);
    return id;
  } catch (error) {
    console.error('Supabase createIngestionLog error:', error);
    return `log_${Date.now()}`;
  }
}

export async function updateIngestionLog(id: string, updates: Partial<Omit<IngestionLog, 'id'>>): Promise<void> {
  try {
    const { data: existing } = await supabase.from('ingestion_logs').select('logs').eq('id', id).maybeSingle();
    const currentLogs = existing?.logs || {};

    const dbUpdates: any = {};
    if (updates.endedAt !== undefined) dbUpdates.ended_at = updates.endedAt;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const newLogs = {
      ...currentLogs,
      ...(updates.taskType !== undefined ? { taskType: updates.taskType } : {}),
      ...(updates.targetId !== undefined ? { targetId: updates.targetId } : {}),
      ...(updates.attempts !== undefined ? { attempts: updates.attempts } : {}),
      ...(updates.error !== undefined ? { error: updates.error } : {})
    };
    dbUpdates.logs = newLogs;

    await supabase.from('ingestion_logs').update(dbUpdates).eq('id', id);
  } catch (error) {
    console.error('Supabase updateIngestionLog error:', error);
  }
}

export async function fetchAllIngestionLogs(): Promise<IngestionLog[]> {
  try {
    const { data, error } = await supabase
      .from('ingestion_logs')
      .select('*')
      .order('started_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((l: any) => {
      const extra = l.logs || {};
      return {
        id: l.id,
        taskType: extra.taskType || 'FetchPlaylists',
        targetId: extra.targetId || '',
        status: l.status || 'pending',
        attempts: Number(extra.attempts) || 1,
        startedAt: l.started_at,
        endedAt: l.ended_at,
        error: extra.error || null
      } as IngestionLog;
    });
  } catch (error) {
    console.error('Supabase fetchAllIngestionLogs error:', error);
    return [];
  }
}

export async function saveIngestionControl(control: IngestionControl): Promise<void> {
  try {
    const dbControl = {
      id: control.id,
      is_running: control.approved,
      last_run: new Date().toISOString(),
      config: {
        phase: control.phase,
        playlistsImported: control.playlistsImported,
        lecturesImported: control.lecturesImported,
        approved: control.approved,
        nextPhaseStart: control.nextPhaseStart
      }
    };
    await supabase.from('ingestion_control').upsert(dbControl);
  } catch (error) {
    console.error('Supabase saveIngestionControl error:', error);
  }
}

export async function fetchIngestionControl(id: string = 'phase1_state'): Promise<IngestionControl | null> {
  try {
    const { data, error } = await supabase.from('ingestion_control').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const cfg = data.config || {};
    return {
      id: data.id,
      phase: Number(cfg.phase) || 1,
      playlistsImported: Number(cfg.playlistsImported) || 0,
      lecturesImported: Number(cfg.lecturesImported) || 0,
      approved: cfg.approved !== undefined ? !!cfg.approved : !!data.is_running,
      nextPhaseStart: cfg.nextPhaseStart || null
    };
  } catch (error) {
    console.error('Supabase fetchIngestionControl error:', error);
    return null;
  }
}

export async function updateLectureVerification(
  lectureId: string,
  updates: Partial<Omit<Lecture, 'id' | 'createdAt'>>
): Promise<void> {
  try {
    const dbUpdates: any = {};
    if (updates.verificationStatus !== undefined) dbUpdates.verification_status = updates.verificationStatus;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    await supabase.from('videos').update(dbUpdates).eq('id', lectureId);
  } catch (error) {
    console.error('Supabase updateLectureVerification error:', error);
  }
}

export async function fetchAllChannels(): Promise<YouTubeChannel[]> {
  try {
    const { data, error } = await supabase.from('channels').select('*').order('added_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((ch: any) => {
      const meta = typeof ch.exams === 'object' && ch.exams !== null && !Array.isArray(ch.exams) ? ch.exams : {};
      return {
        id: ch.id,
        channelId: ch.id,
        channelName: ch.name || '',
        channelHandle: meta.channelHandle || ch.website || '',
        channelThumbnail: meta.channelThumbnail || ch.avatar || '',
        bannerUrl: meta.bannerUrl || null,
        subscriberCount: Number(meta.subscriberCount) || Number(ch.subscribers) || 0,
        description: meta.description || ch.name || '',
        addedBy: meta.addedBy || 'admin',
        addedAt: ch.added_at || new Date().toISOString(),
        lastSynced: meta.lastSynced || ch.added_at || new Date().toISOString(),
        isActive: !!ch.is_active,
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        totalVideos: Number(meta.totalVideos) || Number(ch.playlists_count) || 0,
        totalPlaylists: Number(meta.totalPlaylists) || Number(ch.playlists_count) || 0
      } as YouTubeChannel;
    });
  } catch (error) {
    console.error('Supabase fetchAllChannels error:', error);
    return [];
  }
}

export async function saveChannel(channel: YouTubeChannel): Promise<void> {
  try {
    const dbChannel = {
      id: channel.id || channel.channelId,
      name: channel.channelName,
      avatar: channel.channelThumbnail || '',
      website: channel.channelHandle || '',
      exams: {
        channelHandle: channel.channelHandle,
        channelThumbnail: channel.channelThumbnail,
        bannerUrl: channel.bannerUrl,
        subscriberCount: channel.subscriberCount,
        description: channel.description,
        addedBy: channel.addedBy,
        lastSynced: channel.lastSynced,
        tags: channel.tags,
        totalVideos: channel.totalVideos,
        totalPlaylists: channel.totalPlaylists
      },
      institute_id: '',
      teacher_id: '',
      subscribers: String(channel.subscriberCount),
      playlists_count: channel.totalPlaylists,
      is_active: channel.isActive,
      added_at: channel.addedAt || new Date().toISOString()
    };
    await supabase.from('channels').upsert(dbChannel);
  } catch (error) {
    console.error('Supabase saveChannel error:', error);
  }
}

export async function deleteChannel(channelId: string): Promise<void> {
  try {
    // Delete cascading resources from playlists and videos
    await supabase.from('videos').delete().eq('channel_id', channelId);
    await supabase.from('playlists').delete().eq('channel_id', channelId);
    await supabase.from('channels').delete().eq('id', channelId);
  } catch (error) {
    console.error('Supabase deleteChannel error:', error);
  }
}

export async function fetchPlaylistsForAdmin(filters?: { channelId?: string; importStatus?: string }): Promise<Playlist[]> {
  try {
    let query = supabase.from('playlists').select('*');
    if (filters?.channelId) {
      const teacherIds = Object.keys(TEACHER_TO_CHANNEL).filter(tId => TEACHER_TO_CHANNEL[tId] === filters.channelId);
      if (teacherIds.length > 0) {
        query = query.in('teacher_id', teacherIds);
      } else {
        query = query.eq('teacher_id', 'non_existent_teacher_dummy_id');
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((p: any) => ({
      id: p.id,
      title: p.title || '',
      description: p.description || '',
      thumbnailUrl: p.thumbnail || '',
      lecturesCount: p.lectures_count || 0,
      subject: p.category || '',
      examType: p.exam_type || 'Both',
      teacherId: p.teacher_id || '',
      channelId: TEACHER_TO_CHANNEL[p.teacher_id || ''] || p.teacher_id || '',
      createdAt: p.created_at || new Date().toISOString()
    } as Playlist));
  } catch (error) {
    console.error('Supabase fetchPlaylistsForAdmin error:', error);
    return [];
  }
}

export async function savePlaylistAdmin(playlist: Playlist): Promise<void> {
  await saveImportedPlaylist(playlist);
}

function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0;
  const parts = duration.split(':').map(Number);
  if (parts.every(p => !isNaN(p))) {
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  let sec = 0;
  const hMatch = duration.match(/(\d+)\s*h/i);
  const mMatch = duration.match(/(\d+)\s*m/i);
  const sMatch = duration.match(/(\d+)\s*s/i);
  if (hMatch) sec += parseInt(hMatch[1]) * 3600;
  if (mMatch) sec += parseInt(mMatch[1]) * 60;
  if (sMatch) sec += parseInt(sMatch[1]);
  return sec || 1800;
}

export async function fetchAllVideos(filters?: { playlistId?: string; subject?: string }): Promise<YouTubeVideo[]> {
  try {
    let query = supabase.from('videos').select('*');
    if (filters?.playlistId) {
      query = query.eq('playlist_id', filters.playlistId);
    }
    if (filters?.subject) {
      query = query.eq('subject', filters.subject);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((v: any) => ({
      id: v.id,
      videoId: v.id,
      playlistId: v.playlist_id || '',
      channelId: v.teacher_id || '',
      channelName: v.teacher_name || 'Verified Educator',
      title: v.title || '',
      description: v.description || '',
      thumbnail: v.thumbnail_url || '',
      duration: v.duration || '',
      durationSeconds: parseDurationToSeconds(v.duration),
      publishedAt: v.publish_date || v.created_at || new Date().toISOString(),
      viewCount: Number(v.views) || 0,
      likeCount: Number(v.likes_count) || 0,
      position: 0,
      subject: v.subject || '',
      topic: '',
      examTags: v.exam_type ? v.exam_type.split(',').map((s: string) => s.trim()) : ['Both'],
      chapter: '',
      isActive: !!v.is_active,
      importedAt: v.created_at || new Date().toISOString()
    } as YouTubeVideo));
  } catch (error) {
    console.error('Supabase fetchAllVideos error:', error);
    return [];
  }
}

export async function saveVideo(video: YouTubeVideo): Promise<void> {
  try {
    const dbVideo = {
      id: video.id || video.videoId,
      video_url: `https://www.youtube.com/watch?v=${video.id || video.videoId}`,
      playlist_id: video.playlistId,
      title: video.title,
      description: video.description || '',
      thumbnail_url: video.thumbnail || '',
      duration: video.duration || '1:00:00',
      views: video.viewCount || 0,
      likes_count: video.likeCount || 0,
      publish_date: video.publishedAt,
      subject: video.subject,
      exam_type: Array.isArray(video.examTags) ? video.examTags.join(', ') : 'Both',
      is_active: video.isActive !== undefined ? video.isActive : true,
      created_at: video.importedAt || new Date().toISOString()
    };
    await supabase.from('videos').upsert(dbVideo);
  } catch (error) {
    console.error('Supabase saveVideo error:', error);
  }
}

export async function saveVideosBatch(videos: YouTubeVideo[]): Promise<void> {
  try {
    for (const v of videos) {
      await saveVideo(v);
    }
  } catch (error) {
    console.error('Supabase saveVideosBatch error:', error);
  }
}

export async function fetchAllYouTubeSyncLogs(): Promise<YouTubeSyncLog[]> {
  try {
    const { data, error } = await supabase.from('sync_logs').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return (data || []).map((l: any) => ({
      id: l.id,
      type: 'channel',
      targetId: l.channel_id || '',
      status: l.status || 'success',
      videosImported: Number(l.videos_imported) || 0,
      playlistsImported: Number(l.playlists_imported) || 0,
      apiUnitsUsed: Number(l.quota_used) || 0,
      error: l.error_message || undefined,
      triggeredBy: 'admin',
      timestamp: l.timestamp || new Date().toISOString()
    } as YouTubeSyncLog));
  } catch (error) {
    console.error('Supabase fetchAllYouTubeSyncLogs error:', error);
    return [];
  }
}

export async function saveYouTubeSyncLog(log: YouTubeSyncLog): Promise<void> {
  try {
    const dbLog = {
      id: log.id || `sync_${Date.now()}`,
      timestamp: log.timestamp || new Date().toISOString(),
      channel_id: log.targetId,
      playlists_imported: log.playlistsImported,
      videos_imported: log.videosImported,
      quota_used: log.apiUnitsUsed,
      status: log.status,
      error_message: log.error || null
    };
    await supabase.from('sync_logs').upsert(dbLog);
  } catch (error) {
    console.error('Supabase saveYouTubeSyncLog error:', error);
  }
}

export async function fetchTeacherStats(teacherId: string, videoIds: string[]): Promise<{
  followerCount: number;
  reviewStats: { rating: number; trustScore: number; count: number } | null;
}> {
  let followerCount = 0;
  let reviewStats: { rating: number; trustScore: number; count: number } | null = null;

  try {
    // 1. Fetch follower count
    const { count, error: followerError } = await supabase
      .from('teacher_followers')
      .select('*', { count: 'exact', head: true })
      .eq('teacher_id', teacherId);

    if (!followerError) {
      followerCount = count || 0;
    }

    // 2. Fetch reviews if videoIds exist
    if (videoIds.length > 0) {
      const { data, error: reviewsError } = await supabase
        .from('reviews')
        .select('rating')
        .eq('entity_type', 'video')
        .in('entity_id', videoIds);

      if (!reviewsError && data && data.length > 0) {
        const ratings = data.map(r => Number(r.rating));
        const sum = ratings.reduce((acc, val) => acc + val, 0);
        const avg = sum / ratings.length;
        const positiveCount = ratings.filter(r => r >= 4.0).length;
        const trust = Math.round((positiveCount / ratings.length) * 100);

        reviewStats = {
          rating: Math.round(avg * 10) / 10,
          trustScore: trust,
          count: ratings.length
        };
      }
    }
  } catch (err) {
    console.error('Error in fetchTeacherStats:', err);
  }

  return { followerCount, reviewStats };
}

export function createEmptyScorecard(sourceEntityIds: string[] = []): RatingScorecard {
  return {
    rating: null,
    trustScore: null,
    reviewCount: 0,
    positiveReviewCount: 0,
    sourceEntityIds: Array.from(new Set(sourceEntityIds.filter(Boolean))),
  };
}

export function calculateRatingScorecard(
  ratings: Array<number | string | null | undefined>,
  sourceEntityIds: string[] = []
): RatingScorecard {
  const numericRatings = ratings
    .map((rating) => Number(rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);

  if (numericRatings.length === 0) {
    return createEmptyScorecard(sourceEntityIds);
  }

  const total = numericRatings.reduce((sum, rating) => sum + rating, 0);
  const positiveReviewCount = numericRatings.filter((rating) => rating >= 4).length;

  return {
    rating: Math.round((total / numericRatings.length) * 10) / 10,
    trustScore: Math.round((positiveReviewCount / numericRatings.length) * 100),
    reviewCount: numericRatings.length,
    positiveReviewCount,
    sourceEntityIds: Array.from(new Set(sourceEntityIds.filter(Boolean))),
  };
}

export function mergeRatingScorecards(
  scorecards: Array<RatingScorecard | null | undefined>,
  sourceEntityIds: string[] = []
): RatingScorecard {
  const valid = scorecards.filter((s): s is RatingScorecard => !!s && s.reviewCount > 0);
  if (valid.length === 0) {
    return createEmptyScorecard(sourceEntityIds);
  }

  let totalRatingSum = 0;
  let totalReviews = 0;
  let totalPositiveReviews = 0;
  const allSourceIds = new Set<string>(sourceEntityIds);

  for (const s of valid) {
    totalRatingSum += (s.rating || 0) * s.reviewCount;
    totalReviews += s.reviewCount;
    totalPositiveReviews += s.positiveReviewCount;
    if (s.sourceEntityIds) {
      s.sourceEntityIds.forEach(id => allSourceIds.add(id));
    }
  }

  return {
    rating: totalReviews > 0 ? Math.round((totalRatingSum / totalReviews) * 10) / 10 : null,
    trustScore: totalReviews > 0 ? Math.round((totalPositiveReviews / totalReviews) * 100) : null,
    reviewCount: totalReviews,
    positiveReviewCount: totalPositiveReviews,
    sourceEntityIds: Array.from(allSourceIds).filter(Boolean)
  };
}

export async function fetchReviewScorecards(entityIds: string[]): Promise<Record<string, RatingScorecard>> {
  const result: Record<string, RatingScorecard> = {};
  for (const id of entityIds) {
    result[id] = createEmptyScorecard([id]);
  }
  if (entityIds.length === 0) return result;

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('entity_id, rating')
      .in('entity_id', entityIds);
    
    if (error) throw error;
    
    const ratingsMap: Record<string, number[]> = {};
    for (const row of (data || [])) {
      if (!row.entity_id || row.rating == null) continue;
      if (!ratingsMap[row.entity_id]) {
        ratingsMap[row.entity_id] = [];
      }
      ratingsMap[row.entity_id].push(Number(row.rating));
    }

    for (const id of entityIds) {
      const ratings = ratingsMap[id] || [];
      result[id] = calculateRatingScorecard(ratings, [id]);
    }
  } catch (error) {
    console.error('Error fetching review scorecards:', error);
  }
  return result;
}

export async function fetchPlaylistStats(playlistId: string): Promise<{ rating: number | null; count: number } | null> {
  try {
    const scorecards = await fetchReviewScorecards([playlistId]);
    const scorecard = scorecards[playlistId];
    return {
      rating: scorecard?.rating ?? null,
      count: scorecard?.reviewCount ?? 0
    };
  } catch (error) {
    console.error(`Error in fetchPlaylistStats for ${playlistId}:`, error);
    return null;
  }
}


