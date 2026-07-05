const http = require('https');
const fs = require('fs');
const path = require('path');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!YOUTUBE_API_KEY) {
  console.error('Error: YOUTUBE_API_KEY environment variable is not set');
  process.exit(1);
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

async function fetchLiveVideos(channelId) {
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=completed&order=date&maxResults=50&key=${YOUTUBE_API_KEY}`;
    const completedJson = await fetchUrl(searchUrl);

    if (completedJson.error) {
      console.error(`YouTube API search error for ${channelId}:`, completedJson.error.message);
      return { liveVideos: [], totalFound: 0 };
    }

    const completedItems = completedJson.items || [];

    if (completedItems.length === 0) {
      return { liveVideos: [], totalFound: 0 };
    }

    const videoIds = completedItems.map(item => item.id?.videoId).filter(Boolean);

    if (videoIds.length === 0) {
      return { liveVideos: [], totalFound: 0 };
    }

    const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${videoIds.join(',')}&key=${YOUTUBE_API_KEY}`;
    const videosJson = await fetchUrl(videosUrl);

    if (videosJson.error) {
      console.error(`YouTube API videos error for ${channelId}:`, videosJson.error.message);
      return { liveVideos: [], totalFound: 0 };
    }

    const videoItems = videosJson.items || [];

    const liveVideos = videoItems
      .filter(item => item.liveStreamingDetails && item.liveStreamingDetails.actualStartTime)
      .map(item => ({
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
        duration: item.contentDetails.duration,
        viewCount: item.statistics.viewCount,
        likeCount: item.statistics.likeCount,
        actualStartTime: item.liveStreamingDetails.actualStartTime,
        actualEndTime: item.liveStreamingDetails.actualEndTime
      }));

    return { liveVideos, totalFound: liveVideos.length };
  } catch (error) {
    console.error(`Error fetching live videos for ${channelId}:`, error.message);
    return { liveVideos: [], totalFound: 0 };
  }
}

async function processChannels() {
  const channelsPath = path.join(__dirname, 'src', 'config', 'youtubeChannels.json');
  const channels = JSON.parse(fs.readFileSync(channelsPath, 'utf-8'));

  console.log(`Starting live video extraction for ${channels.length} channels...\n`);
  console.log(`API Key configured: ${YOUTUBE_API_KEY ? 'Yes' : 'No'}\n`);

  const results = [];

  const batchSize = 3;
  for (let i = 0; i < channels.length; i += batchSize) {
    const batch = channels.slice(i, i + batchSize);
    console.log(`\n=== Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(channels.length / batchSize)} ===`);
    
    for (const channel of batch) {
      console.log(`\nFetching live videos for: ${channel.name} (${channel.channelId})`);
      
      const result = await fetchLiveVideos(channel.channelId);
      
      const channelResult = {
        channelName: channel.name,
        channelId: channel.channelId,
        liveVideos: result.liveVideos,
        totalFound: result.totalFound
      };

      if (result.totalFound > 0) {
        console.log(`✓ Found ${result.totalFound} live/past-live videos`);
        result.liveVideos.slice(0, 2).forEach((video, idx) => {
          console.log(`  Example ${idx + 1}: "${video.title}"`);
          console.log(`    Duration: ${video.duration}, Views: ${video.viewCount}`);
          if (video.actualStartTime) {
            console.log(`    Live Start: ${video.actualStartTime}`);
          }
        });
      } else {
        console.log(`  No live/past-live videos found`);
      }

      results.push(channelResult);
    }

    if (i + batchSize < channels.length) {
      console.log('\nWaiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const outputPath = path.join(__dirname, 'live-videos-extraction-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n\n=== EXTRACTION COMPLETE ===`);
  console.log(`Results saved to: ${outputPath}`);
  
  const totalVideos = results.reduce((sum, r) => sum + r.totalFound, 0);
  const channelsWithLive = results.filter(r => r.totalFound > 0).length;
  
  console.log(`\nSummary:`);
  console.log(`  Total channels processed: ${results.length}`);
  console.log(`  Channels with live videos: ${channelsWithLive}`);
  console.log(`  Total live/past-live videos found: ${totalVideos}`);
  
  console.log(`\nPer-channel breakdown:`);
  results.forEach(r => {
    if (r.totalFound > 0) {
      console.log(`  ${r.channelName}: ${r.totalFound} videos`);
    }
  });
}

processChannels().catch(console.error);
