import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  AlertCircle,
  Loader2,
  Play,
  Clock,
  CheckCircle,
  X,
  Eye,
  ThumbsUp,
  Award,
  ShieldCheck,
  PlayCircle
} from 'lucide-react';
import { Batch, BatchSubject, Lecture } from '../types';
import { getSubjectMedia } from './BatchCard';
import { formatViews } from '../utils/youtubeUtils';
import BiovisedPlayer from './BiovisedPlayer';
import { ScorecardSummary } from './ScorecardSummary';

// ─── Exam pill ─────────────────────────────────────────────────────────────
const EXAM_PILL: Record<string, string> = {
  JEE:  'bg-blue-950/60 text-blue-300 border-blue-800/50',
  NEET: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
  Both: 'bg-violet-950/60 text-violet-300 border-violet-800/50',
};



// ─── Avatar initials ring ─────────────────────────────────────────────────
function AvatarInitials({ name, color = '#A1A1AA' }: { name: string; color?: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0] || '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white border"
      style={{ background: `${color}15`, borderColor: `${color}25` }}
    >
      <span style={{ color }}>{initials}</span>
    </div>
  );
}

// ─── Main BatchDetail component ───────────────────────────────────────────
interface BatchDetailProps {
  batch: Batch;
  onClose: () => void;
  onPlayLecture: (lec: Lecture) => void;
}

type DrillLevel = 'subjects' | 'lectures' | 'player';

