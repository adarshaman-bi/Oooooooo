process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('teacher_followers').select('*').limit(1);
  if (error) {
    console.log('Error selecting from teacher_followers:', error.message);
  } else {
    console.log('Table teacher_followers exists! Data:', data);
  }

  const { data: reviewsData, error: reviewsError } = await supabase.from('video_reviews').select('*').limit(1);
  if (reviewsError) {
    console.log('Error selecting from video_reviews:', reviewsError.message);
  } else {
    console.log('Table video_reviews exists! Data:', reviewsData);
  }
}

run();
