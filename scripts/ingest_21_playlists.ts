// Ingestion script: 21 verified playlists — July 2026
// Features:
//   - Real metadata fetch (no assumptions)
//   - Subscriber count stored per channel
//   - Subject/series batch detection (Aagaz, Junoon, Sprint, Prachand, etc.)
//   - Playlist dedup on playlist_id (not title)
//   - Video dedup within batches
//   - Mismatch flag if fetched video count != claimed count
//   - Hindi-medium filter + audit trail
//   - "Newly added channels" log
//   - Channel name normalization

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import {
  parseISO8601Duration,
  getDurationInSeconds,
  isAcademicContent
} from '../src/utils/youtubeUtils.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const YT_KEY = process.env.YOUTUBE_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !YT_KEY) {
  console.error('❌ Missing required env vars. Aborting.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── Playlist manifest ───────────────────────────────────────────────────────
const PLAYLISTS: Array<{
  id: string;
  claimedCount: number;
  stream: 'A' | 'B';
  examType: 'NEET' | 'JEE' | 'Both';
}> = [
  { id: 'PLnG6YW15b0oS2nAV-VCeM-lChp2mxs92Q', claimedCount: 20,  stream: 'A', examType: 'NEET' },
  { id: 'PLsgHooHkqhhOcUymC3AOhf_uSoh_IIvcw',  claimedCount: 21,  stream: 'A', examType: 'NEET' },
  { id: 'PLDJktDT5uc9v4XQWvlV2mUnhrr6xgos9v',  claimedCount: 33,  stream: 'B', examType: 'JEE'  },
  { id: 'PLF7C-DWw7CnN0CaVEMXz60uIYzboP5-RW',  claimedCount: 14,  stream: 'B', examType: 'Both' },
  { id: 'PLB947pxgeu_0Ip5G6lnvRQV96xI4V-XcO',  claimedCount: 18,  stream: 'B', examType: 'NEET' },
  { id: 'PL0vh-44V09GTN6REEB2-whi1JRmVkNZ-R',  claimedCount: 35,  stream: 'B', examType: 'NEET' },
  { id: 'PLy6p4R8K23QXgDchWo0sPPhxm8_uwYN6_',  claimedCount: 115, stream: 'B', examType: 'NEET' },
  { id: 'PLCRUKVXbvwFe40sJefcVdLy6rsGTMH-J_',  claimedCount: 12,  stream: 'B', examType: 'NEET' },
  { id: 'PLjvx7xqdpePIeCvAk2eO45rgZIgdQmpPD',  claimedCount: 42,  stream: 'B', examType: 'JEE'  },
  { id: 'PLsgHooHkqhhPnjfxO4YBywjl0dj2YDC2b',  claimedCount: 15,  stream: 'B', examType: 'NEET' },
  { id: 'PLDyO-0__XCOejQgQc1r4vISjiq24K8WFD',  claimedCount: 50,  stream: 'B', examType: 'NEET' },
  { id: 'PL3m-p7hatfDpXCG9VrbS9LKbES-1ZcgOv',  claimedCount: 19,  stream: 'B', examType: 'NEET' },
  { id: 'PLzSTglXGeoUsXRqVND_XX8C_S9DenBT89',  claimedCount: 16,  stream: 'A', examType: 'NEET' },
  { id: 'PLru9htpOg_gdafDcr6je8zPI62LosWk_Y',  claimedCount: 29,  stream: 'B', examType: 'NEET' },
  { id: 'PLIyq6M-A8_LwcwH7XTWB3jK7rJRsZse2x',  claimedCount: 22,  stream: 'B', examType: 'Both' },
  { id: 'PLtvLAK4LEZ7r5iJMwDhHYqMAXqcdzjpYC',  claimedCount: 13,  stream: 'B', examType: 'NEET' },
  { id: 'PLyZOjc_8pbAxntfG8WwdUlJLdMnbM8rvD',  claimedCount: 15,  stream: 'B', examType: 'Both' },
  { id: 'PLDyO-0__XCOdSYcKVrpr7LJSbdJEFcRbp',  claimedCount: 24,  stream: 'A', examType: 'NEET' },
  { id: 'PLYVDsiuOZP5pp1ak489L0oaMulGzuQWQ3',  claimedCount: 27,  stream: 'B', examType: 'Both' },
  { id: 'PLCzaIJYXP5Yf-lxJBv4SGHxSryMLcGaqw',  claimedCount: 176, stream: 'B', examType: 'NEET' },
  { id: 'PLjvx7xqdpePIhuRDZnZA49oCEALDv48b_',  claimedCount: 11,  stream: 'A', examType: 'JEE'  },
];

// ─── Series/batch keyword detection ─────────────────────────────────────────
const SERIES_KEYWORDS: Array<{
  keyword: string;
  batchId: string;
  batchName: string;
  examType: 'NEET' | 'JEE' | 'Both';
}> = [
  { keyword: 'aagaz',         batchId: 'batch_aagaz_2026',          batchName: 'Aagaz Series 2026',       examType: 'NEET' },
  { keyword: 'junoon',        batchId: 'batch_junoon_2024',         batchName: 'Junoon Free Course 2024', examType: 'NEET' },
  { keyword: 'sprint',        batchId: 'batch_sprint_2024',         batchName: 'Sprint Series 2024',      examType: 'NEET' },
  { keyword: 'prachand',      batchId: 'batch_prachand',            batchName: 'Prachand Series',         examType: 'Both' },
  { keyword: 'umeed',         batchId: 'batch_pw_umeed_neet_2025',  batchName: 'PW Umeed NEET 2025',      examType: 'NEET' },
  { keyword: 'one shot',      batchId: 'batch_one_shot_collection', batchName: 'One Shot Collection',     examType: 'Both' },
  { keyword: 'oneshot',       batchId: 'batch_one_shot_collection', batchName: 'One Shot Collection',     examType: 'Both' },
  { keyword: 'killer series', batchId: 'batch_killer_series',       batchName: 'Killer Series PYQ',       examType: 'Both' },
  { keyword: 'phd series',    batchId: 'batch_phd_series',          batchName: 'PhD Series Physics',      examType: 'JEE'  },
  { keyword: 'last minute',   batchId: 'batch_last_minute_revision',batchName: 'Last Minute Revision',    examType: 'Both' },
  { keyword: 'neet pe jeet',  batchId: 'batch_neet_pe_jeet',        batchName: 'NEET pe Jeet Series',     examType: 'NEET' },
  { keyword: 'pyq',           batchId: 'batch_pyq_collection',      batchName: 'PYQ Collection',          examType: 'Both' },
  { keyword: 'revision',      batchId: 'batch_revision_collection', batchName: 'Revision Collection',     examType: 'Both' },
  { keyword: 'podcast',       batchId: 'batch_podcast_series',      batchName: 'Audio/Podcast Series',    examType: 'NEET' },
];

// ─── Hindi-medium detection ──────────────────────────────────────────────────
const HINDI_MEDIUM_SIGNALS = [
  'hindi medium', 'हिन्दी', 'हिंदी माध्यम', 'hindi mein',
  'in hindi only', 'exclusively in hindi',
];
function isHindiMedium(title: string, description: string): boolean {
  const combined = (title + ' ' + description).toLowerCase();
  return HINDI_MEDIUM_SIGNALS.some(s => combined.includes(s.toLowerCase()));
}

// ─── Channel name normalizer ─────────────────────────────────────────────────
function normalizeChannelName(raw: string): string {
  return raw.replace(/[_]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ─── Subject detector from playlist title ────────────────────────────────────
function detectSubject(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('physics')) return 'Physics';
  if (t.includes('chemistry') || t.includes('organic') || t.includes('inorganic')) return 'Chemistry';
  if (t.includes('biology') || t.includes('botany') || t.includes('zoology') || t.includes('genetics')) return 'Biology';
  if (t.includes('math') || t.includes('maths')) return 'Mathematics';
  return 'General';
}

// ─── Schema detect + filter ─────────────────────────────────────────────────
async function getTableColumns(table: string): Promise<string[]> {
  const { data } = await supabase.from(table).select('*').limit(1);
  if (data && data.length > 0) return Object.keys(data[0]);
  return [];
}
function filterCols(payload: Record<string, any>, cols: string[]): Record<string, any> {
  if (cols.length === 0) return payload;
  const out: Record<string, any> = {};
  for (const k of Object.keys(payload)) {
    if (cols.includes(k)) out[k] = payload[k];
  }
  return out;
}

// ─── Audit & Logging ─────────────────────────────────────────────────────────
interface AuditEntry {
  playlistId: string;
  playlistTitle: string;
  channelName: string;
  reason: string;
  severity: 'EXCLUDED' | 'FLAGGED' | 'INFO';
}
const AUDIT: AuditEntry[] = [];
const NEWLY_ADDED_CHANNELS: string[] = [];
const INGESTED_PLAYLISTS: Array<{
  id: string; title: string; channelName: string; videoCount: number; batchKeywords: string[];
}> = [];

// ─── Fetch channel stats ─────────────────────────────────────────────────────
async function fetchChannelStats(channelId: string) {
  try {
    const res = await axios.get(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YT_KEY}`
    );
    const item = res.data.items?.[0];
    if (!item) return { subscribers: 0, thumbnail: '', title: '', handle: '' };
    return {
      subscribers: parseInt(item.statistics?.subscriberCount || '0', 10),
      thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
      title: normalizeChannelName(item.snippet?.title || ''),
      handle: item.snippet?.customUrl || ''
    };
  } catch {
    return { subscribers: 0, thumbnail: '', title: '', handle: '' };
  }
}

// ─── Core playlist ingestion ─────────────────────────────────────────────────
interface IngestResult {
  playlistId: string;
  title: string;
  channelId: string;
  channelName: string;
  channelHandle: string;
  channelSubscribers: number;
  channelThumbnailUrl: string;
  coverThumbnailUrl: string;
  videoCount: number;
  examType: string;
  detectedKeywords: string[];
}

async function ingestPlaylist(
  playlistId: string,
  claimedCount: number,
  examType: string,
  playlistCols: string[],
  videoCols: string[]
): Promise<IngestResult | null> {
  console.log(`\n📡 [${playlistId}] Fetching...`);

  // Dedup: skip if already in DB
  const { data: existing } = await supabase
    .from('playlists').select('id, title').eq('id', playlistId).maybeSingle();
  if (existing) {
    console.log(`  ⏭  Already in DB: "${existing.title}" — skipping`);
    AUDIT.push({ playlistId, playlistTitle: existing.title, channelName: '—', reason: 'Already ingested (dedup by playlist_id)', severity: 'INFO' });
    return null;
  }

  try {
    // 1. Playlist metadata
    const plRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YT_KEY}`
    );
    const plItem = plRes.data.items?.[0];
    if (!plItem) {
      AUDIT.push({ playlistId, playlistTitle: '(not found)', channelName: 'N/A', reason: 'Not found on YouTube API', severity: 'EXCLUDED' });
      return null;
    }

    const playlistTitle: string = plItem.snippet?.title || 'Untitled';
    const description: string = plItem.snippet?.description || '';
    const channelId: string = plItem.snippet?.channelId || '';

    // 2. Hindi-medium guard
    if (isHindiMedium(playlistTitle, description)) {
      console.warn(`  🚫 Hindi-medium detected for "${playlistTitle}"`);
      AUDIT.push({ playlistId, playlistTitle, channelName: plItem.snippet?.channelTitle || '', reason: 'EXCLUDED: Hindi-medium content', severity: 'EXCLUDED' });
      return null;
    }

    // 3. Channel stats (real data)
    const ch = await fetchChannelStats(channelId);
    const channelName = ch.title || normalizeChannelName(plItem.snippet?.channelTitle || '');
    console.log(`  Channel: ${channelName} | ${ch.subscribers.toLocaleString()} subs | ${ch.handle}`);

    // 4. Enumerate playlist items
    let pageToken: string | undefined;
    const videoRefs: Array<{ videoId: string; position: number }> = [];
    let pos = 0;
    do {
      let url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${YT_KEY}`;
      if (pageToken) url += `&pageToken=${pageToken}`;
      const res = await axios.get(url);
      for (const item of res.data.items || []) {
        const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (vid) videoRefs.push({ videoId: vid, position: pos++ });
      }
      pageToken = res.data.nextPageToken;
    } while (pageToken);

    const fetchedCount = videoRefs.length;
    console.log(`  Videos: fetched=${fetchedCount}, claimed=${claimedCount}`);

    // 5. Flag count mismatch (don't exclude, just flag)
    if (fetchedCount !== claimedCount) {
      AUDIT.push({
        playlistId, playlistTitle, channelName,
        reason: `FLAGGED: count mismatch — fetched ${fetchedCount} vs claimed ${claimedCount}. Needs human review.`,
        severity: 'FLAGGED'
      });
    }

    // 6. Hard rule: >10 videos
    if (fetchedCount <= 10) {
      console.warn(`  🚫 Only ${fetchedCount} videos — below 10-video threshold. Excluding.`);
      AUDIT.push({ playlistId, playlistTitle, channelName, reason: `EXCLUDED: only ${fetchedCount} videos (≤10)`, severity: 'EXCLUDED' });
      return null;
    }

    // 7. Hydrate video details
    const videoIds = videoRefs.map(v => v.videoId);
    const videoDetailsMap = new Map<string, any>();
    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const res = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,statistics&id=${chunk.join(',')}&key=${YT_KEY}`
      );
      for (const v of res.data.items || []) videoDetailsMap.set(v.id, v);
    }

    // 8. Detect series keywords
    const titleLower = playlistTitle.toLowerCase();
    const detectedKeywords: string[] = [];
    for (const kw of SERIES_KEYWORDS) {
      if (titleLower.includes(kw.keyword.toLowerCase()) && !detectedKeywords.includes(kw.keyword)) {
        detectedKeywords.push(kw.keyword);
      }
    }

    // 9. Build video payloads
    const videoPayloads: any[] = [];
    let totalDurationSec = 0;
    let playableCount = 0;
    let coverThumbnailUrl = '';
    const isOneShotPlaylist = titleLower.includes('one shot') || titleLower.includes('oneshot');

    for (const ref of videoRefs) {
      const video = videoDetailsMap.get(ref.videoId);
      if (!video) {
        videoPayloads.push(filterCols({
          id: ref.videoId,
          video_id: ref.videoId,
          playlist_id: playlistId,
          position_in_playlist: ref.position,
          position: ref.position,
          title: 'Unavailable Video',
          description: 'Private or deleted.',
          channel_id: channelId,
          channel_title: channelName,
          teacher_name: channelName,
          thumbnail_url: '',
          duration_seconds: 0,
          duration: '0:00',
          view_count: 0,
          views: 0,
          like_count: 0,
          likes_count: 0,
          published_at: new Date().toISOString(),
          publish_date: new Date().toISOString(),
          is_playable: false,
          is_active: false,
          embed_url: `https://www.youtube.com/embed/${ref.videoId}`,
          video_url: `https://www.youtube.com/watch?v=${ref.videoId}`,
          subject: detectSubject(playlistTitle),
          category: 'lecture',
          content_type: 'lecture',
          updated_at: new Date().toISOString()
        }, videoCols));
        continue;
      }

      const title: string = video.snippet?.title || '';
      const durationISO: string = video.contentDetails?.duration || '';
      const durationSec = getDurationInSeconds(durationISO);
      const privacy = video.status?.privacyStatus;

      if (privacy === 'private' || privacy === 'deleted') continue;
      if (durationSec < 600) continue;
      if (!isAcademicContent(title)) continue;

      const sn = video.snippet || {};
      const thumbs = sn.thumbnails || {};
      const thumbnailUrl: string =
        thumbs.maxres?.url || thumbs.standard?.url || thumbs.high?.url ||
        thumbs.medium?.url || thumbs.default?.url ||
        `https://i.ytimg.com/vi/${ref.videoId}/hqdefault.jpg`;

      if (playableCount === 0) coverThumbnailUrl = thumbnailUrl;
      totalDurationSec += durationSec;
      playableCount++;

      videoPayloads.push(filterCols({
        id: ref.videoId,
        video_id: ref.videoId,
        playlist_id: playlistId,
        position_in_playlist: ref.position,
        position: ref.position,
        title,
        description: sn.description || '',
        channel_id: channelId,
        channel_title: channelName,
        teacher_name: channelName,
        thumbnail_url: thumbnailUrl,
        duration_seconds: durationSec,
        duration: parseISO8601Duration(durationISO),
        view_count: parseInt(video.statistics?.viewCount || '0', 10),
        views: parseInt(video.statistics?.viewCount || '0', 10),
        like_count: parseInt(video.statistics?.likeCount || '0', 10),
        likes_count: parseInt(video.statistics?.likeCount || '0', 10),
        published_at: sn.publishedAt || new Date().toISOString(),
        publish_date: sn.publishedAt || new Date().toISOString(),
        is_playable: true,
        is_active: true,
        embed_url: `https://www.youtube.com/embed/${ref.videoId}`,
        video_url: `https://www.youtube.com/watch?v=${ref.videoId}`,
        subject: detectSubject(playlistTitle),
        category: 'lecture',
        content_type: isOneShotPlaylist ? 'one_shot' : 'playlist',
        updated_at: new Date().toISOString()
      }, videoCols));
    }

    if (videoPayloads.length === 0) {
      AUDIT.push({ playlistId, playlistTitle, channelName, reason: 'FLAGGED: 0 academic videos survived filtering', severity: 'FLAGGED' });
      return null;
    }

    // Dedup by video ID
    const uniqueVideos = new Map<string, any>();
    for (const v of videoPayloads) uniqueVideos.set(v.id || v.video_id, v);
    const uniqueVideoList = Array.from(uniqueVideos.values());

    // 10. Upsert playlist row
    const plRow = filterCols({
      id: playlistId,
      playlist_id: playlistId,
      title: playlistTitle,
      description,
      channel_id: channelId,
      channel_title: channelName,
      channel_thumbnail_url: ch.thumbnail,
      channel_subscriber_count: ch.subscribers,
      cover_thumbnail_url: coverThumbnailUrl,
      thumbnail: coverThumbnailUrl,
      content_type: isOneShotPlaylist ? 'one_shot' : 'playlist',
      lectures_count: playableCount,
      total_duration_seconds: totalDurationSec,
      subject_tags: [detectSubject(playlistTitle)],
      exam_tags: [examType],
      exam_type: examType,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: detectSubject(playlistTitle),
      is_active: true
    }, playlistCols);

    const { error: plErr } = await supabase.from('playlists').upsert(plRow);
    if (plErr) {
      console.error(`  ❌ Playlist upsert failed: ${plErr.message}`);
      AUDIT.push({ playlistId, playlistTitle, channelName, reason: `DB error: ${plErr.message}`, severity: 'FLAGGED' });
      return null;
    }

    const { error: vidErr } = await supabase.from('videos').upsert(uniqueVideoList);
    if (vidErr) {
      console.error(`  ❌ Video upsert failed: ${vidErr.message}`);
    } else {
      console.log(`  ✅ Saved: "${playlistTitle}" — ${uniqueVideoList.length} videos`);
    }

    // 11. Channel record (upsert if new)
    const { data: existingCh } = await supabase.from('channels').select('id').eq('id', channelId).maybeSingle();
    if (!existingCh) {
      const channelCols = await getTableColumns('channels');
      await supabase.from('channels').upsert(filterCols({
        id: channelId,
        channel_id: channelId,
        name: channelName,
        title: channelName,
        handle: ch.handle,
        thumbnail_url: ch.thumbnail,
        subscriber_count: ch.subscribers,
        subscribers: ch.subscribers,
        is_active: true,
        updated_at: new Date().toISOString()
      }, channelCols));
      NEWLY_ADDED_CHANNELS.push(`${channelName} (${ch.handle}) — ${ch.subscribers.toLocaleString()} subs`);
    }

    INGESTED_PLAYLISTS.push({
      id: playlistId, title: playlistTitle, channelName,
      videoCount: uniqueVideoList.length, batchKeywords: detectedKeywords
    });

    return {
      playlistId, title: playlistTitle, channelId, channelName,
      channelHandle: ch.handle, channelSubscribers: ch.subscribers,
      channelThumbnailUrl: ch.thumbnail, coverThumbnailUrl,
      videoCount: uniqueVideoList.length, examType, detectedKeywords
    };

  } catch (err: any) {
    console.error(`  ❌ Exception for ${playlistId}: ${err.message}`);
    AUDIT.push({ playlistId, playlistTitle: '(error)', channelName: 'N/A', reason: `Exception: ${err.message}`, severity: 'FLAGGED' });
    return null;
  }
}

