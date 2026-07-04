import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Querying one playlist...');
  const { data: playlists, error: plErr } = await supabase.from('playlists').select('*').limit(1);
  if (plErr) console.error('Playlists error:', plErr.message);
  else console.log('Playlists columns:', playlists ? Object.keys(playlists[0] || {}) : 'No data');

  console.log('Querying one video...');
  const { data: videos, error: vidErr } = await supabase.from('videos').select('*').limit(1);
  if (vidErr) console.error('Videos error:', vidErr.message);
  else console.log('Videos columns:', videos ? Object.keys(videos[0] || {}) : 'No data');
}
run();
