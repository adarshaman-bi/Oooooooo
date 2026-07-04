import React from 'react';
import { ArrowLeft, X, Search, Mic, Clock, BookOpen, Play, User, Layers, ChevronRight } from 'lucide-react';
import { Lecture, Playlist, Batch } from '../types';
import { ViewName } from '../config/constants';
import LectureCard from './LectureCard';
import { BatchCard } from './BatchCard';

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

interface SearchViewProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  hasExecutedSearch: boolean;
  setHasExecutedSearch: (b: boolean) => void;
  setCurrentView: (v: ViewName) => void;
  searchSuggestions: any[];
  executeSearch: (query: string) => void;
  speechError: string | null;
  setSpeechError: (s: string | null) => void;
  startSpeechRecognition: () => void;
  isLabourIllusionActive: boolean;
  labourProgress: number;
  labourStatusMessage: string;
  serverSearchResults: any[];
  testSeries: any[];
  teachers: any[];
  followedIds: string[];
  handleFollowToggle: (teacher: any) => void;
  setDetailModal: (modal: any) => void;
  recordSearchQuery: (q: string) => void;
  setActiveLecture: (l: Lecture) => void;
  handleSelectPlaylist: (p: Playlist) => void;
  setActiveExploreTab: (tab: any) => void;
}

