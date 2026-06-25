import React, { useState } from 'react';
import { ShieldCheck, Award, Users, ChevronLeft, ArrowRight } from 'lucide-react';

interface ChannelHeaderProps {
  channel: {
    id: string;
    name: string;
    avatarUrl: string;
    bannerUrl: string | null;
    subscriberCountRaw: number;
    subscriberCountFormatted: string;
    description?: string;
  };
  onBack?: () => void;
}

export default function ChannelHeader({ channel, onBack }: ChannelHeaderProps) {
  const [bannerError, setBannerError] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const bannerUrl = channel.bannerUrl;
  const avatarUrl = channel.avatarUrl;

  return (
    <div className="w-full bg-[#08080A] rounded-2xl overflow-hidden border border-zinc-900 shadow-2xl relative">
      
      {/* 1. PREMIUM COHERENT CHANNEL BANNER AREA */}
      <div className="relative w-full aspect-video object-cover overflow-hidden bg-black">
        {bannerUrl && !bannerError ? (
          <img
            key={bannerUrl} // Explicit key identity layout binding to prevent caching/bleeding
            src={bannerUrl}
            alt={`${channel.name} Banner`}
            onError={() => setBannerError(true)}
            className="w-full h-full aspect-video object-cover select-none pointer-events-none transition-opacity duration-300"
            referrerPolicy="no-referrer"
          />
        ) : (
          /* Graceful, elegant Tailwind gradient fallback placeholder with modern technical visual elements */
          <div className="w-full h-full aspect-video object-cover bg-gradient-to-r from-zinc-950 via-[#101014] to-zinc-950 flex items-center justify-center relative select-none">
            {/* Subtle architectural noise/grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b1b22_1px,transparent_1px),linear-gradient(to_bottom,#1b1b22_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            
            {/* Minimalist ambient flare */}
            <div className="absolute -top-12 left-1/3 w-72 h-32 bg-white/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-12 right-1/3 w-72 h-32 bg-white/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative text-center opacity-40 font-mono tracking-widest text-[9px] uppercase font-semibold text-zinc-500">
              Biovised Verified Academic Channel
            </div>
          </div>
        )}

        {/* Back navigation over the banner */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 flex items-center gap-1 bg-black/70 hover:bg-black border border-zinc-800/80 hover:border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer backdrop-blur-md select-none lowercase"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to library
          </button>
        )}

        <div className="absolute bottom-3 right-4 bg-black/60 backdrop-blur-md border border-white/5 py-1 px-2.5 rounded-md flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
          <span className="text-[8px] font-mono font-black text-white uppercase tracking-wider">Curriculum Verified</span>
        </div>
      </div>

      {/* 2. CHANNELS DESCRIPTION & INFO ROW */}
      <div className="p-6 pt-16 sm:pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative">
        
        {/* Floating Absolute Avatar overlap */}
        <div className="absolute -top-12 sm:-top-16 left-6 z-10">
          <div className="w-20 h-20 sm:w-24 sm:h-24 aspect-square object-contain scale-100 rounded-full border-4 border-[#08080A] bg-[#0E0E10] overflow-hidden shadow-2xl relative select-none">
            {avatarUrl && !avatarError ? (
              <img
                key={avatarUrl} // Explicit identity layout key to shield concurrency
                src={avatarUrl}
                alt={channel.name}
                onError={() => setAvatarError(true)}
                className="w-full h-full aspect-square object-contain scale-100 transition-opacity duration-300"
                referrerPolicy="no-referrer"
              />
            ) : (
              /* High contrast fallback placeholder logo if load fails */
              <div className="w-full h-full aspect-square object-contain scale-100 bg-[#1A1A20] flex items-center justify-center font-display font-black text-2xl text-white">
                {channel.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {/* Channel Copy & Subscriber details layout */}
        <div className="space-y-1 text-left sm:pl-28 mt-2 sm:mt-0 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-display font-semibold text-white tracking-tight uppercase leading-none">
              {channel.name}
            </h2>
            <span className="inline-flex items-center gap-1 bg-[#EEEEEE] text-black border border-[#EEEEEE] text-[8px] font-mono font-black px-2 py-0.5 rounded-full uppercase leading-none">
              <Award className="w-2.5 h-2.5" /> Premium Content Partner
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5 text-zinc-350">
              <Users className="w-3.5 h-3.5 text-zinc-500" />
              <strong className="text-zinc-150 font-bold">{channel.subscriberCountFormatted}</strong> Candidates
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-500 text-[10px] uppercase">
              JEE/NEET verified repository
            </span>
          </div>

          {channel.description && (
            <p className="text-xs text-zinc-400 leading-relaxed font-sans pt-2 max-w-3xl border-t border-zinc-950/50 mt-2">
              {channel.description}
            </p>
          )}
        </div>

      </div>

    </div>
  );
}
