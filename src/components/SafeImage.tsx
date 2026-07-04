import React, { useState, useEffect } from 'react';
import { Image, User, Layers, GraduationCap } from 'lucide-react';
import { extractYoutubeVideoId } from './YoutubeThumbnailImg';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  variant: 'thumbnail' | 'avatar' | 'banner';
  fallbackInitials?: string;
  customFallback?: React.ReactNode;
  priority?: boolean;
}

const getGradientByProvider = (provider: string) => {
  const p = (provider || '').toLowerCase();
  if (p.includes('physics') || p.includes('pw')) return 'from-[#1A112E] via-[#0D0D11] to-[#050507]';
  if (p.includes('allen')) return 'from-[#0A1E3F] via-[#0D0D11] to-[#050507]';
  if (p.includes('aakash')) return 'from-[#002D62]/50 via-[#0D0D11] to-[#050507]';
  if (p.includes('unacademy')) return 'from-[#0A261d] via-[#0D0D11] to-[#050507]';
  if (p.includes('fiitjee')) return 'from-[#2F110A] via-[#0D0D11] to-[#050507]';
  if (p.includes('resonance')) return 'from-[#0A1D2F] via-[#0D0D11] to-[#050507]';
  if (p.includes('vedantu')) return 'from-[#2F0A0A] via-[#0D0D11] to-[#050507]';
  if (p.includes('testbook')) return 'from-[#0F1E2A] via-[#0D0D11] to-[#050507]';
  if (p.includes('adda')) return 'from-[#2F1E00]/25 via-[#0D0D11] to-[#050507]';
  if (p.includes('motion')) return 'from-[#2D0A0A] via-[#0E0E0F] to-[#050507]';
  if (p.includes('chaitanya')) return 'from-[#0A1A2F] via-[#0D0D11] to-[#050507]';
  if (p.includes('narayana')) return 'from-[#3A1F0A] via-[#0E0B08] to-[#050507]';
  if (p.includes('vibrant')) return 'from-[#0A2D23] via-[#0D0D11] to-[#050507]';
  if (p.includes('brilliant')) return 'from-[#3A0A10] via-[#0E0E0F] to-[#050507]';
  if (p.includes('bansal')) return 'from-[#0B1530] via-[#0D0D11] to-[#050507]';
  if (p.includes('vidyamandir') || p.includes('vmc')) return 'from-[#121A2F] via-[#0D0D11] to-[#050507]';
  if (p.includes('pace')) return 'from-[#0A261D] via-[#0D0D11] to-[#050507]';
  if (p.includes('infinity')) return 'from-[#1A0A2F] via-[#0D0D11] to-[#050507]';
  if (p.includes('embibe')) return 'from-[#0A232D] via-[#0D0D11] to-[#050507]';
  if (p.includes('toppr')) return 'from-[#0A173A] via-[#0D0D11] to-[#050507]';
  if (p.includes('khan')) return 'from-[#092D09] via-[#0D0D11] to-[#050507]';
  if (p.includes('oswaal')) return 'from-[#2B1B0A] via-[#0E0E0F] to-[#050507]';
  if (p.includes('doubtnut')) return 'from-[#2D1509] via-[#0E0D0C] to-[#050507]';
  return 'from-[#141416] via-[#0C0C0E] to-[#08080A]';
};

