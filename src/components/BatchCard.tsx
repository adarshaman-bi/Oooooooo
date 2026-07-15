import React from 'react';
import { GraduationCap, BookOpen, Atom, TestTube, Binary, Leaf, Microscope, Star, ChevronRight } from 'lucide-react';
import { Batch } from '../types';
import { SafeImage } from './SafeImage';

interface BatchCardProps {
  batch: Batch;
  subjectCount?: number;
  onClick?: () => void;
}

// Shared helper — also used by BatchDetail
export function getSubjectMedia(subject: string = '') {
  const s = subject.toLowerCase();
  if (s.includes('physics')) return { gradient: 'from-blue-600 via-indigo-700 to-blue-900', Icon: Atom, label: 'Physics', color: '#60A5FA' };
  if (s.includes('organic')) return { gradient: 'from-orange-500 via-amber-600 to-orange-900', Icon: TestTube, label: 'Organic Chem', color: '#FB923C' };
  if (s.includes('inorganic')) return { gradient: 'from-teal-500 via-cyan-600 to-teal-900', Icon: TestTube, label: 'Inorganic Chem', color: '#2DD4BF' };
  if (s.includes('physical')) return { gradient: 'from-emerald-500 via-teal-600 to-emerald-900', Icon: TestTube, label: 'Physical Chem', color: '#34D399' };
  if (s.includes('chem')) return { gradient: 'from-emerald-500 via-teal-600 to-emerald-900', Icon: TestTube, label: 'Chemistry', color: '#34D399' };
  if (s.includes('math')) return { gradient: 'from-purple-600 via-fuchsia-700 to-purple-900', Icon: Binary, label: 'Mathematics', color: '#C084FC' };
  if (s.includes('botany') || s.includes('bot')) return { gradient: 'from-green-500 via-lime-600 to-green-900', Icon: Leaf, label: 'Botany', color: '#86EFAC' };
  if (s.includes('zoology') || s.includes('zoo')) return { gradient: 'from-rose-500 via-pink-600 to-rose-900', Icon: Microscope, label: 'Zoology', color: '#FB7185' };
  return { gradient: 'from-indigo-600 via-slate-800 to-blue-900', Icon: GraduationCap, label: subject || 'Full Cohort', color: '#818CF8' };
}

// Exam pill styling
const examPillStyle: Record<string, string> = {
  JEE:  'bg-blue-950/60 text-blue-300 border-blue-800/50',
  NEET: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50',
  Both: 'bg-violet-950/60 text-violet-300 border-violet-800/50',
};

export function BatchCard({ batch, subjectCount, onClick }: BatchCardProps) {
  const examType = batch.examType as string;
  const pillClass = examPillStyle[examType] || examPillStyle['Both'];

  // Generate a gradient based on the batch id so each card has a unique feel
  const gradients: Record<string, string> = {
    batch_competishun_yearly: 'from-amber-900/60 via-orange-950/60 to-zinc-950',
    batch_physics_galaxy:     'from-blue-900/60 via-indigo-950/60 to-zinc-950',
    batch_unacademy_atoms:    'from-violet-900/60 via-purple-950/60 to-zinc-950',
    batch_pw_prachand:        'from-emerald-900/60 via-teal-950/60 to-zinc-950',
  };
  const bannerGradient = gradients[batch.id] || 'from-zinc-900/60 via-zinc-950/60 to-zinc-950';

  // Icon colour per batch
  const iconColors: Record<string, string> = {
    batch_competishun_yearly: '#FCD34D',
    batch_physics_galaxy:     '#60A5FA',
    batch_unacademy_atoms:    '#C084FC',
    batch_pw_prachand:        '#34D399',
  };
  const iconColor = iconColors[batch.id] || '#A1A1AA';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      className="group relative bg-[#0D0D0C] border border-[#1A1A1A] hover:border-zinc-700/70 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_4px_32px_rgba(0,0,0,0.7)] focus:outline-none focus:ring-1 focus:ring-zinc-600"
    >
      {/* Banner gradient strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${bannerGradient} opacity-80`} />

      <div className="p-4 flex gap-4">
        {/* Thumbnail / Icon area */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-800/60 flex items-center justify-center">
          {batch.imageUrl ? (
            <SafeImage
              src={batch.imageUrl}
              alt={batch.name}
              className="w-full h-full"
              imageClassName="object-cover"
              variant="thumbnail"
              customFallback={
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <GraduationCap style={{ color: iconColor }} className="w-8 h-8 opacity-80" />
                </div>
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <GraduationCap style={{ color: iconColor }} className="w-8 h-8 opacity-80 group-hover:scale-110 transition-transform duration-300" />
            </div>
          )}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          {/* Top row: exam pill + free badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${pillClass}`}>
              {examType}
            </span>
            <span className="text-[9px] font-mono text-emerald-400 font-semibold uppercase tracking-wider">
              Free · YouTube
            </span>
          </div>

          {/* Batch name */}
          <h4 className="text-[13px] font-bold text-white leading-snug line-clamp-1 group-hover:text-amber-300 transition-colors duration-200">
            {batch.name}
          </h4>

          {/* Channel name */}
          <p className="text-[11px] text-zinc-400 line-clamp-1">
            {batch.channelName}
          </p>

          {/* Footer row: subject count + rating + chevron */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              {/* Subject count badge */}
              <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                <BookOpen className="w-3 h-3" />
                {subjectCount ?? '—'} subjects
              </span>
              {/* Rating placeholder */}
              <span className="flex items-center gap-0.5 text-[10px] font-mono text-zinc-500">
                <Star className="w-3 h-3 text-zinc-600" />
                No ratings
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
