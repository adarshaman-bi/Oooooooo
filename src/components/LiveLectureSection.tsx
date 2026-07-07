import React from 'react';
import LectureCard from './LectureCard';
import { Lecture } from '../types';

interface LiveLectureSectionProps {
  videos: Lecture[];
  title?: string;
  onSelectVideo?: (lecture: Lecture) => void;
}

const LiveLectureSection: React.FC<LiveLectureSectionProps> = ({ 
  videos, 
  title = 'Live Lectures',
  onSelectVideo 
}) => {
  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 text-left">
      <h2 className="text-xs font-mono font-black uppercase tracking-widest text-red-500 mb-6 flex items-center gap-2">
        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
        {title} ({videos.length})
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => {
          const formattedSub = "182K";
          const lectureDto = {
            ...video,
            channel: {
              id: video.teacherId || 'unknown',
              name: video.teacherName || 'Verified Educator',
              avatarUrl: null,
              bannerUrl: null,
              subscriberCountRaw: 182000,
              subscriberCountFormatted: formattedSub
            }
          };
          return (
            <LectureCard 
              key={video.id} 
              lecture={lectureDto as any} 
              onClick={() => onSelectVideo?.(video)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default LiveLectureSection;
