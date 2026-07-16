import crypto from 'crypto';
import { supabaseAdmin } from '../../utils/supabaseClient';
import { OverrideHandler } from './overrideHandler';
import { detectSubject } from '../classifiers/subjectDetector';
import { detectTeacher } from '../classifiers/teacherDetector';

export class DbSeeder {
  /**
   * Helper to calculate a SHA-256 hash string for raw payloads to deduplicate snapshots.
   */
  static getPayloadHash(payload: any): string {
    const jsonStr = JSON.stringify(payload);
    return crypto.createHash('sha256').update(jsonStr).digest('hex');
  }

  /**
   * Saves raw API payload to the RAW LAYER (source_snapshots).
   */
  static async saveSourceSnapshot(runId: string, entityId: string, entityType: string, rawPayload: any): Promise<string | null> {
    try {
      const hash = this.getPayloadHash(rawPayload);
      
      // Attempt insert
      const { data, error } = await supabaseAdmin
        .from('source_snapshots')
        .insert({
          run_id: runId,
          entity_id: entityId,
          entity_type: entityType,
          raw_payload: rawPayload,
          raw_payload_hash: hash
        })
        .select('id');
      
      if (error) {
        // If conflict on hash, fetch the existing ID
        const { data: existing } = await supabaseAdmin
          .from('source_snapshots')
          .select('id')
          .eq('entity_id', entityId)
          .eq('entity_type', entityType)
          .eq('raw_payload_hash', hash);
        
        return existing?.[0]?.id || null;
      }
      
      return data?.[0]?.id || null;
    } catch (e) {
      console.error('[DbSeeder] Failed to save source snapshot:', e);
      return null;
    }
  }

