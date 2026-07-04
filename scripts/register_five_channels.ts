import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !YOUTUBE_API_KEY) {
  console.error('❌ Missing environment variables in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const targetChannels = [
  { handle: '@CompetishunNEET', id: 'UCUFcLKXPfS7ijJ_WSC20oeQ', subject: 'Chemistry', exams: ['NEET', 'JEE'] },
  { handle: '@pw-neetwallah', id: 'UCD16eo98AXl-9T61Xd711kQ', subject: 'Biology', exams: ['NEET'] },
  { handle: '@VedantuSankalpNEET', id: 'UCWFXoexcMI1jQrHH2N-SJzQ', subject: 'Biology', exams: ['NEET'] },
  { handle: '@unacademyneet', id: 'UCdQwYksctqqiRwqp3PiJMWA', subject: 'Biology', exams: ['NEET'] },
  { handle: '@uaneetenglish', id: 'UCvQSK6a7gfYbNL11KalRfOw', subject: 'Physics', exams: ['NEET'] }
];

async function run() {
  console.log('📡 Starting Step 0: Register and verify the 5 target channels...');
  for (const ch of targetChannels) {
    try {
      console.log(`📡 Fetching YouTube info for ${ch.handle} (${ch.id})...`);
      const res = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${ch.id}&key=${YOUTUBE_API_KEY}`
      );
      const items = res.data.items || [];
      if (items.length === 0) {
        console.error(`❌ Could not resolve YouTube channel: ${ch.handle}`);
        continue;
      }

      const item = items[0];
      const name = item.snippet.title;
      const avatar = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || '';
      const bannerUrl = item.brandingSettings?.image?.bannerExternalUrl || '';
      const description = item.snippet.description || '';
      const subscriberCount = parseInt(item.statistics.subscriberCount, 10) || 0;
      const videoCount = parseInt(item.statistics.videoCount, 10) || 0;

      const payload = {
        id: ch.id,
        name,
        avatar,
        website: ch.handle,
        exams: {
          channelHandle: ch.handle,
          channelThumbnail: avatar,
          bannerUrl,
          subscriberCount,
          description,
          addedBy: 'admin@biovised.com',
          lastSynced: new Date().toISOString(),
          tags: ch.exams,
          totalVideos: videoCount,
          totalPlaylists: 30,
          viewCount: parseInt(item.statistics.viewCount, 10) || 0
        },
        institute_id: '',
        teacher_id: '',
        subscribers: String(subscriberCount),
        playlists_count: 30,
        is_active: true,
        added_at: new Date().toISOString()
      };

      console.log(`📡 Upserting channel ${name} to Supabase...`);
      const { error } = await supabase.from('channels').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.error(`❌ Failed to upsert ${name}:`, error.message);
      } else {
        console.log(`✅ Successfully registered: ${name}`);
      }
    } catch (err: any) {
      console.error(`❌ Error resolving/registering channel ${ch.handle}:`, err.message || err);
    }
  }
  console.log('🎉 Step 0 completed.');
}

run();