export function SafeImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  variant,
  fallbackInitials,
  customFallback,
  priority = false,
}: SafeImageProps) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(false);
    setLoading(true);

    if (!src) {
      setResolvedSrc(null);
      setLoading(false);
      return;
    }

    const ytVideoId = extractYoutubeVideoId(src);
    if (ytVideoId) {
      setResolvedSrc(`https://img.youtube.com/vi/${ytVideoId}/maxresdefault.jpg`);
      setLoading(false);
      return;
    }

    if (src.startsWith('http://') || src.startsWith('https://')) {
      setResolvedSrc(src);
      setLoading(false);
      return;
    }

    // Relative path (starts with 'media/' or general relative path without http/https schema)
    const isRelative = src.startsWith('media/') || (!src.startsWith('http://') && !src.startsWith('https://') && src.length > 0);

    if (isRelative) {
      const cdn = (import.meta as any).env?.VITE_MEDIA_CDN;
      const hasCdn = cdn && cdn !== 'none' && cdn.trim() !== '';

      if (hasCdn) {
        const cleanCdn = cdn.endsWith('/') ? cdn.slice(0, -1) : cdn;
        const cleanPath = src.startsWith('/') ? src.slice(1) : src;
        if (active) {
          setResolvedSrc(`${cleanCdn}/${cleanPath}`);
          setLoading(false);
        }
      } else {
        const cleanPath = src.startsWith('/') ? src.slice(1) : src;
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
        const cleanUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
        if (active) {
          setResolvedSrc(`${cleanUrl}/storage/v1/object/public/media/${cleanPath}`);
          setLoading(false);
        }
      }
    } else {
      if (active) {
        setResolvedSrc(src);
        setLoading(false);
      }
    }

    return () => {
      active = false;
    };
  }, [src]);

  // Render Fallback UI if there's an error or no resolved src provided
  if (error || !resolvedSrc) {
    if (customFallback) {
      return <div className={`relative overflow-hidden ${className}`}>{customFallback}</div>;
    }
    const layoutClass = variant === 'avatar'
      ? 'aspect-square object-contain scale-100'
      : 'aspect-video w-full object-cover';
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-[#121215] via-[#0D0D10] to-[#0A0A0C] text-zinc-500 border border-zinc-900/60 select-none ${layoutClass} ${className}`}
      >
        {variant === 'avatar' && (
          <span className="font-mono font-black text-xs tracking-tighter uppercase text-zinc-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] aspect-square object-contain">
            {fallbackInitials || alt.slice(0, 2)}
          </span>
        )}
        
        {variant === 'thumbnail' && (
          <div className="flex flex-col items-center gap-1.5 text-center p-3 aspect-video w-full object-cover">
            <div className="w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center text-zinc-400 aspect-square object-contain">
              <Image className="w-4 h-4 opacity-75" />
            </div>
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-450 font-bold max-w-full truncate px-1">
              {alt || "No Preview"}
            </span>
          </div>
        )}
        
        {variant === 'banner' && (
          <div className={`w-full h-full aspect-video object-cover relative overflow-hidden flex flex-col items-center justify-center border border-zinc-900/65 bg-gradient-to-br ${getGradientByProvider(alt)} p-4`}>
            {/* Elegant dark grid back pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#232329_25%,transparent_25%,transparent_50%,#232329_50%,#232329_75%,transparent_75%,transparent)] bg-[length:14px_14px] opacity-15" />
            <div className="absolute inset-0 bg-transparent z-0" />
            
            <div className="z-10 flex flex-col items-center justify-center text-center">
              <span className="text-[7.5px] font-mono tracking-widest text-zinc-500 font-extrabold uppercase drop-shadow">
                TEST COOPERATIVE
              </span>
              <h3 className="text-sm font-sans font-black text-white tracking-wider leading-snug drop-shadow-md z-10 select-none uppercase mt-1 pl-1 line-clamp-1 max-w-[90%]">
                {alt}
              </h3>
              <span className="text-[7.5px] font-mono tracking-widest font-black text-white/60 z-10 mt-1 uppercase">
                AITS Evaluation Series
              </span>
            </div>
            
            <Layers className="w-5 h-5 text-zinc-800/25 absolute bottom-3 right-4 z-0" />
          </div>
        )}
      </div>
    );
  }

  const layoutClass = variant === 'avatar'
    ? 'aspect-square object-contain scale-100'
    : 'aspect-video w-full object-cover';

  return (
    <div className={`relative overflow-hidden ${layoutClass} ${className}`}>
      {loading && (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-[#121215] to-[#0A0A0C] flex items-center justify-center animate-pulse">
          <div className="w-4 h-4 border-2 border-zinc-800 border-t-zinc-500 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={resolvedSrc || ''}
        alt={alt}
        className={`w-full h-full ${layoutClass} transition-all duration-300 ${imageClassName} ${loading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        referrerPolicy="no-referrer"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    </div>
  );
}
