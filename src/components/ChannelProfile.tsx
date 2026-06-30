import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { 
  Tv, 
  Users, 
  Play, 
  Star, 
  MessageSquare, 
  CornerDownRight, 
  X, 
  CheckCircle,
  Video,
  Radio,
  FileText
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { formatSubscribers, formatViews } from '../utils/youtubeUtils';
import youtubeChannelsConfig from '../config/youtubeChannels.json';

interface Playlist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

interface Lecture {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  videoUrl: string;
}

interface ChannelData {
  id: string;
  title: string;
  customName: string;
  logo: string;
  banner: string;
  subscriberCount: number;
  viewCount: number;
  playlists: Playlist[];
  liveStream?: { videoId: string; title: string; thumbnail: string } | null;
}

interface Review {
  id: string;
  video_id: string;
  user_id: string;
  rating: number;
  review_text: string;
  created_at: string;
}

interface ChannelProfileProps {
  targetId: string;
  onClose: () => void;
  onSelectLecture: (lecture: any) => void;
}

export default function ChannelProfile({ targetId, onClose, onSelectLecture }: ChannelProfileProps) {
  const { user, isGuest } = useAuth();
  
  // State 1: Active channel ID (initially loaded from URL context or targetId prop)
  const [activeChannelId, setActiveChannelId] = useState<string>(() => {
    // 1. Path param /channel/:channelId
    const pathMatch = window.location.pathname.match(/\/channel\/([^/]+)/);
    if (pathMatch && pathMatch[1]) return pathMatch[1];
    
    // 2. Query param ?channelId=...
    const urlParams = new URLSearchParams(window.location.search);
    const searchId = urlParams.get('channelId') || urlParams.get('id');
    if (searchId) return searchId;
    
    // 3. Match prop targetId in channels config if it's a name alias, or use it directly
    const configMatch = youtubeChannelsConfig.find(
      c => c.channelId === targetId || c.name.toLowerCase() === targetId.toLowerCase()
    );
    if (configMatch) return configMatch.channelId;
    
    return targetId || 'UCD16eo98AXl-9T61Xd711kQ'; // PW by default if not set
  });

  const [channel, setChannel] = useState<ChannelData | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingLectures, setIsLoadingLectures] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Rating states per item
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  
  // Selected detail item for reviews drawer
  const [selectedItem, setSelectedItem] = useState<{ id: string; title: string; type: 'playlist' | 'video' } | null>(null);
  const [selectedItemReviews, setSelectedItemReviews] = useState<Review[]>([]);
  const [selectedItemAvgRating, setSelectedItemAvgRating] = useState<number>(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);
  
  // Post review states
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [reviewTextInput, setReviewTextInput] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);

  const isLoggedIn = user && !isGuest && user.uid !== 'guest';

  // 1. Fetch channel identity profile details & playlists
  useEffect(() => {
    const loadChannelProfile = async () => {
      if (!activeChannelId) return;
      setIsLoading(true);
      setErrorMsg(null);

      try {
        const baseApiUrl = '/api/youtube';

        const profileRes = await axios.get(`${baseApiUrl}/channel/${activeChannelId}`);
        if (profileRes.data && profileRes.data.status === 'ok') {
          setChannel(profileRes.data.data);
        } else {
          setErrorMsg(profileRes.data.error || 'Failed to retrieve channel profile.');
        }
      } catch (err: any) {
        const msg = err.response?.data?.error || err.message || 'Failed connecting to proxy server.';
        setErrorMsg(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadChannelProfile();
  }, [activeChannelId]);

  // 2. Fetch video lectures (playlistItems) for this channel
  useEffect(() => {
    const loadLectures = async () => {
      if (!activeChannelId) return;
      setIsLoadingLectures(true);
      setLectures([]);

      try {
        const baseApiUrl = '/api/youtube';

        const lecturesRes = await axios.get(`${baseApiUrl}/lectures/${activeChannelId}`);
        if (lecturesRes.data && lecturesRes.data.status === 'ok') {
          const fetchedLectures = lecturesRes.data.data || [];
          setLectures(fetchedLectures);
        } else {
        }
      } catch (err: any) {
      } finally {
        setIsLoadingLectures(false);
      }
    };

    loadLectures();
  }, [activeChannelId]);

  // 3. Fetch ratings for playlists and lectures when loaded
  useEffect(() => {
    const itemsToFetch: string[] = [];
    if (channel?.playlists) {
      channel.playlists.forEach(pl => itemsToFetch.push(pl.id));
    }
    if (lectures) {
      lectures.forEach(lec => itemsToFetch.push(lec.id));
    }

    if (itemsToFetch.length === 0) return;

    itemsToFetch.forEach(async (id) => {
      try {
        const res = await fetch(`/api/youtube/reviews/${id}`);
        const data = await res.json();
        if (data.status === 'ok') {
          setItemRatings(prev => ({ ...prev, [id]: data.averageRating }));
        }
      } catch (e) {
      }
    });
  }, [channel, lectures]);

  // 4. Fetch reviews for a selected item detail drawer view
  const loadItemReviews = async (itemId: string) => {
    setIsLoadingReviews(true);
    setReviewSubmitError(null);
    try {
      const res = await fetch(`/api/youtube/reviews/${itemId}`);
      const data = await res.json();
      if (data.status === 'ok') {
        setSelectedItemReviews(data.reviews || []);
        setSelectedItemAvgRating(data.averageRating || 0);
      }
    } catch (e) {
    } finally {
      setIsLoadingReviews(false);
    }
  };

  useEffect(() => {
    if (selectedItem) {
      loadItemReviews(selectedItem.id);
    }
  }, [selectedItem]);

  // 5. Handle review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !isLoggedIn) return;

    setIsSubmittingReview(true);
    setReviewSubmitError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const res = await fetch(`/api/youtube/reviews/${selectedItem.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: ratingInput,
          reviewText: reviewTextInput
        })
      });

      const resData = await res.json();
      if (resData.status === 'ok') {
        setReviewTextInput('');
        await loadItemReviews(selectedItem.id);
        setItemRatings(prev => ({ ...prev, [selectedItem.id]: ratingInput }));
      } else {
        setReviewSubmitError(resData.error || 'Failed to submit review.');
      }
    } catch (err: any) {
      setReviewSubmitError('Failed to post review. Please check connection.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden selection:bg-white selection:text-black relative">
      
      {/* Top Banner section */}
      <div className="w-full h-40 md:h-48 bg-zinc-900 relative overflow-hidden">
        {channel?.banner ? (
          <img 
            src={channel.banner} 
            alt={channel.title} 
            className="w-full h-full object-cover opacity-50"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.02),transparent_70%)]" />
        )}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 border border-zinc-800 hover:border-zinc-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-zinc-400 z-20"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-10 relative z-10 pb-6 text-left">
        <div className="flex flex-col md:flex-row items-center md:items-end gap-5">
          <div className="w-20 h-20 rounded-xl border-2 border-zinc-950 bg-zinc-900 overflow-hidden shadow-2xl shrink-0">
            {channel?.logo ? (
              <img 
                src={channel.logo} 
                alt={channel.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-mono text-zinc-400 text-xl font-black">
                {channel?.title?.slice(0, 2) || 'YT'}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-lg md:text-2xl font-bold tracking-tight text-white uppercase font-sans">
                {isLoading ? 'Syncing...' : (channel?.title || 'Loading...')}
              </h1>
              {channel && (
                <span className="flex items-center gap-1 text-[8px] font-mono font-bold bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                  <CheckCircle className="w-2.5 h-2.5" /> Verified Channel
                </span>
              )}
            </div>

            {channel && (
              <div className="flex flex-wrap justify-center md:justify-start gap-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {formatSubscribers(channel.subscriberCount)}</span>
                <span className="flex items-center gap-1"><Tv className="w-3.5 h-3.5" /> {formatViews(channel.viewCount)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 space-y-8 pb-20">
        
        {/* CATEGORY 1: "CHANNELS" CATEGORY LAYOUT */}
        <div className="space-y-3 text-left">
          <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest">
            Target Channels Configured ({youtubeChannelsConfig?.length || 0})
          </h3>
          <div className="w-full bg-zinc-900/20 border border-zinc-900 p-4 rounded-xl">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {youtubeChannelsConfig?.map((item) => {
                const isSelected = item.channelId === activeChannelId;
                return (
                  <button
                    key={item.channelId}
                    onClick={() => setActiveChannelId(item.channelId)}
                    className={`py-2 px-4 rounded-lg font-mono text-[10px] uppercase tracking-wider border cursor-pointer shrink-0 transition-all ${
                      isSelected 
                        ? 'bg-zinc-800 border-zinc-650 text-white font-bold' 
                        : 'bg-zinc-950/40 border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-800'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Global Fetching states */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Loading live educational streams...</p>
          </div>
        ) : errorMsg ? (
          <div className="py-16 text-center space-y-2 border border-zinc-900 rounded-xl bg-zinc-900/10">
            <p className="text-xs font-mono text-red-500 uppercase tracking-wider">⚠️ API Synchronization Failed</p>
            <p className="text-[10px] text-zinc-500 max-w-md mx-auto leading-relaxed">{errorMsg}</p>
          </div>
        ) : (
          <>
            {/* CATEGORY 2: "PLAYLISTS" CATEGORY LAYOUT */}
            <div className="space-y-4 text-left">
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-2">
                Course Series Playlists ({channel?.playlists?.length || 0})
              </h3>
              
              {!channel?.playlists || channel.playlists.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-900 rounded-xl">
                  <p className="text-xs text-zinc-500 font-mono">No public playlists found for this channel.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {channel.playlists.map((pl) => {
                    const avgRating = itemRatings[pl.id] || 0;
                    return (
                      <div
                        key={pl.id}
                        onClick={() => setSelectedItem({ id: pl.id, title: pl.title, type: 'playlist' })}
                        className="bg-zinc-900/20 border border-zinc-900 hover:border-zinc-800 rounded-xl overflow-hidden cursor-pointer transition-all group flex flex-col"
                      >
                        <div className="relative aspect-video bg-black overflow-hidden">
                          <img 
                            src={pl.thumbnail} 
                            alt={pl.title} 
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Rating display formatted out of 5 stars overlay */}
                          <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/85 backdrop-blur-xs rounded-lg font-mono text-[9px] font-bold text-amber-400 tracking-wider border border-amber-400/10">
                            <span>{avgRating > 0 ? `★ ${avgRating.toFixed(1)} / 5` : '★ 0.0 / 5'}</span>
                          </div>

                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                              <Play className="w-3.5 h-3.5 fill-current pl-0.5" />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-white uppercase tracking-tight line-clamp-2 leading-snug">
                              {pl.title}
                            </h4>
                            {pl.description && (
                              <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
                                {pl.description}
                              </p>
                            )}
                          </div>
                          <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-widest block pt-2 border-t border-zinc-900/40">
                            Synced: {new Date(pl.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CATEGORY 3: "LECTURES" CATEGORY LAYOUT */}
            <div className="space-y-4 text-left">
              <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-900 pb-2">
                Individual Video Lectures ({lectures?.length || 0})
              </h3>

              {isLoadingLectures ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <div className="w-5 h-5 border-2 border-zinc-700 border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-mono text-zinc-650 uppercase">Loading video chapters...</p>
                </div>
              ) : !lectures || lectures.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-zinc-900 rounded-xl">
                  <p className="text-xs text-zinc-500 font-mono">No video lectures available for this stream.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {lectures.map((lec) => {
                    const avgRating = itemRatings[lec.id] || 0;
                    return (
                      <div
                        key={lec.id}
                        className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden flex flex-col justify-between group"
                      >
                        <div className="relative aspect-video bg-black overflow-hidden">
                          <img 
                            src={lec.thumbnail} 
                            alt={lec.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          
                          <div className="absolute top-2 left-2 px-2.5 py-1 bg-black/85 backdrop-blur-xs rounded-lg font-mono text-[9px] font-bold text-amber-400 tracking-wider border border-amber-400/10">
                            <span>{avgRating > 0 ? `★ ${avgRating.toFixed(1)} / 5` : '★ 0.0 / 5'}</span>
                          </div>

                          <div 
                            onClick={() => onSelectLecture(lec)}
                            className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
                              <Play className="w-3.5 h-3.5 fill-current pl-0.5" />
                            </div>
                          </div>
                        </div>

                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-white uppercase tracking-tight line-clamp-2 leading-snug">
                              {lec.title}
                            </h4>
                            {lec.description && (
                              <p className="text-[10px] text-zinc-550 line-clamp-2 leading-relaxed">
                                {lec.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex gap-2 pt-2 border-t border-zinc-900/40">
                            <button
                              onClick={() => setSelectedItem({ id: lec.id, title: lec.title, type: 'video' })}
                              className="flex-1 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-mono text-[9px] uppercase tracking-wider transition-colors cursor-pointer border border-zinc-800"
                            >
                              Write/Read Reviews
                            </button>
                            <button
                              onClick={() => onSelectLecture(lec)}
                              className="py-1.5 px-3 rounded-lg bg-white text-black font-mono text-[9px] uppercase tracking-wider font-bold transition-colors cursor-pointer"
                            >
                              Stream
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Reviews Side-Modal Drawer Overlay */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex justify-end font-sans bg-black/60 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setSelectedItem(null)} />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-900 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto text-left"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[8px] font-mono uppercase bg-zinc-900 text-zinc-400 px-2 py-0.5 rounded-full font-bold">
                      Audited {selectedItem.type} reviews
                    </span>
                    <h3 className="text-xs font-bold text-white uppercase tracking-tight line-clamp-2 mt-1">
                      {selectedItem.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="w-7 h-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-[#09090b] border border-zinc-900 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-mono text-zinc-550 uppercase block tracking-wider">Average Rating</span>
                    <span className="text-xl font-bold text-amber-400 font-sans">
                      ★ {selectedItemAvgRating > 0 ? `${selectedItemAvgRating.toFixed(1)} / 5` : '0.0 / 5'}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 uppercase">
                    {selectedItemReviews.length} reviews
                  </span>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
                    Audited Review Logs
                  </h4>

                  {isLoadingReviews ? (
                    <div className="py-12 text-center text-zinc-700 font-mono text-[10px] animate-pulse">
                      Retrieving database records...
                    </div>
                  ) : selectedItemReviews.length === 0 ? (
                    <p className="text-xs text-zinc-650 py-8 text-center font-mono italic">
                      No review logs recorded for this series.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                      {selectedItemReviews.map((rev) => (
                        <div key={rev.id} className="p-3 bg-zinc-900/10 border border-zinc-900 rounded-xl space-y-1.5 text-xs">
                          <div className="flex justify-between items-center text-[8px] font-mono uppercase">
                            <span className="text-zinc-500 flex items-center gap-1"><CornerDownRight className="w-3 h-3" /> Anonymous Student</span>
                            <span className="text-amber-400 font-bold">★ {rev.rating} / 5</span>
                          </div>
                          <p className="leading-relaxed text-zinc-400 font-sans">{rev.review_text}</p>
                          <span className="text-[7px] font-mono text-zinc-600 block text-right">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Gated Write a Review Form */}
              <div className="border-t border-zinc-900 pt-4 mt-6">
                {!isLoggedIn ? (
                  <div className="p-4 bg-zinc-900/10 border border-dashed border-zinc-900 rounded-xl text-center">
                    <p className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider">
                      🔒 Verification Required
                    </p>
                    <p className="text-[9px] text-zinc-550 mt-1">
                      You must be signed in to submit video review logs.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
                        Write a Review
                      </label>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono text-zinc-550 uppercase">Score:</span>
                        <select
                          value={ratingInput}
                          onChange={(e) => setRatingInput(parseInt(e.target.value, 10))}
                          className="bg-[#0e0e12] border border-zinc-800 text-white rounded px-2 py-1 outline-none text-[10px] font-mono font-bold"
                        >
                          {[5, 4, 3, 2, 1].map((r) => (
                            <option key={r} value={r}>{r}★</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <textarea
                      required
                      value={reviewTextInput}
                      onChange={(e) => setReviewTextInput(e.target.value)}
                      placeholder="Share your experience with this course..."
                      className="w-full h-16 bg-[#0c0c0e] border border-zinc-800 focus:border-zinc-700 text-white placeholder-zinc-700 rounded-xl p-3 outline-none resize-none"
                    />

                    {reviewSubmitError && (
                      <p className="text-[9px] font-mono text-red-400">{reviewSubmitError}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="w-full bg-white hover:bg-zinc-200 text-black py-2 rounded-xl font-bold uppercase tracking-wider text-[9px] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingReview ? 'Posting...' : 'Submit Audited Review'}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
