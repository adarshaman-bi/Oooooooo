import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchWatchHistory,
  fetchWatchLaterLectures,
  fetchFollowingList,
  fetchTeachers,
  fetchInstitutes,
  toggleFollow
} from '../services/dbService';
import { WatchHistoryItem, Lecture, TeacherProfile, InstituteProfile } from '../types';
import { getLectureThumbnail } from '../services/thumbnailHelper';
import {
  Clock,
  Bookmark,
  User,
  CheckCircle,
  LogOut,
  ShieldAlert
} from 'lucide-react';
import ModeratorDashboard from './ModeratorDashboard';

interface ProfileDashboardProps {
  onSelectLecture: (lecture: Lecture) => void;
  onOpenTeacher: (teacherId: string) => void;
  activeLecture: Lecture | null;
  onLogoutSuccess?: () => void;
  onNavigate?: (view: 'explore' | 'profile' | 'moderator' | 'notifications' | 'search' | 'admin-educators') => void;
}

export default function ProfileDashboard({
  onSelectLecture,
  onOpenTeacher,
  activeLecture,
  onLogoutSuccess,
  onNavigate
}: ProfileDashboardProps) {
  const { user, updatePreferences, resetPreferences, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'history' | 'watchlist' | 'following' | 'admin'>('history');

  // Dashboard logs lists
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [watchlist, setWatchlist] = useState<Lecture[]>([]);
  const [followingTeachers, setFollowingTeachers] = useState<TeacherProfile[]>([]);

  useEffect(() => {
    if (!user) return;

    // Load History
    fetchWatchHistory().then(data => setHistory(data));

    // Load Watch Later bookmarks
    fetchWatchLaterLectures().then(data => setWatchlist(data));

    // Load followed educators
    fetchFollowingList().then(async (followingIds) => {
      if (followingIds.length > 0) {
        const allTeachers = await fetchTeachers();
        const followed = allTeachers.filter(t => followingIds.includes(t.id));
        setFollowingTeachers(followed);
      } else {
        setFollowingTeachers([]);
      }
    });

  }, [user, activeTab]);

  const handleSignOut = async () => {
    await logout();
    if (onLogoutSuccess) {
      onLogoutSuccess();
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-brand-gray">
        Please sign in to view your learning dashboard logs.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-8 font-sans">
      
      {/* Profile Overview Banner */}
      <div className="bg-gradient-to-r from-brand-dark to-brand-black border border-brand-border rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white text-black font-display font-black flex items-center justify-center text-3xl">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-display font-medium text-brand-accent">{user.displayName}</h2>
            <p className="text-xs text-brand-gray font-mono">{user.email}</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-block text-[10px] font-mono lowercase bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full">
                {user.uid === 'guest' ? 'guest preview' : (user.role || 'student')}
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1 bg-rose-950/20 hover:bg-rose-900/35 border border-rose-900/50 hover:border-rose-800/80 text-rose-450 text-[10px] font-mono font-medium uppercase tracking-wide rounded-md transition-all cursor-pointer"
              >
                <LogOut className="w-3 h-3" /> Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Edit exam and target year anytime from settings */}
        <div className="flex flex-col sm:flex-row gap-6 text-left md:text-right w-full md:w-auto shrink-0 mt-4 md:mt-0">
          <div className="space-y-2">
            <label className="block text-[10px] font-mono text-brand-gray uppercase tracking-wider">Exam Stream Focus</label>
            <div className="flex flex-wrap gap-1.5 md:justify-end">
              {(['JEE', 'NEET'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => updatePreferences({ examType: type })}
                  className={`text-[10px] font-mono py-1 px-2 rounded-lg font-medium border cursor-pointer transition-all ${
                    user.examType === type
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-brand-border bg-brand-black text-brand-gray hover:text-brand-accent'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-mono text-brand-gray uppercase tracking-wider">Exam Year</label>
            <div className="flex flex-wrap gap-1.5 md:justify-end">
              {['2026', '2027', '2028'].map((yr) => (
                <button
                  key={yr}
                  onClick={() => updatePreferences({ appearingYear: yr })}
                  className={`text-[10px] font-mono py-1 px-2.5 rounded-lg font-medium border cursor-pointer transition-all ${
                    user.appearingYear === yr
                      ? 'border-white bg-white text-black font-semibold'
                      : 'border-brand-border bg-brand-black text-brand-gray hover:text-brand-accent'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 flex flex-col justify-end">
            <button
               onClick={async () => {
                 if (window.confirm('Reset all personalized preferences and start the onboarding walkthrough again?')) {
                   await resetPreferences();
                 }
               }}
              className="px-2.5 py-1.5 border border-red-500/30 hover:border-red-500 bg-red-950/20 text-red-400 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer"
            >
              Reset Prefs
            </button>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-brand-border overflow-x-auto tab-container">
        {[
          { id: 'history', label: 'Watch History', icon: Clock },
          { id: 'watchlist', label: 'Watch Later', icon: Bookmark },
          { id: 'following', label: 'Educators Followed', icon: User },
          ...(user.email === 'adarshaman898@gmail.com' ? [{ id: 'admin', label: 'Admin Panel', icon: ShieldAlert }] : [])
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-5 text-xs font-mono font-medium border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-white text-brand-accent font-semibold'
                  : 'border-transparent text-brand-gray hover:text-brand-accent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab contents */}
      <div className="min-h-[250px]">

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h4 className="text-xs font-mono text-brand-gray uppercase tracking-wider">Watch Log history</h4>
            {history.length === 0 ? (
              <p className="text-xs text-brand-gray py-8 text-center bg-brand-dark/30 rounded-xl border border-brand-border">
                No watch logs generated yet. Core lectures streamed automatically log progress here.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 bg-brand-black border border-brand-border rounded-xl flex gap-3 items-center"
                  >
                    <img 
                      src={getLectureThumbnail({ id: h.lectureId, title: h.lectureTitle, thumbnailUrl: h.thumbnailUrl } as any)} 
                      alt={h.lectureTitle} 
                      className="w-20 h-12 object-cover rounded-lg border border-brand-border flex-shrink-0 bg-zinc-900" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://img.youtube.com/vi/9Bv_M6e8858/hqdefault.jpg';
                      }}
                    />
                    <div className="flex-grow min-w-0">
                      <p className="text-xs font-medium text-brand-accent truncate leading-tight">{h.lectureTitle}</p>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-brand-gray mt-1 flex-wrap">
                        <span>Duration: {h.durationString}</span>
                        <span>•</span>
                        <span className="text-emerald-400">Streamed: {h.progressSeconds}s</span>
                      </div>
                    </div>
                    {h.completed && (
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'watchlist' && (
          <div className="space-y-4">
            <h4 className="text-xs font-mono text-brand-gray uppercase tracking-wider">Personal Watch Later playlist</h4>
            {watchlist.length === 0 ? (
              <p className="text-xs text-brand-gray py-8 text-center bg-brand-dark/30 rounded-xl border border-brand-border">
                Your bookmarks folder is empty. Click Save on any video player to watch bookmarks later.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {watchlist.map((lec) => (
                  <div
                    key={lec.id}
                    onClick={() => onSelectLecture(lec)}
                    className="bg-brand-black border border-brand-border rounded-xl p-3 flex flex-col justify-between hover:border-neutral-500 cursor-pointer"
                  >
                    <img src={getLectureThumbnail(lec)} alt={lec.title} className="aspect-video w-full object-cover rounded-lg border border-brand-border mb-3" />
                    <div>
                      <span className="text-[9px] font-mono uppercase bg-neutral-800 text-brand-gray px-2 py-0.5 rounded">
                        {lec.subject}
                      </span>
                      <h4 className="text-xs font-medium text-brand-accent mt-2 leading-tight line-clamp-2">{lec.title}</h4>
                      <p className="text-[10px] font-mono text-brand-gray mt-1 block">Teacher: {lec.teacherName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="space-y-4">
            <h4 className="text-xs font-mono text-brand-gray uppercase tracking-wider">Educators you follow</h4>
            {followingTeachers.length === 0 ? (
              <p className="text-xs text-brand-gray py-8 text-center bg-brand-dark/30 rounded-xl border border-brand-border">
                You are not currently subscribed to any educator updates. Click Follow on profiles to load directories.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
                {followingTeachers.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onOpenTeacher(t.id)}
                    className="p-4 bg-brand-black border border-brand-border rounded-xl flex flex-col items-center text-center cursor-pointer hover:border-neutral-500"
                  >
                    <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover border border-brand-border" />
                    <h5 className="text-xs font-semibold text-brand-accent mt-2">{t.name}</h5>
                    <span className="text-[10px] text-brand-gray font-mono block mt-1">{t.subject} Expert</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {user.email === 'adarshaman898@gmail.com' && activeTab === 'admin' && (
          <div className="pt-2 animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#0C0C0C] border border-zinc-900 p-5 rounded-2xl gap-4 text-left">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Educators & Directory Admin</h4>
                <p className="text-[11px] text-zinc-500 mt-1">Register new educators, modify their subject tags, target profiles, and live YouTube channel IDs.</p>
              </div>
              <button
                onClick={() => onNavigate && onNavigate('admin-educators')}
                className="bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2 px-4 rounded-full transition-all cursor-pointer shadow-md shrink-0"
              >
                Open Educators Manager
              </button>
            </div>
            <ModeratorDashboard />
          </div>
        )}
      </div>

    </div>
  );
}
