import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SPOT_PLAYLISTS = [
  'PLJyab0VQDBGWvRw8liU4B8s-OB75jv-og',
  'PLDyO-0__XCOcsBmv3WB2_twN3cPJi6q4a',
  'PLbu_fGT0MPsu4U2uiFrIuFgfkbYS22QCm',
  'PLjvx7xqdpePIhuRDZnZA49oCEALDv48b_',
  'PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv'
];

async function run() {
  console.log('🔍 Spot-Checking 5 Random Ingested Playlists:');
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select('id, title, channel_title, cover_thumbnail_url, content_type, lectures_count')
    .in('id', SPOT_PLAYLISTS);

  if (error) {
    console.error('Error fetching playlists:', error.message);
    return;
  }

  for (const p of playlists) {
    console.log(`- ID: ${p.id}`);
    console.log(`  Title: "${p.title}"`);
    console.log(`  Channel Name: "${p.channel_title}"`);
    console.log(`  Cover Thumbnail: "${p.cover_thumbnail_url}"`);
    console.log(`  Content Type: "${p.content_type}"`);
    console.log(`  Lectures Count: ${p.lectures_count}`);
    console.log('----------------------------------------------------');
  }
}

run();
