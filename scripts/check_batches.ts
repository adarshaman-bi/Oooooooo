process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: batches, error: bErr } = await supabase.from('batches').select('*');
  console.log(`Batches: ${batches?.length || 0} | Err: ${bErr?.message || 'none'}`);

  const { data: batchSubs, error: bsErr } = await supabase.from('batch_subjects').select('*');
  console.log(`Batch Subjects: ${batchSubs?.length || 0} | Err: ${bsErr?.message || 'none'}`);

  const { data: playlists, error: pErr } = await supabase.from('playlists').select('*');
  console.log(`Playlists: ${playlists?.length || 0} | Err: ${pErr?.message || 'none'}`);

  const { data: videos, error: vErr } = await supabase.from('videos').select('id');
  console.log(`Videos Count: ${videos?.length || 0} | Err: ${vErr?.message || 'none'}`);
}

main().catch(console.error);
