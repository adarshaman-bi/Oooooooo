import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error('Error listing auth users:', uErr);
    return;
  }
  console.log('--- AUTH USERS ---');
  (users.users as any[]).forEach(u => {
    console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.user_metadata?.display_name || u.user_metadata?.fullName}`);
  });

  const { data: teachers, error: tErr } = await supabase.from('teachers').select('id, name');
  if (tErr) {
    console.error('Error listing teachers:', tErr);
  } else {
    console.log('--- TEACHERS ---');
    console.log(`Total: ${teachers?.length}`);
  }
}

check();
