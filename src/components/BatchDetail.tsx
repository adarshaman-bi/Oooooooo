import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Star,
  ChevronRight,
  AlertCircle,
  Loader2,
  Play,
  Clock,
  CheckCircle,
  X,
  Eye,
  ThumbsUp,
} from 'lucide-react';
import { Batch, BatchSubject, Lecture } from '../types';
import { fetchBatchSubjects, fetchLectures } from '../services/dbService';
import { getSubjectMedia } from './BatchCard';
import { formatViews } from '../utils/youtubeUtils';

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
      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold text-white border border-white/10"
      style={{ background: `${color}22`, borderColor: `${color}33` }}
    >
      <span style={{ color }}>{initials}</span>
    </div>
  );
}

// ─── Subject Card ─────────────────────────────────────────────────────────
interface SubjectCardProps {
  sub: BatchSubject;
  onClick: () => void;
}

function SubjectCard({ sub, onClick }: SubjectCardProps) {
  const media = getSubjectMedia(sub.subject);
  const SubIcon = media.Icon;
  const pillClass = EXAM_PILL[sub.examType] || EXAM_PILL['Both'];

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-[#0D0D0C] border border-[#1A1A1A] hover:border-zinc-700/70 rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.6)] focus:outline-none focus:ring-1 focus:ring-zinc-600"
    >
      {/* Subject icon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${media.gradient}`}>
        <SubIcon className="w-6 h-6 text-white drop-shadow" />
      </div>

      {/* Main text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h4 className="text-[13px] font-bold text-white leading-tight group-hover:text-amber-300 transition-colors">
            {sub.subject}
          </h4>
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide ${pillClass}`}>
            {sub.examType}
          </span>
        </div>

        {/* Teacher row */}
        <div className="flex items-center gap-2 mt-1">
          {sub.teacherName && (
            <AvatarInitials name={sub.teacherName} color={media.color} />
          )}
          <div className="min-w-0">
            <p className="text-[11px] text-zinc-300 font-medium truncate">
              {sub.teacherName || 'Educator TBC'}
            </p>
            {sub.playlistId ? (
              <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" />
                Playlist verified
              </p>
            ) : (
              <p className="text-[10px] text-zinc-600 font-mono flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                Playlist pending verification
              </p>
            )}
          </div>
        </div>

        {/* Rating placeholder */}
        <div className="flex items-center gap-1 mt-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="w-3 h-3 text-zinc-700" />
          ))}
          <span className="text-[10px] font-mono text-zinc-600 ml-1">No ratings yet</span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
    </button>
  );
}

