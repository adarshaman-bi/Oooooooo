import React from 'react';
import { GraduationCap, BookOpen, Atom, TestTube, Binary } from 'lucide-react';
import { Batch } from '../types';
import { SafeImage } from './SafeImage';

interface BatchCardProps {
  batch: Batch;
  onClick?: () => void;
  key?: any;
}

export function BatchCard({ batch, onClick }: BatchCardProps) {
  // Determine subject gradient & icon
  const getSubjectMedia = (subject: string = '') => {
    const s = subject.toLowerCase();
    if (s.includes('physics')) {
      return {
        gradient: 'from-blue-600 via-indigo-650 to-blue-900',
        Icon: Atom,
        label: 'Physics'
      };
    }
    if (s.includes('chemistry')) {
      return {
        gradient: 'from-emerald-500 via-teal-650 to-emerald-800',
        Icon: TestTube,
        label: 'Chemistry'
      };
    }
    if (s.includes('math') || s.includes('mathematics')) {
      return {
        gradient: 'from-purple-600 via-pink-700 to-purple-900',
        Icon: Binary,
        label: 'Mathematics'
      };
    }
    return {
      gradient: 'from-indigo-600 via-slate-800 to-blue-900',
      Icon: GraduationCap,
      label: subject || 'Full Cohort'
    };
  };

  const media = getSubjectMedia(batch.subject);
  const SubjectIcon = media.Icon;

  return (
    <div 
      onClick={onClick}
      className="bg-[#0D0D0C] border border-[#1A1A1A] hover:border-zinc-700 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.8)] relative group overflow-hidden cursor-pointer"
    >
      {/* Thumbnail Slot on Left / Top */}
      <div className="relative w-full sm:w-36 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-zinc-900 flex-shrink-0 border border-zinc-850">
        <SafeImage
          src={batch.imageUrl}
          alt={batch.name}
          className="w-full h-full"
          imageClassName="transition-transform duration-500 group-hover:scale-103"
          variant="thumbnail"
          customFallback={
            <div className={`absolute inset-0 bg-gradient-to-br ${media.gradient} flex flex-col items-center justify-center p-3 text-center transition-all`}>
              <SubjectIcon className="w-8 h-8 text-white mb-1.5 opacity-90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] animate-pulse" />
              <span className="text-[10px] font-mono tracking-widest text-white/90 uppercase font-black">{media.label}</span>
            </div>
          }
        />
      </div>

      {/* Main Metadata Text Section on Right */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono font-bold bg-zinc-900/65 text-zinc-350 px-2 py-0.5 rounded uppercase border border-zinc-800">
              {batch.examType}
            </span>
            <span className="text-[9px] font-mono text-rose-450 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" /> Live Cohort
            </span>
          </div>
          
          <h4 className="text-xs font-bold text-white uppercase tracking-tight line-clamp-1 group-hover:text-indigo-400 transition-colors">
            {batch.name}
          </h4>
          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2 select-text">
            {batch.description}
          </p>
        </div>

        {/* Footer Row */}
        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono pt-2 border-t border-zinc-900/60 mt-1">
          <span className="font-medium">
            Price: {typeof batch.price === 'number' ? (batch.price === 0 ? 'Free' : `₹${batch.price.toLocaleString()}`) : 'Free'}
          </span>
          <span className="text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-950/40 px-2 py-0.5 rounded tracking-wide text-[9px] uppercase">
            {batch.discountCode || 'OFFER10'}
          </span>
        </div>
      </div>
    </div>
  );
}
