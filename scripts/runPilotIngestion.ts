import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { parseISO8601Duration, getDurationInSeconds, isAcademicContent } from '../src/utils/youtubeUtils';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; 
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required Supabase environment variables in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PILOT_TARGETS = [
  // 1. Two Test Case Playlists (NEET mission 30 one shots)
  { 
    teacherId: 'rohit_aggarwal_pw', 
    teacherName: 'Rohit Aggarwal', 
    channelId: 'UCphU2bAGmw304CFAzy0EnCw', // Competition Wallah
    playlistId: 'PLJyab0VQDBGUDRNUYOTU9enTCToMEJW3U', 
    subject: 'Chemistry' 
  },
  { 
    teacherId: 'seep_pahuja', 
    teacherName: 'Seep Pahuja', 
    channelId: 'UCphU2bAGmw304CFAzy0EnCw', // Competition Wallah
    playlistId: 'PLJyab0VQDBGVPk0chK-lvZ11lY4cYr5z1', 
    subject: 'Biology' 
  },
  // 2. Main Pilot Catalog Playlists (from previous milestones)
  { 
    teacherId: 'alakh_pandey', 
    teacherName: 'Alakh Pandey', 
    channelId: 'UCD16eo98AXl-9T61Xd711kQ', 
    playlistId: 'PLJyab0VQDBGWvRw8liU4B8s-OB75jv-og', 
    subject: 'Physics' 
  },
  { 
    teacherId: 'mohit_tyagi', 
    teacherName: 'Mohit Tyagi', 
    channelId: 'UCxypqdjw-S400n162TY5cgQ', 
    playlistId: 'PLwx2dE1vjbJTJcahkyxktzlM232bRCp3g', 
    subject: 'Mathematics' 
  },
  { 
    teacherId: 'seep_pahuja', 
    teacherName: 'Seep Pahuja', 
    channelId: 'UCcxP3vMEVVFafLBasCHcjCg', 
    playlistId: 'PLDyO-0__XCOcsBmv3WB2_twN3cPJi6q4a', 
    subject: 'Biology' 
  },
  { 
    teacherId: 'sachin_rana', 
    teacherName: 'Sachin Rana', 
    channelId: 'UC8Q46TByEJhMsY9V3wqIOZw', 
    playlistId: 'PLYxKzLIbV4xAsk02RsNm99cJ9AT2o08uM', 
    subject: 'Chemistry' 
  },
  { 
    teacherId: 'ashish_arora', 
    teacherName: 'Ashish Arora', 
    channelId: 'UCgBmfNILAlXmGv3CsJ8oFJA', 
    playlistId: 'PLYVDsiuOZP5p1aqpwOCL1dKF1BHIjdf_C', 
    subject: 'Physics' 
  },
  { 
    teacherId: 'rohit_aggarwal_pw', 
    teacherName: 'Rohit Aggarwal', 
    channelId: 'UCkDb4531sPuHocFFSQE3qOQ', 
    playlistId: 'PLijp7t3rV9NcgVRZVR0qqc1JqOa3SV8i7', 
    subject: 'Physics' 
  }
];

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

