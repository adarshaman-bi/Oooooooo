import React, { useState } from 'react';
import { TestSeriesEntry } from '../../types';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { DynamicRating } from '../DynamicRating';
import { SafeImage } from '../SafeImage';

interface TestSeriesCardProps {
  id?: string;
  item: TestSeriesEntry;
  onClick: () => void;
}

const getInitials = (provider: string) => {
  if (!provider) return '';
  const clean = provider
    .replace(/Career|Institute|Classes|Group|Study|Centre|Tutorials/gi, '')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0] ? words[0].slice(0, 2).toUpperCase() : provider.slice(0, 2).toUpperCase();
};

const getTrustBadgeStyle = (score: number | null | undefined) => {
  if (score === null || score === undefined) {
    return "bg-zinc-900 border-zinc-800 text-zinc-500";
  }
  if (score >= 75) {
    return "bg-white/10 border-white/20 text-[#EEEEEE] font-extrabold";
  }
  if (score >= 50) {
    return "bg-zinc-900 border-zinc-800 text-zinc-350";
  }
  return "bg-zinc-900 border-zinc-800 text-zinc-500";
};

export const TestSeriesCard: React.FC<TestSeriesCardProps> = ({ id, item, onClick }) => {
  const initials = getInitials(item.provider);
  const [logoError, setLogoError] = useState(false);

  return (
    <motion.div
      id={id || `card-${item.id}`}
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="bg-zinc-950 border border-zinc-900 hover:border-zinc-750 rounded-2xl p-5 flex flex-col justify-between text-left cursor-pointer transition-all hover:shadow-[0_4px_24px_rgba(0,0,0,0.8)] relative group overflow-hidden"
    >
      <div>
        {/* Aspect Ratio 16:9 Banner Header Image */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-zinc-900 border border-zinc-850 mb-4 select-none pointer-events-none">
          <SafeImage
            src={item.bannerUrl}
            alt={item.provider}
            className="w-full h-full aspect-video object-cover"
            imageClassName="transition-transform duration-500 group-hover:scale-103 aspect-video object-cover"
            variant="banner"
          />

          {/* Left overlay badge: Double-bordered Avatar Component with Micro-badge */}
          <div className="absolute bottom-2 left-2 z-20 flex items-center shadow-lg">
            <div className="relative w-9 h-9 rounded-full bg-black border-[2px] border-zinc-950 ring-[1.5px] ring-white/60 flex items-center justify-center overflow-hidden flex-shrink-0">
              <SafeImage
                src={item.logo}
                alt={item.provider}
                variant="avatar"
                className="w-full h-full rounded-full aspect-square object-contain"
                imageClassName="aspect-square object-contain"
                fallbackInitials={initials.slice(0, 2)}
              />

              {/* Robust verified educator micro-badge sitting on bottom-right of the circle */}
              {item.trustScore !== null && item.trustScore !== undefined && item.trustScore >= 75 && (
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-white rounded-full border border-black flex items-center justify-center shadow-xs" title="Verified Provider">
                  <span className="text-[6px] text-black font-extrabold font-sans leading-none">✓</span>
                </div>
              )}
            </div>
          </div>

          {/* Corner Tag for Service Delivery Type */}
          <div className="absolute top-2.5 right-2.5">
            <span className="text-[8px] font-mono tracking-widest font-extrabold bg-black/80 text-white px-2 py-0.5 rounded border border-zinc-850 uppercase backdrop-blur-xs">
              {item.delivery || item.type}
            </span>
          </div>
        </div>

        {/* Provider Header + name */}
        <div className="space-y-1 min-w-0 mb-2">
          <span className="text-[10px] font-mono text-zinc-500 font-bold block uppercase tracking-wider">
            {item.provider}
          </span>
          <h3 className="text-sm font-bold text-white transition-colors group-hover:text-white leading-snug line-clamp-2">
            {item.name}
          </h3>
        </div>

        {/* Exam Tags as small chips */}
        <div className="flex flex-wrap gap-1 mb-3">
          {item.examTags.map((tag, idx) => (
            <span 
              key={idx} 
              className="text-[8px] font-mono tracking-wider font-extrabold bg-zinc-900/80 text-zinc-300 px-2 py-0.5 rounded uppercase border border-zinc-850"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Short Description */}
        <p className="text-xs text-zinc-400 line-clamp-3 font-sans leading-relaxed mb-4">
          {item.shortDescription || item.description || "No description available."}
        </p>
      </div>

      <div>
        {/* Meta stats: Rating & Price */}
        <div className="border-t border-zinc-900 pt-3 flex justify-between items-center text-xs font-mono">
          
          {/* Star Rating or Verification Pending */}
          <div className="space-y-0.5">
            <span className="text-[8px] text-zinc-550 block uppercase tracking-wider">Student Rating</span>
            <DynamicRating 
              targetId={item.id}
              className="flex items-center gap-1 h-5 text-xs text-zinc-400 font-mono"
              starClassName="w-3 h-3 text-[#FFEFD5] fill-[#FFEFD5] shrink-0 font-sans"
              textClassName="text-[10px] text-zinc-500"
            />
          </div>

          {/* DLP Price Display */}
          <div className="text-right space-y-0.5">
            <span className="text-[8px] text-zinc-550 block uppercase tracking-wider">Tuition Fee</span>
            <span className="text-xs font-mono font-bold text-white block">
              {item.price && typeof item.price === 'object' && 'amount' in item.price ? (
                `₹${item.price.amount.toLocaleString()}`
              ) : typeof item.price === 'number' ? (
                `₹${(item.price as number).toLocaleString()}`
              ) : item.price === 'free' ? (
                'Free'
              ) : item.price === 'bundled' ? (
                'Bundled'
              ) : (
                <span className="text-zinc-550 italic text-[10px] uppercase font-normal tracking-wide">
                  unverified
                </span>
              )}
            </span>
          </div>

        </div>

        {/* Color-Coded Trust Score Badge */}
        <div className="border-t border-zinc-900 mt-2.5 pt-2.5 flex justify-between items-center text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-zinc-550 uppercase tracking-wider">Trust Score</span>
            <span className={`text-[9.5px] font-extrabold font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${getTrustBadgeStyle(item.trustScore)}`}>
              {item.trustScore !== null && item.trustScore !== undefined ? `${item.trustScore}%` : 'null'}
            </span>
          </div>

          <span className="text-[10px] text-zinc-400 group-hover:text-white group-hover:underline flex items-center gap-1 transition-all">
            View Details ➜
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default TestSeriesCard;
