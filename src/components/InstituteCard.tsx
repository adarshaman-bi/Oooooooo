import React, { useState } from 'react';
import { ShieldCheck, Star, ExternalLink, Building2 } from 'lucide-react';
import { InstituteProfile } from '../types';
import { SafeImage } from './SafeImage';

interface InstituteCardProps {
  institute: InstituteProfile;
  onViewHub: () => void;
  key?: any;
}

export function InstituteCard({ institute, onViewHub }: InstituteCardProps) {
  return (
    <div className="bg-[#0D0D0C] border border-[#1A1A1A] w-full rounded-2xl overflow-hidden hover:border-zinc-750 hover:shadow-[0_4px_30px_rgba(0,0,0,0.85)] transition-all duration-300 flex flex-col justify-between group">
      
      {/* 1. Proportional Aspect-ratio Banner Container */}
      <div className="relative w-full h-28 overflow-hidden bg-[#0A0A0C] border-b border-zinc-900">
        <SafeImage
          src={institute.bannerUrl}
          alt={`${institute.name} Banner`}
          className="w-full h-full"
          variant="banner"
        />

        {/* Verified badge in the top corner of the banner if verified */}
        {institute.isVerified && (
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/30 backdrop-blur-md px-2 py-0.5 rounded-full text-emerald-400 font-mono text-[9px] font-bold uppercase tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-450 fill-emerald-500/10" />
            <span>Verified</span>
          </div>
        )}
      </div>

      {/* 2. Floating Circular Profile Graphic and Core Header */}
      <div className="px-5 pb-5 pt-3 flex flex-col flex-grow justify-between gap-4">
        
        <div className="space-y-3">
          {/* Logo container overlapping the banner */}
          <div className="flex justify-between items-end -mt-10 relative z-10 w-full">
            <div className="w-14 h-14 rounded-full border-[3px] border-[#0E0E10] shadow-[0_4px_12px_rgba(0,0,0,0.6)] bg-zinc-950 flex items-center justify-center overflow-hidden flex-shrink-0">
              <SafeImage
                src={institute.logo}
                alt={`${institute.name} Logo`}
                variant="avatar"
                className="w-full h-full rounded-full"
                fallbackInitials={institute.name ? institute.name[0] : 'I'}
              />
            </div>

            {/* Trust Score indicator */}
            <div className="text-right">
              <span className="block text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">Trust Score</span>
              <span className="text-[10px] font-mono font-extrabold bg-zinc-905 border border-zinc-800 px-2.5 py-0.5 rounded text-white leading-none">
                {institute.trustScore != null ? `${institute.trustScore}/100` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Name & description content */}
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1">
              {institute.exams?.map((ex) => (
                <span 
                  key={ex} 
                  className="text-[8px] font-mono font-bold bg-[#141416] text-zinc-400 px-1.5 py-0.5 rounded uppercase border border-zinc-850"
                >
                  {ex}
                </span>
              ))}
            </div>
            
            <h4 className="text-xs font-bold text-white uppercase tracking-tight line-clamp-1 group-hover:text-amber-400 transition-colors">
              {institute.name}
            </h4>
            
            <span className="text-[8px] text-zinc-500 font-mono tracking-wider font-extrabold block uppercase mt-0.5">ESTABLISHED AFFILIATE</span>
            
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
              {institute.description || "Leading coaching center for higher sciences & NEET preparations with rigorous test cycles."}
            </p>
          </div>
        </div>

        {/* 3. Rating & CTA Actions */}
        <div className="space-y-3 pt-3 border-t border-zinc-900/60 font-mono">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              {institute.rating != null && <Star className="w-3 h-3 fill-current text-amber-400" />}
              <span>{institute.rating != null ? Number(institute.rating).toFixed(1) : 'Not yet rated'}</span>
            </span>
            <span className="text-zinc-500 uppercase text-[9px]">
              {institute.reviewCount || 0} reviews
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onViewHub}
              className="flex-grow bg-[#141416]/90 hover:bg-[#1A1A1E] border border-zinc-800 text-white py-1.5 rounded-xl text-center cursor-pointer font-bold transition-all text-[10px] uppercase tracking-wider relative overflow-hidden"
            >
              View Hub
            </button>
            
            {institute.officialLinks && institute.officialLinks.length > 0 && (
              <a
                href={institute.officialLinks[0]}
                target="_blank"
                rel="noreferrer"
                className="px-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer border border-zinc-800"
                title="Official Portal"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
