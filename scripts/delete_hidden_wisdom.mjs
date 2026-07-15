// Remove Hidden Wisdom Academy Biology playlist permanently
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const PLAYLIST_ID = 'PLy6p4R8K23QXgDchWo0sPPhxm8_uwYN6_';
const CHANNEL_ID_HINT = 'Hidden Wisdom Academy Biology';

async function remove() {
  console.log('🗑️  Removing Hidden Wisdom Academy Biology...');

  // 1. Delete videos belonging to this playlist
  const { error: vidErr, count: vidCount } = await supabase
    .from('videos')
    .delete({ count: 'exact' })
    .eq('playlist_id', PLAYLIST_ID);
  if (vidErr) console.error('  ❌ Videos delete error:', vidErr.message);
  else console.log(`  ✅ Deleted ${vidCount ?? 'N/A'} videos`);

  // 2. Delete the playlist row
  const { error: plErr } = await supabase
    .from('playlists')
    .delete()
    .eq('id', PLAYLIST_ID);
  if (plErr) console.error('  ❌ Playlist delete error:', plErr.message);
  else console.log(`  ✅ Playlist row deleted`);

  // 3. Find and delete the channel (by handle/name since we don't have channel_id handy)
  const { data: channels } = await supabase
    .from('channels')
    .select('id, name, handle')
    .ilike('name', '%Hidden Wisdom%');

  if (channels && channels.length > 0) {
    for (const ch of channels) {
      const { error: chErr } = await supabase.from('channels').delete().eq('id', ch.id);
      if (chErr) console.error(`  ❌ Channel delete error (${ch.name}):`, chErr.message);
      else console.log(`  ✅ Channel deleted: ${ch.name} (${ch.handle})`);
    }
  } else {
    console.log('  ℹ️  No matching channel row found (may not have been inserted)');
  }

  // 4. Also remove any batch_subjects referencing this playlist
  const { error: bsErr, count: bsCount } = await supabase
    .from('batch_subjects')
    .delete({ count: 'exact' })
    .eq('playlist_id', PLAYLIST_ID);
  if (bsErr) console.error('  ❌ batch_subjects delete error:', bsErr.message);
  else console.log(`  ✅ Removed ${bsCount ?? 0} batch_subjects references`);

  console.log('\n🎉 Permanently removed. Hidden Wisdom Academy Biology will never appear in the platform.');
}

remove().catch(err => { console.error('💥', err.message); process.exit(1); });