export default function BatchDetail({ batch, onClose, onPlayLecture }: BatchDetailProps) {
  const [subjects, setSubjects] = useState<BatchSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<BatchSubject | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [level, setLevel] = useState<DrillLevel>('subjects');

  // Load hydrated subjects & lectures directly from the pre-validated batch object
  useEffect(() => {
    if (batch.subjects) {
      setSubjects(batch.subjects);
    }
  }, [batch]);

  const handleSubjectClick = (sub: BatchSubject) => {
    setSelectedSubject(sub);
    const subLecs = (sub as any).lectures || [];
    setLectures(subLecs);
    setLevel('lectures');
  };

  const handlePlayLecture = (lec: Lecture) => {
    setActiveLecture(lec);
    setLevel('player');
    onPlayLecture(lec);
  };

  const handleBack = () => {
    if (level === 'player') {
      setLevel('lectures');
      setActiveLecture(null);
    } else if (level === 'lectures') {
      setLevel('subjects');
      setSelectedSubject(null);
      setLectures([]);
    } else {
      onClose();
    }
  };

  const handlePlayAll = () => {
    if (lectures.length > 0) {
      handlePlayLecture(lectures[0]);
    }
  };

  const examPill = EXAM_PILL[batch.examType] || EXAM_PILL['Both'];

  // Calculate cumulative stats
  const totalLectures = batch.totalLectureCount || 0;


  return (
    <div className="flex flex-col h-full bg-[#070707] font-sans text-left">
      
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-[#1A1A1A] flex items-center justify-between bg-[#090909] z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all flex-shrink-0 border border-zinc-900"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            {level === 'subjects' ? (
              <>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${examPill}`}>
                    {batch.examType}
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                    Free · YouTube
                  </span>
                </div>
                <h2 className="text-[14px] font-bold text-white leading-tight truncate">{batch.name}</h2>
              </>
            ) : level === 'lectures' ? (
              <>
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest leading-none mb-1">
                  {batch.name}
                </p>
                <h2 className="text-[14px] font-bold text-white leading-tight">
                  {selectedSubject?.subject} Curriculum
                </h2>
              </>
            ) : (
              <>
                <p className="text-[9px] font-mono text-amber-500 uppercase tracking-widest leading-none mb-1">
                  Now Playing
                </p>
                <h2 className="text-[14px] font-bold text-white leading-tight truncate max-w-[200px] sm:max-w-md">
                  {activeLecture?.title}
                </h2>
              </>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all border border-zinc-900"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Step 2: Subject Selection ────────────────────── */}
      <div 
        style={{ display: level === 'subjects' ? 'block' : 'none' }} 
        className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5"
      >
        {/* Batch Info Card */}
        <div className="p-5 rounded-2xl bg-[#0B0B0A] border border-[#1A1A1A] flex flex-col sm:flex-row gap-5 items-start sm:items-center relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/5 to-transparent blur-2xl pointer-events-none" />
          
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0 shadow-lg">
            {batch.imageUrl ? (
              <img src={batch.imageUrl} alt={batch.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <BookOpen className="w-10 h-10 text-zinc-600" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="text-base font-bold text-white leading-snug">{batch.name}</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">{batch.description}</p>
            
            {/* Metadata Grid */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
              <ScorecardSummary scorecard={batch.scorecard} variant="panel" trustScale="ten" />
              <span className="bg-zinc-900 border border-zinc-850 px-2.5 py-1 rounded-lg text-zinc-300 flex items-center gap-1.5 shadow-sm text-[10px] font-mono font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                {totalLectures} lectures
              </span>
            </div>
          </div>
        </div>

        {/* Subjects list */}
        <div className="space-y-3.5">
          <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 px-1">
            <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
            CHOOSE A SUBJECT TO EXPLORE
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.map((sub) => {
              const media = getSubjectMedia(sub.subject);
              const SubIcon = media.Icon;

              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubjectClick(sub)}
                  className="group bg-[#0B0B0A] border border-[#1C1C1C] hover:border-zinc-700/60 rounded-2xl p-4 flex items-center gap-4 transition-all duration-350 hover:shadow-[0_4px_24px_rgba(0,0,0,0.6)] focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${media.gradient} shadow-lg shadow-black/40`}>
                    <SubIcon className="w-5 h-5 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h5 className="text-[13px] font-bold text-white leading-tight group-hover:text-amber-300 transition-colors">
                      {sub.subject}
                    </h5>
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      {sub.teacherName && <AvatarInitials name={sub.teacherName} color={media.color} />}
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-300 font-semibold truncate leading-none mb-1">
                          {sub.teacherName || 'TBC Educator'}
                        </p>
                        <p className="text-[9px] text-zinc-500 font-mono leading-none">
                          {(sub as any).teacherCount || 1} Teachers · {(sub as any).lectureCount || 0} Lectures
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <ScorecardSummary scorecard={sub.scorecard} variant="inline" trustScale="ten" />
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-300" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Step 3: Lecture List ───────────────────────── */}
      <div 
        style={{ display: level === 'lectures' ? 'block' : 'none' }} 
        className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5"
      >
        {selectedSubject && (
          <>
            {/* Subject Curriculum Header Card */}
            {(() => {
              const media = getSubjectMedia(selectedSubject.subject);
              const SubIcon = media.Icon;

              return (
                <div className="p-5 rounded-2xl bg-[#0B0B0A] border border-[#1A1A1A] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-zinc-800/10 to-transparent blur-2xl pointer-events-none" />
                  
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${media.gradient} shadow-lg`}>
                      <SubIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-white leading-snug">{selectedSubject.subject}</h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {selectedSubject.teacherName && (
                          <span className="text-[10px] text-zinc-300 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {selectedSubject.teacherName}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-zinc-500">
                          {lectures.length} Total lectures
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <ScorecardSummary scorecard={selectedSubject.scorecard} variant="inline" trustScale="ten" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePlayAll}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-[12px] flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(245,158,11,0.25)] hover:scale-[1.02]"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" />
                    Play All
                  </button>
                </div>
              );
            })()}

            {/* Lecture list items */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest px-1">
                ALL CURRICULUM LECTURES ({lectures.length})
              </h4>

              <div className="space-y-3">
                {lectures.map((lec, idx) => {
                  const num = String(idx + 1).padStart(2, '0');
                  const thumb = lec.thumbnailUrl || (lec.id ? `https://i.ytimg.com/vi/${lec.id}/mqdefault.jpg` : '');

                  return (
                    <button
                      key={lec.id}
                      onClick={() => handlePlayLecture(lec)}
                      className="group w-full bg-[#0B0B0A] border border-[#1C1C1C] hover:border-zinc-700/60 rounded-xl p-3 flex items-center gap-3 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
                    >
                      {/* Monospace lecture index */}
                      <span className="text-[11px] font-mono font-bold text-zinc-500 w-6 text-center group-hover:text-amber-400 transition-colors">
                        {num}
                      </span>

                      {/* Image Thumbnail */}
                      <div className="relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800 shadow">
                        {thumb ? (
                          <img src={thumb} alt={lec.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-4 h-4 text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                          <PlayCircle className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>

                      {/* Info details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-white line-clamp-1 group-hover:text-amber-300 transition-colors leading-snug">
                          {lec.title}
                        </p>
                        <p className="text-[10px] text-zinc-400 font-semibold mt-1">
                          {lec.teacherName || 'Verified Educator'}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[9px] font-mono font-bold text-zinc-500">
                          {lec.duration && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-650" />
                              {lec.duration}
                            </span>
                          )}
                          <ScorecardSummary scorecard={lec.scorecard} variant="inline" trustScale="ten" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Step 4: Playlist / Player ──────────────────── */}
      <div 
        style={{ display: level === 'player' ? 'flex' : 'none' }} 
        className="flex-1 overflow-hidden flex flex-col md:flex-row h-full"
      >
        {activeLecture && (
          <>
            {/* Left/Top Content Column: Video + Active details */}
            <div className="w-full md:w-[60%] flex flex-col border-r border-[#161616] bg-[#070707] overflow-y-auto custom-scrollbar pb-6 flex-shrink-0">
              
              {/* Player Area container */}
              <div className="w-full aspect-video bg-black relative border-b border-[#161616]">
                <BiovisedPlayer
                  lecture={activeLecture as any}
                  onClose={handleBack}
                  playlistLectures={lectures as any}
                  onSelectLecture={(l) => setActiveLecture(l as any)}
                />
              </div>

              {/* Active details layout */}
              <div className="p-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest">
                    {activeLecture.subject || selectedSubject?.subject} · verified lecture
                  </span>
                  <h3 className="text-sm font-bold text-white leading-snug">{activeLecture.title}</h3>
                </div>

                {/* Teacher profile summary */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#0B0B0A] border border-[#1A1A1A]">
                  <AvatarInitials name={activeLecture.teacherName || 'Verified Educator'} color="#F59E0B" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-white truncate">{activeLecture.teacherName || 'Verified Educator'}</p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Faculty Lead · Biovised Content Partner</p>
                  </div>
                  
                  {/* Rating / Trust scores */}
                  <div className="flex-shrink-0">
                    <ScorecardSummary scorecard={activeLecture.scorecard} variant="panel" trustScale="ten" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right/Bottom Playlist Panel Column */}
            <div className="flex-1 flex flex-col bg-[#090909] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1A1A1A] flex items-center justify-between flex-shrink-0 bg-[#0A0A0A]">
                <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  ALL LECTURES ({lectures.length})
                </h4>
                <span className="text-[9px] font-mono bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded text-zinc-400 font-semibold uppercase">
                  Subject Playlist
                </span>
              </div>

              {/* Scrollable Playlist Cards container */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 pb-10">
                {lectures.map((lec, idx) => {
                  const num = String(idx + 1).padStart(2, '0');
                  const isPlaying = lec.id === activeLecture.id;
                  const thumb = lec.thumbnailUrl || (lec.id ? `https://i.ytimg.com/vi/${lec.id}/mqdefault.jpg` : '');

                  return (
                    <button
                      key={lec.id}
                      onClick={() => setActiveLecture(lec)}
                      className={`w-full text-left rounded-xl p-2.5 flex items-center gap-3 transition-all border duration-200 focus:outline-none ${
                        isPlaying
                          ? 'bg-amber-500/[0.04] border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.04)]'
                          : 'bg-[#0B0B0A]/80 border-[#1C1C1C] hover:border-zinc-700/60'
                      }`}
                    >
                      <span className={`text-[10px] font-mono font-bold w-5 text-center ${isPlaying ? 'text-amber-400' : 'text-zinc-500'}`}>
                        {num}
                      </span>

                      <div className="relative w-16 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800 shadow-sm">
                        {thumb ? (
                          <img src={thumb} alt={lec.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 text-zinc-650" />
                          </div>
                        )}
                        {isPlaying && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-bold truncate ${isPlaying ? 'text-amber-400' : 'text-white'}`}>
                          {lec.title}
                        </p>
                        <p className="text-[9px] text-zinc-400 font-medium truncate mt-0.5">
                          {lec.teacherName || 'Verified Educator'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[8px] font-mono font-semibold text-zinc-500">
                          {lec.duration && <span>{lec.duration}</span>}
                          <ScorecardSummary scorecard={lec.scorecard} variant="inline" trustScale="ten" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
