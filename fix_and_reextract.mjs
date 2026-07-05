import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const SUPABASE_URL = "https://jicyzdfzcffhjqehvcpk.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU4NjA1NSwiZXhwIjoyMDk2MTYyMDU1fQ.-Bs6NT_xU1MAPRXXACuf22KMhzH1xqdCx-Oq3RHp67g";
const YOUTUBE_API_KEY = "AIzaSyDQ5o3fXjcoOvZE561IpIQaxiOqKxMntEo";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { realtime: { transport: ws } });

// Fixed filter patterns - using simpler regex without word boundaries
const PROMO_PATTERNS = [
  /launching/i, /batch launch/i, /admission open/i, /enrollment open/i,
  /join now/i, /champions batch/i, /scholarship test/i,
  /free batch/i, /dropper batch/i,
  /result out/i, /breaking news/i, /press conference/i,
  /ministry of education/i, /notification out/i, /exam postponed/i, /exam date/i,
  /what next/i, /roadmap/i, /ask me anything/i, /\bama\b/i,
  /motivation/i, /success story/i, /topper interview/i,
  /how to crack/i, /study tips/i, /time table/i, /strategy session/i,
  /x-factor/i, /is this enough/i, /honest review/i, /book review/i
];

const ACADEMIC_INDICATORS = [
  /physics/i, /chemistry/i, /biology/i, /botany/i, /zoology/i,
  /organic/i, /inorganic/i, /physical chemistry/i, /mathematics/i, /maths/i,
  /chapter/i, /lecture/i, /\bclass\b/i, /topic/i, /one shot/i,
  /ncert/i, /\bjee\b/i, /\bneet\b/i, /full lecture/i, /complete [a-z]/i,
  /thermodynamics/i, /mechanics/i, /algebra/i, /calculus/i, /kinematics/i,
  /reproduction/i, /genetics/i, /ecosystem/i, /biomolecules/i, /enzymes/i
];

function isStrategyOrPromoContent(title, description) {
  const text = (title || '') + ' ' + (description || '');
  
  for (const pattern of PROMO_PATTERNS) {
    if (pattern.test(text)) {
      const hasAcademic = ACADEMIC_INDICATORS.some(ind => ind.test(text));
      if (!hasAcademic) {
        return { isPromo: true, reason: `Matches promo pattern: ${pattern.toString()}` };
      }
      // Special case: "roadmap" alone without specific subject/topic is still promo
      if (pattern.toString().includes('roadmap') && !/(chapter|lecture|class|topic|one shot|full)/i.test(text)) {
        return { isPromo: true, reason: 'Roadmap without academic content' };
      }
    }
  }
  return { isPromo: false };
}

const KIDS_CONTENT_PATTERNS = [
  /cocomelon/i, /peppa pig/i, /nursery rhyme/i, /kids song/i,
  /children song/i, /kids cartoon/i, /toddler/i, /preschool/i
];

function isKidsContent(title, description) {
  const text = (title || '') + ' ' + (description || '');
  for (const pattern of KIDS_CONTENT_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  return false;
}

console.log("=== DELETING PREVIOUSLY INSERTED LIVE VIDEOS ===");

// Delete the live videos we just inserted so we can re-insert with proper filtering
const channelsToProcess = [
  { id: 'UCcxP3vMEVVFafLBasCHcjCg', name: 'Unacademy NEET Toppers' },
  { id: 'UC3b3c5UhtPcNB45Smr_BeEQ', name: 'Physics Galaxy' },
  { id: 'UCgBmfNILAlXmGv3CsJ8oFJA', name: 'Physics Galaxy' },
  { id: 'UCkDb4531sPuHocFFSQE3qOQ', name: 'Rohit Aggarwal' },
  { id: 'UCUFcLKXPfS7ijJ_WSC20oeQ', name: 'NEET Competishun' },
  { id: 'UCD16eo98AXl-9T61Xd711kQ', name: 'Competition Wallah' },
  { id: 'UCWFXoexcMI1jQrHH2N-SJzQ', name: 'Sankalp NEET Vedantu' },
  { id: 'UCdQwYksctqqiRwqp3PiJMWA', name: 'Unacademy NEET' },
  { id: 'UCvQSK6a7gfYbNL11KalRfOw', name: 'Unacademy NEET English' }
];

for (const ch of channelsToProcess) {
  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('teacher_id', ch.id)
    .eq('content_type', 'lecture');
  
  if (error) {
    console.error(`Error deleting videos for ${ch.name}:`, error.message);
  } else {
    console.log(`Deleted videos for: ${ch.name}`);
  }
}

console.log("\n=== RE-EXTRACTING WITH FIXED FILTERS ===\n");

async function fetchLiveVideos(channelId, channelName) {
  console.log(`=== Fetching live videos for: ${channelName} (${channelId}) ===`);
  
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
        if (rejectedSamples.length < 5) rejectedSamples.push({ title: video.title, reason: promoCheck.reason });
        continue;
      }
      
      const durationMatch = (video.duration || '').match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      const durationSeconds = durationMatch 
        ? parseInt(durationMatch[1] || '0', 10) * 3600 + parseInt(durationMatch[2] || '0', 10) * 60 + parseInt(durationMatch[3] || '0', 10)
        : 0;
      
      const text = ((video.title || '') + ' ' + (video.description || '')).toLowerCase();
      let subject = 'General';
      if (text.includes('physics')) subject = 'Physics';
      else if (text.includes('chemistry')) subject = 'Chemistry';
      else if (text.includes('biology')) subject = 'Biology';
      else if (text.includes('botany')) subject = 'Botany';
      else if (text.includes('zoology')) subject = 'Zoology';
      else if (text.includes('mathematics') || text.includes('maths')) subject = 'Mathematics';
      else if (text.includes('english')) subject = 'English';
      
      const videoData = {
        id: video.id,
        title: video.title,
        video_url: `https://youtube.com/watch?v=${video.id}`,
        duration: video.duration,
        duration_seconds: durationSeconds,
        category: 'Live Lecture',
        playlist_id: null,
        views: video.viewCount,
        view_count: video.viewCount,
        thumbnail_url: video.thumbnail,
        subject: subject,
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

const { data: activeChannels } = await supabase
  .from('channels')
  .select('id, name, is_active')
  .eq('is_active', true);

console.log(`Processing ${activeChannels.length} active channels\n`);

const results = [];
for (const channel of activeChannels) {
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
