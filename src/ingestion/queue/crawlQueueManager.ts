import { supabaseAdmin } from '../../utils/supabaseClient';

export interface QueueItem {
  id: string;
  runId: string;
  entityId: string;
  entityType: 'channel' | 'playlist' | 'video';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastError?: string;
}

export class CrawlQueueManager {
  /**
   * Pushes a new item to the crawl queue if it doesn't already exist in pending/processing status.
   */
  static async pushToQueue(runId: string, entityId: string, entityType: 'channel' | 'playlist' | 'video'): Promise<void> {
    try {
      // Check if it already exists in the queue in a non-terminal state
      const { data } = await supabaseAdmin
        .from('crawl_queue')
        .select('id')
        .eq('run_id', runId)
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .in('status', ['pending', 'processing']);
      
      if (data && data.length > 0) return; // Already queued or running

      await supabaseAdmin.from('crawl_queue').insert({
        run_id: runId,
        entity_id: entityId,
        entity_type: entityType,
        status: 'pending',
        attempts: 0
      });
    } catch (e) {
      console.error(`[CrawlQueueManager] Failed to queue entity ${entityId}:`, e);
    }
  }

  /**
   * Claims next pending queue item for processing, shifting its status to 'processing'.
   */
  static async claimNextItem(runId: string): Promise<QueueItem | null> {
    try {
      const { data, error } = await supabaseAdmin
        .from('crawl_queue')
        .select('*')
        .eq('run_id', runId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;
      const item = data?.[0];
      if (!item) return null;

      // Optimistic lock check: update status to processing
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('crawl_queue')
        .update({ status: 'processing', attempts: item.attempts + 1 })
        .eq('id', item.id)
        .eq('status', 'pending') // Prevent race conditions
        .select();

      if (updateError || !updated || updated.length === 0) {
        // Race condition: another worker claimed it, try next
        return this.claimNextItem(runId);
      }

      return {
        id: updated[0].id,
        runId: updated[0].run_id,
        entityId: updated[0].entity_id,
        entityType: updated[0].entity_type,
        status: updated[0].status,
        attempts: updated[0].attempts,
        lastError: updated[0].last_error
      };
    } catch (e) {
      console.error('[CrawlQueueManager] Error claiming item:', e);
      return null;
    }
  }

  /**
   * Marks a queue item as successfully processed.
   */
  static async markCompleted(id: string): Promise<void> {
    await supabaseAdmin.from('crawl_queue').update({ status: 'completed' }).eq('id', id);
  }

  /**
   * Marks a queue item as failed, recording error details.
   */
  static async markFailed(id: string, error: string): Promise<void> {
    await supabaseAdmin.from('crawl_queue').update({
      status: 'failed',
      last_error: error
    }).eq('id', id);
  }
}
