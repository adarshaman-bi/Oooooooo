import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('🔍 Querying channels table...');
  const { data: channels, error } = await supabase.from('channels').select('*');
  if (error) {
    console.error('❌ Error fetching channels:', error.message);
    return;
  }
  console.log(`Total channels in DB: ${channels.length}`);
  if (channels.length > 0) {
    console.log('Columns:');
    console.log(Object.keys(channels[0]));
    console.log('\nChannels in DB:');
    for (const c of channels) {
      console.log(`- ID: ${c.id}`);
      console.log(`  Name: ${c.name}`);
      console.log(`  Subscribers: ${c.subscribers}`);
      console.log(`  Is Active: ${c.is_active}`);
    }
  }
}

run();
