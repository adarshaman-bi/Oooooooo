import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('🔍 Querying teachers table...');
  const { data: teachers, error } = await supabase.from('teachers').select('id, name, subject');
  if (error) {
    console.error('❌ Error fetching teachers:', error.message);
    return;
  }
  console.log(`Total teachers in DB: ${teachers.length}`);
  for (const t of teachers) {
    console.log(`- ID: ${t.id}, Name: ${t.name}, Subject: ${t.subject}`);
  }
}

run();
