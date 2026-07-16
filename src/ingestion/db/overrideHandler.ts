import { supabase } from '../../utils/supabaseClient';

export class OverrideHandler {
  /**
   * Check if a staging playlist is locked from being overwritten by crawler syncs.
   */
  static async isPlaylistLocked(playlistId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('staging_playlists')
        .select('is_locked')
        .eq('id', playlistId)
        .limit(1);
      
      return data?.[0]?.is_locked === true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a staging video is locked from being overwritten by crawler syncs.
   */
  static async isVideoLocked(videoId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from('staging_videos')
        .select('is_locked')
        .eq('id', videoId)
        .limit(1);
      
      return data?.[0]?.is_locked === true;
    } catch {
      return false;
    }
  }

  /**
   * Logs mutation changes to the change_history audit table.
   */
  static async logMutation(options: {
    runId: string | null;
    entityId: string;
    entityType: 'playlist' | 'video' | 'teacher';
    fieldName: string;
    oldValue: string | null;
    newValue: string | null;
    modifiedBy?: string;
  }): Promise<void> {
    try {
      await supabase.from('change_history').insert({
        run_id: options.runId,
        entity_id: options.entityId,
        entity_type: options.entityType,
        field_name: options.fieldName,
        old_value: options.oldValue,
        new_value: options.newValue,
        modified_by: options.modifiedBy
      });
    } catch (e) {
      console.error('[OverrideHandler] Failed to log change history mutation:', e);
    }
  }
}
