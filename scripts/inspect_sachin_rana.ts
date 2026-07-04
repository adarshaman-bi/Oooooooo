import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('🔍 Searching videos matching Sachin Rana in teacher_id or teacher_name...');
  const { data: videos, error: vidErr } = await supabase
    .from('videos')
    .select('id, title, teacher_name, teacher_id, playlist_id, duration, is_playable, is_active')
    .or('teacher_id.eq.sachin_rana,teacher_name.ilike.%sachin%');

  if (vidErr) {
    console.error('❌ Error querying videos:', vidErr.message);
    return;
  }

  console.log(`Found ${videos.length} videos matching query:`);
  for (const v of videos) {
    console.log(`- ID: ${v.id}`);
    console.log(`  Title: "${v.title}"`);
    console.log(`  Teacher Name: "${v.teacher_name}"`);
    console.log(`  Teacher ID: "${v.teacher_id}"`);
    console.log(`  Playlist ID: "${v.playlist_id}"`);
    console.log(`  Is Active: ${v.is_active}, Is Playable: ${v.is_playable}`);
    console.log('----------------------------------------------------');
  }

  console.log('\n🔍 Searching playlists matching Sachin Rana...');
  const { data: playlists, error: plErr } = await supabase
    .from('playlists')
    .select('id, title, channel_title, teacher_id, is_active')
    .or('teacher_id.eq.sachin_rana,channel_title.ilike.%sachin%');

  if (plErr) {
    console.error('❌ Error querying playlists:', plErr.message);
    return;
  }

  console.log(`Found ${playlists.length} playlists matching query:`);
  for (const p of playlists) {
    console.log(`- ID: ${p.id}`);
    console.log(`  Title: "${p.title}"`);
    console.log(`  Channel Title: "${p.channel_title}"`);
    console.log(`  Teacher ID: "${p.teacher_id}"`);
    console.log(`  Is Active: ${p.is_active}`);
    console.log('----------------------------------------------------');
  }
}

run();
