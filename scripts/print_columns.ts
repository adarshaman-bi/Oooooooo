import { createClient } from '@supabase/supabase-js';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: playlists } = await supabase.from('playlists').select('*').limit(1);
  if (playlists && playlists.length > 0) {
    console.log('Playlists Keys:', Object.keys(playlists[0]));
    console.log('Sample Playlist:', playlists[0]);
  } else {
    console.log('Playlists is empty.');
  }

  const { data: videos } = await supabase.from('videos').select('*').limit(1);
  if (videos && videos.length > 0) {
    console.log('Videos Keys:', Object.keys(videos[0]));
    console.log('Sample Video:', videos[0]);
  } else {
    console.log('Videos is empty.');
  }

  const { data: batches } = await supabase.from('batches').select('*').limit(1);
  if (batches && batches.length > 0) {
    console.log('Batches Keys:', Object.keys(batches[0]));
    console.log('Sample Batch:', batches[0]);
  } else {
    console.log('Batches is empty.');
  }

  const { data: batchSubjects } = await supabase.from('batch_subjects').select('*').limit(1);
  if (batchSubjects && batchSubjects.length > 0) {
    console.log('BatchSubjects Keys:', Object.keys(batchSubjects[0]));
    console.log('Sample BatchSubject:', batchSubjects[0]);
  } else {
    console.log('BatchSubjects is empty.');
  }
}

main().catch(console.error);
