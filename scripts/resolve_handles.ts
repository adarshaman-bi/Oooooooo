import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  console.error('❌ YOUTUBE_API_KEY is missing');
  process.exit(1);
}

const handles = [
  '@CompetishunNEET',
  '@pw-neetwallah',
  '@VedantuSankalpNEET',
  '@unacademyneet',
  '@uaneetenglish'
];

async function run() {
  console.log('🔍 Querying YouTube API for channel handles...');
  for (const handle of handles) {
    try {
      const res = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handle}&key=${YOUTUBE_API_KEY}`
      );
      const items = res.data.items || [];
      if (items.length === 0) {
        console.log(`❌ No channel found for handle: ${handle}`);
      } else {
        const item = items[0];
        console.log(`✅ Handle: ${handle}`);
        console.log(`   Title: ${item.snippet.title}`);
        console.log(`   ID: ${item.id}`);
        console.log(`   Subscribers: ${item.statistics.subscriberCount}`);
        console.log(`   Videos: ${item.statistics.videoCount}`);
      }
    } catch (err: any) {
      console.error(`❌ Error querying handle ${handle}:`, err.message || err);
    }
  }
}

run();
