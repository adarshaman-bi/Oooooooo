import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const JUNK_VIDEO_IDS = [
  'UF4Adun1QPU',
  'l4ZzbCK7y5c',
  'lyYE3nximas',
  'DruYNHN4FYY',
  'zd8Rkq2hTO8'
];

async function run() {
  console.log(`🧹 Removing junk videos from DB: ${JUNK_VIDEO_IDS.join(', ')}`);
  
  // 1. Delete videos
  const { data: delData, error: delErr } = await supabase
    .from('videos')
    .delete()
    .in('id', JUNK_VIDEO_IDS)
    .select();

  if (delErr) {
    console.error('❌ Error deleting junk videos:', delErr.message);
  } else {
    console.log(`✅ Deleted ${delData?.length || 0} junk videos.`);
  }

  // 2. Query to verify deletion
  const { data: checkData, error: checkErr } = await supabase
    .from('videos')
    .select('id, title')
    .in('id', JUNK_VIDEO_IDS);

  if (checkErr) {
    console.error('❌ Error checking database:', checkErr.message);
  } else {
    console.log(`🔍 Verification check: Found ${checkData?.length || 0} junk videos in DB.`);
  }
}

run();
