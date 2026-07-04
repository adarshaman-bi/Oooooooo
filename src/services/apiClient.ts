/**
 * Typed client wrapper for all backend API endpoints (/api/*).
 * Centralizes endpoint names and fetch logic.
 */

import { Lecture, YouTubeSyncLog } from '../types';

export interface YoutubeChannelInfo {
  channelId: string;
  channelTitle: string;
  avatarUrl: string;
  subscriberCount?: number;
}

export interface YoutubeChannelData {
  id: string;
  channelId: string;
  title: string;
  description: string;
  avatarUrl: string;
  subscriberCount: number;
  videoCount: number;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API error (${response.status}): ${errorText}`);
  }
  const payload = await response.json();
  if (payload.status !== 'ok') {
    throw new Error(payload.message || 'API response indicated failure');
  }
  return payload.data as T;
}

export const apiClient = {
  youtube: {
    /** Get channel info for a specific video ID */
    async getChannelInfo(videoId: string): Promise<YoutubeChannelInfo> {
      const response = await fetch(`/api/youtube/channel-info?videoId=${videoId}`);
      return handleResponse<YoutubeChannelInfo>(response);
    },

    /** Get full channel statistics/details for a YouTube channel ID */
    async getChannelDetails(channelId: string): Promise<YoutubeChannelData> {
      const response = await fetch(`/api/youtube/channel/${channelId}`);
      return handleResponse<YoutubeChannelData>(response);
    },

    /** Fetch playlist lectures */
    async getPlaylistLectures(playlistId: string): Promise<Lecture[]> {
      const response = await fetch(`/api/youtube/lectures?playlistId=${playlistId}`);
      return handleResponse<Lecture[]>(response);
    },

    /** Import a YouTube playlist */
    async importPlaylist(params: {
      playlistId: string;
      teacherId: string;
      subject: string;
      examType: string;
    }): Promise<{ success: boolean; importedCount: number }> {
      const response = await fetch('/api/youtube/playlists/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return handleResponse<{ success: boolean; importedCount: number }>(response);
    },

    /** Sync a YouTube playlist */
    async syncPlaylist(playlistId: string): Promise<{ success: boolean; syncedCount: number }> {
      const response = await fetch('/api/youtube/playlists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId }),
      });
      return handleResponse<{ success: boolean; syncedCount: number }>(response);
    },

    /** Add a channel to monitored channels list */
    async addChannel(params: {
      handle: string;
      teacherId: string;
      subject: string;
      examType: string;
    }): Promise<{ success: boolean; channelId: string }> {
      const response = await fetch('/api/youtube/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return handleResponse<{ success: boolean; channelId: string }>(response);
    },

    /** Sync all channels */
    async syncAll(): Promise<{ success: boolean; logs: any[] }> {
      const response = await fetch('/api/youtube/sync-all', {
        method: 'POST',
      });
      return handleResponse<{ success: boolean; logs: any[] }>(response);
    },

    // ADMIN ENDPOINTS
    async getAdminChannels(): Promise<any[]> {
      const response = await fetch('/api/youtube/admin-channels');
      return handleResponse<any[]>(response);
    },

    async getAdminPlaylists(): Promise<any[]> {
      const response = await fetch('/api/youtube/admin-playlists');
      return handleResponse<any[]>(response);
    },

    async getAdminVideos(): Promise<any[]> {
      const response = await fetch('/api/youtube/admin-videos');
      return handleResponse<any[]>(response);
    },

    async getAdminLogs(): Promise<YouTubeSyncLog[]> {
      const response = await fetch('/api/youtube/admin-logs');
      return handleResponse<YouTubeSyncLog[]>(response);
    },
  },

  teachers: {
    /** Fetch lectures for a specific teacher ID */
    async getLectures(playlistId: string): Promise<Lecture[]> {
      const response = await fetch(`/api/teachers/${playlistId}/lectures`);
      const payload = await response.json();
      // This endpoint returns raw array or status object, handle both
      if (Array.isArray(payload)) return payload;
      if (payload.status === 'ok' && Array.isArray(payload.data)) return payload.data;
      return [];
    },
  },

  moderator: {
    /** Unflag a flagged review */
    async unflagReview(reviewId: string): Promise<{ success: boolean }> {
      const response = await fetch(`/api/moderator/reviews/${reviewId}/unflag`, {
        method: 'POST',
      });
      return handleResponse<{ success: boolean }>(response);
    },

    /** Delete a review */
    async deleteReview(reviewId: string): Promise<{ success: boolean }> {
      const response = await fetch(`/api/moderator/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      return handleResponse<{ success: boolean }>(response);
    },
  },
};
