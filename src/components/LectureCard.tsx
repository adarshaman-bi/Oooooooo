import React, { useState } from 'react';
import { Play, CheckCircle, Eye, Heart } from 'lucide-react';
import { Lecture, LectureWithChannelDTO } from '../types';
import { SafeImage } from './SafeImage';
import YoutubeThumbnailImg from './YoutubeThumbnailImg';
import { formatViews } from '../utils/youtubeUtils';
import { ScorecardSummary } from './ScorecardSummary';

interface LectureCardProps {
  lecture: Lecture | LectureWithChannelDTO;
  onClick?: () => void;
  onChannelClick?: (e: React.MouseEvent) => void;
  isActive?: boolean;
  key?: React.Key;
}

export default function LectureCard({ lecture, onClick, onChannelClick, isActive }: LectureCardProps) {
  // Safely extract channel information (handle both legacy Lecture and raw LectureWithChannelDTO contracts)
  const isDto = 'channel' in lecture;
  
  const id = lecture.id;
  const scorecard = lecture.scorecard || {
    rating: lecture.rating || null,
    trustScore: lecture.trustScore || null,
    reviewCount: lecture.reviewCount || 0,
    positiveReviewCount: 0,
    sourceEntityIds: [id]
  };
  const title = lecture.title;
  
  // Use explicit key={url} to prevent cache-lock or bleeding
  const thumbnailUrl = 'thumbnailUrl' in lecture ? (lecture as any).thumbnailUrl : ('thumbnail_url' in lecture ? (lecture as any).thumbnail_url : (lecture as any).thumbnail);
  
  const duration = 'duration' in lecture ? lecture.duration : '30m';
  const subject = 'subject' in lecture ? lecture.subject : 'Academic';
  const viewsCount = 'viewsCount' in lecture ? lecture.viewsCount : ('views' in lecture ? (lecture as any).views : 0);
  const isPending = 'verificationStatus' in lecture ? lecture.verificationStatus === 'pending' : ('verification_status' in lecture ? (lecture as any).verification_status === 'pending' : false);

  // Extract channel properties correctly
  const channelName = isDto ? lecture.channel.name : ('teacherName' in lecture ? lecture.teacherName : ('teacher_name' in lecture ? (lecture as any).teacher_name : 'Verified Educator'));
  const channelAvatar = isDto 
    ? lecture.channel.avatarUrl 
    : ((lecture as any).teacherAvatar || (lecture as any).channelAvatar || (lecture as any).avatarUrl || (lecture as any).avatar);
  const subscriberText = isDto ? lecture.channel.subscriberCountFormatted : undefined;

  // Extract YouTube ID if valid
  const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;
  let ytId = '';
  const parsedVidId = 'video_id' in lecture ? (lecture as any).video_id : ('videoId' in lecture ? (lecture as any).videoId : '');
  
  if (id && YOUTUBE_ID_REGEX.test(id)) {
    ytId = id;
  } else if (parsedVidId && YOUTUBE_ID_REGEX.test(parsedVidId)) {
    ytId = parsedVidId;
  } else if ('youtubeVideoId' in lecture && (lecture as any).youtubeVideoId && YOUTUBE_ID_REGEX.test((lecture as any).youtubeVideoId)) {
    ytId = (lecture as any).youtubeVideoId;
  } else {
    const videoUrl = 'videoUrl' in lecture ? (lecture as any).videoUrl : ('video_url' in lecture ? (lecture as any).video_url : '');
    if (videoUrl) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
      const match = videoUrl.match(regExp);
      if (match && match[2] && match[2].length === 11 && YOUTUBE_ID_REGEX.test(match[2])) {
        ytId = match[2];
      }
    }
  }

  // Render high quality placeholder if thumbnail fails
  const renderThumbnail = () => {
    if (ytId) {
      return (
        <YoutubeThumbnailImg
          videoId={ytId}
          alt={title}
          className="w-full h-full aspect-video object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
        />
      );
    }
    return (
      <SafeImage
        src={thumbnailUrl}
        alt={title}
        variant="thumbnail"
        className="w-full h-full aspect-video object-cover"
        imageClassName="group-hover:scale-105 transition-transform duration-300 pointer-events-none aspect-video object-cover"
        customFallback={
          <div className="absolute inset-0 bg-neutral-950 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-850/30 via-zinc-950 to-black flex flex-col items-center justify-center p-4 text-center border border-zinc-850 aspect-video object-cover">
            {/* Subtle background pattern of geometric/diagonal stripes */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#232329_25%,transparent_25%,transparent_50%,#232329_50%,#232329_75%,transparent_75%,transparent)] bg-[length:14px_14px] opacity-15" />
            
            {/* Stylized play icon overlay */}
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-[0_0_15px_rgba(255,255,255,0.05)] mb-2 animate-pulse z-10">
              <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
            </div>

            {/* Subject category name badge */}
            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-white bg-white/10 px-2 py-0.5 rounded border border-white/20 mb-1 z-10">
              {subject}
            </span>
            
            <span className="text-[8.5px] text-zinc-400 font-mono tracking-wide truncate max-w-full z-10 uppercase">
              {title}
            </span>
          </div>
        }
      />
    );
  };

  return (
    <div
      onClick={onClick}
      className={`bg-[#0D0D0C] border rounded-2xl overflow-hidden hover:border-zinc-700 cursor-pointer transition-all duration-300 flex flex-col justify-between group h-full ${
        isActive ? 'ring-2 ring-white border-white bg-[#0D0D0C]' : 'border-[#1A1A1A]'
      }`}
    >
      {/* 16:9 Premium Visual Stage */}
      <div className="relative aspect-video bg-[#050505] overflow-hidden">
        {renderThumbnail()}
        
        {/* Overlay Dark Glass Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition-transform duration-300 scale-90 group-hover:scale-100">
            <Play className="w-4 h-4 fill-black pl-0.5" />
          </div>
        </div>

        {/* Dynamic Badges */}
        <span className="absolute bottom-2 right-2 text-[8px] font-mono font-bold tracking-wider bg-black/85 px-1.5 py-0.5 rounded text-white uppercase border border-white/5">
          {duration}
        </span>

        {subject && (
          <span className="absolute top-2 left-2 text-[8px] font-mono font-bold uppercase bg-zinc-950/85 text-[#A0A0A0] border border-zinc-800 px-2 py-0.5 rounded">
            {subject}
          </span>
        )}
      </div>

      {/* Profile Logo and Sub-row Details layout (Contract Compliant) */}
      <div className="p-3.5 space-y-2.5 text-left flex-grow flex flex-col justify-between">
        <div className="space-y-2">
          {/* Lecture Title (Compelling human readable, not-larping styling) */}
          <h4 className="text-xs font-bold text-white tracking-tight leading-snug line-clamp-2 uppercase min-h-[32px] group-hover:text-white transition-colors">
            {title}
          </h4>

          {/* Sub-row Channel Profile Brand Section */}
          <div className="flex items-center gap-2.5 pt-1">
            <SafeImage
              src={channelAvatar}
              alt={channelName}
              variant="avatar"
              className="w-5 h-5 rounded-full border border-zinc-800 select-none flex-shrink-0 aspect-square object-contain"
              imageClassName="aspect-square object-contain"
              fallbackInitials={channelName ? channelName.slice(0, 2) : "ED"}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span
                  onClick={(e) => {
                    if (onChannelClick) {
                      e.stopPropagation();
                      onChannelClick(e);
                    }
                  }}
                  className={`text-[10px] text-zinc-350 hover:text-[#f3b093] hover:underline font-medium truncate uppercase tracking-tight ${onChannelClick ? 'cursor-pointer' : ''}`}
                >
                  {channelName}
                </span>
                <CheckCircle className="w-2.5 h-2.5 text-white shrink-0" />
              </div>

              {/* Verified subscriber badge rendered side-by-side inside the profile alignment row */}
              {subscriberText && (
                <span className="inline-block text-[8px] font-mono text-zinc-500 font-bold tracking-wide">
                  {subscriberText} subscribers
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Views / Status Indicators Footer Row */}
        <div className="flex justify-between items-center text-[9px] font-mono pt-1 text-zinc-500 border-t border-zinc-950/50 mt-1">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3 text-zinc-600" />
            {formatViews(viewsCount).toUpperCase()}
          </span>

          <ScorecardSummary scorecard={scorecard} variant="inline" />

          {isPending && (
            <span className="bg-indigo-950/30 text-indigo-400 border border-indigo-500/10 text-[7px] font-mono px-1 rounded uppercase tracking-wider scale-95 shrink-0">
              Unverified Source
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