export default function SearchView({
  searchQuery,
  setSearchQuery,
  hasExecutedSearch,
  setHasExecutedSearch,
  setCurrentView,
  searchSuggestions,
  executeSearch,
  speechError,
  setSpeechError,
  startSpeechRecognition,
  isLabourIllusionActive,
  labourProgress,
  labourStatusMessage,
  serverSearchResults,
  testSeries,
  followedIds,
  handleFollowToggle,
  setDetailModal,
  recordSearchQuery,
  setActiveLecture,
  handleSelectPlaylist,
  setActiveExploreTab,
}: SearchViewProps) {
  const queryClean = searchQuery.trim().toLowerCase();
  
  // Filter strictly by keyword query match locally
  const matchedLectures = (serverSearchResults.filter(r => r.type === 'lecture') as any[]).filter(v => 
    v.title?.toLowerCase().includes(queryClean) || 
    v.subject?.toLowerCase().includes(queryClean) || 
    v.teacherName?.toLowerCase().includes(queryClean) || 
    v.topic?.toLowerCase().includes(queryClean)
  );
  
  const matchedTeachers = (serverSearchResults.filter(r => r.type === 'teacher') as any[]).filter(t => 
    t.name?.toLowerCase().includes(queryClean) || 
    t.subject?.toLowerCase().includes(queryClean)
  );

  const matchedPlaylists = (serverSearchResults.filter(r => r.type === 'playlist') as any[]).filter(p => 
    p.title?.toLowerCase().includes(queryClean) || 
    p.description?.toLowerCase().includes(queryClean)
  );

  const matchedBatches = (serverSearchResults.filter(r => r.type === 'batch') as any[]).filter(b => 
    b.name?.toLowerCase().includes(queryClean) || 
    b.description?.toLowerCase().includes(queryClean)
  );

  const matchedTests = testSeries.filter(ts => 
    ts.name?.toLowerCase().includes(queryClean) || 
    ts.provider?.toLowerCase().includes(queryClean) || 
    ts.description?.toLowerCase().includes(queryClean)
  );

  const matchedInstitutes = (serverSearchResults.filter(r => r.type === 'institute') as any[]).filter(inst => 
    inst.name?.toLowerCase().includes(queryClean)
  );

  const totalCount = matchedLectures.length + matchedTeachers.length + matchedPlaylists.length + matchedBatches.length + matchedTests.length + matchedInstitutes.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-[#FFFFFF] overflow-y-auto flex flex-col font-sans select-none animate-in fade-in duration-300">
      
      {/* YouTube-Style Search Header (Strict Borderless Rules applied) */}
      <div className="w-full h-16 bg-[#000000] border-b border-[#1A1A1A] px-4 flex items-center gap-3 shrink-0">
        <button
          onClick={() => {
            setSearchQuery('');
            setHasExecutedSearch(false);
            setCurrentView('explore');
          }}
          className="p-2 text-zinc-400 hover:text-[#FFFFFF] transition-colors bg-transparent border-none cursor-pointer"
          title="Go back"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        {/* Pill Search Container with strict borderless properties */}
        <div className="flex-grow relative flex items-center rounded-full bg-[#0D0D0C] border border-zinc-800 text-white px-5 py-2.5 focus-within:border-zinc-700 w-full">
          <Search className="w-4 h-4 text-zinc-550 mr-3 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                executeSearch(searchQuery);
              }
            }}
            placeholder="Search playlists, lessons, tests, or teachers..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-650 border-none outline-none ring-0 focus:ring-0 pr-8"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-5 text-zinc-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer flex items-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={startSpeechRecognition}
          className="w-10 h-10 rounded-full bg-[#0D0D0C] hover:bg-zinc-900 border border-zinc-800 text-zinc-450 hover:text-white transition-all flex items-center justify-center cursor-pointer shrink-0"
          title="Search with voice"
        >
          <Mic className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full max-w-2xl mx-auto flex flex-col items-center px-4 relative">
        {/* Autocomplete Suggestions Under Input Box (only when search has not been executed yet) */}
        {!hasExecutedSearch && searchQuery.trim() !== '' && searchSuggestions.length > 0 && (
          <div className="w-full bg-[#0E0E0F] border border-zinc-800 rounded-2xl shadow-2xl mt-2 overflow-hidden z-50 flex flex-col divide-y divide-zinc-900">
            {searchSuggestions.map((suggestion, idx) => {
              const handleSuggestionClick = () => {
                if (suggestion.type === 'lecture') {
                  const lecObj = {
                    id: suggestion.id,
                    title: suggestion.title,
                    thumbnailUrl: suggestion.thumbnailUrl,
                    videoUrl: `https://www.youtube.com/embed/${suggestion.id}`,
                    duration: '30m',
                    viewsCount: 0,
                    publishDate: new Date().toISOString()
                  };
                  setActiveLecture(lecObj as any);
                  setCurrentView('explore');
                } else if (suggestion.type === 'playlist') {
                  handleSelectPlaylist({
                    id: suggestion.id,
                    title: suggestion.title,
                    thumbnailUrl: suggestion.thumbnailUrl
                  } as any);
                } else if (suggestion.type === 'teacher') {
                  setDetailModal({ id: suggestion.id, type: 'teacher' });
                } else if (suggestion.type === 'institute') {
                  setDetailModal({ id: suggestion.id, type: 'institute' });
                }
              };

              // Determine icon
              let Icon = Play;
              if (suggestion.type === 'playlist') Icon = Layers;
              else if (suggestion.type === 'teacher') Icon = User;
              else if (suggestion.type === 'institute') Icon = BookOpen;

              const isCircle = suggestion.type === 'teacher' || suggestion.type === 'institute';

              return (
                <div
                  key={idx}
                  onClick={handleSuggestionClick}
                  className="w-full text-left py-3 px-4 text-sm text-zinc-350 hover:text-white hover:bg-zinc-900/80 cursor-pointer transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail / Avatar */}
                    {suggestion.thumbnailUrl ? (
                      <img
                        src={suggestion.thumbnailUrl}
                        alt={suggestion.title}
                        className={`w-12 h-8 object-cover flex-shrink-0 ${isCircle ? 'rounded-full w-8 h-8' : 'rounded'}`}
                      />
                    ) : (
                      <div className={`w-12 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0 text-[10px] font-mono text-zinc-550 ${isCircle ? 'rounded-full w-8 h-8' : 'rounded'}`}>
                        {suggestion.type === 'teacher' ? 'ED' : 'YT'}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="min-w-0">
                      <p className="font-semibold text-xs truncate text-zinc-100 uppercase tracking-tight leading-snug">{suggestion.title}</p>
                      <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">{suggestion.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-650 flex-shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Voice/Speech Error Banner (If any) */}
      {speechError && (
        <div className="w-full max-w-2xl mx-auto bg-red-50 dark:bg-red-950/45 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono mt-6 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1">
            <p className="font-bold uppercase tracking-wider text-red-500 dark:text-red-400">Microphone Access Restricted</p>
            <p className="text-zinc-600 dark:text-zinc-350 leading-relaxed max-w-2xl">
              {speechError === 'not-allowed' 
                ? 'Microphone permission was blocked or denied.' 
                : `Speech recognition encountered an issue: "${speechError}".`}
            </p>
          </div>
          <button
            onClick={() => setSpeechError(null)}
            className="self-start sm:self-center bg-red-150 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 hover:text-red-800 dark:hover:text-white text-red-700 dark:text-zinc-200 px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer border-none"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main content area */}
      <div className="w-full max-w-4xl mx-auto mt-12 flex-grow px-4">
        {searchQuery.trim() === '' ? (
          /* Ask the user cleanly what they are looking for */
          <div className="flex flex-col items-center justify-center py-24 text-center select-none animate-in fade-in duration-300">
            <p className="text-zinc-500 font-sans font-medium text-lg md:text-xl tracking-tight">
              What are you looking for?
            </p>
          </div>
        ) : !hasExecutedSearch ? (
          /* While typing and search is not executed, keep the layout clean */
          null
        ) : isLabourIllusionActive ? (
          /* Clean progress panel */
          <div className="w-full max-w-md mx-auto py-16 flex flex-col items-center gap-4 text-center select-none animate-in fade-in duration-300">
            <div className="relative flex items-center justify-center">
              <svg className="w-10 h-10 text-zinc-300 dark:text-zinc-800 animate-spin" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="4" strokeDasharray="30 20" />
              </svg>
            </div>
            <div className="space-y-2 w-full mt-4">
              <div className="flex justify-between text-[9px] font-mono text-zinc-500 dark:text-zinc-650 uppercase tracking-widest px-1">
                <span>Searching catalog</span>
                <span className="text-zinc-700 dark:text-zinc-400 font-bold">{labourProgress}%</span>
              </div>
              <div className="h-0.5 w-full bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-zinc-800 dark:bg-white rounded-full transition-all duration-300"
                  style={{ width: `${labourProgress}%` }}
                />
              </div>
            </div>
            <p className="text-xs font-sans text-zinc-500 dark:text-zinc-400 tracking-wide min-h-[1.5rem] mt-2">
              {labourStatusMessage}
            </p>
          </div>
        ) : totalCount === 0 ? (
          /* "No Matches Found" Empty State matching 17671.png details */
          <div className="flex flex-col items-center justify-center py-24 select-none animate-in fade-in duration-300">
            <div className="bg-[#0D0D0C] border border-[#1A1A1A] rounded-[32px] p-12 max-w-md w-full text-center shadow-lg">
              <div className="flex items-center justify-center w-16 h-16 rounded-full border border-[#1A1A1A] text-zinc-500 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="tracking-wider font-extrabold text-sm text-[#FFFFFF] mt-4 uppercase">
                NO MATCHES FOUND
              </h3>
              <p className="text-zinc-400 text-xs mt-1 max-w-xs mx-auto">
                Can't find keyword related to this, try again.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-12 pb-24 text-left">
            {/* Grid results without borders */}
            {matchedLectures.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-sans font-bold tracking-widest text-zinc-500 uppercase">Video Lessons ({matchedLectures.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {matchedLectures.map(lec => {
                    const lectureDto = {
                      ...lec,
                      channel: {
                        id: lec.teacherId || 'unknown',
                        name: lec.teacherName || 'Verified Educator',
                        avatarUrl: null,
                        bannerUrl: null,
                        subscriberCountRaw: 182000,
                        subscriberCountFormatted: "182K"
                      }
                    };
                    return (
                      <LectureCard
                        key={lec.id}
                        lecture={lectureDto as any}
                        onClick={() => {
                          recordSearchQuery(searchQuery);
                          setActiveLecture(lec);
                          setCurrentView('explore');
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {matchedTeachers.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-sans font-bold tracking-widest text-zinc-500 uppercase">Educators ({matchedTeachers.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {matchedTeachers.map(t => (
                    <div key={t.id} className="bg-[#0D0D0C] border border-[#1A1A1A] hover:bg-zinc-900/45 rounded-2xl p-4 flex gap-4 text-left items-center transition-colors">
                      <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div>
                          <h5 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-tight">{t.name}</h5>
                          <span className="text-[9px] text-zinc-450 uppercase tracking-wider">{t.subject} Mentor</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              recordSearchQuery(searchQuery);
                              setDetailModal({ id: t.id, type: 'teacher' });
                            }}
                            className="text-[9px] font-sans font-semibold uppercase bg-[#FFFFFF] hover:bg-zinc-200 px-3.5 py-1.5 rounded-full text-[#000000] cursor-pointer border-none"
                          >
                            View Portal
                          </button>
                          <button
                            onClick={() => handleFollowToggle(t)}
                            className="text-[9px] font-sans font-bold uppercase px-3.5 py-1 text-zinc-400 hover:text-[#FFFFFF] rounded-full cursor-pointer bg-transparent border-none"
                          >
                            {followedIds.includes(t.id) ? 'Followed' : 'Follow'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchedPlaylists.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-sans font-bold tracking-widest text-zinc-500 uppercase">Playlists ({matchedPlaylists.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {matchedPlaylists.map(p => {
                    const durText = p.totalDurationSeconds ? formatDuration(p.totalDurationSeconds) : '';
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          recordSearchQuery(searchQuery);
                          handleSelectPlaylist(p);
                        }}
                        className="bg-transparent rounded-xl overflow-hidden cursor-pointer flex flex-col group text-left"
                      >
                        <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-zinc-900 bg-zinc-950 group-hover:border-zinc-800 transition-all duration-300">
                          <img
                            src={p.coverThumbnailUrl || p.thumbnailUrl || p.thumbnail || 'https://i.ytimg.com/vi/placeholder/hqdefault.jpg'}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/20" />
                          
                          <div className="absolute right-0 inset-y-0 w-24 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center text-center space-y-1.5 border-l border-zinc-900/50">
                            <BookOpen className="w-5 h-5 text-white/80" />
                            <div className="space-y-0.5">
                              <span className="text-xs font-mono font-bold text-white block">{p.lecturesCount}</span>
                              <span className="text-[8px] font-mono text-zinc-400 uppercase tracking-widest block">Lectures</span>
                            </div>
                          </div>

                          <div className="absolute top-2 left-2 bg-[#0d0d0c]/80 backdrop-blur-sm border border-zinc-800/80 px-2 py-0.5 rounded text-[8px] font-mono text-zinc-300 uppercase tracking-wider">
                            {p.subject}
                          </div>
                        </div>

                        <div className="pt-3 px-1 space-y-1.5 flex-grow flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors uppercase">
                              {p.title}
                            </h4>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                                {p.teacherName || 'Verified Educator'}
                              </p>
                              {durText && (
                                <div className="flex items-center gap-1 text-[9px] font-mono text-zinc-550">
                                  <Clock className="w-3 h-3 text-zinc-650" />
                                  <span>{durText}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {matchedBatches.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-sans font-bold tracking-widest text-zinc-500 uppercase">Cohorts ({matchedBatches.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {matchedBatches.map(b => (
                    <div key={b.id} className="bg-[#0D0D0C] border border-[#1A1A1A] hover:bg-zinc-900/45 rounded-2xl p-2 transition-colors">
                      <BatchCard
                        batch={b}
                        onClick={() => setDetailModal({ id: b.id, type: 'batch' as any })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchedTests.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-sans font-bold tracking-widest text-zinc-500 uppercase">Tests ({matchedTests.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {matchedTests.map(ts => (
                    <div key={ts.id} className="bg-[#0D0D0C] border border-[#1A1A1A] hover:bg-zinc-900/45 rounded-2xl p-4 flex flex-col justify-between text-left gap-3 transition-colors">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-sans font-bold text-zinc-500 uppercase">{ts.examType}</span>
                        </div>
                        <h5 className="text-xs font-bold text-[#FFFFFF] uppercase truncate tracking-tight">{ts.name}</h5>
                        <p className="text-[10px] text-zinc-400 line-clamp-1">{ts.description}</p>
                      </div>
                      <div className="pt-2 flex justify-between items-center text-[10px] text-zinc-550 font-sans">
                        <span className="text-zinc-400">{ts.provider}</span>
                        <button
                          onClick={() => {
                            setCurrentView('explore');
                            setActiveExploreTab('tests');
                          }}
                          className="text-[#FFFFFF] hover:underline text-[9px] uppercase font-bold bg-transparent border-none cursor-pointer"
                        >
                          Go To Tests
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {matchedInstitutes.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-sans font-bold tracking-widest text-zinc-500 uppercase">Institutes ({matchedInstitutes.length})</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {matchedInstitutes.map(inst => (
                    <div key={inst.id} className="bg-[#0D0D0C] border border-[#1A1A1A] hover:bg-zinc-900/45 rounded-2xl p-4 flex gap-4 text-left items-center transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-[#1A1A1A] flex items-center justify-center font-sans text-zinc-400 text-lg font-bold uppercase">
                        {inst.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-bold text-[#FFFFFF] uppercase tracking-tight">{inst.name}</h5>
                        <button
                          onClick={() => {
                            setCurrentView('explore');
                            setActiveExploreTab('institutes');
                          }}
                          className="text-[9px] font-sans text-[#FFFFFF] hover:underline mt-1 block uppercase font-bold bg-transparent border-none cursor-pointer"
                        >
                          Visit Hub
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
