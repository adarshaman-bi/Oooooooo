import React, { useState, useEffect, useMemo } from 'react';
import { 
  YouTubeChannel, 
  YouTubeVideo, 
  YouTubeSyncLog, 
  Playlist, 
  Lecture 
} from '../types';
import { mutate } from 'swr';
import { SWR_KEYS } from '../utils/swrConfig';
import { supabase } from '../utils/supabaseClient';
import {
  Youtube,
  Play,
  Plus,
  Trash2,
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
  History,
  Clock,
  Eye,
  Heart,
  X,
  Search,
  Filter,
  Edit,
  ExternalLink,
  Settings,
  Ban,
  Sparkles,
  Check,
  CheckCircle2,
  ChevronRight,
  EyeOff,
  Terminal
} from 'lucide-react';

export default function ContentManagerTab() {
  // Active Content Manager Sub-tab
  const [currentTab, setCurrentTab] = useState<'add_channel' | 'channels_list' | 'playlists' | 'videos' | 'sync_logs'>('add_channel');

  // Core collections data states
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [syncLogs, setSyncLogs] = useState<YouTubeSyncLog[]>([]);

  // Loaders
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(false);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // TAB 1 — ADD CHANNEL States
  const [channelInput, setChannelInput] = useState('');
  const [addSubjects, setAddSubjects] = useState<string[]>(['Biology']);
  const [addExamTags, setAddExamTags] = useState<string[]>(['NEET']);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  
  // Real-time track states for currently adding channel
  const [importStatusStep, setImportStatusStep] = useState<'idle' | 'searching' | 'importing_playlists' | 'importing_videos' | 'complete' | 'failed'>('idle');
  const [importFoundChannel, setImportFoundChannel] = useState<any | null>(null);
  const [importPlaylistsProgress, setImportPlaylistsProgress] = useState({ current: 0, total: 0 });
  const [importVideosProgress, setImportVideosProgress] = useState({ current: 0, total: 0 });
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);

  // TAB 2 — CHANNELS LIST States
  const [syncingChannelId, setSyncingChannelId] = useState<string | null>(null);
  const [channelToDelete, setChannelToDelete] = useState<YouTubeChannel | null>(null);
  const [isDeletingChannel, setIsDeletingChannel] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // TAB 3 — PLAYLISTS States
  const [playlistsSearch, setPlaylistsSearch] = useState('');
  const [playlistsChannelFilter, setPlaylistsChannelFilter] = useState('all');
  const [playlistsSubjectFilter, setPlaylistsSubjectFilter] = useState('all');
  const [playlistsExamFilter, setPlaylistsExamFilter] = useState('all');
  
  const [selectedPlaylistForVideos, setSelectedPlaylistForVideos] = useState<Playlist | null>(null);
  const [playlistVideosList, setPlaylistVideosList] = useState<YouTubeVideo[]>([]);
  const [isLoadingPlaylistVideos, setIsLoadingPlaylistVideos] = useState(false);
  const [playlistToDelete, setPlaylistToDelete] = useState<Playlist | null>(null);

  // TAB 4 — VIDEOS States
  const [videosSearch, setVideosSearch] = useState('');
  const [videosChannelFilter, setVideosChannelFilter] = useState('all');
  const [videosPlaylistFilter, setVideosPlaylistFilter] = useState('all');
  const [videosSubjectFilter, setVideosSubjectFilter] = useState('all');
  
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<YouTubeVideo | null>(null);

  // Metadata editor fields
  const [editSubject, setEditSubject] = useState('Biology');
  const [editTopic, setEditTopic] = useState('');
  const [editExamTagsString, setEditExamTagsString] = useState('NEET');

  // System subject list options
  const SUBJECT_OPTIONS = ['Biology', 'Physics', 'Chemistry', 'Botany', 'Zoology', 'Mixed'];
  const EXAM_OPTIONS = ['NEET', 'NEET 2025', 'NEET 2026', 'JEE', 'AIIMS'];

  // Logging utility for TAB 1 Console
  const pushTerminalLog = (text: string) => {
    const stamp = new Date().toLocaleTimeString();
    setTerminalOutput(prev => [...prev, `[${stamp}] ${text}`]);
  };

  // ==================== REAL-TIME SUPABASE SERVICES ====================
  useEffect(() => {
    let active = true;
    async function loadChannels() {
      setIsLoadingChannels(true);
      try {
        const { data, error } = await supabase.from('channels').select('*').order('name', { ascending: true });
        if (error) throw error;
        if (active) {
          const items: YouTubeChannel[] = (data || []).map((c: any) => ({
            id: c.id,
            channelId: c.id,
            channelName: c.name,
            channelHandle: c.website || '',
            channelThumbnail: c.avatar || '',
            bannerUrl: null,
            subscriberCount: Number(c.subscribers) || 0,
            description: c.name || '',
            addedBy: 'admin',
            addedAt: c.added_at,
            lastSynced: c.added_at,
            isActive: c.is_active !== false,
            tags: c.exams || [],
            totalVideos: 0,
            totalPlaylists: c.playlists_count || 0,
            channelAvatar: c.avatar,
            channelUrl: c.website,
            examTags: c.exams || [],
            instituteId: c.institute_id,
            teacherId: c.teacher_id,
            subscriberCountFormatted: c.subscribers || '0',
            videoCount: c.playlists_count || 0
          } as any));
          setChannels(items);
        }
      } catch (err) {
        console.error('Error fetching channels:', err);
      } finally {
        if (active) setIsLoadingChannels(false);
      }
    }

    loadChannels();

    const channel = supabase.channel('realtime-channels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, () => {
        loadChannels();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPlaylists() {
      setIsLoadingPlaylists(true);
      try {
        const { data, error } = await supabase.from('playlists').select('*').order('title', { ascending: true });
        if (error) throw error;
        if (active) {
          const items: Playlist[] = (data || []).map((p: any) => ({
            id: p.id,
            playlistId: p.id,
            title: p.title,
            description: p.description || '',
            thumbnailUrl: p.thumbnail || '',
            channelId: p.channel_id || '',
            channelName: p.channel_name || '',
            videoCount: p.lectures_count || 0,
            lecturesCount: p.lectures_count || 0,
            subject: p.category || '',
            examType: p.exam_type || 'NEET',
            examTags: [p.exam_type].filter(Boolean),
            isActive: p.is_active !== false,
            importStatus: p.import_status || 'completed',
            createdAt: p.created_at || new Date().toISOString()
          }));
          setPlaylists(items);
        }
      } catch (err) {
        console.error('Error fetching playlists:', err);
      } finally {
        if (active) setIsLoadingPlaylists(false);
      }
    }

    loadPlaylists();

    const channel = supabase.channel('realtime-playlists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists' }, () => {
        loadPlaylists();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadVideos() {
      setIsLoadingVideos(true);
      try {
        const { data, error } = await supabase.from('videos').select('*').order('publish_date', { ascending: false }).limit(500);
        if (error) throw error;
        if (active) {
          const items: YouTubeVideo[] = (data || []).map((v: any) => ({
            id: v.id,
            videoId: v.id,
            playlistId: v.playlist_id || '',
            channelId: v.channel_id || '',
            channelName: v.channel_name || '',
            title: v.title,
            description: v.description || '',
            thumbnail: v.thumbnail_url || '',
            duration: v.duration || '',
            durationSeconds: v.duration_seconds || 0,
            publishedAt: v.publish_date || v.created_at || new Date().toISOString(),
            viewCount: v.views || 0,
            likeCount: v.likes_count || 0,
            subject: v.subject || '',
            topic: v.topic || '',
            examTags: v.exam_type ? [v.exam_type] : [],
            isActive: v.is_active !== false,
            importedAt: v.created_at || '',
            position: 0
          }));
          setVideos(items);
        }
      } catch (err) {
        console.error('Error fetching videos:', err);
      } finally {
        if (active) setIsLoadingVideos(false);
      }
    }

    loadVideos();

    const channel = supabase.channel('realtime-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, () => {
        loadVideos();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSyncLogs() {
      setIsLoadingLogs(true);
      try {
        const { data, error } = await supabase.from('sync_logs').select('*').order('timestamp', { ascending: false }).limit(150);
        if (error) throw error;
        if (active) {
          const items: YouTubeSyncLog[] = (data || []).map((l: any) => ({
            id: l.id,
            timestamp: l.timestamp,
            targetId: l.channel_id || '',
            targetName: l.channel_name || '',
            playlistsImported: l.playlists_imported || 0,
            videosImported: l.videos_imported || 0,
            quotaUsed: l.quota_used || 0,
            status: l.status || 'success',
            error: l.error_message || '',
            type: 'channel',
            apiUnitsUsed: l.quota_used || 0,
            triggeredBy: 'admin'
          }));
          setSyncLogs(items);
        }
      } catch (err) {
        console.error('Error fetching sync logs:', err);
      } finally {
        if (active) setIsLoadingLogs(false);
      }
    }

    loadSyncLogs();

    const channel = supabase.channel('realtime-sync-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs' }, () => {
        loadSyncLogs();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time tracker for newly importing channel stats via Supabase Realtime
  useEffect(() => {
    if (!activeImportId) return;

    pushTerminalLog(`Attaching real-time listener to Supabase sync logs and collections for ID: ${activeImportId}...`);

    let active = true;

    async function checkCounts() {
      try {
        const { count: playlistCount } = await supabase.from('playlists').select('*', { count: 'exact', head: true }).eq('channel_id', activeImportId);
        const { count: videoCount } = await supabase.from('videos').select('*', { count: 'exact', head: true }).eq('channel_id', activeImportId);
        
        if (active) {
          setImportPlaylistsProgress(prev => ({ ...prev, current: playlistCount || 0 }));
          setImportVideosProgress(prev => ({ ...prev, current: videoCount || 0 }));
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function checkChannel() {
      try {
        const { data, error } = await supabase.from('channels').select('*').eq('id', activeImportId).single();
        if (error) throw error;
        if (active && data) {
          const c: YouTubeChannel = {
            id: data.id,
            channelId: data.id,
            channelName: data.name,
            channelHandle: data.website || '',
            channelThumbnail: data.avatar || '',
            bannerUrl: null,
            subscriberCount: Number(data.subscribers) || 0,
            description: data.name || '',
            addedBy: 'admin',
            addedAt: data.added_at,
            lastSynced: data.added_at,
            isActive: data.is_active !== false,
            tags: data.exams || [],
            totalVideos: 0,
            totalPlaylists: data.playlists_count || 0,
            channelAvatar: data.avatar,
            channelUrl: data.website,
            examTags: data.exams || [],
            instituteId: data.institute_id,
            teacherId: data.teacher_id,
            subscriberCountFormatted: data.subscribers || '0',
            videoCount: data.playlists_count || 0
          } as any;
          setImportFoundChannel(c);
          setImportPlaylistsProgress(prev => ({ ...prev, total: c.totalPlaylists || 20 }));
          setImportVideosProgress(prev => ({ ...prev, total: 500 }));
          pushTerminalLog(`Channel successfully resolved & saved: ${c.channelName} (${c.subscriberCount.toLocaleString()} subscribers)`);
        }
      } catch (err) {
        console.error(err);
      }
    }

    async function checkLatestLog() {
      try {
        const { data, error } = await supabase.from('sync_logs').select('*').eq('channel_id', activeImportId).order('timestamp', { ascending: false }).limit(1);
        if (error) throw error;
        if (active && data && data.length > 0) {
          const latestLog = data[0];
          if (latestLog.status === 'failed') {
            setImportStatusStep('failed');
            pushTerminalLog(`❌ API sync log flagged failure: ${latestLog.error_message || 'Unknown quota exception'}`);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    checkCounts();
    checkChannel();
    checkLatestLog();

    const playlistChan = supabase.channel('import-playlists')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'playlists', filter: `channel_id=eq.${activeImportId}` }, () => {
        checkCounts();
      }).subscribe();

    const videoChan = supabase.channel('import-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `channel_id=eq.${activeImportId}` }, () => {
        checkCounts();
      }).subscribe();

    const channelChan = supabase.channel('import-channels')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels', filter: `id=eq.${activeImportId}` }, () => {
        checkChannel();
      }).subscribe();

    const logChan = supabase.channel('import-sync-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sync_logs', filter: `channel_id=eq.${activeImportId}` }, () => {
        checkLatestLog();
      }).subscribe();

    return () => {
      active = false;
      supabase.removeChannel(playlistChan);
      supabase.removeChannel(videoChan);
      supabase.removeChannel(channelChan);
      supabase.removeChannel(logChan);
    };
  }, [activeImportId]);


  // ==================== ACTIONS ====================

  // Start Ingestion (TAB 1)
  const handleImportChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelInput.trim() || isAddingChannel) return;

    setIsAddingChannel(true);
    setTerminalOutput([]);
    setImportStatusStep('searching');
    setImportPlaylistsProgress({ current: 0, total: 5 });
    setImportVideosProgress({ current: 0, total: 50 });
    setImportFoundChannel(null);

    const targetQuery = channelInput.trim();
    pushTerminalLog(`Initializing handshake interface containing validation nodes for query: "${targetQuery}"...`);

    try {
      pushTerminalLog(`Sending REST POST trigger to channel register middleware. Scopes: Subjects [${addSubjects.join(', ')}], Exams [${addExamTags.join(', ')}]`);
      const response = await fetch('/api/youtube/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          handleOrId: targetQuery,
          examTags: addExamTags,
          subject: addSubjects[0] || 'Biology'
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Server rejected registration');
      }

      const channelObj = resData.data;
      setImportFoundChannel(channelObj);
      pushTerminalLog(`✅ Channel resolved successfully: ${channelObj.channelName}`);
      pushTerminalLog(`   - Subscriber Base: ${channelObj.subscriberCount.toLocaleString()} pre-medical candidates`);
      pushTerminalLog(`   - Expected total playlists: ${channelObj.totalPlaylists || 'Unspecified'}`);
      pushTerminalLog(`   - Expected total videos: ${channelObj.totalVideos || 'Unspecified'}`);

      setImportPlaylistsProgress({ current: 0, total: channelObj.totalPlaylists || 15 });
      setImportVideosProgress({ current: 0, total: channelObj.totalVideos || 120 });
      
      // Setting activeImportId triggers the live onSnapshot listeners for precise UI statistics!
      setActiveImportId(channelObj.id);

      // Transition to importing playlists phase
      setImportStatusStep('importing_playlists');
      pushTerminalLog(`Invoking backend crawler discovery routine '/api/youtube/playlists/sync'...`);
      const syncRes = await fetch('/api/youtube/playlists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channelObj.id })
      });

      if (!syncRes.ok) {
        const syncErr = await syncRes.json();
        throw new Error(`Playlist scanner failed: ${syncErr.error}`);
      }
      
      const syncData = await syncRes.json();
      const plList = syncData.data || [];
      pushTerminalLog(`Playlist crawler finalized. ${plList.length} course playlists discovered and cached!`);
      
      setImportPlaylistsProgress({ current: plList.length, total: plList.length });
      
      const expectedTotalVideos = plList.reduce((acc: number, p: any) => acc + (p.lecturesCount || p.videoCount || 0), 0);
      setImportVideosProgress({ current: 0, total: expectedTotalVideos || 100 });

      // Transition to importing videos phase
      setImportStatusStep('importing_videos');
      pushTerminalLog(`Initiating micro-learning video lectures ingestion recursively across ${plList.length} playlists...`);

      let totalVideosCount = 0;
      for (let idx = 0; idx < plList.length; idx++) {
        const playlist = plList[idx];
        pushTerminalLog(`[${idx + 1}/${plList.length}] Ingesting item items from playlist: "${playlist.title}"...`);
        const itemRes = await fetch('/api/youtube/playlists/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlistId: playlist.id })
        });
        
        if (itemRes.ok) {
          const itemData = await itemRes.json();
          const itemsImportedCount = itemData.count || itemData.data?.length || 0;
          totalVideosCount += itemsImportedCount;
          pushTerminalLog(`Successfully imported ${itemsImportedCount} videos from "${playlist.title}".`);
        } else {
          pushTerminalLog(`⚠️ Warning: Failed to ingest videos for playlist ID: ${playlist.id}`);
        }
      }

      setImportStatusStep('complete');
      pushTerminalLog(`✅ Real-time sync complete: ${plList.length} playlists synchronized, ${totalVideosCount} video lectures cataloged successfully!`);

    } catch (err: any) {
      pushTerminalLog(`❌ FATAL EXCEPTION: ${err.message}`);
      setImportStatusStep('failed');
    } finally {
      setIsAddingChannel(false);
    }
  };

  const handleSubjectToggle = (subj: string) => {
    if (addSubjects.includes(subj)) {
      setAddSubjects(prev => prev.filter(s => s !== subj));
    } else {
      setAddSubjects(prev => [...prev, subj]);
    }
  };

  const handleExamToggle = (ex: string) => {
    if (addExamTags.includes(ex)) {
      setAddExamTags(prev => prev.filter(e => e !== ex));
    } else {
      setAddExamTags(prev => [...prev, ex]);
    }
  };

  // Sync playlists and videos for a single Channel (TAB 2)
  const handleSyncChannel = async (channelId: string, name: string) => {
    setSyncingChannelId(channelId);
    try {
      const res = await fetch('/api/youtube/playlists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to sync channel: ${err.error}`);
      } else {
        alert(`Successfully synchronized playlists and lectures for channel: ${name}`);
      }
    } catch (err: any) {
      alert(`Sync communication failure: ${err.message}`);
    } finally {
      setSyncingChannelId(null);
    }
  };

  // Sync All Channels (TAB 2)
  const handleSyncAllChannels = async () => {
    if (isSyncingAll) return;
    setIsSyncingAll(true);
    try {
      const res = await fetch('/api/youtube/sync-all', { method: 'POST' });
      if (res.ok) {
        const pay = await res.json();
        alert(`Scheduled synchronization completed: Synthesized ${pay.playlistsSynced} playlists and consumed ${pay.apiUnitsConsumed} quota units.`);
      } else {
        const pay = await res.json();
        alert(`Sync All failed: ${pay.error}`);
      }
    } catch (err: any) {
      alert(`Sync All exception: ${err.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  // Channel Toggle isActive Status (TAB 2)
  const handleToggleChannelStatus = async (channelId: string, currentVal: boolean) => {
    try {
      const { error } = await supabase.from('channels').update({ is_active: !currentVal }).eq('id', channelId);
      if (error) throw error;
      mutate(SWR_KEYS.CHANNELS);
    } catch (err: any) {
      alert(`Failed to update status in Supabase: ${err.message}`);
    }
  };

  // Delete Channel Confirmation & execution (TAB 2)
  const handleDeleteChannelExecute = async () => {
    if (!channelToDelete) return;
    setIsDeletingChannel(true);
    try {
      const response = await fetch(`/api/youtube/channels/${channelToDelete.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setChannelToDelete(null);
        mutate(SWR_KEYS.CHANNELS);
        mutate(SWR_KEYS.PLAYLISTS);
        mutate(SWR_KEYS.RECENT_VIDEOS);
      } else {
        const resData = await response.json();
        alert(`Failed to delete channel resource: ${resData.error || 'Server error'}`);
      }
    } catch (err: any) {
      alert(`Deletion communication error: ${err.message}`);
    } finally {
      setIsDeletingChannel(false);
    }
  };

  // Playlist dynamic fetch of associated videos for viewing modal (TAB 3)
  const handleOpenPlaylistVideos = async (pl: Playlist) => {
    setSelectedPlaylistForVideos(pl);
    setIsLoadingPlaylistVideos(true);
    setPlaylistVideosList([]);
    try {
      // Fetch associated lectures/videos
      const response = await fetch(`/api/youtube/lectures?playlistId=${pl.id}`);
      if (response.ok) {
        const resData = await response.json();
        setPlaylistVideosList(resData.data || []);
      } else {
        // Fallback filter client-side videos
        const filtered = videos.filter(v => v.playlistId === pl.id);
        setPlaylistVideosList(filtered);
      }
    } catch (err) {
      // fallback
      const filtered = videos.filter(v => v.playlistId === pl.id);
      setPlaylistVideosList(filtered);
    } finally {
      setIsLoadingPlaylistVideos(false);
    }
  };

  // Playlist Delete confirmation (TAB 3)
  const handleDeletePlaylistExecute = async (playlist: Playlist) => {
    if (!window.confirm(`Are you sure you want to delete the playlist "${playlist.title}" and associated lectures?`)) return;
    try {
      // Remove playlist document
      const { error: plError } = await supabase.from('playlists').delete().eq('id', playlist.id);
      if (plError) throw plError;
      
      // Delete associated videos to prevent orphan records
      const { error: vidError } = await supabase.from('videos').delete().eq('playlist_id', playlist.id);
      if (vidError) throw vidError;

      alert('Playlist and associated videos successfully removed.');
      mutate(SWR_KEYS.PLAYLISTS);
      mutate(SWR_KEYS.RECENT_VIDEOS);
    } catch (err: any) {
      alert(`Failed to delete playlist: ${err.message}`);
    }
  };

  // Toggle Hide/Show playlist from students (TAB 3)
  const handleTogglePlaylistActive = async (playlistId: string, currentVal: boolean) => {
    try {
      const { error } = await supabase.from('playlists').update({ is_active: !currentVal }).eq('id', playlistId);
      if (error) throw error;
      mutate(SWR_KEYS.PLAYLISTS);
    } catch (err: any) {
      alert(`Failed to update playlist state: ${err.message}`);
    }
  };

  // Video Preview Embed (TAB 4)
  const handlePreviewVideo = (videoId: string) => {
    setPreviewVideoId(videoId);
  };

  // Toggle Hide/Show individual Video (TAB 4)
  const handleToggleVideoActive = async (videoId: string, currentVal: boolean) => {
    try {
      const { error } = await supabase.from('videos').update({ is_active: !currentVal }).eq('id', videoId);
      if (error) throw error;
      mutate(SWR_KEYS.RECENT_VIDEOS);
    } catch (err: any) {
      alert(`Failed to update video active status: ${err.message}`);
    }
  };

  // Delete Individual Video (TAB 4)
  const handleDeleteVideo = async (videoId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the video: "${title}"?`)) return;
    try {
      const { error } = await supabase.from('videos').delete().eq('id', videoId);
      if (error) throw error;
      mutate(SWR_KEYS.RECENT_VIDEOS);
    } catch (err: any) {
      alert(`Deletion failure: ${err.message}`);
    }
  };

  // Open Edit Metadata Drawer/Modal (TAB 4)
  const handleEditVideoMetadata = (vid: YouTubeVideo) => {
    setEditingVideo(vid);
    setEditSubject(vid.subject || 'Biology');
    setEditTopic(vid.topic || '');
    setEditExamTagsString(vid.examTags?.join(', ') || 'NEET');
  };

  const handleSaveVideoMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    try {
      const parsedTags = editExamTagsString.split(',').map(t => t.trim()).filter(Boolean);
      const { error } = await supabase.from('videos').update({
        subject: editSubject,
        topic: editTopic,
        exam_type: parsedTags[0] || 'Both'
      }).eq('id', editingVideo.id);

      if (error) throw error;
      setEditingVideo(null);
      mutate(SWR_KEYS.RECENT_VIDEOS);
    } catch (err: any) {
      alert(`Failed to save metadata: ${err.message}`);
    }
  };

  // BULK OPERATIONS FOR VIDEOS WITH CHECKBOXES (TAB 4)
  const handleSelectVideo = (videoId: string) => {
    setSelectedVideoIds(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      } else {
        return [...prev, videoId];
      }
    });
  };

  // Apply selectors or filters to visible data sets
  const computedFilteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchSearch = v.title.toLowerCase().includes(videosSearch.toLowerCase()) || 
                          (v.topic && v.topic.toLowerCase().includes(videosSearch.toLowerCase()));
      const matchChannel = videosChannelFilter === 'all' || v.channelId === videosChannelFilter;
      const matchPlaylist = videosPlaylistFilter === 'all' || v.playlistId === videosPlaylistFilter;
      const matchSubject = videosSubjectFilter === 'all' || v.subject === videosSubjectFilter;
      return matchSearch && matchChannel && matchPlaylist && matchSubject;
    });
  }, [videos, videosSearch, videosChannelFilter, videosPlaylistFilter, videosSubjectFilter]);

  const handleSelectAllFilteredVideos = (checked: boolean) => {
    if (checked) {
      const ids = computedFilteredVideos.map(v => v.id);
      setSelectedVideoIds(ids);
    } else {
      setSelectedVideoIds([]);
    }
  };

  const isAllFilteredSelected = computedFilteredVideos.length > 0 && 
    computedFilteredVideos.every(v => selectedVideoIds.includes(v.id));

  // Bulk hide, show, delete actions using batch writes
  const handleBulkHide = async (hide: boolean) => {
    if (selectedVideoIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to ${hide ? 'HIDE' : 'SHOW'} ${selectedVideoIds.length} selected videos?`)) return;
    
    try {
      const { error } = await supabase.from('videos').update({ is_active: !hide }).in('id', selectedVideoIds);
      if (error) throw error;
      setSelectedVideoIds([]);
      alert(`Successfully updated status for selected videos.`);
    } catch (err: any) {
      alert(`Bulk update failed: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVideoIds.length === 0) return;
    if (!window.confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE ${selectedVideoIds.length} selected videos from the catalog? This is irreversible!`)) return;

    try {
      const { error } = await supabase.from('videos').delete().in('id', selectedVideoIds);
      if (error) throw error;
      setSelectedVideoIds([]);
      alert(`Successfully deleted selected videos.`);
    } catch (err: any) {
      alert(`Bulk deletion failed: ${err.message}`);
    }
  };


  // ==================== METRICS CALCULATIONS (TAB 5) ====================
  const quotaStats = useMemo(() => {
    // Current date inside UTC/locale tracker
    const today = new Date().toISOString().substring(0, 10);
    const todayLogs = syncLogs.filter(l => l.timestamp && l.timestamp.startsWith(today));
    const todayUsed = todayLogs.reduce((acc, l) => acc + (l.apiUnitsUsed || 0), 0);
    
    const quotaLimit = 10000;
    const remaining = Math.max(0, quotaLimit - todayUsed);
    // Estimate that an average channel sync/playlist import costs roughly 100 units
    const estImportsPossible = Math.floor(remaining / 100);

    return {
      todayUsed,
      quotaLimit,
      remaining,
      estImportsPossible,
      todayLogsCount: todayLogs.length
    };
  }, [syncLogs]);


  // ==================== RENDERS ====================

  return (
    <div id="content-manager-tab-container" className="space-y-6 pt-4">
      {/* Tab select header buttons */}
      <div className="flex border-b border-zinc-800 bg-zinc-950 p-1.5 rounded-xl gap-1">
        <button
          id="btn-subtab-add-channel"
          onClick={() => setCurrentTab('add_channel')}
          className={`flex-1 text-xs py-2.5 rounded-lg font-mono tracking-tight cursor-pointer uppercase transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'add_channel'
              ? 'bg-indigo-600 font-medium text-white shadow-md shadow-indigo-600/10'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Plus className="w-3.5 h-3.5" /> Add Channel
        </button>
        <button
          id="btn-subtab-channels-list"
          onClick={() => setCurrentTab('channels_list')}
          className={`flex-1 text-xs py-2.5 rounded-lg font-mono tracking-tight cursor-pointer uppercase transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'channels_list'
              ? 'bg-indigo-600 font-medium text-white shadow-md shadow-indigo-600/10'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Youtube className="w-3.5 h-3.5" /> Channels List
        </button>
        <button
          id="btn-subtab-playlists"
          onClick={() => setCurrentTab('playlists')}
          className={`flex-1 text-xs py-2.5 rounded-lg font-mono tracking-tight cursor-pointer uppercase transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'playlists'
              ? 'bg-indigo-600 font-medium text-white shadow-md shadow-indigo-600/10'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Playlists
        </button>
        <button
          id="btn-subtab-videos"
          onClick={() => setCurrentTab('videos')}
          className={`flex-1 text-xs py-2.5 rounded-lg font-mono tracking-tight cursor-pointer uppercase transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'videos'
              ? 'bg-indigo-600 font-medium text-white shadow-md shadow-indigo-600/10'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Play className="w-3.5 h-3.5" /> Videos Catalog
        </button>
        <button
          id="btn-subtab-sync-logs"
          onClick={() => setCurrentTab('sync_logs')}
          className={`flex-1 text-xs py-2.5 rounded-lg font-mono tracking-tight cursor-pointer uppercase transition-all flex items-center justify-center gap-1.5 ${
            currentTab === 'sync_logs'
              ? 'bg-indigo-600 font-medium text-white shadow-md shadow-indigo-600/10'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Sync Logs
        </button>
      </div>


      {/* ==================== TAB 1 — ADD CHANNEL ==================== */}
      {currentTab === 'add_channel' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-5">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-400" /> Catalog Verified Channels
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Introduce new academic channel resources for lecture-item slicing.
                </p>
              </div>

              <form onSubmit={handleImportChannel} className="space-y-5">
                {/* Full-width Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    YouTube Channel URL or Handle
                  </label>
                  <input
                    id="input-channel-url"
                    type="text"
                    required
                    disabled={isAddingChannel}
                    value={channelInput}
                    onChange={(e) => setChannelInput(e.target.value)}
                    placeholder="https://youtube.com/@PhysicsWallah or @PhysicsWallah"
                    className="w-full bg-zinc-950 border border-zinc-800 text-sm py-2.5 px-3.5 rounded-lg text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                {/* Subject Selector Multi Chips */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Subject tags (primary content classification)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUBJECT_OPTIONS.map((sub) => {
                      const isActive = addSubjects.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => handleSubjectToggle(sub)}
                          className={`text-xs px-3 py-1.5 rounded-full font-mono transition-all border cursor-pointer ${
                            isActive
                              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 font-medium'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:border-zinc-700'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Exam Selector Chips */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                    Exam Tag curation filters
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {EXAM_OPTIONS.map((ex) => {
                      const isActive = addExamTags.includes(ex);
                      return (
                        <button
                          key={ex}
                          type="button"
                          onClick={() => handleExamToggle(ex)}
                          className={`text-xs px-3 py-1.5 rounded-full font-mono transition-all border cursor-pointer ${
                            isActive
                              ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40 font-medium'
                              : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:border-zinc-700'
                          }`}
                        >
                          {ex}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Import Button */}
                <button
                  id="btn-submit-import-channel"
                  type="submit"
                  disabled={isAddingChannel}
                  className="w-full py-3 rounded-lg text-xs font-mono font-medium tracking-wide uppercase bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingChannel ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Verifying Academic Identity...
                    </>
                  ) : (
                    <>
                      <DownloadIcon className="w-4 h-4" /> Import Channel
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Import Live Progress Tracker Console */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl space-y-4 flex flex-col h-full min-h-[460px]">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-500" /> Live Ingestion Monitor
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Visual reporting feedback pipeline driven by Firestore triggers.
                </p>
              </div>

              {/* Progress UI Output Pane */}
              <div id="import-progress-panel" className="flex-1 bg-zinc-950 border border-zinc-850 rounded-lg p-4 space-y-4 font-mono text-[11px] overflow-y-auto max-h-[340px]">
                {importStatusStep === 'idle' && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
                    <Database className="w-8 h-8 text-zinc-600 animate-pulse" />
                    <p className="text-xs">No active importation job detected. Complete the register workspace to instantiate listeners.</p>
                  </div>
                )}

                {importStatusStep !== 'idle' && (
                  <div className="space-y-3">
                    {/* Live indicator steps */}
                    <div className="space-y-2 pb-2 border-b border-zinc-900">
                      {/* Step 1: Resolved Channel */}
                      <div className="flex items-start gap-2">
                        {importStatusStep === 'searching' ? (
                          <RefreshCw className="w-3.5 h-3.5 text-indigo-450 animate-spin shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className={importStatusStep === 'searching' ? 'text-indigo-400' : 'text-zinc-300'}>
                            {importStatusStep === 'searching' ? 'Resolving channel credentials from YouTube API...' : '✅ Channel found and registered.'}
                          </p>
                          {importFoundChannel && (
                            <p className="text-zinc-500 text-[10px] mt-0.5">
                              Title: <span className="text-emerald-400">{importFoundChannel.channelName}</span> ({importFoundChannel.subscriberCount?.toLocaleString()} subscribers)
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Playlists Sync */}
                      {importStatusStep !== 'searching' && (
                        <div className="flex items-start gap-2">
                          {['importing_playlists', 'importing_videos'].includes(importStatusStep) ? (
                            <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0 mt-0.5" />
                          ) : importStatusStep === 'complete' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-zinc-800 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={['importing_playlists', 'importing_videos'].includes(importStatusStep) ? 'text-sky-400' : 'text-zinc-400'}>
                              {importStatusStep === 'complete' ? '✅ Playlists synced successfully.' : '⏳ Syncing playlists from channel archive...'}
                            </p>
                            <div className="w-full bg-zinc-900 rounded-full h-1 mt-1.5 overflow-hidden">
                              <div 
                                className="bg-sky-500 h-1 rounded-full transition-all duration-300" 
                                style={{ width: `${importPlaylistsProgress.total > 0 ? (importPlaylistsProgress.current / importPlaylistsProgress.total) * 100 : 0}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">
                              Parsed Playlists: <span className="text-sky-400">{importPlaylistsProgress.current}</span> / {importPlaylistsProgress.total} directories
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Step 3: Videos Sync */}
                      {['importing_videos', 'complete'].includes(importStatusStep) && (
                        <div className="flex items-start gap-2 pt-1">
                          {importStatusStep === 'importing_videos' ? (
                            <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className={importStatusStep === 'importing_videos' ? 'text-purple-400' : 'text-zinc-400'}>
                              {importStatusStep === 'complete' ? '✅ Lectures database populated.' : '⏳ Processing playlistItems (videos ingest)...'}
                            </p>
                            <div className="w-full bg-zinc-900 rounded-full h-1 mt-1.5 overflow-hidden">
                              <div 
                                className="bg-purple-500 h-1 rounded-full transition-all duration-300" 
                                style={{ width: `${importVideosProgress.total > 0 ? (importVideosProgress.current / importVideosProgress.total) * 100 : 0}%` }}
                              />
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1">
                              Ingested Lectures: <span className="text-purple-400">{importVideosProgress.current}</span> / {importVideosProgress.total} videos
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Final Success Badge */}
                    {importStatusStep === 'complete' && importFoundChannel && (
                      <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-900/40 text-emerald-400 text-xs space-y-1">
                        <p className="font-bold">✅ Import complete!</p>
                        <p className="text-[10px] leading-relaxed text-zinc-300">
                          Merged <span className="font-semibold text-emerald-300">{importPlaylistsProgress.current}</span> verified course playlists containing <span className="font-semibold text-emerald-300">{importVideosProgress.current}</span> distinct video lectures directly into database catalog collections.
                        </p>
                      </div>
                    )}

                    {importStatusStep === 'failed' && (
                      <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-900/40 text-rose-400 text-xs space-y-1">
                        <p className="font-bold flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Import failed</p>
                        <p className="text-[10px] leading-relaxed text-zinc-300">
                          Critical validation or API limits error. Examine the raw logs below to initiate mitigation steps.
                        </p>
                      </div>
                    )}

                    {/* Console Live logs output */}
                    <div className="space-y-1 pt-2">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Raw Terminal Frame</p>
                      <div className="bg-zinc-950 p-2.5 rounded border border-zinc-900 font-mono text-[9px] text-zinc-400 max-h-[140px] overflow-y-auto space-y-1">
                        {terminalOutput.map((logStr, idx) => (
                          <div key={idx} className="whitespace-pre-wrap leading-tight break-all border-b border-zinc-900 pb-0.5">
                            {logStr}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ==================== TAB 2 — CHANNELS LIST ==================== */}
      {currentTab === 'channels_list' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold tracking-tight text-white">Registered Channels Catalogue</h3>
              <p className="text-xs text-zinc-400 font-mono">
                Active YouTube broadcasters mapped to academic structures.
              </p>
            </div>
            <button
              onClick={handleSyncAllChannels}
              disabled={isSyncingAll || channels.length === 0}
              className="px-4 py-2 rounded-lg text-xs font-mono font-medium tracking-tight bg-zinc-950 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-zinc-900 cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSyncingAll ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Batch Synced...
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" /> Sync All Channels
                </>
              )}
            </button>
          </div>

          {isLoadingChannels ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              Retrieving channels config from Cloud Firestore...
            </div>
          ) : channels.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-850 rounded-xl">
              No channels mapped yet. Navigate to Add Channel first.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="tbl-channels-list" className="w-full text-left font-sans border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Channel Thumbnail</th>
                    <th className="py-3 px-4">Channel Name</th>
                    <th className="py-3 px-4">Subscribers</th>
                    <th className="py-3 px-4 text-center">Playlists</th>
                    <th className="py-3 px-4 text-center">Videos</th>
                    <th className="py-3 px-4">Last Synced</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-xs">
                  {channels.map((chan) => (
                    <tr key={chan.id} className="hover:bg-zinc-800/20 transition-all">
                      <td className="py-4 px-4">
                        <img
                          src={chan.channelThumbnail}
                          alt={chan.channelName}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full border border-zinc-750 object-cover shrink-0"
                        />
                      </td>
                      <td className="py-4 px-4 font-mono font-medium text-white max-w-[200px] truncate">
                        <div>
                          <p className="truncate block font-semibold">{chan.channelName}</p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{chan.channelHandle}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-zinc-300 font-mono">
                        {chan.subscriberCount ? formatSubscribers(chan.subscriberCount) : '—'}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-300 font-mono">
                        {playlists.filter(p => p.channelId === chan.id).length || chan.totalPlaylists || 0}
                      </td>
                      <td className="py-4 px-4 text-center text-zinc-300 font-mono">
                        {videos.filter(v => v.channelId === chan.id).length || chan.totalVideos || 0}
                      </td>
                      <td className="py-4 px-4 text-zinc-400 font-mono text-[11px]">
                        {chan.lastSynced ? renderTimeAgo(chan.lastSynced) : 'Never synced'}
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleChannelStatus(chan.id, chan.isActive)}
                          className={`text-[10px] font-mono font-semibold px-2 py-1 rounded cursor-pointer transition-colors ${
                            chan.isActive !== false
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-900/50'
                              : 'bg-zinc-950 text-zinc-500 border border-zinc-850'
                          }`}
                        >
                          {chan.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end gap-2 text-[11px] font-mono">
                          <button
                            onClick={() => handleSyncChannel(chan.id, chan.channelName)}
                            disabled={syncingChannelId === chan.id}
                            className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 hover:bg-zinc-900 text-indigo-400 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {syncingChannelId === chan.id ? 'Syncing...' : 'Sync Now'}
                          </button>
                          <button
                            onClick={() => setChannelToDelete(chan)}
                            className="p-1.5 rounded-lg border border-transparent text-rose-500 hover:bg-rose-950/20 hover:border-rose-900/30 transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* ==================== TAB 3 — PLAYLISTS ==================== */}
      {currentTab === 'playlists' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold tracking-tight text-white">Course Playlists Directory</h3>
              <p className="text-xs text-zinc-400 font-mono">
                Curated chapters synthesized from broadcaster feeds.
              </p>
            </div>
          </div>

          {/* Interactive Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                id="playlists-search-input"
                type="text"
                placeholder="Search playlists by title..."
                value={playlistsSearch}
                onChange={(e) => setPlaylistsSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 py-2 pl-9 pr-4 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Channel filter dropdown */}
            <div className="md:col-span-3">
              <select
                id="playlists-channel-select"
                value={playlistsChannelFilter}
                onChange={(e) => setPlaylistsChannelFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 py-2 px-3 rounded-lg text-xs font-mono text-zinc-400 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">Channels: All</option>
                {channels.map(c => (
                  <option key={c.id} value={c.id}>{c.channelName}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="md:col-span-2.5 flex gap-2">
              <select
                id="playlists-subject-select"
                value={playlistsSubjectFilter}
                onChange={(e) => setPlaylistsSubjectFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 py-2 px-3 rounded-lg text-xs font-mono text-zinc-400 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">Subjects: All</option>
                {SUBJECT_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Exam Tag filter */}
            <div className="md:col-span-2.5">
              <select
                value={playlistsExamFilter}
                onChange={(e) => setPlaylistsExamFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 py-2 px-3 rounded-lg text-xs font-mono text-zinc-400 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">Exams: All</option>
                {EXAM_OPTIONS.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table list */}
          {isLoadingPlaylists ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              Retrieving playlists catalog...
            </div>
          ) : playlists.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-850 rounded-xl">
              No playlists found in catalog database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="tbl-playlists" className="w-full text-left font-sans border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Thumbnail</th>
                    <th className="py-3 px-4">Playlist Title</th>
                    <th className="py-3 px-4">Broadcaster Channel</th>
                    <th className="py-3 px-4 text-center">Lectures</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Exam Tags</th>
                    <th className="py-3 px-4">Imports</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-xs">
                  {playlists
                    .filter(pl => {
                      const matchSearch = pl.title.toLowerCase().includes(playlistsSearch.toLowerCase());
                      const matchChannel = playlistsChannelFilter === 'all' || pl.channelId === playlistsChannelFilter;
                      const matchSubject = playlistsSubjectFilter === 'all' || pl.subject === playlistsSubjectFilter;
                      const matchExam = playlistsExamFilter === 'all' || 
                        (pl.examType && pl.examType.includes(playlistsExamFilter));
                      return matchSearch && matchChannel && matchSubject && matchExam;
                    })
                    .map((pl) => (
                      <tr key={pl.id} className="hover:bg-zinc-800/20 transition-all">
                        <td className="py-3 px-4">
                          <img
                            src={pl.thumbnailUrl || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100'}
                            alt={pl.title}
                            referrerPolicy="no-referrer"
                            className="w-16 h-10 object-cover rounded-lg border border-zinc-800 shrink-0"
                          />
                        </td>
                        <td className="py-3 px-4 max-w-[220px] font-medium text-white">
                          <p className="truncate block font-semibold">{pl.title}</p>
                          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{pl.description || 'Verified academic syllabus resource.'}</p>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 font-mono font-medium max-w-[120px] truncate">
                          {pl.channelName}
                        </td>
                        <td className="py-3 px-4 text-center text-zinc-300 font-mono font-semibold">
                          {pl.lecturesCount || 0}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-mono bg-zinc-950 font-semibold text-indigo-400 border border-indigo-500/10 px-2 py-0.5 rounded-full">
                            {pl.subject || 'Biology'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-normal">
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            <span className="text-[9px] font-mono bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded">
                              {pl.examType || 'NEET'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/30">
                            IMPORTED
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5 text-[10px] font-mono">
                            <button
                              onClick={() => handleOpenPlaylistVideos(pl)}
                              className="px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 text-indigo-400 border border-zinc-800 cursor-pointer shrink-0 transition-colors"
                            >
                              View Videos
                            </button>
                            <button
                              onClick={() => handleTogglePlaylistActive(pl.id, pl.isActive || false)}
                              className={`p-1 rounded cursor-pointer transition-colors ${
                                pl.isActive !== false ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-zinc-400'
                              }`}
                              title={pl.isActive !== false ? "Hide Playlist" : "Show Playlist"}
                            >
                              {pl.isActive !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-rose-500" />}
                            </button>
                            <button
                              onClick={() => handleDeletePlaylistExecute(pl)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-500 hover:bg-rose-950/20 transition-colors cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* ==================== TAB 4 — VIDEOS CATALOG ==================== */}
      {currentTab === 'videos' && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold tracking-tight text-white">Academic Lectures Database</h3>
              <p className="text-xs text-zinc-400 font-mono">
                Individual micro-learning units parsed and catalogued.
              </p>
            </div>
          </div>

          {/* Videos filter bar */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              <input
                id="videos-search-input"
                type="text"
                placeholder="Search lectures by title or topic..."
                value={videosSearch}
                onChange={(e) => setVideosSearch(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 py-2 pl-9 pr-4 rounded-lg text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Channel filter dropdown */}
            <div className="md:col-span-3">
              <select
                id="videos-channel-select"
                value={videosChannelFilter}
                onChange={(e) => {
                  setVideosChannelFilter(e.target.value);
                  setVideosPlaylistFilter('all'); // reset playlist
                }}
                className="w-full bg-zinc-950 border border-zinc-850 py-2 px-3 rounded-lg text-xs font-mono text-zinc-400 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">Channels: All</option>
                {channels.map(c => (
                  <option key={c.id} value={c.id}>{c.channelName}</option>
                ))}
              </select>
            </div>

            {/* Playlist Filter */}
            <div className="md:col-span-3">
              <select
                id="videos-playlist-select"
                value={videosPlaylistFilter}
                onChange={(e) => setVideosPlaylistFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 py-2 px-3 rounded-lg text-xs font-mono text-zinc-400 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">Playlists: All</option>
                {playlists
                  .filter(p => videosChannelFilter === 'all' || p.channelId === videosChannelFilter)
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div className="md:col-span-2">
              <select
                id="videos-subject-select"
                value={videosSubjectFilter}
                onChange={(e) => setVideosSubjectFilter(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-850 py-2 px-3 rounded-lg text-xs font-mono text-zinc-400 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="all">Subjects: All</option>
                {SUBJECT_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bulk operation header widget (Sticky visual bar!) */}
          {selectedVideoIds.length > 0 && (
            <div className="bg-indigo-550/10 border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between gap-4 animate-fadeIn">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-indigo-600 text-white shrink-0">
                  <Database className="w-3.5 h-3.5" />
                </div>
                <p className="text-xs font-mono text-white">
                  <span className="font-bold text-indigo-400">{selectedVideoIds.length}</span> lectures selected for administrative batch operations.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkHide(true)}
                  className="px-3 py-1.5 rounded bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 font-mono text-[10px] text-zinc-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <EyeOff className="w-3 h-3 text-rose-400" /> Hide Selected
                </button>
                <button
                  onClick={() => handleBulkHide(false)}
                  className="px-3 py-1.5 rounded bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 font-mono text-[10px] text-zinc-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Eye className="w-3 h-3 text-emerald-400" /> Show Selected
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 rounded bg-rose-950/30 hover:bg-rose-950/50 border border-rose-900/30 font-mono text-[10px] text-rose-400 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Delete Selected
                </button>
                <button
                  onClick={() => setSelectedVideoIds([])}
                  className="px-2 py-1.5 text-zinc-400 hover:text-white shrink-0 text-xs font-mono"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Table view list */}
          {isLoadingVideos ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500">
              Retrieving general index collection...
            </div>
          ) : computedFilteredVideos.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-850 rounded-xl">
              No matching lectures indexed under active constraints.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table id="tbl-videos" className="w-full text-left font-sans border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={(e) => handleSelectAllFilteredVideos(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-zinc-800 text-indigo-550 focus:ring-0 cursor-pointer bg-zinc-950"
                      />
                    </th>
                    <th className="py-3 px-4">Thumbnail</th>
                    <th className="py-3 px-4">Lecture Info</th>
                    <th className="py-3 px-4">Broadcaster</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Subject & Topic</th>
                    <th className="py-3 px-4">Views count</th>
                    <th className="py-3 px-4">Published</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-xs text-zinc-300">
                  {computedFilteredVideos.map((video) => {
                    const isSelected = selectedVideoIds.includes(video.id);
                    return (
                      <tr 
                        key={video.id} 
                        className={`hover:bg-zinc-800/15 transition-all ${
                          isSelected ? 'bg-indigo-500/5' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectVideo(video.id)}
                            className="w-3.5 h-3.5 rounded border-zinc-800 text-indigo-400 focus:ring-0 cursor-pointer bg-zinc-950"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="relative shrink-0 cursor-pointer" onClick={() => handlePreviewVideo(video.videoId)}>
                            <img
                              src={video.thumbnail || 'https://images.unsplash.com/photo-1510070112810-d4e9a46d9e91?w=100'}
                              alt={video.title}
                              referrerPolicy="no-referrer"
                              className="w-16 h-10 object-cover rounded-lg border border-zinc-800"
                            />
                            <div className="absolute inset-0 bg-black/40 hover:bg-black/20 rounded-lg flex items-center justify-center transition-opacity opacity-0 hover:opacity-100">
                              <Play className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <div>
                            <p 
                              onClick={() => handlePreviewVideo(video.videoId)}
                              className="font-semibold text-white truncate hover:text-indigo-400 cursor-pointer block leading-normal"
                            >
                              {video.title}
                            </p>
                            <p className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">ID: {video.videoId}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 font-mono text-[11px] max-w-[120px] truncate">
                          {video.channelName}
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {video.duration || '00:00'}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <span className="text-[9px] font-mono font-semibold bg-zinc-950 text-indigo-400 border border-indigo-500/10 px-1.5 py-0.5 rounded">
                              {video.subject || 'Biology'}
                            </span>
                            {video.topic && (
                              <p className="text-[10px] text-zinc-500 truncate mt-1 max-w-[130px]" title={video.topic}>
                                Topic: <span className="text-zinc-400 font-medium">{video.topic}</span>
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {video.viewCount ? formatNumberCompact(video.viewCount) : '—'}
                        </td>
                        <td className="py-3 px-4 text-[10px] text-zinc-500 font-mono">
                          {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1 text-[11px] font-mono">
                            <button
                              onClick={() => handlePreviewVideo(video.videoId)}
                              className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                              title="Preview"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditVideoMetadata(video)}
                              className="p-1 rounded text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer"
                              title="Edit Metadata"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleVideoActive(video.id, video.isActive)}
                              className="p-1 rounded transition-colors cursor-pointer"
                              title={video.isActive ? "Hide Video" : "Show Video"}
                            >
                              {video.isActive ? (
                                <Eye className="w-4 h-4 text-zinc-400 hover:text-white" />
                              ) : (
                                <EyeOff className="w-4 h-4 text-rose-500 hover:text-rose-400" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(video.id, video.title)}
                              className="p-1 rounded text-zinc-500 hover:text-rose-500 hover:bg-rose-950/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}


      {/* ==================== TAB 5 — SYNC LOGS ==================== */}
      {currentTab === 'sync_logs' && (
        <div className="space-y-6">
          {/* Quota Usage Grid Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quota Progress Bar */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 md:col-span-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-zinc-400 flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-indigo-455" /> Today's YouTube API Unit Usage</span>
                <span className="text-white font-semibold">{quotaStats.todayUsed.toLocaleString()} / {quotaStats.quotaLimit.toLocaleString()} units</span>
              </div>
              <div className="w-full bg-zinc-950 rounded-full h-3 overflow-hidden border border-zinc-850 p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    (quotaStats.todayUsed / quotaStats.quotaLimit) > 0.85 
                      ? 'bg-rose-500' 
                      : (quotaStats.todayUsed / quotaStats.quotaLimit) > 0.5 
                      ? 'bg-indigo-500' 
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${(quotaStats.todayUsed / quotaStats.quotaLimit) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 font-mono leading-relaxed">
                Unit impact updates progressively based on transactions. Discovery scans cost 100u, playlist crawls cost 100u, item updates are buffered dynamically.
              </p>
            </div>

            {/* Estimated Remaining Imports Block */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Estimated remaining potential</span>
                <p className="text-2xl font-bold font-display text-emerald-400">~{quotaStats.estImportsPossible} channels</p>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Calculated on rough estimate budgets of 100 units per pipeline operation.
              </p>
            </div>
          </div>

          {/* Sync Operations Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold tracking-tight text-white flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-455" /> Synchronization Activity Feed
                </h3>
                <p className="text-xs text-zinc-400 font-mono">Detailed records of indexing routines.</p>
              </div>
            </div>

            {isLoadingLogs ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-500">
                Parsing telemetry records...
              </div>
            ) : syncLogs.length === 0 ? (
              <div className="py-12 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-850 rounded-xl">
                No activity logs available in Firestore data warehouse.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-850 text-zinc-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                      <th className="py-2.5 px-4 font-semibold">Type</th>
                      <th className="py-2.5 px-4 font-semibold">Target Entity ID</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Videos Imported</th>
                      <th className="py-2.5 px-4 font-semibold text-center">API Unit Cost</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                      <th className="py-2.5 px-4 font-semibold">Exception Info / Errors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850/60 text-zinc-300">
                    {syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                        </td>
                        <td className="py-3 px-4 font-bold max-w-[100px] truncate">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono ${
                            log.type === 'channel' 
                              ? 'bg-indigo-500/10 text-indigo-400' 
                              : log.type === 'playlist' 
                              ? 'bg-indigo-500/10 text-indigo-400' 
                              : log.type === 'channel_delete'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[150px] truncate text-zinc-400">
                          {log.targetId}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {log.videosImported ?? 0}
                        </td>
                        <td className="py-3 px-4 text-center text-zinc-400">
                          {log.apiUnitsUsed ? `${log.apiUnitsUsed} units` : '0 u'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {log.status === 'success' ? (
                            <span className="text-emerald-400 font-bold">SUCCESS</span>
                          ) : (
                            <span className="text-rose-400 font-bold">FAILED</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-rose-400 max-w-[200px] truncate" title={log.error}>
                          {log.error || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ==================== SUB-MODALS & SLIDEOUT DRAWDERS ==================== */}

      {/* Playlist View Videos Modal */}
      {selectedPlaylistForVideos && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Playlist Course lectures</span>
                <h4 className="text-sm font-semibold text-white truncate max-w-[600px]">{selectedPlaylistForVideos.title}</h4>
              </div>
              <button
                onClick={() => setSelectedPlaylistForVideos(null)}
                className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-850 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {isLoadingPlaylistVideos ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500">
                  Scanning associated recordings from platform database...
                </div>
              ) : playlistVideosList.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  No lectures linked to this course playlist in database registry.
                </div>
              ) : (
                <div className="space-y-3">
                  {playlistVideosList.map((vid, idx) => (
                    <div 
                      key={vid.id} 
                      className="flex items-center gap-4 bg-zinc-950 p-3 rounded-lg border border-zinc-850/60 hover:border-zinc-800 transition-all hover:bg-zinc-950/80"
                    >
                      <span className="text-zinc-600 font-mono text-xs w-6 shrink-0">{idx + 1}</span>
                      <img
                        src={vid.thumbnail}
                        alt={vid.title}
                        referrerPolicy="no-referrer"
                        className="w-20 h-12 object-cover rounded border border-zinc-800 shrink-0 cursor-pointer"
                        onClick={() => {
                          setSelectedPlaylistForVideos(null);
                          setPreviewVideoId(vid.videoId);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p 
                          onClick={() => {
                            setSelectedPlaylistForVideos(null);
                            setPreviewVideoId(vid.videoId);
                          }}
                          className="text-xs font-semibold text-white truncate hover:text-indigo-400 cursor-pointer"
                        >
                          {vid.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 truncate mt-1">
                          Duration: <span className="text-zinc-400 font-mono">{vid.duration || '—'}</span> &bull; Topic: <span className="text-zinc-400">{vid.topic || '—'}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedPlaylistForVideos(null);
                          setPreviewVideoId(vid.videoId);
                        }}
                        className="p-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900 text-indigo-400 shrink-0 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Embed YouTube Player Preview Modal */}
      {previewVideoId && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-zinc-900 border-b border-zinc-850 flex justify-between items-center shrink-0">
              <span className="text-xs font-mono text-white flex items-center gap-1.5">
                <Youtube className="w-4 h-4 text-rose-500" /> Platform Player Inmate
              </span>
              <button
                onClick={() => setPreviewVideoId(null)}
                className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Embed element */}
            <div className="relative aspect-video bg-black flex-1">
              <iframe
                src={`https://www.youtube.com/embed/${previewVideoId}?autoplay=1&rel=0`}
                title="YouTube Video Player Preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full border-0"
              />
            </div>
            
            <div className="p-3 bg-zinc-900 border-t border-zinc-850 text-center font-mono text-[10px] text-zinc-500">
              Viewing external academic lecture node inside safe Sandboxed Iframe.
            </div>
          </div>
        </div>
      )}

      {/* Channel Delete Confirmation Modal */}
      {channelToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="space-y-2 text-center">
              <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-tight">Confirm Resource Eviction</h4>
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                Evicting <span className="text-white font-semibold">{channelToDelete.channelName}</span> will trigger cascade deletion rules, cleaning up:
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-850 font-mono text-xs text-zinc-400 space-y-2">
              <p className="flex justify-between"><span>Channel Document</span> <span className="text-rose-400">DELETE</span></p>
              <p className="flex justify-between"><span>Associated Playlists</span> <span className="text-rose-400">DELETE</span></p>
              <p className="flex justify-between"><span>Associated Videos</span> <span className="text-rose-400">DELETE</span></p>
              <p className="flex justify-between"><span>System Lectures</span> <span className="text-rose-400">DELETE</span></p>
            </div>

            <div className="flex gap-3 font-mono text-xs">
              <button
                onClick={() => setChannelToDelete(null)}
                className="flex-1 py-2.5 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteChannelExecute}
                disabled={isDeletingChannel}
                className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white transition-colors cursor-pointer disabled:opacity-55"
              >
                {isDeletingChannel ? 'Evicting...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Video Metadata Drawer/Drawer-Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-end">
          <div className="bg-zinc-900 border-l border-zinc-850 w-full max-w-md h-full flex flex-col shadow-2xl p-6 justify-between animate-slideLeft">
            <div className="space-y-6 flex-1 overflow-y-auto">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block tracking-wider">Aesthetic Metadata adjustments</span>
                  <h4 className="text-sm font-semibold text-white">Edit Academic Fields</h4>
                </div>
                <button
                  onClick={() => setEditingVideo(null)}
                  className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveVideoMetadata} className="space-y-5 font-mono text-xs">
                {/* Visual Video Card Preview */}
                <div className="flex gap-3 bg-zinc-950 p-3 rounded-lg border border-zinc-850">
                  <img
                    src={editingVideo.thumbnail}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-20 h-12 object-cover rounded"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-zinc-300 truncate leading-relaxed">{editingVideo.title}</p>
                    <p className="text-[10px] text-zinc-500 mt-1 truncate">{editingVideo.channelName}</p>
                  </div>
                </div>

                {/* Subject Selector */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 uppercase text-[10px] tracking-wider block">Academic Subject</label>
                  <select
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 py-2.5 px-3 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500/50"
                  >
                    {SUBJECT_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Topic field */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 uppercase text-[10px] tracking-wider block">Topic / Lesson Unit</label>
                  <input
                    type="text"
                    value={editTopic}
                    onChange={(e) => setEditTopic(e.target.value)}
                    placeholder="e.g. Mitochondria & Cell Membrane"
                    className="w-full bg-zinc-950 border border-zinc-850 py-2.5 px-3 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                {/* Exam Tags field */}
                <div className="space-y-1.5">
                  <label className="text-zinc-500 uppercase text-[10px] tracking-wider block">Exam tags (comma-separated)</label>
                  <input
                    type="text"
                    value={editExamTagsString}
                    onChange={(e) => setEditExamTagsString(e.target.value)}
                    placeholder="NEET, NEET 2025"
                    className="w-full bg-zinc-950 border border-zinc-850 py-2.5 px-3 rounded-lg text-white font-mono focus:outline-none focus:border-indigo-500/50"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-800 flex gap-3 text-xs font-mono font-medium">
                  <button
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    className="flex-1 py-3 rounded-lg border border-zinc-800 hover:bg-zinc-850 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


// ==================== HELPER FUNCS ====================

// Simple custom component references for icons used as custom tags
function DownloadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      className={props.className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      ></path>
    </svg>
  );
}

// Format numerical views count beautifully
function formatNumberCompact(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// format subscriber count nicely 
function formatSubscribers(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2).replace(/\.00$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

// Relative time calculation from ISO dates
function renderTimeAgo(dateStr: string): string {
  try {
    const past = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = now - past;
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hour = Math.floor(min / 60);
    const day = Math.floor(hour / 24);

    if (day > 0) return day === 1 ? '1 day ago' : `${day} days ago`;
    if (hour > 0) return hour === 1 ? '1 hr ago' : `${hour} hrs ago`;
    if (min > 0) return min === 1 ? '1 min ago' : `${min} mins ago`;
    return 'Just now';
  } catch {
    return '—';
  }
}
