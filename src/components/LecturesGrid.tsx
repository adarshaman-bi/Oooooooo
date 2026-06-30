import React, { useState, useEffect, useRef } from 'react';
import { Play, X } from 'lucide-react';

interface Lecture {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  description?: string;
  videoUrl?: string;
}

interface LecturesGridProps {
  playlistId: string;
}

export const LecturesGrid: React.FC<LecturesGridProps> = ({ playlistId }) => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null); // Controls the in-built player state
  const [loading, setLoading] = useState<boolean>(true);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadLectures = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/teachers/${playlistId}/lectures`);
        const result = await response.json();
        if (active && result.success) {
          setLectures(result.data || []);
        }
      } catch (err) {
        console.error("Frontend safety boundary caught fetch error:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    loadLectures();
    return () => {
      active = false;
    };
  }, [playlistId]);

  if (loading) {
    return (
      <div className="text-zinc-400 p-6 text-sm font-mono animate-pulse">
        Loading live video assets...
      </div>
    );
  }

  if (lectures.length === 0) {
    return (
      <div className="text-zinc-500 p-6 text-sm font-mono border border-dashed border-white/5 rounded-2xl bg-zinc-950/20 text-center">
        No active live lectures verified for this configuration.
      </div>
    );
  }

  return (
    <div className="p-5 md:p-6 bg-zinc-950/40 border border-white/5 rounded-3xl text-white font-sans">
      
      {/* 1. IN-BUILT PLAYER COMPONENT DISPLAY */}
      {activeVideoId && (
        <div 
          ref={playerRef}
          className="mb-8 relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300"
        >
          <iframe
            src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1`}
            title="In-Built Video Player"
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button 
            onClick={() => setActiveVideoId(null)} 
            className="absolute top-4 right-4 bg-black/85 hover:bg-black/95 text-white border border-white/15 px-3 py-1.5 rounded-lg cursor-pointer font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            Close Player
          </button>
        </div>
      )}

      {/* 2. SANITIZED VIDEOS GRID */}
      <h3 className="mb-5 text-base md:text-lg font-extrabold text-white flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
        Latest Live Video Lectures
      </h3>
      <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 p-0.5 sm:p-0">
        {lectures.map((video) => (
          <div 
            key={video.id} 
            onClick={() => {
              setActiveVideoId(video.id);
              playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="group cursor-pointer bg-zinc-900 border border-white/5 overflow-hidden transition-all duration-300 relative aspect-square sm:aspect-video sm:rounded-2xl sm:flex sm:flex-col sm:h-full"
          >
            {/* Live True Thumbnail Asset */}
            <div className="absolute inset-0 sm:relative sm:aspect-video w-full h-full sm:h-auto bg-zinc-950 overflow-hidden shrink-0">
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/40 opacity-30 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center shadow-lg transition-transform duration-300 transform scale-90 group-hover:scale-100">
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-950 fill-current ml-0.5" />
                </div>
              </div>
            </div>
            <div className="hidden sm:flex p-4 flex-grow flex-col justify-between">
              <h4 className="text-xs font-bold leading-snug text-zinc-100 line-clamp-2 group-hover:text-zinc-50 mb-2">
                {video.title}
              </h4>
              <span className="text-[10px] text-zinc-500 font-mono">
                Uploaded: {new Date(video.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
