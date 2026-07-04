import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  console.error('❌ YOUTUBE_API_KEY is missing');
  process.exit(1);
}

async function run() {
  console.log('🔍 Searching YouTube channels for "Unacademy NEET"...');
  try {
    const searchRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=Unacademy+NEET&maxResults=10&key=${YOUTUBE_API_KEY}`
    );
    const channelIds = (searchRes.data.items || []).map((item: any) => item.snippet.channelId).filter(Boolean);
    if (channelIds.length === 0) {
      console.log('❌ No channels found in search.');
      return;
    }

    const channelsRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds.join(',')}&key=${YOUTUBE_API_KEY}`
    );

    for (const item of channelsRes.data.items || []) {
      console.log(`- Title: ${item.snippet.title}`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Handle: ${item.snippet.customUrl || 'N/A'}`);
      console.log(`  Subscribers: ${item.statistics.subscriberCount}`);
      console.log(`  Videos: ${item.statistics.videoCount}`);
    }
  } catch (err: any) {
    console.error('❌ Search error:', err.message || err);
  }
}

run();
