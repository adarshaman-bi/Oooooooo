import React, { useState, useEffect } from 'react';
import { 
  YouTubeChannel, 
  YouTubeVideo, 
  YouTubeSyncLog, 
  Playlist, 
  Lecture, 
  TeacherProfile, 
  InstituteProfile,
  IngestionControl
} from '../types';
import { getPlaylistThumbnail } from '../services/thumbnailHelper';
import {
  Activity,
  User,
  Layers,
  Youtube,
  History,
  RefreshCw,
  Plus,
  Trash2,
  Database,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Terminal,
  FileSpreadsheet,
  FileText,
  Clock,
  Eye,
  Heart,
  X,
  Play,
  ExternalLink,
  Sparkles,
  Check
} from 'lucide-react';

interface YouTubeImporterTabProps {
  dbTeachers: TeacherProfile[];
  dbInstitutes: InstituteProfile[];
  automatedFlowState: 'idle' | 'running' | 'completed' | 'failed';
  automatedStepIndex: number;
  terminalLogs: Array<{ time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' | 'retry' }>;
  manifestData: any[];
  ingestionControlState: IngestionControl | null;
  handleToggleApproved: (val: boolean) => void;
  simulateQuotaError: boolean;
  setSimulateQuotaError: (val: boolean) => void;
  handleSimulateSyncChannelPlaylists: () => void;
  handleSimulateSyncPlaylistVideos: () => void;
  handleSimulateVerifyTeacherTrigger: () => void;
  handleStartAutomatedIngestion: () => void;
  handleDownloadCSV: () => void;
  addTerminalLog: (text: string, type: 'info' | 'success' | 'warn' | 'error' | 'retry') => void;
}

export default function YouTubeImporterTab({
  dbTeachers,
  dbInstitutes,
  automatedFlowState,
  automatedStepIndex,
  terminalLogs,
  manifestData,
  ingestionControlState,
  handleToggleApproved,
  simulateQuotaError,
  setSimulateQuotaError,
  handleSimulateSyncChannelPlaylists,
  handleSimulateSyncPlaylistVideos,
  handleSimulateVerifyTeacherTrigger,
  handleStartAutomatedIngestion,
  handleDownloadCSV,
  addTerminalLog
}: YouTubeImporterTabProps) {
  // Nested sub-tab states
  const [subTab, setSubTab] = useState<'console' | 'channels' | 'playlists' | 'videos' | 'audit'>('console');

  // Channels lists
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [addHandle, setAddHandle] = useState('');
  const [addSubject, setAddSubject] = useState('Biology');
  const [addTags, setAddTags] = useState('NEET, Biology');
  const [addingChannel, setAddingChannel] = useState(false);

  // Playlists crawler lists
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistChannelFilter, setPlaylistChannelFilter] = useState('all');
  const [playlistStatusFilter, setPlaylistStatusFilter] = useState('all');
  const [importingPlaylistId, setImportingPlaylistId] = useState<string | null>(null);

