import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('🔍 Fetching all playlists in DB...');
  const { data: playlists, error: plErr } = await supabase
    .from('playlists')
    .select('id, title');

  if (plErr) {
    console.error('❌ Error fetching playlists:', plErr.message);
    return;
  }

  const mockIds: string[] = [];
  const realIds: string[] = [];

  for (const p of playlists) {
    const isReal = p.id.startsWith('PL') && p.id.length === 34;
    if (isReal && p.id !== 'PL2PA-4G8bF9O7N_p6_2O0d2U7-fG-YF-J') {
      realIds.push(p.id);
    } else {
      mockIds.push(p.id);
    }
  }

  console.log(`\nFound ${realIds.length} Real YouTube Playlists:`, realIds);
  console.log(`Found ${mockIds.length} Mock/Deleted Playlists to deactivate:`, mockIds);

  // 1. Deactivate mock playlists
  if (mockIds.length > 0) {
    await supabase
      .from('playlists')
      .update({ is_active: false })
      .in('id', mockIds);
    
    await supabase
      .from('videos')
      .update({ is_active: false })
      .in('playlist_id', mockIds);
  }

  // 2. Activate real playlists
  if (realIds.length > 0) {
    await supabase
      .from('playlists')
      .update({ is_active: true })
      .in('id', realIds);

    await supabase
      .from('videos')
      .update({ is_active: true })
      .in('playlist_id', realIds);
  }

  // 3. Deactivate playlists with 0 lectures (skipped/empty/deleted)
  console.log('🧹 Deactivating playlists with 0 lectures...');
  await supabase
    .from('playlists')
    .update({ is_active: false })
    .eq('lectures_count', 0);

  // 4. Deactivate videos belonging to inactive playlists
  const { data: inactivePlaylists } = await supabase
    .from('playlists')
    .select('id')
    .eq('is_active', false);
  
  const inactivePlIds = (inactivePlaylists || []).map(p => p.id);
  if (inactivePlIds.length > 0) {
    await supabase
      .from('videos')
      .update({ is_active: false })
      .in('playlist_id', inactivePlIds);
  }

  // 5. Deactivate videos that are marked as playable but have 0 duration (skipped/invalid legacy videos)
  console.log('🧹 Deactivating skipped/stale legacy video rows...');
  await supabase
    .from('videos')
    .update({ is_active: false })
    .eq('is_active', true)
    .eq('is_playable', true)
    .or('duration_seconds.eq.0,duration_seconds.is.null');

  // 6. Run User's exact validation queries
  console.log('\n📊 PLAYLISTS VALIDATION QUERY:');
  const { data: playlistsData, error: plValErr } = await supabase
    .from('playlists')
    .select('*')
    .eq('is_active', true);

  if (plValErr) {
    console.error('❌ Error querying playlists:', plValErr.message);
  } else {
    const totalPlaylists = playlistsData.length;
    const missingChannel = playlistsData.filter(p => !p.channel_title).length;
    const missingThumbnail = playlistsData.filter(p => !p.cover_thumbnail_url).length;
    const missingContentType = playlistsData.filter(p => p.content_type === null || p.content_type === undefined).length;
    const zeroLectures = playlistsData.filter(p => p.lectures_count === 0).length;

    console.log(`total_playlists: ${totalPlaylists}`);
    console.log(`missing_channel: ${missingChannel}`);
    console.log(`missing_thumbnail: ${missingThumbnail}`);
    console.log(`missing_content_type: ${missingContentType}`);
    console.log(`zero_lectures: ${zeroLectures}`);
  }

  console.log('\n📊 VIDEOS VALIDATION QUERY:');
  const { data: videosData, error: vidValErr } = await supabase
    .from('videos')
    .select('*')
    .eq('is_active', true);

  if (vidValErr) {
    console.error('❌ Error querying videos:', vidValErr.message);
  } else {
    const totalVideos = videosData.length;
    const missingThumbnail = videosData.filter(v => !v.thumbnail_url).length;
    const missingDuration = videosData.filter(v => v.duration_seconds === null || v.duration_seconds === 0).length;
    const missingViews = videosData.filter(v => v.view_count === null || v.view_count === undefined).length;
    const unplayable = videosData.filter(v => v.is_playable === false).length;

    console.log(`total_videos: ${totalVideos}`);
    console.log(`missing_thumbnail: ${missingThumbnail}`);
    console.log(`missing_duration: ${missingDuration}`);
    console.log(`missing_views: ${missingViews}`);
    console.log(`unplayable: ${unplayable}`);
  }

  console.log('\n📊 CONTENT QUALITY CHECK (JUNK CONTENT VERIFICATION):');
  const { data: junkCheck, error: junkErr } = await supabase
    .from('videos')
    .select('id, title, teacher_name')
    .eq('is_active', true)
    .or('title.ilike.%cocomelon%,title.ilike.%cartoon%,title.ilike.%rhyme%,title.ilike.%kids song%,teacher_name.ilike.%sachin%');

  if (junkErr) {
    console.error('❌ Error checking for junk content:', junkErr.message);
  } else {
    console.log(`Found ${junkCheck.length} junk rows.`);
    for (const j of junkCheck) {
      console.log(`- ID: ${j.id}, Title: "${j.title}", Channel: "${j.teacher_name}"`);
    }
  }
}

run();