// ─── Batch upsert ────────────────────────────────────────────────────────────
async function upsertSeriesBatch(
  batchId: string,
  batchName: string,
  examType: string,
  matchedPlaylists: IngestResult[]
): Promise<boolean> {
  console.log(`\n🧱 Batch: "${batchName}" — ${matchedPlaylists.length} playlist(s)`);

  const { data: existing } = await supabase.from('batches').select('id').eq('id', batchId).maybeSingle();
  const isNew = !existing;

  const batchRow = {
    id: batchId,
    name: batchName,
    description: `Auto-detected series: ${batchName}. Playlists: ${matchedPlaylists.length}.`,
    channel_name: matchedPlaylists[0]?.channelName || 'Various',
    exam_type: examType,
    price: 0,
    is_active: true,
    image_url: matchedPlaylists[0]?.coverThumbnailUrl || '',
    created_at: new Date().toISOString()
  };

  const { error: batchErr } = await supabase.from('batches').upsert(batchRow);
  if (batchErr) { console.error(`  ❌ Batch upsert: ${batchErr.message}`); return isNew; }

  await supabase.from('batch_subjects').delete().eq('batch_id', batchId);
  const joinRecords = matchedPlaylists.map((pl, i) => ({
    batch_id: batchId,
    subject: detectSubject(pl.title),
    teacher_name: pl.channelName,
    playlist_id: pl.playlistId,
    playlist_title: pl.title,
    exam_type: pl.examType,
    sort_order: i + 1
  }));

  const { error: joinErr } = await supabase.from('batch_subjects').insert(joinRecords);
  if (joinErr) console.error(`  ❌ batch_subjects: ${joinErr.message}`);
  else console.log(`  ✅ "${batchName}" — ${joinRecords.length} subject(s) mapped`);

  return isNew;
}

