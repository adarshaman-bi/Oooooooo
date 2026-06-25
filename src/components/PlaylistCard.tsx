import React, { useState } from 'react';
import { extractYoutubeId, getYoutubeThumbnail, getYoutubeEmbedUrl } from '../utils/youtubeUtils';

interface PlaylistCardProps {
  playlist: {
    id: string;
    title?: string;
    subtitle?: string;
    youtubeUrl?: string;
    videoLink?: string;
  };
}

export const PlaylistCard = ({ playlist }: PlaylistCardProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  // 1. Run data validation on the incoming item
  // Use playlist.youtubeUrl or whatever field stores the genuine link
  const videoSource = playlist.youtubeUrl || playlist.videoLink || playlist.id; 
  const videoId = extractYoutubeId(videoSource);
  const thumbnailUrl = getYoutubeThumbnail(videoSource);
  const embedUrl = getYoutubeEmbedUrl(videoSource);

  // 2. Fallback UI if the video configuration is completely dead
  if (!videoId) {
    return (
      <div className="playlist-card error-state" style={{ border: '1px dashed #ef4444', padding: '16px', borderRadius: '12px', background: '#fef2f2' }}>
        <div style={{ height: '140px', background: '#fee2e2', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c' }}>
          ⚠️ Link Structure Broken
        </div>
        <h4 style={{ margin: '12px 0 4px 0', color: '#1f2937' }}>{playlist.title || 'Untitled Lecture'}</h4>
        <p style={{ fontSize: '12px', color: '#ef4444' }}>Fix required: Data contains placeholder key ("{playlist.id}") instead of a real YouTube link.</p>
      </div>
    );
  }

  return (
    <div className="playlist-card" style={{ width: '100%', maxWidth: '320px', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
      {/* Dynamic Video Player Wrapper */}
      <div className="video-player-container" style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000' }}>
        {isPlaying && embedUrl ? (
          <iframe
            src={embedUrl}
            title={playlist.title}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div 
            onClick={() => setIsPlaying(true)}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `url(${thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {/* Play Button Overlay */}
            <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' }}>
              <span style={{ color: '#000', marginLeft: '4px' }}>▶</span>
            </div>
          </div>
        )}
      </div>

      {/* Metadata Text */}
      <div style={{ padding: '12px', background: '#1e293b', color: '#fff' }}>
        <h4 style={{ margin: 0, fontSize: '14px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{playlist.title}</h4>
        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{playlist.subtitle || '[ROHIT AGARWAL CLASSES]'}</span>
      </div>
    </div>
  );
};
