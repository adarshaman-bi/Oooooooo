import React from 'react';
import VideoCard from './VideoCard';
import { Video } from '../types';

interface LiveLectureSectionProps {
  videos: Video[];
  title?: string;
}

const LiveLectureSection: React.FC<LiveLectureSectionProps> = ({ videos, title = 'Live Lectures' }) => {
  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
        <span className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
        {title}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} showLiveBadge={true} />
        ))}
      </div>
    </div>
  );
};

export default LiveLectureSection;
