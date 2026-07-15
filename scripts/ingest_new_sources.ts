// Ingestion script for new batch sources and verified playlists
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Bypass local SSL CA issues

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { parseISO8601Duration, getDurationInSeconds, isAcademicContent } from '../src/utils/youtubeUtils';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !YOUTUBE_API_KEY) {
  console.error('❌ Missing environment variables in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function filterColumns(payload: any, allowedColumns: string[]) {
  if (allowedColumns.length === 0) return payload;
  const filtered: any = {};
  for (const key of Object.keys(payload)) {
    if (allowedColumns.includes(key)) {
      filtered[key] = payload[key];
    }
  }
  return filtered;
}

// Map teacher names based on ID
async function getTeacherName(teacherId: string): Promise<string> {
  const { data } = await supabase.from('teachers').select('name').eq('id', teacherId).single();
  return data?.name || 'Unknown Teacher';
}

async function ingestPlaylist(options: {
  playlistId: string;
  subject: string;
  teacherId: string;
  overrideChannelId?: string;
  overrideChannelTitle?: string;
  overrideChannelThumbnail?: string;
}) {
  const { playlistId, subject, teacherId } = options;
  console.log(`\n📡 Processing playlist: ${playlistId} for teacher: ${teacherId}`);

  let detectedPlaylistColumns: string[] = [];
  let detectedVideoColumns: string[] = [];
  try {
    const { data: plSample } = await supabase.from('playlists').select('*').limit(1);
    detectedPlaylistColumns = plSample && plSample.length > 0 ? Object.keys(plSample[0]) : [];
    const { data: vidSample } = await supabase.from('videos').select('*').limit(1);
    detectedVideoColumns = vidSample && vidSample.length > 0 ? Object.keys(vidSample[0]) : [];
  } catch (e) {
    console.warn('Schema check warning:', e);
  }

  try {
    // 1. Fetch playlist metadata
    const playlistMetaRes = await axios.get(
      `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${YOUTUBE_API_KEY}`
    );
    const playlistItem = playlistMetaRes.data.items?.[0];
    if (!playlistItem) {
      console.error(`❌ Playlist ${playlistId} not found on YouTube.`);
      return null;
    }

    let playlistTitle = playlistItem.snippet.title || 'Untitled Playlist';
    let playlistDescription = playlistItem.snippet.description || '';
    let channelId = options.overrideChannelId || playlistItem.snippet.channelId;
    let channelTitle = options.overrideChannelTitle || playlistItem.snippet.channelTitle || '';

    // Sanitize reuploader references as requested by user
    if (options.overrideChannelTitle) {
      playlistTitle = playlistTitle.replace(/\bZUBAIR\b/gi, '').trim();
      playlistDescription = playlistDescription.replace(/\bZUBAIR\b/gi, '').trim();
    }

    // 2. Fetch channel thumbnail if not overridden
    let channelThumbnailUrl = options.overrideChannelThumbnail || '';
    if (!channelThumbnailUrl) {
      console.log(`📡 Fetching channel info for ${channelId}...`);
      const channelRes = await axios.get(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`
      );
      const channelItem = channelRes.data.items?.[0];
      channelTitle = options.overrideChannelTitle || channelItem?.snippet?.title || channelTitle;
      channelThumbnailUrl = channelItem?.snippet?.thumbnails?.high?.url || channelItem?.snippet?.thumbnails?.default?.url || '';
    }

    // 3. Enumerate video IDs in the playlist
    let pageToken: string | undefined;
    const playlistVideoRefs: Array<{ videoId: string; position: number }> = [];
    let currentPos = 0;

    do {
      let itemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
      if (pageToken) itemsUrl += `&pageToken=${pageToken}`;

      const itemsRes = await axios.get(itemsUrl);
      for (const item of itemsRes.data.items || []) {
        const vidId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (vidId) {
          playlistVideoRefs.push({ videoId: vidId, position: currentPos++ });
        }
      }
      pageToken = itemsRes.data.nextPageToken;
    } while (pageToken);

    console.log(`📡 Found ${playlistVideoRefs.length} videos. Hydrating details...`);

    const videoDetailsMap = new Map<string, any>();
    const videoIds = playlistVideoRefs.map(v => v.videoId);

    for (let i = 0; i < videoIds.length; i += 50) {
      const chunk = videoIds.slice(i, i + 50);
      const videosRes = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status,statistics&id=${chunk.join(',')}&key=${YOUTUBE_API_KEY}`
      );
      for (const v of videosRes.data.items || []) {
        videoDetailsMap.set(v.id, v);
      }
    }

    const teacherName = await getTeacherName(teacherId);
    const videoUpsertPayloads: any[] = [];
    let totalDurationSeconds = 0;
    let playableLecturesCount = 0;
    let coverThumbnailUrl = '';

    for (const ref of playlistVideoRefs) {
      const video = videoDetailsMap.get(ref.videoId);
      if (!video) {
        const dbVideoRow = {
          id: ref.videoId,
          video_id: ref.videoId,
          playlist_id: playlistId,
          position_in_playlist: ref.position,
          position: ref.position,
          title: 'Unavailable Video',
          description: 'This video is private or deleted.',
          channel_id: channelId,
          channel_title: channelTitle,
          teacher_name: teacherName,
          thumbnail_url: 'https://i.ytimg.com/vi/placeholder/hqdefault.jpg',
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
          subject,
          category: 'lecture',
          content_type: 'lecture',
          teacher_id: teacherId,
          updated_at: new Date().toISOString()
        };
        videoUpsertPayloads.push(filterColumns(dbVideoRow, detectedVideoColumns));
        continue;
      }

      const title = video.snippet?.title || '';
      const durationISO = video.contentDetails?.duration || '';
      const durationSec = getDurationInSeconds(durationISO);
      const privacyStatus = video.status?.privacyStatus;

      if (privacyStatus === 'private' || privacyStatus === 'deleted') continue;
      // Filter out short clips (< 10 minutes)
      if (durationSec < 600) continue;
      if (!isAcademicContent(title)) continue;

      const sn = video.snippet || {};
      const thumbs = sn.thumbnails || {};
      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        `https://i.ytimg.com/vi/${ref.videoId}/hqdefault.jpg`;

      if (playableLecturesCount === 0) {
        coverThumbnailUrl = thumbnailUrl;
      }

      totalDurationSeconds += durationSec;
      playableLecturesCount++;

      const dbVideoRow = {
        id: ref.videoId,
        video_id: ref.videoId,
        playlist_id: playlistId,
        position_in_playlist: ref.position,
        position: ref.position,
        title: title,
        description: sn.description || '',
        channel_id: channelId,
        channel_title: channelTitle,
        teacher_name: teacherName,
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
        subject,
        category: 'lecture',
        content_type: 'lecture',
        teacher_id: teacherId,
        updated_at: new Date().toISOString()
      };

      videoUpsertPayloads.push(filterColumns(dbVideoRow, detectedVideoColumns));
    }

    const titleLower = playlistTitle.toLowerCase();
    const descLower = playlistDescription.toLowerCase();
    const isOneShot = titleLower.includes('one shot') || titleLower.includes('oneshot') || descLower.includes('one shot') || descLower.includes('oneshot');
    const contentType = isOneShot ? 'one_shot' : 'playlist';

    if (videoUpsertPayloads.length > 0) {
      const uniquePayloadsMap = new Map();
      for (const p of videoUpsertPayloads) {
        uniquePayloadsMap.set(p.id, p);
      }
      const uniquePayloads = Array.from(uniquePayloadsMap.values());

      const plRow = {
        id: playlistId,
        playlist_id: playlistId,
        title: playlistTitle,
        description: playlistDescription,
        channel_id: channelId,
        channel_title: channelTitle,
        channel_thumbnail_url: channelThumbnailUrl,
        cover_thumbnail_url: coverThumbnailUrl,
        thumbnail: coverThumbnailUrl,
        content_type: contentType,
        lectures_count: playableLecturesCount,
        total_duration_seconds: totalDurationSeconds,
        subject_tags: [subject],
        exam_tags: ['NEET'],
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category: subject,
        is_active: true,
        teacher_id: teacherId
      };

      await supabase.from('playlists').upsert(filterColumns(plRow, detectedPlaylistColumns));
      await supabase.from('videos').upsert(uniquePayloads);

      console.log(`✅ Success! Playlist ${playlistId} and ${uniquePayloads.length} videos successfully saved.`);
      return { title: playlistTitle, coverThumbnailUrl };
    } else {
      console.warn(`⚠️ No playable videos found in playlist ${playlistId}.`);
      return null;
    }
  } catch (err: any) {
    console.error(`❌ Failed to ingest ${playlistId}:`, err.message);
    return null;
  }
}

async function run() {
  console.log('🚀 Starting new batch sources ingestion pipeline...');

  // 1. Ingest UMEED NEET 2025 [Full Series] (Overriding ZUBAIR with official PW NEET info)
  const umeed2025 = await ingestPlaylist({
    playlistId: 'PL9l7UXY2J4qkYqAEEKSNvXg6zJ8ESddI5',
    subject: 'Physics',
    teacherId: 'alakh_pandey',
    overrideChannelId: 'UCGw8iWmsw1cPlfcrww-3C0g', // PW NEET Channel ID
    overrideChannelTitle: 'PW NEET',
    overrideChannelThumbnail: 'https://yt3.ggpht.com/UgbbeNYEDkdTkP2CsFChE5H1onitXUu_p6pZwwnON-TzOTcUSfVxhIz4udjkp2mzQPu3kPzA=s240-c-k-c0x00ffffff-no-rj'
  });

  // 2. Ingest Magnet Brains Class 11 NEET Physics
  const mbPhysics = await ingestPlaylist({
    playlistId: 'PLJz-qWiTZc9Zfb1CqFE94CxrFfpDsaZ0d',
    subject: 'Physics',
    teacherId: 'satyam_sir_magnet_brains'
  });

  // 3. Ingest NCERT 360 Biology Seep Pahuja
  await ingestPlaylist({
    playlistId: 'PLsgHooHkqhhOpw_jgw7uGzmrWiGT2axH3',
    subject: 'Biology',
    teacherId: 'seep_pahuja'
  });

  // 4. Ingest Physics Crash Course by Alakh Sir (Competition Wallah)
  await ingestPlaylist({
    playlistId: 'PLJyab0VQDBGWVYHPLjAHjw9y1YB9Gf4bf',
    subject: 'Physics',
    teacherId: 'alakh_pandey'
  });

  // 5. Ingest Flagship Channel Playlists (Alakh Sir's key playlists)
  const flagshipPlaylists = [
    { id: 'PLF_7kfnwLFCH1CsmEZR3DaUlPglHU7wqr', subject: 'Physics', teacherId: 'alakh_pandey' }, // UMEED NEET Physics Crash Course
    { id: 'PLF_7kfnwLFCF3-6FHytCJG0SowEkd1OZn', subject: 'Physics', teacherId: 'alakh_pandey' }, // MahaRevision
    { id: 'PLF_7kfnwLFCHRGQ5f3OwxR_AM2_IzfTXe', subject: 'Physics', teacherId: 'alakh_pandey' }, // MahaRevision 2022
    { id: 'PLF_7kfnwLFCHgWsQx18YLNOBbGP1vTJO5', subject: 'Physics', teacherId: 'alakh_pandey' }  // PACE Physics Units
  ];

  for (const pl of flagshipPlaylists) {
    await ingestPlaylist({
      playlistId: pl.id,
      subject: pl.subject,
      teacherId: pl.teacherId
    });
  }

  // 6. Seed Batches & Join Tables
  console.log('\n🧱 Seeding Batch Cards and Join Records...');

  // UMEED NEET 2025 Batch
  if (umeed2025) {
    const batchId = 'batch_pw_umeed_neet_2025';
    const batchData = {
      id: batchId,
      name: 'PW Umeed NEET 2025',
      institute_id: 'physics_wallah',
      institute_name: 'Physics Wallah',
      subject: 'All Subjects',
      price: 0,
      discount_price: 0,
      exam_type: 'NEET',
      description: 'Complete high-yield free one-shot batch covering Physics, Chemistry, and Biology for NEET 2025.',
      image_url: umeed2025.coverThumbnailUrl || 'https://i.ytimg.com/vi/WDjcpSCI-uU/hqdefault.jpg',
      is_active: true,
      channel_name: 'PW NEET',
      youtube_channel_id: 'UCGw8iWmsw1cPlfcrww-3C0g'
    };

    const { error: batchErr } = await supabase.from('batches').upsert(batchData);
    if (batchErr) {
      console.error('❌ Failed to upsert Umeed 2025 Batch:', batchErr.message);
    } else {
      console.log('✅ Upserted Batch: PW Umeed NEET 2025');

      // Map to batch_subjects
      const joinRecords = [
        {
          batch_id: batchId,
          subject: 'Physics',
          teacher_id: 'alakh_pandey',
          teacher_name: 'Alakh Pandey',
          playlist_id: 'PL9l7UXY2J4qkYqAEEKSNvXg6zJ8ESddI5',
          playlist_title: umeed2025.title,
          exam_type: 'NEET',
          sort_order: 1
        },
        {
          batch_id: batchId,
          subject: 'Chemistry',
          teacher_id: 'alakh_pandey', // Default since multi-teacher, Alakh Sir is primary profile
          teacher_name: 'Alakh Pandey',
          playlist_id: 'PL9l7UXY2J4qkYqAEEKSNvXg6zJ8ESddI5',
          playlist_title: umeed2025.title,
          exam_type: 'NEET',
          sort_order: 2
        },
        {
          batch_id: batchId,
          subject: 'Biology',
          teacher_id: 'alakh_pandey',
          teacher_name: 'Alakh Pandey',
          playlist_id: 'PL9l7UXY2J4qkYqAEEKSNvXg6zJ8ESddI5',
          playlist_title: umeed2025.title,
          exam_type: 'NEET',
          sort_order: 3
        }
      ];

      // Delete existing join entries to avoid duplicates
      await supabase.from('batch_subjects').delete().eq('batch_id', batchId);
      const { error: joinErr } = await supabase.from('batch_subjects').insert(joinRecords);
      if (joinErr) {
        console.error('❌ Failed to insert Umeed 2025 batch subjects:', joinErr.message);
      } else {
        console.log('✅ Mapped PW Umeed NEET 2025 subjects successfully.');
      }
    }
  }

  // Magnet Brains NEET Class 11 Batch
  if (mbPhysics) {
    const batchId = 'batch_magnet_brains_neet_class_11';
    const batchData = {
      id: batchId,
      name: 'Magnet Brains NEET Class 11',
      institute_id: 'magnet_brains',
      institute_name: 'Magnet Brains',
      subject: 'Physics',
      teacher_id: 'satyam_sir_magnet_brains',
      teacher_name: 'Satyam Sir',
      price: 0,
      discount_price: 0,
      exam_type: 'NEET',
      description: 'Systematic Class 11 Physics course for NEET aspirants by Satyam Sir at Magnet Brains.',
      image_url: mbPhysics.coverThumbnailUrl || 'https://i.ytimg.com/vi/Mcf5GAjRWFQ/hqdefault.jpg',
      is_active: true,
      channel_name: 'Magnet Brains IIT-JEE & NEET',
      youtube_channel_id: 'UC-PZSEHaQOcJiSTsbJMohZQ'
    };

    const { error: batchErr } = await supabase.from('batches').upsert(batchData);
    if (batchErr) {
      console.error('❌ Failed to upsert Magnet Brains Batch:', batchErr.message);
    } else {
      console.log('✅ Upserted Batch: Magnet Brains NEET Class 11');

      const joinRecord = {
        batch_id: batchId,
        subject: 'Physics',
        teacher_id: 'satyam_sir_magnet_brains',
        teacher_name: 'Satyam Sir',
        playlist_id: 'PLJz-qWiTZc9Zfb1CqFE94CxrFfpDsaZ0d',
        playlist_title: mbPhysics.title,
        exam_type: 'NEET',
        sort_order: 1
      };

      await supabase.from('batch_subjects').delete().eq('batch_id', batchId);
      const { error: joinErr } = await supabase.from('batch_subjects').insert([joinRecord]);
      if (joinErr) {
        console.error('❌ Failed to insert Magnet Brains batch subjects:', joinErr.message);
      } else {
        console.log('✅ Mapped Magnet Brains NEET Class 11 subjects successfully.');
      }
    }
  }

  console.log('🎉 Ingestion complete!');
}

run();