// ─── Lecture row ──────────────────────────────────────────────────────────
function LectureRow({ lec, index, onPlay }: { lec: Lecture; index: number; onPlay: (lec: Lecture) => void }) {
  const thumb =
    lec.thumbnailUrl ||
    (lec.youtubeVideoId
      ? `https://i.ytimg.com/vi/${lec.youtubeVideoId}/mqdefault.jpg`
      : '');

  return (
    <button
      onClick={() => onPlay(lec)}
      className="group w-full text-left flex items-center gap-3 p-3 bg-[#0A0A0A] border border-[#1C1C1C] hover:border-zinc-700 rounded-xl transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-zinc-600"
    >
      {/* Position number */}
      <span className="text-[11px] font-mono text-zinc-600 w-5 text-right flex-shrink-0 group-hover:text-zinc-400">
        {index + 1}
      </span>

      {/* Thumbnail */}
      <div className="relative w-20 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900">
        {thumb ? (
          <img src={thumb} alt={lec.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-5 h-5 text-zinc-600" />
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
          <Play className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
        </div>
      </div>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-white line-clamp-2 group-hover:text-amber-300 transition-colors leading-snug">
          {lec.title}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {lec.duration && (
            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-zinc-600" />
              {lec.duration}
            </span>
          )}
          {lec.viewsCount !== undefined && (
            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
              <Eye className="w-3 h-3 text-zinc-600" />
              {formatViews(lec.viewsCount).toUpperCase()}
            </span>
          )}
          {lec.likesCount !== undefined && lec.likesCount > 0 && (
            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
              <ThumbsUp className="w-2.5 h-2.5 text-zinc-600" />
              {formatViews(lec.likesCount).toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main BatchDetail component ───────────────────────────────────────────
interface BatchDetailProps {
  batch: Batch;
  onClose: () => void;
  onPlayLecture: (lec: Lecture) => void;
}

type DrillLevel = 'subjects' | 'chapters';

export default function BatchDetail({ batch, onClose, onPlayLecture }: BatchDetailProps) {
  const [subjects, setSubjects] = useState<BatchSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState<BatchSubject | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loadingLectures, setLoadingLectures] = useState(false);

  const [level, setLevel] = useState<DrillLevel>('subjects');

  // Load subjects on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingSubjects(true);
    fetchBatchSubjects(batch.id).then((subs) => {
      if (!cancelled) {
        setSubjects(subs);
        setLoadingSubjects(false);
      }
    });
    return () => { cancelled = true; };
  }, [batch.id]);

  // Load lectures when a subject is selected
  async function handleSubjectClick(sub: BatchSubject) {
    setSelectedSubject(sub);
    setLevel('chapters');
    if (!sub.playlistId) {
      setLectures([]);
      return;
    }
    setLoadingLectures(true);
    try {
      const allLecs = await fetchLectures();
      const filtered = allLecs
        .filter((l) => l.playlistId === sub.playlistId)
        .sort((a, b) => 0); // position_in_playlist ordering is implicit from DB
      setLectures(filtered);
    } catch {
      setLectures([]);
    } finally {
      setLoadingLectures(false);
    }
  }

  function handleBack() {
    if (level === 'chapters') {
      setLevel('subjects');
      setSelectedSubject(null);
      setLectures([]);
    } else {
      onClose();
    }
  }

  const examPill = EXAM_PILL[batch.examType as string] || EXAM_PILL['Both'];

  return (
    <div className="flex flex-col h-full bg-[#080808]">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-[#1A1A1A] flex items-start gap-3">
        <button
          onClick={handleBack}
          className="mt-0.5 p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all flex-shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          {level === 'subjects' ? (
            <>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${examPill}`}>
                  {batch.examType}
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-semibold uppercase">
                  Free · YouTube
                </span>
              </div>
              <h2 className="text-base font-bold text-white leading-tight line-clamp-1">{batch.name}</h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">{batch.channelName}</p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">{batch.name}</p>
              <h2 className="text-base font-bold text-white leading-tight">
                {selectedSubject?.subject}
              </h2>
              <p className="text-[11px] text-zinc-400">{selectedSubject?.teacherName || 'Educator TBC'}</p>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-0.5 p-1.5 rounded-lg text-zinc-600 hover:text-white hover:bg-zinc-800 transition-all flex-shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">

        {/* LEVEL 1 — Subject list */}
        {level === 'subjects' && (
          <div className="p-4 space-y-3 pb-8">
            {/* Batch description */}
            {batch.description && (
              <p className="text-[11px] text-zinc-500 leading-relaxed px-1 pb-2 border-b border-zinc-900">
                {batch.description}
              </p>
            )}

            {/* Section header */}
            <div className="flex items-center gap-2 pb-1">
              <BookOpen className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">
                {loadingSubjects ? 'Loading subjects...' : `${subjects.length} Subjects covered`}
              </span>
            </div>

            {loadingSubjects ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
              </div>
            ) : subjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <AlertCircle className="w-8 h-8 text-zinc-700" />
                <p className="text-xs text-zinc-500 font-mono">No subjects registered for this batch yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {subjects.map((sub) => (
                  <SubjectCard
                    key={sub.id}
                    sub={sub}
                    onClick={() => handleSubjectClick(sub)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* LEVEL 2 — Chapter list */}
        {level === 'chapters' && selectedSubject && (
          <div className="p-4 space-y-3 pb-8">
            {/* Subject info header */}
            {(() => {
              const media = getSubjectMedia(selectedSubject.subject);
              const SubIcon = media.Icon;
              return (
                <div className={`flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r ${media.gradient} opacity-90`}>
                  <SubIcon className="w-6 h-6 text-white" />
                  <div>
                    <p className="text-[11px] font-bold text-white">{selectedSubject.subject}</p>
                    <p className="text-[10px] text-white/70">{selectedSubject.teacherName || 'Faculty TBC'}</p>
                  </div>
                </div>
              );
            })()}

            {/* Playlist state */}
            {!selectedSubject.playlistId ? (
              <div className="flex flex-col items-center justify-center py-14 text-center gap-3 bg-zinc-950/50 rounded-2xl border border-zinc-900">
                <AlertCircle className="w-8 h-8 text-amber-700/70" />
                <p className="text-xs font-bold text-zinc-400">Playlist pending independent verification</p>
                <p className="text-[11px] text-zinc-600 max-w-xs leading-relaxed">
                  This channel's playlist ID has not yet been confirmed. Chapter content will appear once the playlist is verified and ingested.
                </p>
              </div>
            ) : loadingLectures ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
              </div>
            ) : lectures.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center gap-3 bg-zinc-950/50 rounded-2xl border border-zinc-900">
                <AlertCircle className="w-8 h-8 text-zinc-700" />
                <p className="text-xs text-zinc-500 font-mono">No lectures ingested for this playlist yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider pb-1">
                  {lectures.length} chapters
                </p>
                {lectures.map((lec, idx) => (
                  <LectureRow
                    key={lec.id}
                    lec={lec}
                    index={idx}
                    onPlay={onPlayLecture}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
