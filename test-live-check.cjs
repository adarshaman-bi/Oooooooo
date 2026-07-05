const https = require('https');

// Check API key from environment
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey || apiKey === 'YOUR_YOUTUBE_DATA_API_V3_KEY' || apiKey.length < 10) {
  console.log('ERROR: YOUTUBE_API_KEY not configured in environment');
  console.log('Current value:', apiKey ? '[SET BUT MAYBE INVALID]' : '[NOT SET]');
  process.exit(1);
}

const targets = [
  { name: 'Competition Wallah', id: 'UCRjSO-juFtngAeJGJRMdIZw' },
  { name: 'Unacademy NEET', id: 'UCRIWslqlyC7p3M8z0EqtnTA' },
  { name: 'Vedantu Sankalp NEET', id: 'UCUzDn7v6yE6Y5xWzHqX5z6A' }
];

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function checkLiveContent() {
  console.log('--- STARTING PHASE 1 LIVE EXTRACTION CHECK ---\n');

  for (const channel of targets) {
    console.log('Scanning: ' + channel.name + ' (' + channel.id + ')...');
    
    try {
      const searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=' + channel.id + '&eventType=completed&type=video&order=date&maxResults=10&key=' + apiKey;
      const searchRes = await makeRequest(searchUrl);

      if (searchRes.error) {
        console.log('   API Error: ' + searchRes.error.message);
        continue;
      }

      const candidateIds = (searchRes.items || []).map(i => i.id && i.id.videoId).filter(Boolean);
      
      if (candidateIds.length === 0) {
        console.log('   No completed live events found via search.');
        continue;
      }

      const videosUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,contentDetails&id=' + candidateIds.join(',') + '&key=' + apiKey;
      const videoRes = await makeRequest(videosUrl);

      let validLiveCount = 0;
      let samples = [];

      for (const video of (videoRes.items || [])) {
        const hasLiveDetails = video.liveStreamingDetails && video.liveStreamingDetails.actualStartTime;
        const title = (video.snippet && video.snippet.title) ? video.snippet.title.toLowerCase() : '';
        const duration = (video.contentDetails && video.contentDetails.duration) ? video.contentDetails.duration : '';
        const isShort = duration.startsWith('PT0') || (duration.startsWith('PT1') && title.indexOf('hour') === -1);
        
        if (hasLiveDetails && isShort === false) {
          validLiveCount++;
          if (samples.length < 3) {
            samples.push({
              title: video.snippet.title,
              startTime: video.liveStreamingDetails.actualStartTime,
              duration: duration
            });
          }
        }
      }

      console.log('   Found ' + validLiveCount + ' valid past-live lectures.');
      if (samples.length > 0) {
        console.log('   Samples:');
        samples.forEach((s, i) => {
          console.log('      ' + (i+1) + '. "' + s.title.substring(0, 60) + '..." (Start: ' + s.startTime + ')');
        });
      } else {
        console.log('   Candidates found but filtered out (likely shorts or non-academic).');
      }

    } catch (err) {
      console.error('   Error scanning ' + channel.name + ': ', err.message);
    }
    console.log('');
  }
  
  console.log('--- PHASE 1 CHECK COMPLETE ---');
}

checkLiveContent();
