import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectAll() {
  console.log('🔍 Querying all playlists in database...');
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select('id, title, channel_title, cover_thumbnail_url, content_type, last_synced_at, lectures_count');

  if (error) {
    console.error('❌ Error fetching playlists:', error.message);
    return;
  }

  console.log(`Total playlists in DB: ${playlists.length}`);
  console.log('\nList of Playlists in Database:');
  for (const p of playlists) {
    const isNewIngested = !!p.cover_thumbnail_url;
    console.log(`- [${isNewIngested ? '✅ NEW' : '❌ OLD/BROKEN'}] ID: ${p.id}`);
    console.log(`  Title: "${p.title}"`);
    console.log(`  Channel Name: "${p.channel_title}"`);
    console.log(`  Cover Thumbnail: "${p.cover_thumbnail_url || 'NULL'}"`);
    console.log(`  Content Type: "${p.content_type || 'NULL'}"`);
    console.log(`  Lectures Count: ${p.lectures_count}`);
    console.log(`  Last Synced At: "${p.last_synced_at || 'NULL'}"`);
    console.log('------------------------------------------------');
  }
}

inspectAll();
