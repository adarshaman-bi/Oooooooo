const http = require('http');
const https = require('https');
const { URL } = require('url');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

if (!youtubeApiKey) {
  console.error('Missing YouTube API key');
  process.exit(1);
}

// Simple HTTP fetch wrapper
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };
    
    const req = lib.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(JSON.parse(data)),
            text: () => Promise.resolve(data)
          });
        } catch (e) {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve([]),
            text: () => Promise.resolve(data)
          });
        }
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function getActiveChannels() {
  const res = await fetch(`${supabaseUrl}/rest/v1/channels?is_active=eq.true&select=id,name`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!res.ok) {
    const error = await res.text();
    console.error('Error fetching channels:', error);
    return [];
  }
  
  const data = await res.json();
  console.log(`Found ${data.length} active channels in database`);
  
  return data.map(ch => ({
    channel_id: ch.id,
    custom_name: ch.name
  }));
}

async function fetchLiveVideos(channelId, channelName) {
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=completed&order=date&maxResults=50&key=${youtubeApiKey}`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    
    if (searchJson.error) {
      console.error(`YouTube API search error for ${channelName}:`, searchJson.error.message);
      return [];
    }
    
    const items = searchJson.items || [];
    if (items.length === 0) {
      console.log(`[${channelName}] No completed live streams found`);
      return [];
    }
    
    const videoIds = items.map(item => item.id?.videoId).filter(Boolean);
    const batchSize = 50;
    const liveVideos = [];
    
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails,statistics&id=${batch.join(',')}&key=${youtubeApiKey}`
      );
      const videosJson = await videosRes.json();
      
      if (videosJson.error) {
        console.error(`YouTube API videos error:`, videosJson.error.message);
        continue;
      }
      
      const videoItems = videosJson.items || [];
      
      for (const video of videoItems) {
        if (video.liveStreamingDetails) {
          const snippet = video.snippet || {};
          const contentDetails = video.contentDetails || {};
          const liveDetails = video.liveStreamingDetails || {};
          const statistics = video.statistics || {};
          
          liveVideos.push({
            id: video.id,
            channel_id: channelId,
            title: snippet.title || 'Untitled',
            description: snippet.description || '',
            thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
            published_at: snippet.publishedAt || null,
            duration: contentDetails.duration || '',
            view_count: parseInt(statistics.viewCount || '0', 10),
            like_count: parseInt(statistics.likeCount || '0', 10),
            actual_start_time: liveDetails.actualStartTime || null,
            actual_end_time: liveDetails.actualEndTime || null,
            scheduled_start_time: liveDetails.scheduledStartTime || null,
            source_type: 'live'
          });
        }
      }
    }
    
    console.log(`[${channelName}] Found ${liveVideos.length} live/past-live videos`);
    return liveVideos;
  } catch (err) {
    console.error(`Error fetching live videos for ${channelName}:`, err.message);
    return [];
  }
}

async function saveVideos(videos, channelId) {
  if (videos.length === 0) return 0;
  
  // Check which videos already exist by video_id
  const videoIds = videos.map(v => v.id);
  const idsParam = videoIds.map(id => encodeURIComponent(id)).join(',');
  const res = await fetch(`${supabaseUrl}/rest/v1/videos?video_id=in.(${idsParam})&select=video_id`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  let existing = [];
  try {
    const jsonData = await res.json();
    existing = Array.isArray(jsonData) ? jsonData : [];
  } catch (e) {
    existing = [];
  }
  
  const existingIds = new Set(existing.map(v => v.video_id));
  const newVideos = videos.filter(v => !existingIds.has(v.id));
  
  if (newVideos.length === 0) {
    console.log(`  All ${videos.length} videos already exist in database`);
    return 0;
  }
  
  // Use correct column names matching the videos table schema
  const videosToInsert = newVideos.map(v => ({
    id: v.id,
    video_url: `https://www.youtube.com/watch?v=${v.id}`,
    playlist_id: `UU${v.channel_id.substring(2)}`, // Convert channel ID to uploads playlist ID
    title: v.title,
    description: v.description.substring(0, 1000),
    thumbnail_url: v.thumbnail,
    duration: v.duration || 'PT1H',
    views: v.view_count,
    likes_count: v.like_count,
    publish_date: v.published_at,
    subject: 'Mixed',
    exam_type: 'Both',
    is_active: true,
    created_at: new Date().toISOString(),
    source_type: v.source_type,
    live_start_time: v.actual_start_time,
    live_end_time: v.actual_end_time
  }));
  
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/videos`, {
    method: 'POST',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(videosToInsert)
  });
  
  if (!insertRes.ok) {
    const error = await insertRes.text();
    console.error(`  Error inserting videos: ${error.substring(0, 300)}`);
    return 0;
  }
  
  console.log(`  Inserted ${newVideos.length} new videos`);
  return newVideos.length;
}

async function main() {
  console.log('=== Live Lecture Extraction Started ===\n');
  console.log(`YouTube API Key configured: ${youtubeApiKey ? 'Yes' : 'No'}`);
  console.log(`Supabase URL: ${supabaseUrl}\n`);
  
  const channels = await getActiveChannels();
  console.log(`Will process ${channels.length} channels\n`);
  
  let totalFound = 0;
  let totalInserted = 0;
  const results = [];
  
  for (const channel of channels) {
    console.log(`\nProcessing: ${channel.custom_name || channel.channel_id}`);
    const liveVideos = await fetchLiveVideos(channel.channel_id, channel.custom_name || channel.channel_id);
    const inserted = await saveVideos(liveVideos, channel.channel_id);
    
    totalFound += liveVideos.length;
    totalInserted += inserted;
    
    results.push({
      channel: channel.custom_name || channel.channel_id,
      channelId: channel.channel_id,
      found: liveVideos.length,
      inserted: inserted,
      samples: liveVideos.slice(0, 3).map(v => ({
        title: v.title,
        startTime: v.actual_start_time,
        endTime: v.actual_end_time
      }))
    });
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  console.log('\n\n=== EXTRACTION COMPLETE ===');
  console.log(`Total live videos found: ${totalFound}`);
  console.log(`Total new videos inserted: ${totalInserted}`);
  console.log('\nResults by channel:');
  results.forEach(r => {
    console.log(`  ${r.channel}: ${r.found} found, ${r.inserted} inserted`);
    if (r.samples.length > 0) {
      console.log(`    Sample: "${r.samples[0].title}"`);
    }
  });
}

main().catch(console.error);