  // Videos catalog lists
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videoPlaylistFilter, setVideoPlaylistFilter] = useState('all');
  const [videoSubjectFilter, setVideoSubjectFilter] = useState('all');
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Sync audit lists
  const [logs, setLogs] = useState<YouTubeSyncLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch loaders
  const loadChannels = async () => {
    setChannelsLoading(true);
    try {
      const res = await fetch('/api/youtube/admin-channels');
      if (res.ok) {
        const payload = await res.json();
        setChannels(payload.data || []);
      }
    } catch (err) {
      console.error('Failed to load admin channels', err);
    } finally {
      setChannelsLoading(false);
    }
  };

  const loadPlaylists = async () => {
    setPlaylistsLoading(true);
    try {
      const res = await fetch('/api/youtube/admin-playlists');
      if (res.ok) {
        const payload = await res.json();
        setPlaylists(payload.data || []);
      }
    } catch (err) {
      console.error('Failed to load admin playlists', err);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const loadVideos = async () => {
    setVideosLoading(true);
    try {
      const res = await fetch('/api/youtube/admin-videos');
      if (res.ok) {
        const payload = await res.json();
        setVideos(payload.data || []);
      }
    } catch (err) {
      console.error('Failed to load admin videos', err);
    } finally {
      setVideosLoading(false);
    }
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/youtube/admin-logs');
      if (res.ok) {
        const payload = await res.json();
        setLogs(payload.data || []);
      }
    } catch (err) {
      console.error('Failed to load admin logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // Watcher
  useEffect(() => {
    loadChannels();
  }, []);

  useEffect(() => {
    if (subTab === 'channels') loadChannels();
    if (subTab === 'playlists') {
      loadChannels();
      loadPlaylists();
    }
    if (subTab === 'videos') {
      loadPlaylists();
      loadVideos();
    }
    if (subTab === 'audit') loadLogs();
  }, [subTab]);

  // Handle addition
  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addHandle.trim()) return;
    setAddingChannel(true);
    addTerminalLog(`Initiating handshake for new channel: ${addHandle}`, 'info');
    try {
      const res = await fetch('/api/youtube/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handleOrId: addHandle.trim(),
          examTags: addTags.split(',').map(s => s.trim()),
          subject: addSubject
        })
      });
      if (res.ok) {
        addTerminalLog(`Successfully registered channel handle: ${addHandle}`, 'success');
        setAddHandle('');
        await loadChannels();
      } else {
        const payload = await res.json();
        addTerminalLog(`Handshake failed: ${payload.error || 'Server rejected registration'}`, 'error');
      }
    } catch (err: any) {
      addTerminalLog(`Communication failure: ${err.message}`, 'error');
    } finally {
      setAddingChannel(false);
    }
  };

  // Sync playlists for an individual channel
  const handleSyncPlaylists = async (channelId: string, name: string) => {
    addTerminalLog(`Syncing playlist catalogue for verified educator: ${name}`, 'info');
    try {
      const res = await fetch('/api/youtube/playlists/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId })
      });
      if (res.ok) {
        addTerminalLog(`Synchronised playlists for ${name}. View Playlists crawler sub-tab.`, 'success');
        if (subTab === 'playlists') await loadPlaylists();
      } else {
        const payload = await res.json();
        addTerminalLog(`Playlist discovery failed: ${payload.error}`, 'error');
      }
    } catch (err: any) {
      addTerminalLog(`Sync communication failure: ${err.message}`, 'error');
    }
  };

  // Delete channel
  const handleDeleteChannel = async (channelId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to stop indexing content from ${name}?`)) return;
    addTerminalLog(`De-registering channel indexing configuration: ${channelId}`, 'warn');
    try {
      const res = await fetch(`/api/youtube/channels/${channelId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        addTerminalLog(`Successfully cancelled subscription lookup and removed data for: ${name}`, 'success');
        await loadChannels();
      } else {
        const payload = await res.json();
        addTerminalLog(`De-registration failed: ${payload.error || 'Server rejected request'}`, 'error');
      }
    } catch (err: any) {
      addTerminalLog(`De-registration communication error: ${err.message}`, 'error');
    }
  };

  // Import videos from a playlist
  const handleImportPlaylist = async (playlistId: string, title: string) => {
    setImportingPlaylistId(playlistId);
    addTerminalLog(`Launching batch playlistItems loader for: ${title}`, 'info');
    try {
      const res = await fetch('/api/youtube/playlists/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId })
      });
      if (res.ok) {
        const payload = await res.json();
        addTerminalLog(`Successfully ingested ${payload.count} videos as official platform lectures!`, 'success');
        await loadPlaylists();
      } else {
        const payload = await res.json();
        addTerminalLog(`Batch video ingestion failed: ${payload.error}`, 'error');
      }
    } catch (err: any) {
      addTerminalLog(`Batch import communication error: ${err.message}`, 'error');
    } finally {
      setImportingPlaylistId(null);
    }
  };

  // Trigger global sync simulation
  const handleGlobalSyncAll = async () => {
    addTerminalLog(`Initiating scheduled background synchronization run...`, 'info');
    try {
      const res = await fetch('/api/youtube/sync-all', { method: 'POST' });
      if (res.ok) {
        const pay = await res.json();
        addTerminalLog(`Scheduled sync completed. Synthesized ${pay.playlistsSynced} playlists. Units: ${pay.apiUnitsConsumed}`, 'success');
      }
    } catch (err: any) {
      addTerminalLog(`Scheduled sync errored out: ${err.message}`, 'error');
    }
  };

  // Filter computations
  const filteredPlaylists = playlists.filter(pl => {
    const matchChannel = playlistChannelFilter === 'all' || pl.channelId === playlistChannelFilter;
    const matchStatus = playlistStatusFilter === 'all' || pl.importStatus === playlistStatusFilter;
    return matchChannel && matchStatus;
  });

  const filteredVideos = videos.filter(v => {
    const matchPlaylist = videoPlaylistFilter === 'all' || v.playlistId === videoPlaylistFilter;
    const matchSubject = videoSubjectFilter === 'all' || v.subject.toLowerCase() === videoSubjectFilter.toLowerCase();
    return matchPlaylist && matchSubject;
  });

  return (
    <div className="space-y-6">
      {/* Sub Tab Navigation bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-850 pb-4">
        {[
          { id: 'console', label: 'Importer Console', icon: Activity },
          { id: 'channels', label: 'Channels Manager', icon: User },
          { id: 'playlists', label: 'Playlists Crawler', icon: Layers },
          { id: 'videos', label: 'Videos Database', icon: Youtube },
          { id: 'audit', label: 'Sync Audit logs', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = subTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              id={`subtab-${tab.id}`}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-rose-500 text-white font-semibold shadow-lg shadow-rose-950/20' 
                  : 'bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white hover:bg-zinc-850'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TAB content SWITCH */}
      
      {subTab === 'console' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Control Panel Bento */}
            <div className="md:col-span-5 bg-zinc-950 border border-zinc-850 p-6 rounded-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4 text-left">
                <div className="flex items-center gap-2 text-rose-500 font-display font-medium text-sm">
                  <Activity className={`w-5 h-5 ${automatedFlowState === 'running' ? 'animate-spin text-rose-500' : 'text-rose-600'}`} />
                  <span>Automated Phase 1 Pipeline Console</span>
                </div>
                
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Triggers the entire end-to-end academic content intake flow. Automates YouTube API playlist fetches, Knowledge Graph validation checks, academic relevance filtering, and relational database writes.
                </p>

                {/* DB status indicators */}
                <div className="bg-zinc-900/50 border border-zinc-850 p-4 rounded-xl space-y-3 font-mono text-[11px]">
                  <div className="text-zinc-400 border-b border-zinc-800 pb-1.5 flex justify-between items-center">
                    <span>INDEX REGISTRATION</span>
                    <span className="text-[10px] uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-500/20 font-semibold">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Target Syllabus:</span>
                    <span className="text-zinc-300">NEET Biology Core</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Active Handshaked Channels:</span>
                    <span className="text-rose-400 font-bold">{channels.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Sync Control Gate Approval:</span>
                    <span className={ingestionControlState?.approved ? "text-emerald-400 font-semibold" : "text-amber-400"}>
                      {ingestionControlState?.approved ? "Approved" : "Gatekeeper Blocked"}
                    </span>
                  </div>
                </div>

                {/* Human-in-the-loop Ingestion Gate Checkpoint (Phase 2.2) */}
                <div className="bg-zinc-900/40 border border-zinc-850/60 p-3 rounded-lg flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-1">
                      <CheckCircle className={`w-3.5 h-3.5 ${ingestionControlState?.approved ? 'text-emerald-500' : 'text-zinc-500'}`} />
                      <span>Approved (Manual Checkpoint Gate)</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Unlocks dynamic client-side sync events.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={!!ingestionControlState?.approved} 
                      onChange={(e) => handleToggleApproved(e.target.checked)}
                      disabled={automatedFlowState === 'running'}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Quota tester toggle */}
                <div className="bg-zinc-900/40 border border-zinc-850/60 p-3 rounded-lg flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-[11px] font-mono text-zinc-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Simulate HTTP 429 Quotas</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">Forces exponential backoff with random jitter.</p>
                  </div>
                  <label className="relative inline-flex inline-block cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simulateQuotaError} 
                      onChange={(e) => setSimulateQuotaError(e.target.checked)}
                      disabled={automatedFlowState === 'running'}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600 peer-checked:after:bg-white"></div>
                  </label>
                </div>

                {/* Action Triggers */}
                <div className="border-t border-zinc-850 pt-4 space-y-2">
                  <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block">Relational Verification Triggers</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={handleSimulateSyncChannelPlaylists}
                      className="flex items-center justify-between text-left px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-mono transition-all cursor-pointer"
                    >
                      <span className="text-zinc-300">Sync Channels (Cron)</span>
                      <ArrowRight className="w-3 h-3 text-zinc-500" />
                    </button>
                    <button
                      onClick={handleSimulateSyncPlaylistVideos}
                      className="flex items-center justify-between text-left px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-mono transition-all cursor-pointer"
                    >
                      <span className="text-zinc-300">Sync Playlists (Aggregator)</span>
                      <ArrowRight className="w-3 h-3 text-zinc-500" />
                    </button>
                    <button
                      onClick={handleSimulateVerifyTeacherTrigger}
                      className="flex items-center justify-between text-left px-3 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-mono transition-all cursor-pointer"
                    >
                      <span className="text-zinc-300">Verify Teacher Graph</span>
                      <ArrowRight className="w-3 h-3 text-zinc-500" />
                    </button>
                  </div>
                </div>

              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleStartAutomatedIngestion}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-mono text-xs py-3 rounded-xl transition-all shadow-lg hover:shadow-rose-600/10 cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  <span>Execute Automated Pipeline</span>
                </button>
              </div>
            </div>

            {/* Logger terminal bento */}
            <div className="md:col-span-7 bg-zinc-950 border border-zinc-850 p-6 rounded-xl flex flex-col justify-between space-y-4">
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                  <div className="flex items-center gap-2 text-zinc-300 font-display font-medium text-sm">
                    <Terminal className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span>Real-time Ingestion Logger Console</span>
                  </div>
                  {manifestData.length > 0 && (
                    <button
                      onClick={handleDownloadCSV}
                      className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 hover:text-emerald-300 bg-emerald-950/25 border border-emerald-900/60 px-2.5 py-1 rounded"
                    >
                      <FileSpreadsheet className="w-3 h-3" />
                      <span>Syllabus CSV</span>
                    </button>
                  )}
                </div>

                {/* Pipeline Progression Stage Flowchart */}
                {automatedFlowState !== 'idle' && (
                  <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-850/60">
                    <span className="text-[10px] font-mono uppercase text-zinc-500">Pipeline Stages (Flowchart 1.9)</span>
                    <div className="mt-2 grid grid-cols-4 sm:grid-cols-7 gap-1.5 text-center text-[9px] font-mono">
                      {['Init', 'Fetch', 'Relevance', 'Verify', 'Extract', 'Firestore', 'Export'].map((step, idx) => {
                        const isActive = automatedStepIndex === idx;
                        const isDone = automatedStepIndex > idx;
                        return (
                          <div
                            key={step}
                            className={`p-1 rounded border transition-all ${
                              isActive 
                                ? 'bg-indigo-500/15 border-indigo-500 text-indigo-400 font-bold active-step-glow'
                                : isDone
                                  ? 'bg-emerald-500/10 border-emerald-800 text-emerald-400'
                                  : 'bg-zinc-900 border-zinc-850 text-zinc-500'
                            }`}
                          >
                            <div>{step}</div>
                            <div className="mt-1 flex justify-center">
                              {isActive ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                              ) : isDone ? (
                                <Check className="w-2.5 h-2.5" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Logs Terminal */}
                <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl min-h-[220px] max-h-[260px] overflow-y-auto font-mono text-[10px] space-y-1.5">
                  {terminalLogs.length === 0 ? (
                    <div className="text-zinc-500 flex flex-col justify-center items-center h-[180px] space-y-2">
                      <Terminal className="w-8 h-8 text-zinc-850 animate-pulse" />
                      <p>Console is waiting... Ingestion operations log output prints here.</p>
                    </div>
                  ) : (
                    terminalLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start gap-1.5 ${
                          log.type === 'success' ? 'text-emerald-400' :
                          log.type === 'warn' ? 'text-amber-400' :
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'retry' ? 'text-indigo-400 font-bold animate-pulse' :
                          'text-zinc-300'
                        }`}
                      >
                        <span className="text-zinc-500">[{log.time}]</span>
                        <p className="leading-relaxed text-left">{log.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CSV exported message */}
              {automatedFlowState === 'completed' && (
                <div className="bg-emerald-950/20 border border-emerald-950 p-3 rounded-lg flex items-center justify-between text-xs text-emerald-400">
                  <span className="font-mono">✓ Phase 1 Syllabus Registered & Saved</span>
                  <button
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1 bg-emerald-600 text-white font-mono text-[10px] py-1 px-2.5 rounded shadow cursor-pointer"
                  >
                    <span>Download CSV</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'channels' && (
        <div className="space-y-6">
          {/* Add Channel Form */}
          <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-xl text-left space-y-4">
            <h3 className="text-sm font-semibold text-brand-accent flex items-center gap-2">
              <Plus className="w-4 h-4 text-rose-500" />
              <span>Index New YouTube Channel</span>
            </h3>
            
            <form onSubmit={handleAddChannel} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-400 uppercase">Channel Handle or ID</label>
                <input
                  type="text"
                  required
                  value={addHandle}
                  onChange={(e) => setAddHandle(e.target.value)}
                  placeholder="@RituRattewal or ID"
                  className="w-full bg-zinc-900 border border-zinc-805 text-xs text-brand-accent rounded-lg p-2.5 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-400 uppercase">Syllabus Subject</label>
                <select
                  value={addSubject}
                  onChange={(e) => setAddSubject(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-805 text-xs text-brand-accent rounded-lg p-2.5 outline-none"
                >
                  <option value="Biology">Biology (Botany & Zoology)</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Maths">Mathematics</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-zinc-400 uppercase">Indexing tags</label>
                <input
                  type="text"
                  value={addTags}
                  onChange={(e) => setAddTags(e.target.value)}
                  placeholder="NEET, Botany, Lectures"
                  className="w-full bg-zinc-900 border border-zinc-805 text-xs text-brand-accent rounded-lg p-2.5 outline-none font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={addingChannel}
                className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-mono text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {addingChannel ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Register Educator</span>
              </button>
            </form>
          </div>

          {/* Channels Grid list */}
          <div className="space-y-4 text-left">
            <div className="flex justify-between items-center bg-zinc-950 border border-zinc-850 p-4 rounded-xl">
              <span className="font-display font-medium text-sm text-zinc-300">Registered YouTube Channels ({channels.length})</span>
              <button
                onClick={handleGlobalSyncAll}
                className="flex items-center gap-1.5 text-xs font-mono text-rose-400 bg-rose-950/20 border border-rose-900/50 px-3 py-1.5 rounded-lg hover:bg-rose-950/40 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Trigger All Sync</span>
              </button>
            </div>

            {channelsLoading ? (
              <p className="text-xs font-mono p-8 text-center text-zinc-400">Loading registered configurations...</p>
            ) : channels.length === 0 ? (
              <p className="text-xs font-mono p-12 text-center text-zinc-500 border border-dashed border-zinc-850 rounded-xl">No active channels are registered. Add a channel handle above to start indexing!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {channels.map((channel) => (
                  <div key={channel.id} className="bg-zinc-950 border border-zinc-850 p-5 rounded-xl space-y-4 flex flex-col justify-between">
                    <div className="flex items-start gap-4">
                      <img 
                        src={channel.channelThumbnail || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=100'} 
                        alt="" 
                        className="w-12 h-12 rounded-full border border-zinc-800 object-cover shrink-0"
                      />
                      <div className="space-y-1 text-left min-w-0">
                        <h4 className="text-sm font-semibold text-brand-accent line-clamp-1">{channel.channelName}</h4>
                        <span className="text-xs text-rose-500 font-mono font-medium block">{channel.channelHandle}</span>
                        <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                          {channel.description || 'Verified channel catalog indexing academic lectures.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-zinc-900/50 border border-zinc-850/60 p-3 rounded-lg text-center font-mono text-[10px]">
                      <div>
                        <span className="text-zinc-500 block uppercase">Subscribers</span>
                        <span className="text-zinc-200 font-bold font-sans">
                          {channel.subscriberCount ? (channel.subscriberCount / 1000000).toFixed(1) + 'M' : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block uppercase">Videos Count</span>
                        <span className="text-zinc-200 font-bold font-sans">{channel.totalVideos || 0}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block uppercase">Subject</span>
                        <span className="text-brand-accent font-bold">{(channel as any).subject || 'Biology'}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-zinc-900">
                      <button
                        onClick={() => handleSyncPlaylists(channel.id, channel.channelName)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-mono py-2 rounded-lg cursor-pointer hover:text-white transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Crawl Playlists</span>
                      </button>
                      <button
                        onClick={() => handleDeleteChannel(channel.id, channel.channelName)}
                        className="bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-900/40 p-2 rounded-lg cursor-pointer transition-all"
                        title="Remove channel indexing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'playlists' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex flex-col sm:flex-row gap-3 text-left">
            <div className="space-y-1 shrink-0 w-full sm:w-64">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Channel Index filter</label>
              <select
                value={playlistChannelFilter}
                onChange={(e) => setPlaylistChannelFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-855 text-xs text-zinc-300 rounded-lg p-2 outline-none font-mono"
              >
                <option value="all">All channels ({channels.length})</option>
                {channels.map(ch => (
                  <option key={ch.id} value={ch.id}>{ch.channelName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 shrink-0 w-full sm:w-48">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Import status</label>
              <select
                value={playlistStatusFilter}
                onChange={(e) => setPlaylistStatusFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-855 text-xs text-zinc-300 rounded-lg p-2 outline-none"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending Intake</option>
                <option value="imported">Imported & Active</option>
              </select>
            </div>
          </div>

          {/* Playlists grid */}
          <div className="space-y-4 text-left">
            <h3 className="font-display font-medium text-sm text-zinc-300">Playlists Discovered ({filteredPlaylists.length})</h3>

            {playlistsLoading ? (
              <p className="text-xs font-mono p-8 text-center text-zinc-400">Handshaking discoverable playlists...</p>
            ) : filteredPlaylists.length === 0 ? (
              <p className="text-xs font-mono p-12 text-center text-zinc-500 border border-dashed border-zinc-850 rounded-xl">No playlists matched current active filters. Sync channels playlists on prior tab!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPlaylists.map((pl) => {
                  const isImported = pl.importStatus === 'imported';
                  return (
                    <div key={pl.id} className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden shadow duration-200 flex flex-col justify-between">
                      <div className="relative aspect-video bg-zinc-900">
                        <img 
                          src={getPlaylistThumbnail(pl)} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1 items-center">
                          <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded shadow ${
                            isImported 
                              ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800' 
                              : 'bg-amber-955/70 text-amber-400 border border-amber-800'
                          }`}>
                            {pl.importStatus || 'pending'}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                        <div className="space-y-1 text-left">
                          <span className="text-[10px] font-mono text-rose-500 uppercase font-semibold block">{pl.channelName}</span>
                          <h4 className="text-xs font-bold text-brand-accent line-clamp-1">{pl.title}</h4>
                          <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                            {pl.description || 'Verified chapter playlist configuration.'}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-zinc-900 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span>Videos: {pl.lecturesCount || 0}</span>
                          <span>Syllabus: {pl.subject || 'Biology'}</span>
                        </div>
                        
                        <div className="pt-2">
                          <button
                            onClick={() => handleImportPlaylist(pl.id, pl.title)}
                            disabled={importingPlaylistId === pl.id}
                            className={`w-full flex items-center justify-center gap-1.5- px-3 py-2 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                              isImported 
                                ? 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800' 
                                : 'bg-rose-600 hover:bg-rose-500 text-white shadow shadow-rose-900/10'
                            }`}
                          >
                            {importingPlaylistId === pl.id ? (
                              <>
                                <RefreshCw className="w-3 animate-spin shrink-0" />
                                <span>Ingesting Videos...</span>
                              </>
                            ) : (
                              <>
                                <Database className="w-3 h-3 shrink-0" />
                                <span>{isImported ? 'Force Sync Videos' : 'Ingest Playlist & Videos'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'videos' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-xl flex flex-col sm:flex-row gap-3 text-left">
            <div className="space-y-1 shrink-0 w-full sm:w-64">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Playlist source</label>
              <select
                value={videoPlaylistFilter}
                onChange={(e) => setVideoPlaylistFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-855 text-xs text-zinc-300 rounded-lg p-2 outline-none font-mono"
              >
                <option value="all">All loaded playlists ({playlists.length})</option>
                {playlists.map(pl => (
                  <option key={pl.id} value={pl.id}>{pl.title}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 shrink-0 w-full sm:w-48">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Syllabus Subject</label>
              <select
                value={videoSubjectFilter}
                onChange={(e) => setVideoSubjectFilter(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-855 text-xs text-zinc-300 rounded-lg p-2 outline-none"
              >
                <option value="all">All subjects</option>
                <option value="biology">Biology</option>
                <option value="physics">Physics</option>
                <option value="chemistry">Chemistry</option>
              </select>
            </div>
          </div>

          {/* Videos Grid */}
          <div className="space-y-4 text-left">
            <h3 className="font-display font-medium text-sm text-zinc-300">Ingested Lecture Videos ({filteredVideos.length})</h3>

            {videosLoading ? (
              <p className="text-xs font-mono p-8 text-center text-zinc-400">Loading catalog search index...</p>
            ) : filteredVideos.length === 0 ? (
              <p className="text-xs font-mono p-12 text-center text-zinc-500 border border-dashed border-zinc-850 rounded-xl">No videos matched selected criteria. Ingest playlists to populate internal videos database!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden flex flex-col justify-between hover:border-rose-900/30 transition-all group">
                    <div className="relative aspect-video bg-black/50">
                      <img 
                        src={video.thumbnail || `https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] text-zinc-300 font-mono shadow">
                        {video.duration || '1h 15m'}
                      </div>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-left">
                      <div className="space-y-1">
                        <span className="text-[9px] font-mono uppercase bg-neutral-900 text-zinc-400 px-2 py-0.5 rounded border border-neutral-850 inline-block mb-1">
                          {video.topic || 'General Lecture'}
                        </span>
                        
                        <h4 className="text-xs font-bold text-brand-accent line-clamp-2 leading-relaxed group-hover:text-rose-400 transition-colors">
                          {video.title}
                        </h4>
                        
                        <span className="text-[10px] font-mono text-zinc-500 block pt-0.5">By {video.channelName || 'Verified Educator'}</span>
                      </div>

                      <div className="pt-2 border-t border-zinc-900/60 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 shrink-0" />{(video.viewCount || 0).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 shrink-0 animate-pulse text-rose-800" />{(video.likeCount || 0).toLocaleString()}</span>
                      </div>

                      <div className="pt-1.5 flex gap-1.5">
                        <button
                          onClick={() => setPlayingVideoId(video.videoId)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/20 text-xs font-mono py-1.5 rounded-lg cursor-pointer transition-all"
                        >
                          <Play className="w-3.5 h-3.5 shrink-0 fill-current" />
                          <span>Play Lesson</span>
                        </button>
                        <a
                          href={`https://youtube.com/watch?v=${video.videoId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-zinc-900 hover:bg-zinc-850 text-zinc-400 border border-zinc-800 p-2 rounded-lg cursor-pointer transition-all"
                          title="Open in YouTube"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'audit' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border border-zinc-850 p-6 rounded-xl text-left space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
              <h3 className="text-sm font-semibold text-brand-accent flex items-center gap-2">
                <History className="w-4 h-4 text-rose-500" />
                <span>Sync & Quota Ingest Logs</span>
              </h3>
              <button
                onClick={loadLogs}
                disabled={logsLoading}
                className="flex items-center gap-1 font-mono text-[10px] text-zinc-400 hover:text-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                <span>Reload logs</span>
              </button>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              Audit trails documenting every automated scheduler sync event and human-triggered batch upload. Calculates YouTube API quote consumption statistics to keep Biovised safely below the 10,000 units/day ceiling.
            </p>

            {logsLoading ? (
              <p className="text-xs font-mono p-8 text-center text-zinc-500">Loading audit history...</p>
            ) : logs.length === 0 ? (
              <p className="text-xs font-mono p-12 text-center text-zinc-500 border border-dashed border-zinc-850 rounded">No synchronization history found. Importer has not executed yet.</p>
            ) : (
              <div className="overflow-x-auto border border-zinc-850 rounded-xl">
                <table className="w-full text-left font-mono text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-400 uppercase">
                      <th className="p-3.5">Log ID / Type</th>
                      <th className="p-3.5">Scope Target ID</th>
                      <th className="p-3.5">Videos Saved</th>
                      <th className="p-3.5">Playlists Sync</th>
                      <th className="p-3.5">Quota Cost</th>
                      <th className="p-3.5">Triggered By</th>
                      <th className="p-3.5">Execution Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const isCron = log.type === 'cron_scheduler';
                      const isVid = log.type === 'video';
                      return (
                        <tr key={log.id} className="border-b border-zinc-855 hover:bg-zinc-900/30 transition-colors">
                          <td className="p-3.5 font-bold">
                            <span className={`px-1.5 py-0.5 rounded ${
                              isCron ? 'bg-white/10 text-[#EEEEEE]' :
                              isVid ? 'bg-white/10 text-zinc-300' : 'bg-zinc-800 text-zinc-400'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="p-3.5 text-zinc-400 font-sans text-xs">{log.targetId}</td>
                          <td className="p-3.5 text-zinc-300 font-bold">{log.videosImported}</td>
                          <td className="p-3.5 text-zinc-300 font-bold">{log.playlistsImported}</td>
                          <td className="p-3.5">
                            <span className="text-zinc-100 bg-white/10 px-2 py-0.5 rounded border border-white/5 font-bold font-mono">
                              {log.apiUnitsUsed} units
                            </span>
                          </td>
                          <td className="p-3.5 text-zinc-400">{log.triggeredBy}</td>
                          <td className="p-3.5 text-zinc-500">{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video playback overlay modal */}
      {playingVideoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-left">
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl space-y-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-850">
              <h4 className="font-display font-medium text-sm text-white">BIOVISED YouTube Video Playback</h4>
              <button
                onClick={() => setPlayingVideoId(null)}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="px-6 pb-6 text-xs text-zinc-400 font-mono flex justify-between items-center">
              <span>Video ID Reference: {playingVideoId}</span>
              <span className="text-[10px] text-zinc-600">Playing inside secure sandbox</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
