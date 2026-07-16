import { supabase } from '../../utils/supabaseClient';
import { ALLOWED_CHANNELS } from '../config/channels';
import { CrawlQueueManager } from '../queue/crawlQueueManager';
import { ChannelCollector } from '../collectors/channelCollector';
import { PlaylistCollector } from '../collectors/playlistCollector';
import { VideoCollector } from '../collectors/videoCollector';
import { DbSeeder } from '../db/dbSeeder';
import { canonicalizeText } from '../normalizers/textNormalizer';
import { classifyDimensions } from '../classifiers/dimensions';
import { detectSubject } from '../classifiers/subjectDetector';
import { detectChapters } from '../classifiers/chapterDetector';
import { detectTeacher } from '../classifiers/teacherDetector';
import { validateAcademicQuality } from '../validators/qualityGate';
import { fetchVideoDetailsBatch } from '../api/youtubeClient';


// Simple locally inline Duration helper in case durationNormalizer isn't fully set up
export function parseISO8601DurationToSeconds(isoDuration: string): number {
  if (!isoDuration) return 0;
  const matches = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!matches) return 0;
  const hours = parseInt(matches[1] || '0', 10);
  const minutes = parseInt(matches[2] || '0', 10);
  const seconds = parseInt(matches[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

export async function runIngestionEngine(options: { dryRun?: boolean } = {}): Promise<void> {
  console.log(`\n🚀 [IngestionEngine] Initializing run... (Dry Run: ${options.dryRun === true})`);

  // 1. Create Ingestion Run record
  const { data: run, error: runError } = await supabase
    .from('ingestion_runs')
    .insert({
      status: 'running',
      schema_version: '1.0.0'
    })
    .select('id')
    .single();

  if (runError || !run) {
    console.error('❌ [IngestionEngine] Failed to create ingestion run:', runError);
    return;
  }

  const runId = run.id;
  console.log(`📋 [IngestionEngine] Run ID: ${runId}`);

  try {
    // 2. Initialize crawl queue with whitelisted channels
    for (const channelId of Object.keys(ALLOWED_CHANNELS)) {
      await CrawlQueueManager.pushToQueue(runId, channelId, 'channel');
    }

    // 3. Process the queue loop
    while (true) {
      const item = await CrawlQueueManager.claimNextItem(runId);
      if (!item) break; // Queue empty, finish run

      console.log(`📡 [IngestionEngine] Processing queue item: [${item.entityType}] ${item.entityId}`);

      try {
        if (item.entityType === 'channel') {
          // Fetch channel metadata
          await ChannelCollector.collectChannelMetadata(runId, item.entityId);

          // Fetch channel playlists
          const playlists = await PlaylistCollector.collectChannelPlaylists(runId, item.entityId);
          console.log(`   - Found ${playlists.length} playlists for channel.`);

          const snapshotId = await DbSeeder.saveSourceSnapshot(runId, item.entityId, 'channel', playlists);

          for (const pl of playlists) {
            const plId = pl.id;
            
            // Push playlists to crawl queue
            await CrawlQueueManager.pushToQueue(runId, plId, 'playlist');

            if (!options.dryRun) {
              const { contentType, academicType } = classifyDimensions(pl.snippet?.title || '', pl.snippet?.description || '');
              
              await DbSeeder.syncStagingPlaylist(runId, {
                id: plId,
                title: canonicalizeText(pl.snippet?.title),
                description: pl.snippet?.description || '',
                thumbnailUrl: pl.snippet?.thumbnails?.high?.url || pl.snippet?.thumbnails?.default?.url || '',
                videoCount: pl.contentDetails?.itemCount || 0,
                channelId: item.entityId,
                sourceSnapshotId: snapshotId,
                contentType,
                academicType
              });
            }
          }

        } else if (item.entityType === 'playlist') {
          // Fetch playlist items (videos)
          const videoItems = await VideoCollector.collectPlaylistVideos(runId, item.entityId);
          console.log(`   - Found ${videoItems.length} videos inside playlist.`);

          const snapshotId = await DbSeeder.saveSourceSnapshot(runId, item.entityId, 'playlist', videoItems);

          // Get details batch
          const videoIds = videoItems.map(vi => vi.contentDetails?.videoId).filter(Boolean);
          const detailsList = await fetchVideoDetailsBatch(videoIds);

          const detailsMap = new Map();
          for (const details of detailsList) {
            detailsMap.set(details.id, details);
          }

          for (const vi of videoItems) {
            const vId = vi.contentDetails?.videoId;
            if (!vId) continue;

            const details = detailsMap.get(vId);
            const durationIso = details?.contentDetails?.duration || 'PT0S';
            const durationSec = parseISO8601DurationToSeconds(durationIso);

            // Filter & validate academic quality
            const validation = validateAcademicQuality(vi.snippet?.title || '', vi.snippet?.description || '', durationSec);
            
            if (!validation.isApproved) {
              console.log(`   🚫 Skipped video ${vId}: ${validation.rejectReason}`);
              continue;
            }

            if (!options.dryRun) {
              const { contentType, academicType } = classifyDimensions(vi.snippet?.title || '', vi.snippet?.description || '');
              const subjectResult = detectSubject(vi.snippet?.title || '', vi.snippet?.description || '');
              const chapterResult = detectChapters(vi.snippet?.title || '', vi.snippet?.description || '');
              const teacherResult = detectTeacher(vi.snippet?.title || '', vi.snippet?.description || '', vi.snippet?.channelTitle || '');

              await DbSeeder.syncStagingVideo(runId, {
                id: vId,
                title: canonicalizeText(vi.snippet?.title),
                videoUrl: `https://www.youtube.com/watch?v=${vId}`,
                durationSeconds: durationSec,
                thumbnailUrl: vi.snippet?.thumbnails?.high?.url || vi.snippet?.thumbnails?.default?.url || '',
                playlistId: item.entityId,
                sourceSnapshotId: snapshotId,
                contentType,
                academicType
              });

              // Log classification staging rules/decisions log
              await supabase.from('change_review_log').insert({
                run_id: runId,
                entity_id: vId,
                entity_type: 'video',
                field_name: 'subject',
                old_value: null,
                new_value: subjectResult.subject,
                confidence_score: validation.confidenceScore,
                evidence: {
                  matched_keywords: subjectResult.matchedKeywords,
                  validation_evidence: validation.evidenceList
                }
              });
            }
          }
        }

        await CrawlQueueManager.markCompleted(item.id);
      } catch (err: any) {
        console.error(`❌ [IngestionEngine] Error on queue item ${item.entityId}:`, err);
        await CrawlQueueManager.markFailed(item.id, err?.message || String(err));
      }
    }

    // 4. Publish high confidence items if not dry-run
    if (!options.dryRun) {
      await DbSeeder.publishHighConfidenceItems(runId);
    }

    // Update run as completed
    await supabase
      .from('ingestion_runs')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString()
      })
      .eq('id', runId);

    console.log(`\n🎉 [IngestionEngine] Ingestion run completed successfully!`);

  } catch (err: any) {
    console.error('❌ [IngestionEngine] Run failed with error:', err);
    await supabase
      .from('ingestion_runs')
      .update({
        status: 'failed',
        ended_at: new Date().toISOString()
      })
      .eq('id', runId);
  }
}
