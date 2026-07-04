import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGETS = [
  // Two Test Cases
  'PLJyab0VQDBGUDRNUYOTU9enTCToMEJW3U',
  'PLJyab0VQDBGVPk0chK-lvZ11lY4cYr5z1',
  // Newly Sync'd Playlists
  'PLbu_fGT0MPsu4U2uiFrIuFgfkbYS22QCm',
  'PLjvx7xqdpePIhuRDZnZA49oCEALDv48b_',
  'PLjvx7xqdpePJD6xrZkipYKAgTioEVsjKu',
  'PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv',
  // Valid active legacy ones
  'PLJyab0VQDBGWvRw8liU4B8s-OB75jv-og',
  'PLDyO-0__XCOcsBmv3WB2_twN3cPJi6q4a',
  'PLYxKzLIbV4xAsk02RsNm99cJ9AT2o08uM',
  'PLijp7t3rV9NcgVRZVR0qqc1JqOa3SV8i7'
];

async function run() {
  console.log('🔍 Starting Direct Database Contract Validation...');
  console.log(`Target Playlists: ${TARGETS.join(', ')}`);

  // 1. Detect columns
  let playlistCols: string[] = [];
  let videoCols: string[] = [];
  try {
    const { data: plSample } = await supabase.from('playlists').select('*').limit(1);
    playlistCols = plSample && plSample.length > 0 ? Object.keys(plSample[0]) : [];
    const { data: vidSample } = await supabase.from('videos').select('*').limit(1);
    videoCols = vidSample && vidSample.length > 0 ? Object.keys(vidSample[0]) : [];
  } catch (e: any) {
    console.warn('Schema check failed:', e.message);
  }

  const hasNewColumns = playlistCols.includes('cover_thumbnail_url') && videoCols.includes('duration_seconds');
  console.log(`Schema Detection: ${hasNewColumns ? '🆕 NEW CONTRACT COLUMNS ACTIVE' : '⚠️ LEGACY SCHEME ACTIVE'}`);

  let hasErrors = false;

  for (const playlistId of TARGETS) {
    console.log(`\nChecking Playlist: ${playlistId}...`);
    
    // Fetch playlist record
    const { data: playlist, error: plErr } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .single();

    if (plErr) {
      console.warn(`  ⚠️ Playlist row not found in DB (might have been skipped if no videos passed filters).`);
      continue;
    }

    console.log(`  ✅ Playlist found: "${playlist.title}"`);
    console.log(`     Category/Subject: ${playlist.category}`);
    console.log(`     Content Type: ${playlist.content_type || 'playlist'}`);
    console.log(`     Lectures Count: ${playlist.lectures_count}`);

    // Fetch videos belonging to this playlist
    const { data: videos, error: vidErr } = await supabase
      .from('videos')
      .select('*')
      .eq('playlist_id', playlistId);

    if (vidErr) {
      console.error(`  ❌ Failed to fetch video rows:`, vidErr.message);
      hasErrors = true;
      continue;
    }

    console.log(`  ✅ Found ${videos.length} videos in database.`);

    for (const v of videos) {
      // Check if this video was updated in the last 2 hours (indicates it was processed by the new ingestion)
      const lastUpdated = v.updated_at ? new Date(v.updated_at).getTime() : 0;
      const isRecentlySynced = (Date.now() - lastUpdated) < 2 * 60 * 60 * 1000;

      if (!isRecentlySynced) {
        console.log(`     - Video ${v.id} (Stale legacy row, skipping contract validation checks)`);
        continue;
      }

      const isPlayable = v.is_playable !== false && v.is_active !== false;
      console.log(`     - Video ${v.id} (Playable: ${isPlayable}, Title: "${v.title}")`);

      // Check fields
      const errors: string[] = [];

      // 1. thumbnail_url
      if (!v.thumbnail_url) {
        errors.push('thumbnail_url is empty');
      }

      // 2. channel_title
      const chTitle = videoCols.includes('channel_title') ? v.channel_title : (v.teacher_name || v.channel_title);
      if (!chTitle) {
        errors.push('channel_title (or teacher_name) is empty');
      }

      // 3. duration_seconds (only required for playable videos)
      if (isPlayable) {
        if (videoCols.includes('duration_seconds')) {
          const durSec = v.duration_seconds || 0;
          if (durSec <= 0) {
            errors.push(`duration_seconds is ${durSec} (must be >0)`);
          }
        } else {
          // Check legacy duration column
          const dur = v.duration;
          if (!dur) {
            errors.push('legacy duration is empty');
          }
        }
      }

      // 4. view_count
      const viewCount = videoCols.includes('view_count') ? v.view_count : v.views;
      if (viewCount === null || viewCount === undefined) {
        errors.push('view_count (or views) is undefined/null');
      }

      if (errors.length > 0) {
        console.error(`       ❌ Validation errors: ${errors.join(', ')}`);
        hasErrors = true;
      } else {
        console.log(`       ✅ All contract fields populated.`);
      }
    }
  }

  console.log('\n=========================================');
  if (hasErrors) {
    console.error('❌ DATABASE CONTRACT VALIDATION FAILED!');
    process.exit(1);
  } else {
    console.log('✅ DATABASE CONTRACT VALIDATION PASSED SUCCESSFULLY!');
  }
  console.log('=========================================\n');
}

run();
