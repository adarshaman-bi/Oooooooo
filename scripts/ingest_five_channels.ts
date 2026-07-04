import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { getDurationInSeconds, isAcademicContent } from '../src/utils/youtubeUtils';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !YOUTUBE_API_KEY) {
  console.error('❌ Missing environment variables in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const targetChannels = [
  { handle: '@CompetishunNEET', id: 'UCUFcLKXPfS7ijJ_WSC20oeQ', subject: 'Chemistry', teacherId: 'jayant-nagpal-competishun' },
  { handle: '@pw-neetwallah', id: 'UCD16eo98AXl-9T61Xd711kQ', subject: 'Biology', teacherId: 'manish-tiwari-physics-wallah' },
  { handle: '@VedantuSankalpNEET', id: 'UCWFXoexcMI1jQrHH2N-SJzQ', subject: 'Biology', teacherId: 'tarun-singh-vedantu-bio-360' },
  { handle: '@unacademyneet', id: 'UCdQwYksctqqiRwqp3PiJMWA', subject: 'Biology', teacherId: 'komal-yadav-unacademy' },
  { handle: '@uaneetenglish', id: 'UCvQSK6a7gfYbNL11KalRfOw', subject: 'Physics', teacherId: 'brijesh-dwivedi-unacademy' }
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

async function run() {
  console.log('🚀 Starting 5-Channel Bulk Ingestion Pipeline...');

  // 1. Detect schema columns
  let playlistCols: string[] = [];
  let videoCols: string[] = [];
  try {
    const { data: plSample } = await supabase.from('playlists').select('*').limit(1);
    playlistCols = plSample && plSample.length > 0 ? Object.keys(plSample[0]) : [];
    const { data: vidSample } = await supabase.from('videos').select('*').limit(1);
    videoCols = vidSample && vidSample.length > 0 ? Object.keys(vidSample[0]) : [];
  } catch (e) {
    console.warn('Schema detection warning:', e);
  }

  const summary = {
    totalPlaylistsAttempted: 0,
    totalPlaylistsIngested: 0,
    totalPlaylistsSkipped: 0,
    totalVideosIngested: 0,
    totalVideosFilteredOut: 0,
    channelBreakdown: {} as Record<string, any>
  };

  for (const ch of targetChannels) {
    console.log(`\n==================================================`);
    console.log(`📡 Ingesting channel: ${ch.handle} (${ch.id})`);
    console.log(`==================================================`);

    summary.channelBreakdown[ch.handle] = {
      playlistsPulled: 0,
      playlistsIngested: 0,
      playlistsSkipped: 0,
      videosIngested: 0,
      videosFilteredOut: 0
    };

    const breakdown = summary.channelBreakdown[ch.handle];

    try {
      // A. Pull up to 50 playlists
      const plUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&channelId=${ch.id}&maxResults=50&key=${YOUTUBE_API_KEY}`;
      const plRes = await axios.get(plUrl);
      const rawPlaylists = plRes.data.items || [];
      console.log(`📡 Pulled ${rawPlaylists.length} raw playlists from YouTube.`);

      // B. Sort by publishedAt descending and slice top 30
      const sortedPlaylists = rawPlaylists
        .sort((a: any, b: any) => new Date(b.snippet?.publishedAt || 0).getTime() - new Date(a.snippet?.publishedAt || 0).getTime())
        .slice(0, 30);

      breakdown.playlistsPulled = sortedPlaylists.length;
      summary.totalPlaylistsAttempted += sortedPlaylists.length;
      console.log(`📡 Processing top ${sortedPlaylists.length} most recent playlists...`);

      for (const plItem of sortedPlaylists) {
        const playlistId = plItem.id;
        const playlistTitle = plItem.snippet?.title || 'Untitled Playlist';
        const playlistDescription = plItem.snippet?.description || '';

        console.log(`\n📺 Ingesting playlist: "${playlistTitle}" (${playlistId})`);

        // C. Fetch all playlist items (videos)
        let pageToken: string | undefined;
        const playlistVideoRefs: Array<{ videoId: string; position: number }> = [];
        let currentPos = 0;

        try {
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
        } catch (itemErr: any) {
          console.error(`   ❌ Failed to pull playlistItems: ${itemErr.message}`);
          breakdown.playlistsSkipped++;
          summary.totalPlaylistsSkipped++;
          continue;
        }

        if (playlistVideoRefs.length === 0) {
          console.log(`   ⚠️ Empty playlist. Skipping.`);
          breakdown.playlistsSkipped++;
          summary.totalPlaylistsSkipped++;
          continue;
        }

        // D. Hydrate video details in chunks of 50
        const videoDetailsMap = new Map<string, any>();
        const videoIds = playlistVideoRefs.map(v => v.videoId);

        try {
          for (let i = 0; i < videoIds.length; i += 50) {
            const chunk = videoIds.slice(i, i + 50);
            const videosRes = await axios.get(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,statistics&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`
            );
            for (const v of videosRes.data.items || []) {
              videoDetailsMap.set(v.id, v);
            }
          }
        } catch (vidErr: any) {
          console.error(`   ❌ Failed to hydrate video details: ${vidErr.message}`);
          breakdown.playlistsSkipped++;
          summary.totalPlaylistsSkipped++;
          continue;
        }

        // E. Filter and Map videos
        const videoUpsertPayloads: any[] = [];
        let totalDurationSeconds = 0;
        let playableLecturesCount = 0;
        let coverThumbnailUrl = '';

        for (const ref of playlistVideoRefs) {
          const video = videoDetailsMap.get(ref.videoId);
          if (!video) {
            // Unavailable/deleted/private video, skip from active catalog
            breakdown.videosFilteredOut++;
            summary.totalVideosFilteredOut++;
            continue;
          }

          const title = video.snippet?.title || '';
          const description = video.snippet?.description || '';
          const durationISO = video.contentDetails?.duration || '';
          const durationSec = getDurationInSeconds(durationISO);
          const privacyStatus = video.status?.privacyStatus;

          if (privacyStatus === 'private' || privacyStatus === 'deleted') {
            breakdown.videosFilteredOut++;
            summary.totalVideosFilteredOut++;
            continue;
          }

          // 1. Duration check (>20 minutes / 1200 seconds)
          if (durationSec < 1200) {
            breakdown.videosFilteredOut++;
            summary.totalVideosFilteredOut++;
            continue;
          }

          // 2. Academic content denylist check
          if (!isAcademicContent(title, description)) {
            console.log(`   🚫 Filtered out junk video: "${title}"`);
            breakdown.videosFilteredOut++;
            summary.totalVideosFilteredOut++;
            continue;
          }

          // Resolve thumbnail fallback chain
          const snippetThumbnails = video.snippet?.thumbnails || {};
          const thumbnailUrl = snippetThumbnails.maxres?.url || snippetThumbnails.standard?.url || snippetThumbnails.high?.url || snippetThumbnails.medium?.url || snippetThumbnails.default?.url || '';

          if (!coverThumbnailUrl && thumbnailUrl) {
            coverThumbnailUrl = thumbnailUrl;
          }

          const dbVideoRow = {
            id: ref.videoId,
            video_id: ref.videoId,
            playlist_id: playlistId,
            position_in_playlist: ref.position,
            position: ref.position,
            title,
            description,
            channel_id: ch.id,
            channel_title: plItem.snippet?.channelTitle || '',
            teacher_name: plItem.snippet?.channelTitle || '',
            thumbnail_url: thumbnailUrl,
            duration_seconds: durationSec,
            duration: video.contentDetails?.duration || '',
            view_count: parseInt(video.statistics?.viewCount || '0', 10) || 0,
            views: parseInt(video.statistics?.viewCount || '0', 10) || 0,
            like_count: parseInt(video.statistics?.likeCount || '0', 10) || 0,
            likes_count: parseInt(video.statistics?.likeCount || '0', 10) || 0,
            published_at: video.snippet?.publishedAt || new Date().toISOString(),
            publish_date: video.snippet?.publishedAt || new Date().toISOString(),
            is_playable: true,
            is_active: true,
            embed_url: `https://www.youtube.com/embed/${ref.videoId}`,
            video_url: `https://www.youtube.com/watch?v=${ref.videoId}`,
            subject: ch.subject,
            category: 'lecture',
            content_type: 'lecture',
            teacher_id: ch.teacherId,
            updated_at: new Date().toISOString()
          };

          totalDurationSeconds += durationSec;
          playableLecturesCount++;
          videoUpsertPayloads.push(filterColumns(dbVideoRow, videoCols));
        }

        // F. Skip playlist if 0 active academic videos exist
        if (playableLecturesCount === 0 || videoUpsertPayloads.length === 0) {
          console.log(`   ⚠️ Playlist has 0 active academic videos matching the >20m filter. Skipping.`);
          breakdown.playlistsSkipped++;
          summary.totalPlaylistsSkipped++;
          continue;
        }

        // Classification
        const titleLower = playlistTitle.toLowerCase();
        let resolvedContentType = 'playlist';
        if (titleLower.includes('one shot') || titleLower.includes('oneshot') || titleLower.includes('complete revision')) {
          resolvedContentType = 'one_shot';
        }

        const snippetThumbnails = plItem.snippet?.thumbnails || {};
        const plThumbnail = snippetThumbnails.maxres?.url || snippetThumbnails.standard?.url || snippetThumbnails.high?.url || snippetThumbnails.medium?.url || snippetThumbnails.default?.url || coverThumbnailUrl || '';

        const dbPlaylist = {
          id: playlistId,
          title: playlistTitle,
          description: playlistDescription,
          thumbnail: plThumbnail,
          category: ch.subject,
          subject: ch.subject,
          teacher_id: ch.teacherId,
          teacher_name: plItem.snippet?.channelTitle || '',
          channel_title: plItem.snippet?.channelTitle || '',
          channel_id: ch.id,
          lectures_count: playableLecturesCount,
          is_active: true,
          content_type: resolvedContentType,
          show_on_home: true,
          cover_thumbnail_url: coverThumbnailUrl || plThumbnail,
          total_duration_seconds: totalDurationSeconds,
          last_synced_at: new Date().toISOString(),
          created_at: plItem.snippet?.publishedAt || new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // G. Unique videos payload by id to prevent duplicate upsert conflict
        const uniqueVideosMap = new Map<string, any>();
        for (const vPayload of videoUpsertPayloads) {
          uniqueVideosMap.set(vPayload.id, vPayload);
        }
        const uniqueVideos = Array.from(uniqueVideosMap.values());

        // H. Upsert Playlist and Videos
        console.log(`   📡 Upserting playlist metadata...`);
        const { error: plUpsertErr } = await supabase.from('playlists').upsert(filterColumns(dbPlaylist, playlistCols), { onConflict: 'id' });
        if (plUpsertErr) {
          console.error(`   ❌ Playlist upsert failed: ${plUpsertErr.message}`);
          breakdown.playlistsSkipped++;
          summary.totalPlaylistsSkipped++;
          continue;
        }

        console.log(`   📡 Upserting ${uniqueVideos.length} unique video details...`);
        const { error: vidUpsertErr } = await supabase.from('videos').upsert(uniqueVideos, { onConflict: 'id' });
        if (vidUpsertErr) {
          console.error(`   ❌ Videos upsert failed: ${vidUpsertErr.message}`);
          breakdown.playlistsSkipped++;
          summary.totalPlaylistsSkipped++;
          continue;
        }

        console.log(`   ✅ Playlist successfully synced! Ingested ${uniqueVideos.length} videos.`);
        breakdown.playlistsIngested++;
        summary.totalPlaylistsIngested++;
        breakdown.videosIngested += uniqueVideos.length;
        summary.totalVideosIngested += uniqueVideos.length;
      }
    } catch (chanErr: any) {
      console.error(`❌ Channel ingestion error for ${ch.handle}:`, chanErr.message || chanErr);
    }
  }

  console.log(`\n==================================================`);
  console.log(`🎉 Ingestion completed successfully!`);
  console.log(`==================================================`);
  console.log(JSON.stringify(summary, null, 2));
}

run();