// ─── Main runner ─────────────────────────────────────────────────────────────
async function run() {
  console.log('🚀 Starting ingestion of 21 verified playlists...\n');

  const playlistCols = await getTableColumns('playlists');
  const videoCols = await getTableColumns('videos');
  console.log(`📋 Schema: playlists(${playlistCols.length} cols), videos(${videoCols.length} cols)\n`);

  const results: IngestResult[] = [];

  for (const pl of PLAYLISTS) {
    const result = await ingestPlaylist(pl.id, pl.claimedCount, pl.examType, playlistCols, videoCols);
    if (result) results.push(result);
    await new Promise(r => setTimeout(r, 400)); // Rate-limit guard
  }

  // Detect and create batches
  const batchMap = new Map<string, IngestResult[]>();
  for (const result of results) {
    for (const kw of result.detectedKeywords) {
      const kwDef = SERIES_KEYWORDS.find(s => s.keyword === kw);
      if (!kwDef) continue;
      const list = batchMap.get(kwDef.batchId) || [];
      if (!list.find(r => r.playlistId === result.playlistId)) list.push(result);
      batchMap.set(kwDef.batchId, list);
    }
  }

  let newBatchesCreated = 0;
  for (const [batchId, playlists] of batchMap.entries()) {
    const kwDef = SERIES_KEYWORDS.find(s => s.batchId === batchId)!;
    const isNew = await upsertSeriesBatch(batchId, kwDef.batchName, kwDef.examType, playlists);
    if (isNew) newBatchesCreated++;
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(65));
  console.log('📊 INGESTION SUMMARY REPORT');
  console.log('='.repeat(65));
  console.log(`✅ Playlists ingested:   ${results.length} / ${PLAYLISTS.length}`);
  console.log(`🆕 New batches created:  ${newBatchesCreated}`);
  console.log(`🔖 Batches upserted:     ${batchMap.size}`);

  console.log('\n📚 INGESTED PLAYLISTS:');
  for (const pl of INGESTED_PLAYLISTS) {
    const kws = pl.batchKeywords.length ? ` [${pl.batchKeywords.join(', ')}]` : '';
    console.log(`  • ${pl.title}`);
    console.log(`    ${pl.channelName} — ${pl.videoCount} videos${kws}`);
  }

  if (NEWLY_ADDED_CHANNELS.length) {
    console.log('\n🆕 NEWLY ADDED CHANNELS:');
    NEWLY_ADDED_CHANNELS.forEach(ch => console.log(`  + ${ch}`));
  }

  if (AUDIT.length) {
    console.log('\n⚠️  AUDIT TRAIL:');
    for (const entry of AUDIT) {
      const icon = entry.severity === 'EXCLUDED' ? '🚫' : entry.severity === 'FLAGGED' ? '⚠️ ' : 'ℹ️ ';
      console.log(`  ${icon} [${entry.severity}] ${entry.playlistTitle}`);
      console.log(`       → ${entry.reason}`);
    }
  }

  const totalVideos = INGESTED_PLAYLISTS.reduce((s, pl) => s + pl.videoCount, 0);
  console.log(`\n🎬 Total videos added:   ${totalVideos}`);
  console.log('🎉 Done!');
}

run().catch(err => {
  console.error('💥 Fatal:', err.message);
  process.exit(1);
});
