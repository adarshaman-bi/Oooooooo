import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: dbTeachers, error } = await supabase.from('teachers').select('id, name');
  if (error) {
    console.error('Error fetching teachers:', error);
    return;
  }
  
  const searchNames = ['arjun', 'om', 'manish', 'mr sir', 'pandey', 'sharma'];
  console.log('--- Matching DB Teachers ---');
  dbTeachers?.forEach(t => {
    const tName = t.name.toLowerCase();
    if (searchNames.some(sn => tName.includes(sn))) {
      console.log(`ID: ${t.id} | Name: ${t.name}`);
    }
  });
}

check();
