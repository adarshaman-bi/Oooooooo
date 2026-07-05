import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = "https://jicyzdfzcffhjqehvcpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU4NjA1NSwiZXhwIjoyMDk2MTYyMDU1fQ.-Bs6NT_xU1MAPRXXACuf22KMhzH1xqdCx-Oq3RHp67g";
const YOUTUBE_API_KEY = "AIzaSyDQ5o3fXjcoOvZE561IpIQaxiOqKxMntEo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

// Strategy/Promotional content filter patterns
const PROMO_PATTERNS = [
  /\blaunching\b/i, /\bbatch launch\b/i, /\badmission open\b/i, /\benrollment open\b/i,
  /\bjoin now\b/i, /\bchampions batch\b/i, /\byakeen\b/i, /\bscholarship test\b/i,
  /\bfree batch\b/i, /\bdropper batch\b/i,
  /\bresult out\b/i, /\bbreaking news\b/i, /\bpress conference\b/i,
  /\bministry of education\b/i, /\bnotification out\b/i, /\bexam postponed\b/i, /\bexam date\b/i,
  /\bwhat next\b/i, /\broadmap\b/i, /\bask me anything\b/i, /\bama\b/i,
  /\bmotivation\b/i, /\bsuccess story\b/i, /\btopper interview\b/i,
  /\bhow to crack\b/i, /\bstudy tips\b/i, /\btime table\b/i, /\bstrategy session\b/i,
  /\bx-factor\b/i, /\bis this enough\b/i, /\bhonest review\b/i, /\bbook review\b/i
];

const ACADEMIC_INDICATORS = [
  /\bphysics\b/i, /\bchemistry\b/i, /\bbiology\b/i, /\bbotany\b/i, /\bzoology\b/i,
  /\borganic\b/i, /\binorganic\b/i, /\bphysical\b/i, /\bmathematics\b/i, /\bmaths\b/i,
  /\bchapter\b/i, /\blecture\b/i, /\bclass\b/i, /\btopic\b/i, /\bone shot\b/i,
  /\bncert\b/i, /\bjee\b/i, /\bneet\b/i, /\bfull lecture\b/i, /\bcomplete\b/i,
  /\bthermodynamics\b/i, /\bmechanics\b/i, /\balgebra\b/i, /\bcalculus\b/i
];

function isStrategyOrPromoContent(title, description) {
  const text = (title || '') + ' ' + (description || '');
  for (const pattern of PROMO_PATTERNS) {
    if (pattern.test(text)) {
      const hasAcademic = ACADEMIC_INDICATORS.some(ind => ind.test(text));
      if (!hasAcademic) {
        return { isPromo: true, reason: `Matches promo pattern: ${pattern.toString()}` };
      }
    }
  }
  return { isPromo: false };
}

const KIDS_CONTENT_PATTERNS = [
  /\bcocomelon\b/i, /\bpeppa pig\b/i, /\bnursery rhyme\b/i, /\bkids song\b/i,
  /\bchildren song\b/i, /\bkids cartoon\b/i, /\btoddler\b/i, /\bpreschool\b/i
];