  /**
   * Syncs staging playlist records.
   */
  static async syncStagingPlaylist(runId: string, playlist: {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
    videoCount: number;
    channelId: string;
    sourceSnapshotId: string | null;
    contentType: string;
    academicType: string;
  }): Promise<void> {
    const isLocked = await OverrideHandler.isPlaylistLocked(playlist.id);
    if (isLocked) {
      console.log(`[DbSeeder] Playlist ${playlist.id} is locked. Crawler update skipped.`);
      return;
    }

    try {
      // Get current title to log mutations
      const { data: current } = await supabaseAdmin
        .from('staging_playlists')
        .select('title')
        .eq('id', playlist.id)
        .limit(1);

      if (current && current.length > 0 && current[0].title !== playlist.title) {
        await OverrideHandler.logMutation({
          runId,
          entityId: playlist.id,
          entityType: 'playlist',
          fieldName: 'title',
          oldValue: current[0].title,
          newValue: playlist.title
        });
      }

      await supabaseAdmin.from('staging_playlists').upsert({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        thumbnail_url: playlist.thumbnailUrl,
        video_count: playlist.videoCount,
        channel_id: playlist.channelId,
        source_snapshot_id: playlist.sourceSnapshotId,
        content_type: playlist.contentType,
        academic_type: playlist.academicType,
        taxonomy_version: 'v1.0.0',
        last_synced_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('[DbSeeder] Failed to sync staging playlist:', e);
    }
  }

  /**
   * Syncs staging video records.
   */
  static async syncStagingVideo(runId: string, video: {
    id: string;
    title: string;
    videoUrl: string;
    durationSeconds: number;
    thumbnailUrl: string;
    playlistId: string;
    sourceSnapshotId: string | null;
    contentType: string;
    academicType: string;
  }): Promise<void> {
    const isLocked = await OverrideHandler.isVideoLocked(video.id);
    if (isLocked) {
      return;
    }

    try {
      await supabaseAdmin.from('staging_videos').upsert({
        id: video.id,
        title: video.title,
        video_url: video.videoUrl,
        duration_seconds: video.durationSeconds,
        thumbnail_url: video.thumbnailUrl,
        playlist_id: video.playlistId,
        source_snapshot_id: video.sourceSnapshotId,
        content_type: video.contentType,
        academic_type: video.academicType,
        taxonomy_version: 'v1.0.0',
        last_synced_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('[DbSeeder] Failed to sync staging video:', e);
    }
  }

  /**
   * Publishes high-confidence staging items directly into the public tables.
   */
  static async publishHighConfidenceItems(runId: string): Promise<void> {
    try {
      // 1. Fetch approved staging playlists
      const { data: playlists } = await supabaseAdmin
        .from('staging_playlists')
        .select('*')
        .eq('review_status', 'pending')
        .gte('confidence_score', 80.0);
      
      if (playlists) {
        for (const pl of playlists) {
          // Resolve subject and teacher for the playlist
          const { data: logs } = await supabaseAdmin
            .from('change_review_log')
            .select('field_name, new_value')
            .eq('entity_id', pl.id);

          let subject = logs?.find(l => l.field_name === 'subject')?.new_value;
          let teacherId = logs?.find(l => l.field_name === 'teacher_id')?.new_value;

          if (!subject) {
            const subjectResult = detectSubject(pl.title || '', pl.description || '');
            subject = subjectResult.subject;
          }
          if (!teacherId) {
            const teacherResult = detectTeacher(pl.title || '', pl.description || '', '');
            teacherId = teacherResult.teacherId || 'alakh_pandey';
          }

          let teacherName = 'Alakh Pandey';
          if (teacherId) {
            const { data: teacher } = await supabaseAdmin
              .from('teachers')
              .select('name')
              .eq('id', teacherId)
              .maybeSingle();
            if (teacher?.name) {
              teacherName = teacher.name;
            }
          }

          // Detect exam type
          const plTitleLower = pl.title.toLowerCase();
          let examType: 'JEE' | 'NEET' | 'Both' = 'Both';
          if (plTitleLower.includes('jee') || plTitleLower.includes('iit') || plTitleLower.includes('joint entrance')) {
            examType = 'JEE';
          } else if (plTitleLower.includes('neet') || plTitleLower.includes('medical') || plTitleLower.includes('national eligibility')) {
            examType = 'NEET';
          }

          // Publish to public.playlists
          await supabaseAdmin.from('playlists').upsert({
            id: pl.id,
            title: pl.title,
            description: pl.description,
            thumbnail: pl.thumbnail_url,
            category: subject,
            lectures_count: pl.video_count,
            teacher_id: teacherId,
            exam_type: examType,
            is_active: true,
            cover_thumbnail_url: pl.thumbnail_url,
            channel_id: pl.channel_id,
            content_type: pl.content_type || 'playlist',
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

          // Match series/batch name from title
          let seriesName = '';
          if (plTitleLower.includes('raftaar')) seriesName = 'raftaar';
          else if (plTitleLower.includes('umeed')) seriesName = 'umeed';
          else if (plTitleLower.includes('lakshya')) seriesName = 'lakshya';
          else if (plTitleLower.includes('yakeen')) seriesName = 'yakeen';
          else if (plTitleLower.includes('pace')) seriesName = 'pace';
          else if (plTitleLower.includes('shaurya')) seriesName = 'shaurya';
          else if (plTitleLower.includes('arjuna')) seriesName = 'arjuna';
          else if (plTitleLower.includes('parishram')) seriesName = 'parishram';
          else if (plTitleLower.includes('neev')) seriesName = 'neev';
          else if (plTitleLower.includes('udaan')) seriesName = 'udaan';
          else if (plTitleLower.includes('vidya')) seriesName = 'vidya';

          if (seriesName) {
            const batchId = `batch_pw_${seriesName}`;
            const canonicalName = `PW ${seriesName.charAt(0).toUpperCase() + seriesName.slice(1)} Batch`;

            // 1. Ensure the batch exists in the `batches` table
            await supabaseAdmin.from('batches').upsert({
              id: batchId,
              name: canonicalName,
              description: `Official PW ${seriesName.charAt(0).toUpperCase() + seriesName.slice(1)} batch containing lectures for JEE/NEET.`,
              channel_name: 'Physics Wallah',
              exam_type: examType,
              is_active: true,
              institute_id: 'physics_wallah',
              updated_at: new Date().toISOString()
            });

            // 2. Upsert the playlist mapping in batch_subjects
            const batchSubjectId = `bs_${batchId}_${pl.id}`;
            await supabaseAdmin.from('batch_subjects').upsert({
              id: batchSubjectId,
              batch_id: batchId,
              subject: subject,
              teacher_id: teacherId,
              teacher_name: teacherName,
              playlist_id: pl.id,
              playlist_title: pl.title,
              exam_type: examType,
              sort_order: 10
            });
          }
        }
      }

      // 2. Fetch approved staging videos
      const { data: videos } = await supabaseAdmin
        .from('staging_videos')
        .select('*')
        .eq('review_status', 'pending')
        .gte('confidence_score', 80.0);
      
      if (videos) {
        for (const v of videos) {
          // Resolve classification values from change_review_log
          const { data: logs } = await supabaseAdmin
            .from('change_review_log')
            .select('field_name, new_value')
            .eq('entity_id', v.id);

          let subject = logs?.find(l => l.field_name === 'subject')?.new_value;
          let teacherId = logs?.find(l => l.field_name === 'teacher_id')?.new_value;
          let teacherName = logs?.find(l => l.field_name === 'teacher_name')?.new_value;
          let chapter = logs?.find(l => l.field_name === 'chapter')?.new_value;

          if (!subject) {
            const subjectResult = detectSubject(v.title || '', v.description || '');
            subject = subjectResult.subject;
          }
          if (!teacherId) {
            const teacherResult = detectTeacher(v.title || '', v.description || '', '');
            teacherId = teacherResult.teacherId || 'alakh_pandey';
            teacherName = teacherResult.teacherName || 'Alakh Pandey';
          }
          if (!teacherName && teacherId) {
            const { data: teacher } = await supabaseAdmin
              .from('teachers')
              .select('name')
              .eq('id', teacherId)
              .maybeSingle();
            if (teacher?.name) {
              teacherName = teacher.name;
            }
          }

          // Detect exam type
          const vTitleLower = v.title.toLowerCase();
          let examType: 'JEE' | 'NEET' | 'Both' = 'Both';
          if (vTitleLower.includes('jee') || vTitleLower.includes('iit') || vTitleLower.includes('joint entrance')) {
            examType = 'JEE';
          } else if (vTitleLower.includes('neet') || vTitleLower.includes('medical') || vTitleLower.includes('national eligibility')) {
            examType = 'NEET';
          }

          // Publish to public.videos
          await supabaseAdmin.from('videos').upsert({
            id: v.id,
            title: v.title,
            video_url: v.video_url,
            duration: `${Math.floor(v.duration_seconds / 60)}m`,
            playlist_id: v.playlist_id,
            thumbnail_url: v.thumbnail_url,
            subject: subject || 'Unknown',
            category: chapter || 'lecture',
            teacher_id: teacherId,
            teacher_name: teacherName || 'Alakh Pandey',
            is_active: true,
            duration_seconds: v.duration_seconds,
            is_playable: true,
            embed_url: `https://www.youtube.com/embed/${v.id}`,
            description: v.description,
            exam_type: examType,
            content_type: v.content_type || 'lecture',
            updated_at: new Date().toISOString()
          });
        }
      }
      
      console.log(`✨ [DbSeeder] Successfully published high confidence items to production.`);
    } catch (e) {
      console.error('[DbSeeder] Failed to publish items:', e);
    }
  }
}
