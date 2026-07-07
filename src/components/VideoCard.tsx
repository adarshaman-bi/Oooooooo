import React from 'react';
import { Video } from '../types';

interface VideoCardProps {
  video: Video;
  showLiveBadge?: boolean;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, showLiveBadge = false }) => {
  const title = video.title || 'Untitled lecture';
  const thumbnail = video.thumbnail_url || 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=800&q=80';

  return (
    <div className="bg-[#111111] border border-zinc-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="relative aspect-video">
        <img src={thumbnail} alt={title} className="h-full w-full object-cover" />
        {showLiveBadge && (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] font-semibold px-2 py-1 rounded-full uppercase tracking-wide">
            Live
          </span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-white line-clamp-2">{title}</h3>
        {video.description && (
          <p className="text-xs text-zinc-400 line-clamp-2">{String(video.description)}</p>
        )}
        {video.publish_date && (
          <p className="text-[11px] text-zinc-500">{new Date(String(video.publish_date)).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
};

export default VideoCard;
