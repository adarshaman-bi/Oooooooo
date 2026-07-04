import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { parseISO8601Duration, getDurationInSeconds, isAcademicContent } from '../src/utils/youtubeUtils';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !YOUTUBE_API_KEY) {
  console.error('❌ Missing environment variables in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function filterColumns(payload: any, allowedColumns: string[]) {
  if (allowedColumns.length === 0) return payload;
  const filtered: any = {};
  for (const key of Object.keys(payload)) {
    if (allowedColumns.includes(key)) {
      filtered[key] = payload[key];
    }
  }
  return filtered;
}

async function ingestSingle(playlistId: string, subject: string, teacherId: string) {
  console.log(`\n📡 Ingesting playlist: ${playlistId} for teacher: ${teacherId}`);

  let detectedPlaylistColumns: string[] = [];
  let detectedVideoColumns: string[] = [];
  try {
    const { data: plSample } = await supabase.from('playlists').select('*').limit(1);
    detectedPlaylistColumns = plSample && plSample.length > 0 ? Object.keys(plSample[0]) : [];
    const { data: vidSample } = await supabase.from('videos').select('*').limit(1);
    detectedVideoColumns = vidSample && vidSample.length > 0 ? Object.keys(vidSample[0]) : [];
  } catch (e) {
    console.warn('Schema check failed:', e);
  }

  try {
    // 1. Fetch playlist metadata
    const playlistMetaRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`
    );
    const playlistItem = playlistMetaRes.data.items?.[0];
    if (!playlistItem) {
      console.error(`❌ Playlist ${playlistId} not found on YouTube.`);
      return;
    }

    const playlistTitle = playlistItem.snippet.title || 'Untitled Playlist';
    const playlistDescription = playlistItem.snippet.description || '';
    const channelId = playlistItem.snippet.channelId;

    // 2. Fetch channel details
    console.log(`📡 Fetching channel info for ${channelId}...`);
    const channelRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    const channelItem = channelRes.data.items?.[0];
    const channelTitle = channelItem?.snippet?.title || '';
    const channelThumbnailUrl = channelItem?.snippet?.thumbnails?.high?.url || channelItem?.snippet?.thumbnails?.default?.url || '';

    // 3. Enumerate items
    let pageToken: string | undefined;
    const playlistVideoRefs: Array<{ videoId: string; position: number }> = [];
    let currentPos = 0;

    do {
      let itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
      if (pageToken) itemsUrl += `&pageToken=${pageToken}`;

      const itemsRes = await axios.get(itemsUrl);
      for (const item of itemsRes.data.items || []) {
        const vidId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (vidId) {
          playlistVideoRefs.push({ videoId: vidId, position: currentPos++ });
        }
      }
      pageToken = itemsRes.data.nextPageToken;
    } while (pageToken);

    console.log(`📡 Found ${playlistVideoRefs.length} videos. Hydrating details...`);

    const videoDetailsMap = new Map<string, any>();
    const videoIds = playlistVideoRefs.map(v => v.videoId);

    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const videosRes = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,statistics&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`
      );
      for (const v of videosRes.data.items || []) {
        videoDetailsMap.set(v.id, v);
      }
    }

    const videoUpsertPayloads: any[] = [];
    let totalDurationSeconds = 0;
    let playableLecturesCount = 0;
    let coverThumbnailUrl = '';

    for (const ref of playlistVideoRefs) {
      const video = videoDetailsMap.get(ref.videoId);
      if (!video) {
        const dbVideoRow = {
          id: ref.videoId,
          video_id: ref.videoId,
          playlist_id: playlistId,
          position_in_playlist: ref.position,
          position: ref.position,
          title: 'Unavailable Video',
          description: 'This video is private or deleted.',
          channel_id: channelId,
          channel_title: channelTitle,
          teacher_name: channelTitle,
          thumbnail_url: 'https://i.ytimg.com/vi/placeholder/hqdefault.jpg',
          duration_seconds: 0,
          duration: '0:00',
          view_count: 0,
          views: 0,
          like_count: 0,
          likes_count: 0,
          published_at: new Date().toISOString(),
          publish_date: new Date().toISOString(),
          is_playable: false,
          is_active: false,
          embed_url: `https://www.youtube.com/embed/${ref.videoId}`,
          video_url: `https://www.youtube.com/watch?v=${ref.videoId}`,
          subject,
          category: 'lecture',
          content_type: 'lecture',
          teacher_id: teacherId,
          updated_at: new Date().toISOString()
        };
        videoUpsertPayloads.push(filterColumns(dbVideoRow, detectedVideoColumns));
        continue;
      }

      const title = video.snippet?.title || '';
      const durationISO = video.contentDetails?.duration || '';
      const durationSec = getDurationInSeconds(durationISO);
      const privacyStatus = video.status?.privacyStatus;

      if (privacyStatus === 'private' || privacyStatus === 'deleted') continue;
      // Relax duration to 10 minutes for legacy pilot videos
      if (durationSec < 600) continue;
      if (!isAcademicContent(title)) continue;

      const sn = video.snippet || {};
      const thumbs = sn.thumbnails || {};
      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        `https://i.ytimg.com/vi/${ref.videoId}/hqdefault.jpg`;

      if (playableLecturesCount === 0) {
        coverThumbnailUrl = thumbnailUrl;
      }

      totalDurationSeconds += durationSec;
      playableLecturesCount++;

      const dbVideoRow = {
        id: ref.videoId,
        video_id: ref.videoId,
        playlist_id: playlistId,
        position_in_playlist: ref.position,
        position: ref.position,
        title: title,
        description: sn.description || '',
        channel_id: channelId,
        channel_title: channelTitle,
        teacher_name: channelTitle,
        thumbnail_url: thumbnailUrl,
        duration_seconds: durationSec,
        duration: parseISO8601Duration(durationISO),
        view_count: parseInt(video.statistics?.viewCount || '0', 10),
        views: parseInt(video.statistics?.viewCount || '0', 10),
        like_count: parseInt(video.statistics?.likeCount || '0', 10),
        likes_count: parseInt(video.statistics?.likeCount || '0', 10),
        published_at: sn.publishedAt || new Date().toISOString(),
        publish_date: sn.publishedAt || new Date().toISOString(),
        is_playable: true,
        is_active: true,
        embed_url: `https://www.youtube.com/embed/${ref.videoId}`,
        video_url: `https://www.youtube.com/watch?v=${ref.videoId}`,
        subject,
        category: 'lecture',
        content_type: 'lecture',
        teacher_id: teacherId,
        updated_at: new Date().toISOString()
      };

      videoUpsertPayloads.push(filterColumns(dbVideoRow, detectedVideoColumns));
    }

    const titleLower = playlistTitle.toLowerCase();
    const descLower = playlistDescription.toLowerCase();
    const isOneShot = titleLower.includes('one shot') || titleLower.includes('oneshot') || descLower.includes('one shot') || descLower.includes('oneshot');
    const contentType = isOneShot ? 'one_shot' : 'playlist';

    if (videoUpsertPayloads.length > 0) {
      // Unique the payloads by ID to avoid ON CONFLICT duplicate issues
      const uniquePayloadsMap = new Map();
      for (const p of videoUpsertPayloads) {
        uniquePayloadsMap.set(p.id, p);
      }
      const uniquePayloads = Array.from(uniquePayloadsMap.values());

      const plRow = {
        id: playlistId,
        playlist_id: playlistId,
        title: playlistTitle,
        description: playlistDescription,
        channel_id: channelId,
        channel_title: channelTitle,
        channel_thumbnail_url: channelThumbnailUrl,
        cover_thumbnail_url: coverThumbnailUrl,
        thumbnail: coverThumbnailUrl,
        content_type: contentType,
        lectures_count: playableLecturesCount,
        total_duration_seconds: totalDurationSeconds,
        subject_tags: [subject],
        exam_tags: ['NEET'],
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: subject,
        is_active: true,
        teacher_id: teacherId
      };

      const { error: plErr } = await supabase.from('playlists').upsert(filterColumns(plRow, detectedPlaylistColumns));
      if (plErr) {
        console.error('❌ Playlist upsert error:', plErr.message);
        return;
      }

      const { error: vidErr } = await supabase.from('videos').upsert(uniquePayloads);
      if (vidErr) {
        console.error('❌ Video upsert error:', vidErr.message);
      } else {
        console.log(`✅ Success! Playlist ${playlistId} and ${uniquePayloads.length} child videos successfully updated in DB.`);
      }
    } else {
      console.warn('⚠️ No videos passed filtering.');
    }
  } catch (err: any) {
    console.error(`❌ Failed to ingest ${playlistId}:`, err.message);
  }
}

async function runAll() {
  // Retry 4. PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv (NCERT Biology Complete Course) -> seep_pahuja, Biology
  await ingestSingle('PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv', 'Biology', 'seep_pahuja');
}

runAll();
