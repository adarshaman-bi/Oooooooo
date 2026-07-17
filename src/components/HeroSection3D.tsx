import { useEffect, useRef, useState } from 'react';
import { Search, ArrowRight, Play, Award, Target, Zap, Clock, Star } from 'lucide-react';

interface HeroSection3DProps {
  examText?: string | null;
  targetYear?: string | null;
  onFocusSearch: () => void;
}

export default function HeroSection3D({ examText, targetYear, onFocusSearch }: HeroSection3DProps) {
  const [greeting, setGreeting] = useState('Evening');
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Morning');
    else if (h < 17) setGreeting('Afternoon');
    else setGreeting('Evening');
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || window.innerWidth < 768) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 8;
    const rotateX = (0.5 - y) * 8;
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (!cardRef.current) return;
    cardRef.current.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 pt-8 pb-4 z-10">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-hidden rounded-2xl border border-zinc-800/40 shadow-[0_25px_80px_rgba(0,0,0,0.95)] transition-transform duration-200 ease-out"
        style={{ backgroundColor: 'var(--color-surface-card, #0D0D0C)' }}
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-[0.015]" style={{ background: 'radial-gradient(circle, #FFB800, transparent 70%)' }} />
          <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-[0.015]" style={{ background: 'radial-gradient(circle, #22D3EE, transparent 70%)' }} />
          <div className="absolute top-1/3 left-1/2 w-64 h-64 rounded-full opacity-[0.01]" style={{ background: 'radial-gradient(circle, #A855F7, transparent 70%)' }} />
        </div>

        {/* Top edge glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-500/10 to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-8 md:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-12">
            {/* Left */}
            <div className="flex-1 min-w-0 space-y-5">
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
                <span className="text-[11px] font-mono text-zinc-500 tracking-widest uppercase">Good {greeting}</span>
                <span className="w-px h-3 bg-zinc-800" />
                <span className="text-[10px] font-mono text-zinc-600">{examText || 'Curated Learning'}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-[1.1]">
                {examText
                  ? <>Master <span className="text-ratings">{examText}</span>{targetYear ? ` ${targetYear}` : ''}</>
                  : <>Master <span className="text-ratings">Your Curriculum</span></>
                }
              </h1>

              <p className="text-sm text-zinc-400 leading-relaxed max-w-lg">
                {examText
                  ? `${examText} playlists, top Kota educators, and targeted test series — built for results.`
                  : 'Curated playlists, verified Kota educators, and smart test series to ace your exams.'
                }
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={onFocusSearch}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-black font-semibold text-sm transition-all duration-300 hover:shadow-[0_0_24px_rgba(255,255,255,0.06)] active:scale-[0.97] cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Start Learning</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>

                <div className="flex items-center gap-1 -ml-1">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-black bg-zinc-900 flex items-center justify-center text-[8px] font-bold text-zinc-500 -ml-1.5 first:ml-0">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <span className="text-[10px] text-zinc-700 font-mono ml-1">+2K today</span>
                </div>
              </div>
            </div>

            {/* Right - Stats Card */}
            <div className="shrink-0 w-full lg:w-72">
              <div className="relative">
                <div
                  className="relative rounded-xl p-4 border shadow-[0_10px_40px_rgba(0,0,0,0.8)]"
                  style={{ backgroundColor: 'var(--color-main-bg, #000000)', borderColor: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono text-zinc-600 tracking-wide">Today's Activity</span>
                    <Zap className="w-3 h-3 text-ratings" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Play className="w-3 h-3 text-zinc-600" />
                        <span className="text-xs text-zinc-400">Lessons</span>
                      </div>
                      <span className="text-xs font-bold text-white">4</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        <span className="text-xs text-zinc-400">Hours</span>
                      </div>
                      <span className="text-xs font-bold text-white">2.5h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-zinc-600" />
                        <span className="text-xs text-zinc-400">Streak</span>
                      </div>
                      <span className="text-xs font-bold text-ratings">12 days</span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex items-center gap-2">
                      <Award className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] text-zinc-600">Top 5% this week</span>
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-2 -right-2 rounded-lg px-3 py-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.7)]" style={{ backgroundColor: 'var(--color-main-bg, #000000)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3 h-3 text-cyan-400" />
                    <span className="text-[10px] font-mono text-zinc-500">50K+ students</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
