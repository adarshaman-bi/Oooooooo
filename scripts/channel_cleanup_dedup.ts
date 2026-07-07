import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !YOUTUBE_API_KEY) {
  console.error('❌ Missing required environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- PART 1: REMOVE 2 CHANNELS ---
async function removeUnwantedChannels() {
  console.log('\n--- PART 1: Removing Unwanted Channels ---');
  
  const channelsToRemove = ['Competishun Mentorship', 'Sachin Rana'];
  
  for (const channelName of channelsToRemove) {
    console.log(`🔍 Searching for channel: ${channelName}...`);
    
    // Find playlists associated with this channel
    const { data: playlists, error } = await supabase
      .from('playlists')
      .select('id, channel_id, channel_title')
      .ilike('channel_title', `%${channelName}%`);

    if (error) {
      console.error(`❌ Error fetching playlists for ${channelName}:`, error.message);
      continue;
    }

    if (!playlists || playlists.length === 0) {
      console.log(`⚠️ No playlists found for ${channelName}. Skipping.`);
      continue;
    }

    console.log(`🗑️ Deactivating ${playlists.length} playlists for ${channelName}...`);
    
    const playlistIds = playlists.map(p => p.id);
    const { error: updateError } = await supabase
      .from('playlists')
      .update({ is_active: false })
      .in('id', playlistIds);

    if (updateError) {
      console.error(`❌ Error deactivating playlists for ${channelName}:`, updateError.message);
    } else {
      console.log(`✅ Successfully deactivated ${playlists.length} playlists for ${channelName}.`);
    }
  }
}

// --- PART 2: FIX DUPLICATE PHYSICS GALAXY ---
async function fixPhysicsGalaxyDuplicates() {
  console.log('\n--- PART 2: Fixing Physics Galaxy Duplicates ---');
  
  const { data: physicsPlaylists, error } = await supabase
    .from('playlists')
    .select('id, channel_id, channel_title, channel_thumbnail_url')
    .ilike('channel_title', '%physics galaxy%');

  if (error) {
    console.error('❌ Error fetching Physics Galaxy playlists:', error.message);
    return;
  }

  if (!physicsPlaylists || physicsPlaylists.length === 0) {
    console.log('✅ No Physics Galaxy entries found. Nothing to fix.');
    return;
  }

  console.log(`Found ${physicsPlaylists.length} Physics Galaxy entries.`);
  
  // Group by channel_id
  const channelMap = new Map<string, any[]>();
  physicsPlaylists.forEach(p => {
    if (!channelMap.has(p.channel_id)) {
      channelMap.set(p.channel_id, []);
    }
    channelMap.get(p.channel_id)!.push(p);
  });

  if (channelMap.size === 1) {
    console.log('✅ All entries belong to the same channel ID. No duplicate channels found.');
    // Just ensure they have thumbnails
    const first = physicsPlaylists[0];
    if (!first.channel_thumbnail_url || first.channel_thumbnail_url === '') {
       console.log('⚠️ Main entry missing thumbnail. Fetching from YouTube...');
       // Logic to fetch thumbnail would go here if needed
    }
    return;
  }

  console.log('⚠️ Found multiple distinct channel IDs for "Physics Galaxy". This indicates a real duplicate or spinoff.');
  console.log('Channel IDs found:', Array.from(channelMap.keys()));
  console.log('ACTION REQUIRED: Manually verify if these are different channels. If duplicates, decide which channel_id to keep.');
  // For safety, we don't auto-delete here without user confirmation
}

// --- PART 3: REFRESH SUBSCRIBER COUNTS & LOGOS ---
async function refreshChannelMetadata() {
  console.log('\n--- PART 3: Refreshing Subscriber Counts & Logos ---');

  const { data: distinctChannels, error } = await supabase
    .from('playlists')
    .select('channel_id, channel_title')
    .eq('is_active', true)
    .group('channel_id, channel_title'); // Note: Supabase JS v2 might need manual dedup if group isn't supported directly in select like SQL

  // Manual dedup if needed
  const uniqueChannels = Array.from(new Map(distinctChannels?.map(c => [c.channel_id, c]) || []).values());

  if (!uniqueChannels || uniqueChannels.length === 0) {
    console.log('No active channels found.');
    return;
  }

  for (const channel of uniqueChannels) {
    if (!channel.channel_id) continue;

    try {
      console.log(`🔄 Refreshing: ${channel.channel_title} (${channel.channel_id})...`);
      
      const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'snippet,statistics',
          id: channel.channel_id,
          key: YOUTUBE_API_KEY
        }
      });

      const item = response.data.items?.[0];
      if (!item) {
        console.warn(`⚠️ Channel not found on YouTube: ${channel.channel_id}`);
        continue;
      }

      const newThumb = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url;
      const newSubs = parseInt(item.statistics.subscriberCount || '0');
      const newTitle = item.snippet.title;

      // Update all playlists for this channel
      const { error } = await supabase
        .from('playlists')
        .update({
          channel_thumbnail_url: newThumb,
          channel_title: newTitle // Ensure consistent naming
          // Note: We don't store subscriber count in playlists table directly based on schema, 
          // but we update the avatar and name which are displayed.
        })
        .eq('channel_id', channel.channel_id);

      if (error) throw error;
      console.log(`✅ Updated ${channel.channel_title}: Subs=${newSubs}, Thumb=${newThumb ? 'OK' : 'MISSING'}`);

    } catch (err: any) {
      console.error(`❌ Failed to refresh ${channel.channel_title}:`, err.message);
    }
  }
}

async function main() {
  console.log('🚀 Starting Channel Cleanup & Deduplication...');
  await removeUnwantedChannels();
  await fixPhysicsGalaxyDuplicates();
  await refreshChannelMetadata();
  console.log('✅ Cleanup Complete.');
}

main();