function isKidsContent(title, description) {
  const text = (title || '') + ' ' + (description || '');
  for (const pattern of KIDS_CONTENT_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

function parseDuration(duration) {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || '0', 10) * 3600 + parseInt(match[2] || '0', 10) * 60 + parseInt(match[3] || '0', 10);
}

function extractSubject(title, description) {
  const text = ((title || '') + ' ' + (description || '')).toLowerCase();
  if (text.includes('physics')) return 'Physics';
  if (text.includes('chemistry')) return 'Chemistry';
  if (text.includes('biology')) return 'Biology';
  if (text.includes('botany')) return 'Botany';
  if (text.includes('zoology')) return 'Zoology';
  if (text.includes('mathematics') || text.includes('maths')) return 'Mathematics';
  if (text.includes('english')) return 'English';
  if (text.includes('hindi')) return 'Hindi';
  return 'General';
}

async function fetchLiveVideos(channelId, channelName) {
  console.log(`\n=== Fetching live videos for: ${channelName} (${channelId}) ===`);
  
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=completed&order=date&maxResults=50&key=${YOUTUBE_API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchJson = await searchRes.json();
    
    if (searchJson.error) {
      console.error(`YouTube API error:`, searchJson.error.message);
      return { found: 0, inserted: 0, rejected: { promo: 0, kids: 0, other: 0 }, samples: [] };
    }
    
    const items = searchJson.items || [];
    if (items.length === 0) {
      console.log(`No live videos found for ${channelName}`);
      return { found: 0, inserted: 0, rejected: { promo: 0, kids: 0, other: 0 }, samples: [] };
    }
    
    const videoIds = items.map(item => item.id?.videoId).filter(Boolean);
    const batchSize = 50;
    const allVideos = [];
    
    for (let i = 0; i < videoIds.length; i += batchSize) {
      const batch = videoIds.slice(i, i + batchSize);
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,liveStreamingDetails,statistics&id=${batch.join(',')}&key=${YOUTUBE_API_KEY}`
      );
      const videosJson = await videosRes.json();
      
      if (videosJson.error) continue;
      
      for (const video of (videosJson.items || [])) {
        if (video.liveStreamingDetails) {
          const snippet = video.snippet || {};
          const contentDetails = video.contentDetails || {};
          const statistics = video.statistics || {};
          
          allVideos.push({
            id: video.id,
            title: snippet.title || 'Untitled',
            description: snippet.description || '',
            thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
            publishedAt: snippet.publishedAt || '',
            duration: contentDetails.duration || '',
            viewCount: parseInt(statistics.viewCount || '0', 10),
            likeCount: parseInt(statistics.likeCount || '0', 10)
          });
        }
      }
    }
    
    console.log(`Found ${allVideos.length} videos with liveStreamingDetails`);
    
    let inserted = 0;
    let rejected = { promo: 0, kids: 0, other: 0 };
    const rejectedSamples = [];
    
    for (const video of allVideos) {
      if (isKidsContent(video.title, video.description)) {
        rejected.kids++;
        if (rejectedSamples.length < 3) rejectedSamples.push({ title: video.title, reason: 'Kids content' });
        continue;
      }
      
      const promoCheck = isStrategyOrPromoContent(video.title, video.description);
      if (promoCheck.isPromo) {
        rejected.promo++;
        if (rejectedSamples.length < 3) rejectedSamples.push({ title: video.title, reason: promoCheck.reason });
        continue;
      }
      
      const videoData = {
        id: video.id,
        title: video.title,
        video_url: `https://youtube.com/watch?v=${video.id}`,
        duration: video.duration,
        duration_seconds: parseDuration(video.duration),
        category: 'Live Lecture',
        playlist_id: null,
        views: video.viewCount,
        view_count: video.viewCount,
        thumbnail_url: video.thumbnail,
        subject: extractSubject(video.title, video.description),
        exam_type: 'NEET/JEE',
        content_type: 'lecture',
        teacher_id: channelId,
        teacher_name: channelName,
        institute_id: null,
        institute_name: null,
        likes_count: video.likeCount,
        like_count: video.likeCount,
        publish_date: video.publishedAt,
        is_active: true,
        is_playable: true,
        embed_url: `https://www.youtube.com/embed/${video.id}`
      };
      
      const { error } = await supabase.from('videos').upsert(videoData, { onConflict: 'id' });
      if (error) {
        console.error(`Insert error for ${video.id}:`, error.message);
        rejected.other++;
      } else {
        inserted++;
      }
    }
    
    return { found: allVideos.length, inserted, rejected, samples: rejectedSamples };
  } catch (err) {
    console.error(`Error fetching live videos for ${channelId}:`, err.message);
    return { found: 0, inserted: 0, rejected: { promo: 0, kids: 0, other: 0 }, samples: [], error: err.message };
  }
}

console.log("=== LIVE LECTURE EXTRACTION WITH FILTERS ===");

const { data: channels, error } = await supabase
  .from('channels')
  .select('id, name, is_active')
  .eq('is_active', true);

if (error) {
  console.error('Error fetching channels:', error.message);
  process.exit(1);
}

console.log(`Found ${channels.length} active channels\n`);

const results = [];
for (const channel of channels) {
  const result = await fetchLiveVideos(channel.id, channel.name);
  results.push({ channelId: channel.id, channelName: channel.name, ...result });
}

console.log("\n========== EXTRACTION SUMMARY ==========");
let totalFound = 0, totalInserted = 0, totalRejected = { promo: 0, kids: 0, other: 0 };

for (const r of results) {
  console.log(`\n${r.channelName}:`);
  console.log(`  Found: ${r.found}, Inserted: ${r.inserted}`);
  console.log(`  Rejected - Promo: ${r.rejected.promo}, Kids: ${r.rejected.kids}, Other: ${r.rejected.other}`);
  if (r.samples && r.samples.length > 0) {
    console.log(`  Sample rejected titles:`);
    r.samples.forEach(s => console.log(`    - "${s.title}" (${s.reason})`));
  }
  totalFound += r.found;
  totalInserted += r.inserted;
  totalRejected.promo += r.rejected.promo;
  totalRejected.kids += r.rejected.kids;
  totalRejected.other += r.rejected.other;
}

console.log("\n========== TOTALS ==========");
console.log(`Total Found: ${totalFound}`);
console.log(`Total Inserted: ${totalInserted}`);
console.log(`Total Rejected - Promo: ${totalRejected.promo}, Kids: ${totalRejected.kids}, Other: ${totalRejected.other}`);

const { count } = await supabase
  .from('videos')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)
  .eq('content_type', 'lecture');

console.log(`\nTotal active lectures in DB: ${count}`);

console.log("\n========== SPOT CHECK FOR BLOCKED CONTENT ==========");
const blockedPhrases = ['launching', 'what next', 'press conference', 'ask me anything', 'roadmap'];
for (const phrase of blockedPhrases) {
  const { data: blocked } = await supabase
    .from('videos')
    .select('id, title')
    .ilike('title', `%${phrase}%`)
    .eq('is_active', true)
    .limit(5);
  
  if (blocked && blocked.length > 0) {
    console.log(`WARNING: Found ${blocked.length} videos containing "${phrase}":`);
    blocked.forEach(v => console.log(`  - ${v.title}`));
  } else {
    console.log(`✓ No videos found containing "${phrase}"`);
  }
}
