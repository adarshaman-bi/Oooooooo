import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const supabaseUrl = 'https://jicyzdfzcffhjqehvcpk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppY3l6ZGZ6Y2ZmaGpxZWh2Y3BrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDU4NjA1NSwiZXhwIjoyMDk2MTYyMDU1fQ.-Bs6NT_xU1MAPRXXACuf22KMhzH1xqdCx-Oq3RHp67g';
const YOUTUBE_API_KEY = 'AIzaSyDQ5o3fXjcoOvZE561IpIQaxiOqKxMntEo';

const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: { transport: ws }
});

const STRATEGY_KEYWORDS = [
  'strategy', 'strategies', 'motivation', 'motivational', 
  'how to crack', 'how to clear', 'preparation tips', 'tips & tricks',
  'tips and tricks', 'roadmap', 'last minute', 'study plan', 
  'cut-off', 'cutoff', 'marks vs rank', 'rank predictor', 'secrets of success',
  'jee strategy', 'neet strategy', 'preparation guide', 'timetable', 'time table',
  'leak', 'leaked', 'shocking', 'exposed', 'scam', 'do not miss', 'must watch',
  'guaranteed marks', 'cheat codes', 'cheat code', 'fail', 'crying',
  'emotional', 'sorry', 'insane', 'magic', 'magical', 'giveaway', 'surprise',
  'short', 'shorts', 'reel', 'reels', 'clip', 'clips', 'tiktok',
  'launching', 'batch', 'admission', 'enroll', 'registration', 'announcement',
  'press conference', 'breaking news', 'result out', 'ask me anything'
];

function isStrategyOrHypeContent(title) {
  if (!title) return false;
  const tLower = title.toLowerCase();
  return STRATEGY_KEYWORDS.some(keyword => tLower.includes(keyword));
}

const NON_ACADEMIC_KEYWORDS = [
  'cocomelon', 'peppa pig', 'nursery rhymes', 'kids songs', 'baby songs',
  'cartoon', 'animation for kids', 'children entertainment'
];

function isNonAcademicContent(title, description = '') {
  const text = (title + ' ' + description).toLowerCase();
  return NON_ACADEMIC_KEYWORDS.some(keyword => text.includes(keyword));
}

async function fetchLiveVideos(channelId, maxResults = 50) {
  const allVideos = [];
  let nextPageToken = null;
  
  do {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
    searchUrl.searchParams.set('channelId', channelId);
    searchUrl.searchParams.set('eventType', 'completed');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('order', 'date');
    searchUrl.searchParams.set('maxResults', Math.min(50, maxResults - allVideos.length));
    searchUrl.searchParams.set('fields', 'nextPageToken,items(id(videoId),snippet(title,description))');
    if (nextPageToken) searchUrl.searchParams.set('pageToken', nextPageToken);
    
    const searchResp = await fetch(searchUrl.toString());
    const searchData = await searchResp.json();
    
    if (searchData.error) {
      console.error('YouTube API error:', searchData.error);
      break;
    }
    
    const videoIds = searchData.items?.map(item => item.id.videoId).filter(Boolean) || [];
    
    if (videoIds.length > 0) {
      const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      videosUrl.searchParams.set('key', YOUTUBE_API_KEY);
      videosUrl.searchParams.set('id', videoIds.join(','));
      videosUrl.searchParams.set('part', 'snippet,contentDetails,liveStreamingDetails');
      videosUrl.searchParams.set('fields', 'items(id,snippet(title,description,publishTime),contentDetails(duration),liveStreamingDetails(actualStartTime,actualEndTime))');
      
      const videosResp = await fetch(videosUrl.toString());
      const videosData = await videosResp.json();
      
      if (videosData.error) {
        console.error('YouTube videos API error:', videosData.error);
      } else {
        const liveVideos = videosData.items?.filter(item => item.liveStreamingDetails !== undefined) || [];
        allVideos.push(...liveVideos);
      }
    }
    
    nextPageToken = searchData.nextPageToken;
  } while (nextPageToken && allVideos.length < maxResults);
  
  return allVideos.slice(0, maxResults);
}

async function main() {
  console.log('=== COMPLETE LIVE LECTURE EXTRACTION (ALL ACTIVE CHANNELS) ===\n');
  
  // Get all active channels
  const { data: channels, error: chError } = await supabase
    .from('channels')
    .select('id, name, avatar')
    .eq('is_active', true);
    
  if (chError) {
    console.log('Error fetching channels:', chError);
    return;
  }
  
  console.log(`Processing ${channels.length} active channels...\n`);
  
  let totalFound = 0;
  let totalValid = 0;
  
  for (const channel of channels) {
    console.log(`\n--- Channel: ${channel.name} (${channel.id}) ---`);
    
    try {
      const liveVideos = await fetchLiveVideos(channel.id, 50);
      
      console.log(`Found ${liveVideos.length} past-live videos`);
      
      if (liveVideos.length === 0) {
        console.log('No live/past-live content found for this channel.');
        continue;
      }
      
      const validLectures = liveVideos.filter(v => {
        const title = v.snippet?.title || '';
        return !isStrategyOrHypeContent(title) && !isNonAcademicContent(title);
      });
      
      totalFound += liveVideos.length;
      totalValid += validLectures.length;
      
      console.log(`Summary for ${channel.name}:`);
      console.log(`  - Total past-live videos found: ${liveVideos.length}`);
      console.log(`  - After filtering strategy/promotional content: ${validLectures.length}`);
      
    } catch (error) {
      console.error(`Error processing channel ${channel.name}:`, error.message);
    }
  }
  
  console.log('\n=== FINAL SUMMARY ===');
  console.log(`Total channels processed: ${channels.length}`);
  console.log(`Total past-live videos found: ${totalFound}`);
  console.log(`Total valid lectures after filtering: ${totalValid}`);
  console.log('\n=== EXTRACTION COMPLETE ===');
}

main().catch(console.error);
