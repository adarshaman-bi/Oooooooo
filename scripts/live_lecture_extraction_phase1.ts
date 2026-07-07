import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !YOUTUBE_API_KEY) {
  console.error('❌ Missing required environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Phase 1 Targets
const TARGET_HANDLES = [
  '@CompetitionWallah', // Adjust handle if needed, usually we resolve ID first
  '@UnacademyNEET',
  '@VedantuNEET'
];

// Denylist for non-academic content
const DENYLIST = ['cocomelon', 'cartoon', 'rhyme', 'nursery', 'peppa pig', 'chuchu tv', 'kids song', 'lullaby'];

function isAcademic(title: string): boolean {
  const lower = title.toLowerCase();
  return !DENYLIST.some(keyword => lower.includes(keyword));
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

async function resolveChannelId(handle: string): Promise<string | null> {
  try {
    const res = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { forHandle: handle, key: YOUTUBE_API_KEY, part: 'id' }
    });
    const id = res.data.items?.[0]?.id;
    if (id) console.log(`✅ Resolved ${handle} -> ${id}`);
    else console.warn(`❌ Could not resolve ${handle}`);
    return id || null;
  } catch (e: any) {
    console.error(`❌ Error resolving ${handle}:`, e.message);
    return null;
  }
}

async function fetchLiveVideos(channelId: string) {
  console.log(`\n🔴 Fetching LIVE/PAST-LIVE videos for ${channelId}...`);
  let allVideos: any[] = [];
  let nextPageToken: string | undefined = undefined;

  // Search for completed live streams
  do {
    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          channelId: channelId,
          eventType: 'completed',
          type: 'video',
          order: 'date',
          maxResults: 50,
          pageToken: nextPageToken,
          key: YOUTUBE_API_KEY,
          part: 'id'
        }
      });

      const items = res.data.items || [];
      const videoIds = items.map((i: any) => i.id.videoId).filter(Boolean);
      
      if (videoIds.length > 0) {
        // Hydrate details
        const detailRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            id: videoIds.join(','),
            part: 'snippet,contentDetails,statistics,liveStreamingDetails',
            key: YOUTUBE_API_KEY
          }
        });

        const validVideos = detailRes.data.items.filter((v: any) => {
          return v.liveStreamingDetails && isAcademic(v.snippet.title);
        });

        allVideos = [...allVideos, ...validVideos];
        console.log(`   Found ${validVideos.length} valid live videos in this batch.`);
      }

      nextPageToken = res.data.nextPageToken;
    } catch (e: any) {
      console.error('Error fetching page:', e.message);
      break;
    }
  } while (nextPageToken && allVideos.length < 50); // Limit to 50 per channel for Phase 1

  return allVideos.slice(0, 50);
}

async function upsertVideo(video: any, channelId: string, channelTitle: string) {
  const snippet = video.snippet;
  const contentDetails = video.contentDetails;
  const stats = video.statistics;
  const liveDetails = video.liveStreamingDetails;

  const durationSeconds = parseDuration(contentDetails.duration);
  
  // Determine a generic playlist ID or create a virtual one for "Live Streams"
  // Since live streams might not belong to a specific playlist, we associate them with the channel
  // We'll use a convention: playlist_id = channel_id + "_LIVE"
  const virtualPlaylistId = `${channelId}_LIVE`;

  const videoData = {
    id: video.id,
    playlist_id: virtualPlaylistId,
    position_in_playlist: 0, // Order by date later if needed
    title: snippet.title,
    channel_title: channelTitle,
    thumbnail_url: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
    duration_seconds: durationSeconds,
    view_count: parseInt(stats.viewCount || '0'),
    is_playable: true,
    is_active: true,
    publish_date: liveDetails.actualStartTime || snippet.publishedAt,
    content_type: 'live', // Mark as live
    teacher_id: channelId // Assuming teacher_id maps to channel_id
  };

  // Upsert Video
  const { error } = await supabase.from('videos').upsert(videoData, { onConflict: 'id' });
  if (error) console.error(`❌ Error upserting video ${video.id}:`, error.message);
  else console.log(`   ✅ Saved: ${videoData.title.substring(0, 50)}...`);

  // Also ensure a "Live Streams" playlist entry exists for this channel
  const { data: existingPL } = await supabase.from('playlists').select('id').eq('id', virtualPlaylistId).single();
  
  if (!existingPL) {
    await supabase.from('playlists').upsert({
      id: virtualPlaylistId,
      title: `${channelTitle} - Live Archives`,
      channel_id: channelId,
      channel_title: channelTitle,
      content_type: 'playlist', // Treat container as playlist
      is_active: true,
      cover_thumbnail_url: videoData.thumbnail_url,
      lectures_count: 1, // Will need increment logic ideally
      total_duration_seconds: durationSeconds
    }, { onConflict: 'id' });
  } else {
    // Increment count roughly
    // In production, use SQL increment or fetch-update
  }
}

async function main() {
  console.log('🚀 Starting Phase 1: Live Lecture Extraction (3 Channels)');
  
  for (const handle of TARGET_HANDLES) {
    const channelId = await resolveChannelId(handle);
    if (!channelId) continue;

    // Get Channel Title for DB
    const titleRes = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { id: channelId, part: 'snippet', key: YOUTUBE_API_KEY }
    });
    const channelTitle = titleRes.data.items?.[0]?.snippet.title || 'Unknown';

    const liveVideos = await fetchLiveVideos(channelId);
    console.log(`💾 Saving ${liveVideos.length} live videos for ${channelTitle}...`);
    
    for (const vid of liveVideos) {
      await upsertVideo(vid, channelId, channelTitle);
    }
  }

  console.log('\n✅ Phase 1 Complete. Check database for new "Live Archives" playlists.');
}

main();
