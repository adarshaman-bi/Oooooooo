import React, { useState, useEffect, useRef } from 'react';
import { Play, X, Eye, Clock } from 'lucide-react';
import YoutubeThumbnailImg from './YoutubeThumbnailImg';
import BiovisedPlayer from './BiovisedPlayer';
import { Lecture as TypesLecture } from '../types';

interface Lecture {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  description?: string;
  videoUrl?: string;
  viewCount?: number;
  duration?: string;
}

interface LecturesGridProps {
  playlistId: string;
}

function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
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
      
      {/* 1. PREMIUM BIOVISED PLAYER DISPLAY */}
      {activeVideoId && (
        <div 
          ref={playerRef}
          className="mb-8 w-full transition-all duration-300"
        >
          {(() => {
            const video = lectures.find(l => l.id === activeVideoId);
            if (!video) return null;

            const pseudoLecture: TypesLecture = {
              id: video.id,
              title: video.title,
              description: video.description || '',
              videoUrl: video.videoUrl || `https://www.youtube.com/watch?v=${video.id}`,
              thumbnailUrl: video.thumbnail,
              subject: 'Academic',
              examType: 'JEE',
              contentType: 'lecture',
              teacherId: 'youtube_video',
              teacherName: 'YouTube Educator',
              duration: video.duration || '00:00',
              viewsCount: video.viewCount || 0,
              likesCount: 0,
              createdAt: video.publishedAt || new Date().toISOString(),
            };

            return (
              <BiovisedPlayer
                lecture={pseudoLecture}
                onClose={() => setActiveVideoId(null)}
              />
            );
          })()}
        </div>
      )}

      {/* 2. SANITIZED VIDEOS GRID */}
      <h3 className="mb-5 text-base md:text-lg font-extrabold text-white flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
        Latest Live Video Lectures
      </h3>
      <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 sm:gap-5 p-0.5 sm:p-0">
        {lectures.map((video, index) => (
          <div 
            key={video.id} 
            onClick={() => {
              setActiveVideoId(video.id);
              playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="group cursor-pointer bg-zinc-900 border border-white/5 overflow-hidden transition-all duration-300 relative aspect-square sm:aspect-video sm:rounded-2xl sm:flex sm:flex-col sm:h-full"
          >
            {/* Live True Thumbnail Asset — uses YoutubeThumbnailImg for cascading fallback */}
            <div className="absolute inset-0 sm:relative sm:aspect-video w-full h-full sm:h-auto bg-zinc-950 overflow-hidden shrink-0">
              <YoutubeThumbnailImg
                videoId={video.id}
                alt={video.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-30 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white flex items-center justify-center shadow-lg transition-transform duration-300 transform scale-90 group-hover:scale-100">
                  <Play className="w-3 h-3 sm:w-4 sm:h-4 text-zinc-950 fill-current ml-0.5" />
                </div>
              </div>
              {/* Lecture Index Badge */}
              <span className="absolute top-2 left-2 bg-emerald-600 text-[10px] text-white font-mono font-bold px-2 py-0.5 rounded shadow-lg uppercase tracking-wider">
                Lecture #{index + 1}
              </span>
              {/* Duration badge */}
              {video.duration && (
                <span className="absolute bottom-1.5 right-1.5 bg-black/80 text-[10px] text-white font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {video.duration}
                </span>
              )}
            </div>
            <div className="hidden sm:flex p-4 flex-grow flex-col justify-between">
              <h4 className="text-xs font-bold leading-snug text-zinc-100 line-clamp-2 group-hover:text-zinc-50 mb-2">
                {video.title}
              </h4>
              <div className="flex items-center gap-3">
                {video.viewCount !== undefined && video.viewCount > 0 && (
                  <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViewCount(video.viewCount)} views
                  </span>
                )}
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(video.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
