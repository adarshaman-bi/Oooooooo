import express from 'express';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getLiveTeacherLectures } from '../services/youtubeService';

dotenv.config();

const router = express.Router();

router.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key';
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

// 5-minute in-memory cache for live channels data
interface CacheStore {
  data: any;
  expiry: number;
}

let liveChannelsCache: CacheStore | null = null;

// GET /api/youtube/channels/live
router.get('/channels/live', async (req, res) => {
  const now = Date.now();
  if (liveChannelsCache && now < liveChannelsCache.expiry) {
    return res.json({ status: 'ok', source: 'cache', data: liveChannelsCache.data });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_DATA_API_V3_KEY') {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY environment variable is not defined or configured on the backend.' });
  }

  try {
    // A. Sync from youtubeChannels.json config to Supabase database monitored_channels
    let jsonChannels: any[] = [];
    try {
      let configPath = path.resolve(__dirname, '../src/config/youtubeChannels.json');
      if (!fs.existsSync(configPath)) {
        configPath = path.resolve(__dirname, './src/config/youtubeChannels.json');
      }
      if (!fs.existsSync(configPath)) {
        configPath = path.resolve(process.cwd(), './src/config/youtubeChannels.json');
      }
      if (!fs.existsSync(configPath)) {
        configPath = path.resolve(__dirname, '../config/youtubeChannels.json');
      }

      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed)) {
          jsonChannels = parsed;
        }
      }
    } catch (configErr) {
      console.warn('Could not read local youtubeChannels.json config:', configErr);
    }

    if (jsonChannels.length > 0) {
      const upsertData = jsonChannels.map(c => ({
        channel_id: c.channelId || c.channel_id,
        custom_name: c.name || c.custom_name,
        is_active: true
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('monitored_channels')
        .upsert(upsertData, { onConflict: 'channel_id' });

      if (upsertError) {
        console.error('Error syncing JSON channels to monitored_channels:', upsertError);
      }
    }

    // 1. Get all active monitored channels from Supabase
    const { data: dbChannels, error: dbError } = await supabaseAdmin
      .from('monitored_channels')
      .select('channel_id, custom_name')
      .eq('is_active', true);

    if (dbError) {
      console.error('Error fetching monitored channels from database:', dbError);
      return res.status(500).json({ error: dbError.message });
    }

    if (!dbChannels || dbChannels.length === 0) {
      return res.json({ status: 'ok', source: 'live', data: [] });
    }

    // 2. Fetch live data from YouTube Data API v3 concurrently
    const channelsData = await Promise.all(
      dbChannels.map(async (ch) => {
        const channelId = ch.channel_id;

        try {
          // A. Fetch Channel Branding & Statistics
          const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${apiKey}`;
          const channelRes = await fetch(channelUrl);
          const channelDataJson = await channelRes.json();

          if (channelDataJson.error) {
            console.error(`YouTube API channels error for ${channelId}:`, channelDataJson.error);
            return null;
          }

          const channelItem = channelDataJson.items?.[0] || null;
          if (!channelItem) {
            return null;
          }

          const snippet = channelItem.snippet || {};
          const statistics = channelItem.statistics || {};
          const branding = channelItem.brandingSettings || {};

          const logo = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '';
          const banner = branding.image?.bannerExternalUrl || '';
          const subscriberCount = statistics.subscriberCount || '0';
          const viewCount = statistics.viewCount || '0';
          const title = snippet.title || ch.custom_name || 'YouTube Channel';

          // B. Fetch Playlists
          const playlistsUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=25&key=${apiKey}`;
          const playlistsRes = await fetch(playlistsUrl);
          const playlistsDataJson = await playlistsRes.json();

          if (playlistsDataJson.error) {
            console.error(`YouTube API playlists error for ${channelId}:`, playlistsDataJson.error);
            return null;
          }

          const playlists = (playlistsDataJson.items || []).map((item: any) => ({
            id: item.id,
            title: item.snippet?.title || 'Playlist',
            description: item.snippet?.description || '',
            thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
            publishedAt: item.snippet?.publishedAt || ''
          }));

          // C. Fetch Live Stream Status
          let liveStream = null;
          try {
            const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${apiKey}`;
            const liveRes = await fetch(liveUrl);
            const liveDataJson = await liveRes.json();
            if (liveDataJson.items && liveDataJson.items.length > 0) {
              const item = liveDataJson.items[0];
              liveStream = {
                videoId: item.id?.videoId || '',
                title: item.snippet?.title || '',
                thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || ''
              };
            }
          } catch (liveErr) {
            console.warn(`Could not check live stream status for channel ${channelId}:`, liveErr);
          }

          return {
            id: channelId,
            title,
            customName: ch.custom_name,
            logo,
            banner,
            subscriberCount: parseInt(subscriberCount, 10),
            viewCount: parseInt(viewCount, 10),
            playlists,
            liveStream
          };
        } catch (err) {
          console.error(`Error querying YouTube live metadata for channel ${channelId}:`, err);
          return null;
        }
      })
    );

    const filteredChannels = channelsData.filter(Boolean);

    // Save response to 5-minute cache
    liveChannelsCache = {
      data: filteredChannels,
      expiry: now + 5 * 60 * 1000 // 5 minutes
    };

    return res.json({ status: 'ok', source: 'live', data: filteredChannels });
  } catch (e: any) {
    console.error('Error fetching live YouTube channels aggregation:', e);
    return res.status(500).json({ error: e.message || 'Failed to fetch live YouTube channels.' });
  }
});

// GET /api/youtube/reviews/:videoId
router.get('/reviews/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    const { data: reviews, error } = await supabaseAdmin
      .from('reviews')
      .select('id, video_id:entity_id, user_id, rating, review_text:comment, created_at')
      .eq('entity_type', 'video')
      .eq('entity_id', videoId);

    if (error) {
      console.error(`Error loading reviews for video ${videoId}:`, error);
      return res.status(500).json({ error: error.message });
    }

    // Compute mathematical average rating
    let averageRating = 0;
    if (reviews && reviews.length > 0) {
      const total = reviews.reduce((sum, r) => sum + Number(r.rating), 0);
      averageRating = total / reviews.length;
    }

    return res.json({
      status: 'ok',
      reviews: reviews || [],
      averageRating: parseFloat(averageRating.toFixed(1))
    });
  } catch (e: any) {
    console.error(`Error executing GET reviews for video ${videoId}:`, e);
    return res.status(500).json({ error: e.message || 'Failed to retrieve reviews.' });
  }
});

// POST /api/youtube/reviews/:videoId (Authenticated)
router.post('/reviews/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const { rating, reviewText } = req.body;

  // 1. Verify user session via authorization header Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: missing authorization header Bearer token' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: invalid or expired session token' });
    }

    // 2. Validate inputs
    const parsedRating = parseFloat(rating);
    if (isNaN(parsedRating) || parsedRating < 1.0 || parsedRating > 5.0) {
      return res.status(400).json({ error: 'Validation Error: Rating must be a number between 1.0 and 5.0' });
    }

    // 3. Insert review
    const { data: newReview, error: dbError } = await supabaseAdmin
      .from('reviews')
      .insert({
        id: `rev_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        entity_id: videoId,
        entity_type: 'video',
        user_id: user.id,
        user_display_name: user.user_metadata?.display_name || user.email || 'Anonymous Student',
        rating: parsedRating,
        comment: reviewText || '',
        created_at: new Date().toISOString()
      })
      .select('id, video_id:entity_id, user_id, rating, review_text:comment, created_at');

    if (dbError) {
      console.error(`Database insertion failed for review on video ${videoId}:`, dbError);
      return res.status(500).json({ error: dbError.message });
    }

    return res.json({ status: 'ok', data: newReview });
  } catch (err: any) {
    console.error(`Error executing POST review for video ${videoId}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to post review.' });
  }
});

// Helper to get channels from config
function getChannelsFromConfig() {
  try {
    let configPath = path.resolve(__dirname, '../src/config/youtubeChannels.json');
    if (!fs.existsSync(configPath)) {
      configPath = path.resolve(__dirname, './src/config/youtubeChannels.json');
    }
    if (!fs.existsSync(configPath)) {
      configPath = path.resolve(process.cwd(), './src/config/youtubeChannels.json');
    }
    if (!fs.existsSync(configPath)) {
      configPath = path.resolve(__dirname, '../config/youtubeChannels.json');
    }

    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(fileContent);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (configErr) {
    console.warn('Could not read local youtubeChannels.json config:', configErr);
  }
  return [];
}

// GET /api/youtube/channels
router.get('/channels', (req, res) => {
  const channels = getChannelsFromConfig();
  return res.json({ status: 'ok', data: channels });
});

// Cache store for channel profiles
interface ChannelCacheStore {
  data: any;
  expiry: number;
}
const channelProfileCache: Record<string, ChannelCacheStore> = {};

// GET /api/youtube/channel/:channelId
router.get('/channel/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const now = Date.now();

  if (channelProfileCache[channelId] && now < channelProfileCache[channelId].expiry) {
    return res.json({ status: 'ok', source: 'cache', data: channelProfileCache[channelId].data });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_DATA_API_V3_KEY') {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY environment variable is not defined or configured on the backend.' });
  }

  try {
    const [channelRes, playlistsRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&id=${channelId}&key=${apiKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=25&key=${apiKey}`)
    ]);

    const channelJson = await channelRes.json();
    const playlistsJson = await playlistsRes.json();

    if (channelJson.error) {
      console.error(`YouTube API channels error for ${channelId}:`, channelJson.error);
      return res.status(500).json({ error: channelJson.error.message || 'YouTube channels list error.' });
    }
    if (playlistsJson.error) {
      console.error(`YouTube API playlists error for ${channelId}:`, playlistsJson.error);
      return res.status(500).json({ error: playlistsJson.error.message || 'YouTube playlists list error.' });
    }

    const channelItem = channelJson.items?.[0] || null;
    if (!channelItem) {
      return res.status(404).json({ error: 'YouTube channel not found.' });
    }

    const snippet = channelItem.snippet || {};
    const statistics = channelItem.statistics || {};
    const branding = channelItem.brandingSettings || {};

    const logo = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '';
    const banner = branding.image?.bannerExternalUrl || '';
    const subscriberCount = statistics.subscriberCount ? parseInt(statistics.subscriberCount, 10) : 0;
    const viewCount = statistics.viewCount ? parseInt(statistics.viewCount, 10) : 0;
    const videoCount = statistics.videoCount ? parseInt(statistics.videoCount, 10) : 0;
    const title = snippet.title || 'YouTube Channel';

    const playlists = (playlistsJson.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || 'Playlist',
      description: item.snippet?.description || '',
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      publishedAt: item.snippet?.publishedAt || ''
    }));

    // Check live status
    let liveStream = null;
    try {
      const liveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&eventType=live&key=${apiKey}`;
      const liveResponse = await fetch(liveUrl);
      const liveDataJson = await liveResponse.json();
      if (liveDataJson.items && liveDataJson.items.length > 0) {
        const item = liveDataJson.items[0];
        liveStream = {
          videoId: item.id?.videoId || '',
          title: item.snippet?.title || '',
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.high?.url || ''
        };
      }
    } catch (liveErr) {
      console.warn(`Could not check live stream status for channel ${channelId}:`, liveErr);
    }

    const channelData = {
      id: channelId,
      title,
      customName: snippet.customUrl || title,
      logo,
      banner,
      subscriberCount,
      viewCount,
      videoCount,
      playlists,
      liveStream
    };

    // Sync channel metadata to public.channels table
    try {
      await supabaseAdmin.from('channels').upsert({
        id: channelId,
        name: title,
        avatar: logo,
        subscribers: String(subscriberCount),
        playlists_count: playlists.length,
        is_active: true,
      } as any, { onConflict: 'id' });
    } catch (syncErr: any) {
      console.warn(`[SYNC] Failed to sync channel ${channelId} to DB:`, syncErr.message);
    }

    // Cache for 5 minutes
    channelProfileCache[channelId] = {
      data: channelData,
      expiry: now + 5 * 60 * 1000
    };

    return res.json({ status: 'ok', source: 'live', data: channelData });
  } catch (err: any) {
    console.error(`Error executing GET channel/:channelId for ${channelId}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to fetch channel profile.' });
  }
});

// GET /api/youtube/lectures/:playlistId
router.get('/lectures/:playlistId', async (req, res) => {
  let { playlistId } = req.params;

  // If it's a channel ID, construct the uploads playlist ID
  if (playlistId.startsWith('UC')) {
    playlistId = 'UU' + playlistId.substring(2);
  }

  try {
    const lectures = await getLiveTeacherLectures(playlistId);
    // Format to match old schema expectations + deep stats
    const formattedLectures = lectures.map(v => ({
      id: v.id,
      title: v.title,
      description: v.description,
      thumbnail: v.thumbnail,
      publishedAt: v.publishedAt,
      videoUrl: `https://www.youtube.com/embed/${v.id}`,
      viewCount: v.viewCount || 0,
      duration: v.duration || '',
    }));
    return res.json({ status: 'ok', data: formattedLectures });
  } catch (err: any) {
    console.error(`Error executing GET lectures for playlist ${playlistId}:`, err);
    return res.status(500).json({ error: err.message || 'Failed to fetch video lectures.' });
  }
});

export default router;