async function runPilotIngestion() {
  console.log('🚀 Starting BIOVISED Supabase Ingestion Pipeline (Contract-Compliant Pilot)...');

  if (!YOUTUBE_API_KEY) {
    console.error('❌ Error: YOUTUBE_API_KEY is missing from environment variables in .env');
    process.exit(1);
  }

  // --- STAGE 0: SCHEMA DETECTION AND EXPLICIT LOGGING ---
  let detectedPlaylistColumns: string[] = [];
  let detectedVideoColumns: string[] = [];

  try {
    const { data: plSample } = await supabase.from('playlists').select('*').limit(1);
    detectedPlaylistColumns = plSample && plSample.length > 0 ? Object.keys(plSample[0]) : [];
  } catch (err: any) {
    console.warn('⚠️ Playlists schema detection failed:', err.message);
  }

  try {
    const { data: vidSample } = await supabase.from('videos').select('*').limit(1);
    detectedVideoColumns = vidSample && vidSample.length > 0 ? Object.keys(vidSample[0]) : [];
  } catch (err: any) {
    console.warn('⚠️ Videos schema detection failed:', err.message);
  }

  const requiredPlaylistColumns = ['cover_thumbnail_url', 'channel_title', 'channel_id', 'channel_thumbnail_url', 'content_type', 'total_duration_seconds', 'subject_tags', 'exam_tags', 'last_synced_at'];
  const requiredVideoColumns = ['position_in_playlist', 'duration_seconds', 'view_count', 'like_count', 'is_playable', 'embed_url'];

  const foundPl = requiredPlaylistColumns.filter(c => detectedPlaylistColumns.includes(c));
  const missingPl = requiredPlaylistColumns.filter(c => !detectedPlaylistColumns.includes(c));
  const foundVid = requiredVideoColumns.filter(c => detectedVideoColumns.includes(c));
  const missingVid = requiredVideoColumns.filter(c => !detectedVideoColumns.includes(c));

  console.log('\n=========================================');
  console.log('[Schema Check] Playlists columns found:', foundPl);
  console.log('[Schema Check] Playlists columns missing:', missingPl);
  console.log('[Schema Check] Videos columns found:', foundVid);
  console.log('[Schema Check] Videos columns missing:', missingVid);
  console.log('=========================================\n');

  let quotaCost = 0;

  for (const target of PILOT_TARGETS) {
    console.log(`\n-----------------------------------------`);
    console.log(`Processing Playlist: ${target.playlistId} for ${target.teacherName}`);
    console.log(`-----------------------------------------`);

    try {
      // 1. Fetch playlist metadata
      console.log(`📡 Fetching playlist info...`);
      const playlistMetaRes = await axios.get(
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${target.playlistId}&key=${YOUTUBE_API_KEY}`
      );
      quotaCost++;

      const playlistItem = playlistMetaRes.data.items?.[0];
      if (!playlistItem) {
        console.error(`❌ Playlist ${target.playlistId} not found on YouTube.`);
        continue;
      }

      const playlistTitle = playlistItem.snippet.title || 'Untitled Playlist';
      const playlistDescription = playlistItem.snippet.description || '';
      const channelId = playlistItem.snippet.channelId;

      // 2. Fetch channel details
      console.log(`📡 Fetching channel info for ${channelId}...`);
      const channelRes = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`
      );
      quotaCost++;

      const channelItem = channelRes.data.items?.[0];
      const channelTitle = channelItem?.snippet?.title || target.teacherName;
      const channelThumbnailUrl = channelItem?.snippet?.thumbnails?.high?.url || channelItem?.snippet?.thumbnails?.default?.url || '';

      // 3. Enumerate all playlist items
      console.log(`📡 Enumerating playlist items...`);
      let pageToken: string | undefined;
      const playlistVideoRefs: Array<{ videoId: string; position: number }> = [];
      let currentPos = 0;

      do {
        let itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${target.playlistId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
        if (pageToken) itemsUrl += `&pageToken=${pageToken}`;

        const itemsRes = await axios.get(itemsUrl);
        quotaCost++;

        for (const item of itemsRes.data.items || []) {
          const vidId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
          if (vidId) {
            playlistVideoRefs.push({ videoId: vidId, position: currentPos++ });
          }
        }
        pageToken = itemsRes.data.nextPageToken;
      } while (pageToken);

      console.log(`📡 Found ${playlistVideoRefs.length} videos referenced in playlist. Fetching details...`);

      // 4. Batch-hydrate video details (chunking into groups of 50)
      const videoDetailsMap = new Map<string, any>();
      const videoIds = playlistVideoRefs.map(v => v.videoId);

      for (let i = 0; i < videoIds.length; i += 50) {
        const chunk = videoIds.slice(i, i + 50);
        console.log(`   Hydrating chunk ${i / 50 + 1} (${chunk.length} videos)...`);
        const videosRes = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,statistics&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`
        );
        quotaCost++;

        for (const v of videosRes.data.items || []) {
          videoDetailsMap.set(v.id, v);
        }
      }

      // 5. Normalization, filtration and contract mapping
      const videoUpsertPayloads: any[] = [];
      let totalDurationSeconds = 0;
      let playableLecturesCount = 0;
      let coverThumbnailUrl = '';

      for (const ref of playlistVideoRefs) {
        const video = videoDetailsMap.get(ref.videoId);
        
        // 5a. Handle unavailable videos (private/deleted)
        if (!video) {
          console.warn(`⚠️ [Ingestion warning] Video ${ref.videoId} in playlist ${target.playlistId} is unavailable (deleted/private). Storing with is_playable = false.`);
          
          const dbVideoRow = {
            id: ref.videoId,
            video_id: ref.videoId,
            playlist_id: target.playlistId,
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
            subject: target.subject,
            category: 'lecture',
            content_type: 'lecture',
            teacher_id: target.teacherId,
            updated_at: new Date().toISOString()
          };

          videoUpsertPayloads.push(filterColumns(dbVideoRow, detectedVideoColumns));
          continue;
        }

        const title = video.snippet?.title || '';
        const durationISO = video.contentDetails?.duration || '';
        const durationSec = getDurationInSeconds(durationISO);
        const privacyStatus = video.status?.privacyStatus;

        // 5b. Apply filters to playable lectures (under 20 minutes, strategy/clickbait)
        if (privacyStatus === 'private' || privacyStatus === 'deleted') {
          console.log(`[Import Skip] Video ${ref.videoId} is private/deleted.`);
          continue;
        }
        if (durationSec < 1200) {
          console.log(`[Import Skip] Skipping video ${ref.videoId} (duration under 20 mins: ${durationISO})`);
          continue;
        }
        if (!isAcademicContent(title, video.snippet?.description)) {
          console.log(`[Import Skip] Skipping non-academic video ${ref.videoId} (${title})`);
          continue;
        }

        // 5c. Thumbnail fallback chain (maxres -> standard -> high -> medium -> default)
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
          playlist_id: target.playlistId,
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
          subject: target.subject,
          category: 'lecture',
          content_type: 'lecture',
          teacher_id: target.teacherId,
          updated_at: new Date().toISOString()
        };

        videoUpsertPayloads.push(filterColumns(dbVideoRow, detectedVideoColumns));
      }

      // 5d. Determine content_type
      const titleLower = playlistTitle.toLowerCase();
      const descLower = playlistDescription.toLowerCase();
      const isOneShot = titleLower.includes('one shot') || titleLower.includes('oneshot') || descLower.includes('one shot') || descLower.includes('oneshot');
      const contentType = isOneShot ? 'one_shot' : 'playlist';

      console.log(`Playlist Classifed Content Type: ${contentType}`);

      // 6. DB Sync
      if (videoUpsertPayloads.length > 0) {
        // Upsert Playlist first to prevent foreign key errors
        console.log(`📡 Syncing playlist row...`);
        const plRow = {
          id: target.playlistId,
          playlist_id: target.playlistId,
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
          subject_tags: target.subject === 'Biology' ? ['Biology', 'Botany'] : (target.subject === 'Chemistry' ? ['Chemistry', 'Inorganic Chemistry'] : [target.subject]),
          exam_tags: ['NEET'],
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          category: target.subject,
          is_active: true
        };

        const { error: plErr } = await supabase.from('playlists').upsert(filterColumns(plRow, detectedPlaylistColumns));
        if (plErr) {
          console.error(`❌ Error upserting playlist metadata:`, plErr.message);
          continue;
        }

        // Upsert child videos
        console.log(`📡 Syncing ${videoUpsertPayloads.length} child video rows...`);
        const uniquePayloadsMap = new Map();
        for (const p of videoUpsertPayloads) {
          uniquePayloadsMap.set(p.id, p);
        }
        const uniquePayloads = Array.from(uniquePayloadsMap.values());
        const { error: vidErr } = await supabase.from('videos').upsert(uniquePayloads);
        if (vidErr) {
          console.error(`❌ Error upserting video rows:`, vidErr.message);
        } else {
          console.log(`✅ Playlist and ${videoUpsertPayloads.length} child videos successfully updated in DB.`);
        }
      } else {
        console.warn(`⚠️ No videos passed academic filtering. Skipping DB write.`);
      }

    } catch (err: any) {
      console.error(`💥 Failed to ingest playlist ${target.playlistId}:`, err.message);
    }
  }

  console.log(`\n--- Ingestion complete. Quota used: ${quotaCost} units ---`);
}

runPilotIngestion();
