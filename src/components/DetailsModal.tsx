import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Award,
  Star,
  ExternalLink,
  ShieldCheck,
  Send,
  User,
  CheckCircle,
  AlertOctagon,
  TrendingUp,
  Bookmark
} from 'lucide-react';
import { TeacherProfile, InstituteProfile, Review, EntityTrustScoreBreakdown as TrustScoreBreakdown, Lecture, Playlist, Batch } from '../types';
import { getLectureThumbnail, getPlaylistThumbnail } from '../services/thumbnailHelper';
import ChannelProfile from './ChannelProfile';
import {
  fetchReviews,
  submitReview,
  fetchTrustScore,
  submitReport,
  fetchLectures,
  fetchPlaylists,
  fetchBatches
} from '../services/dbService';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'teacher' | 'institute' | 'playlist' | 'batch';
  targetId: string;
  onSelectLecture: (lecture: Lecture) => void;
}

export default function DetailsModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  onSelectLecture
}: DetailsModalProps) {
  const { user, isGuest } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | InstituteProfile | { id: string; name: string; description?: string; isVerified: boolean; officialLinks: string[]; rating: number; reviewCount: number } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [trustBreakdown, setTrustBreakdown] = useState<TrustScoreBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Associated resources lists
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  // Submitting review form states
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [reviewSuccess, setReviewSuccess] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');

  // Submitting report layout
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportError, setReportError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    // Reset state parameters
    setIsLoading(true);
    setErrorMsg(null);
    setReviewSuccess('');
    setReviewError('');
    setReportError('');
    setShowReportForm(false);
    setReportDetails('');
    setProfile(null);
    setReviews([]);
    setTrustBreakdown(null);
    setLectures([]);
    setPlaylists([]);
    setBatches([]);

    // Resolve entity details
    import('../services/dbService').then(async (dbService) => {
      try {
        if (targetType === 'teacher') {
          const prof = await dbService.fetchTeacherById(targetId);
          if (!prof) {
            setErrorMsg('Teacher profile not found.');
            setIsLoading(false);
            return;
          }
          setProfile(prof);

          const revs = await dbService.fetchReviews(targetId);
          setReviews(revs);

          const tb = await dbService.fetchTrustScore(targetId);
          setTrustBreakdown(tb);

          const lecs = await dbService.fetchLectures({ teacherId: targetId });
          setLectures(lecs);

          const plays = await dbService.fetchPlaylists({ teacherId: targetId });
          setPlaylists(plays);
        } else if (targetType === 'institute') {
          const prof = await dbService.fetchInstituteById(targetId);
          if (!prof) {
            setErrorMsg('Institute profile not found.');
            setIsLoading(false);
            return;
          }
          setProfile(prof);

          const revs = await dbService.fetchReviews(targetId);
          setReviews(revs);

          const tb = await dbService.fetchTrustScore(targetId);
          setTrustBreakdown(tb);

          const lecs = await dbService.fetchLectures({ instituteId: targetId });
          setLectures(lecs);

          const bts = await dbService.fetchBatches(targetId);
          setBatches(bts);
        } else if (targetType === 'playlist') {
          const pl = await dbService.fetchPlaylistById(targetId);
          if (!pl) {
            setErrorMsg('Curated learning playlist channel not found.');
            setIsLoading(false);
            return;
          }
          setProfile({
            id: pl.id,
            name: pl.title,
            description: pl.description || 'Curated series of core academic lectures',
            isVerified: true,
            officialLinks: [],
            rating: 4.5,
            reviewCount: 0
          });

          const allLecs = await dbService.fetchLectures();
          const plLecs = allLecs.filter(l => l.playlistId === targetId);
          setLectures(plLecs);
        } else if (targetType === 'batch') {
          const b = await dbService.fetchBatchById(targetId);
          if (!b) {
            setErrorMsg('Batch cohort program details not found.');
            setIsLoading(false);
            return;
          }
          setProfile({
            id: b.id,
            name: b.name,
            description: b.description || 'Comprehensive class batch curated with study guides.',
            isVerified: b.verified !== false,
            officialLinks: [],
            rating: 4.8,
            reviewCount: 0
          });

          setBatches([b]);
        }
        setIsLoading(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed loading targeted resource details.';
        console.error(err);
        setErrorMsg(message);
        setIsLoading(false);
      }
    });

  }, [isOpen, targetId, targetType]);

  if (!isOpen) return null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewError('');
    setReviewSuccess('');

    if (isGuest || !user) {
      setReviewError('Guest profiles cannot submit content. Sign in to post.');
      return;
    }

    if (!comment.trim()) {
      setReviewError('Please write review commentary first.');
      return;
    }

    try {
      await submitReview({
        targetId,
        targetType: targetType as 'teacher' | 'institute',
        rating,
        comment,
        trustImpact: user.role === 'teacher' || user.role === 'admin' ? 3 : 1,
        isVerifiedStudent: true
      });

      setReviewSuccess('Review cataloged and trust metrics re-aggregated successfully!');
      setComment('');
      
      // Refresh reviews and trustscore
      const dbService = await import('../services/dbService');
      
      // Trigger trust score recalibration
      try {
        await dbService.recalibrateTrustScore(targetId, targetType as 'teacher' | 'institute');
      } catch (calErr) {
        console.warn("Client-side direct recalibration skipped, trigger will handle it:", calErr);
      }
      
      const revs = await dbService.fetchReviews(targetId);
      setReviews(revs);
      const tb = await dbService.fetchTrustScore(targetId);
      setTrustBreakdown(tb);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database permissions aborted.';
      setReviewError(message);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReportSuccess('');
    setReportError('');
    if (isGuest || !user) {
      setReportError("Authenticated credentials required to flag reports. Guest mode is read-only.");
      return;
    }

    try {
      await submitReport({
        targetId,
        targetType: targetType === 'teacher' ? 'teacher' : 'institute',
        reason: reportReason,
        details: reportDetails
      });
      setReportSuccess('Report successfully lodged in the moderation queue.');
      setReportDetails('');
      setTimeout(() => setShowReportForm(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const dynamicRatingCount = reviews.length;
  const dynamicAverageRating = dynamicRatingCount > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / dynamicRatingCount).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-hidden animate-fade-in text-left">
      {targetType === 'institute' ? (
        <div className="w-full max-w-6xl h-[90vh] bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl overflow-y-auto custom-scrollbar relative">
          <ChannelProfile 
            targetId={targetId} 
            onClose={onClose} 
            onSelectLecture={onSelectLecture} 
          />
        </div>
      ) : (
        <div className="w-full max-w-5xl h-[85vh] bg-brand-dark border border-brand-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          
          {/* Modal Top Header container */}
          <div className="p-4 border-b border-brand-border bg-brand-black flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider bg-white/10 text-brand-accent px-2 py-0.5 rounded font-mono">
                {targetType} Verification Detail
              </span>
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <button
              onClick={onClose}
              className="p-1 text-brand-gray hover:text-brand-accent transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Primary split scroll layout */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono text-zinc-400">LOADING METRICS & CREDENTIALS...</p>
              </div>
            ) : errorMsg ? (
              <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
                <AlertOctagon className="w-10 h-10 text-rose-500" />
                <h4 className="text-sm font-semibold text-rose-400">Query Verification Failed</h4>
                <p className="text-xs font-mono text-zinc-400 max-w-md">{errorMsg}</p>
              </div>
            ) : targetType === 'playlist' ? (
              <div className="space-y-6">
                <div className="border-b border-brand-border pb-6">
                  <h2 className="text-xl md:text-2xl font-display font-medium text-brand-accent">{profile?.name}</h2>
                  <p className="text-xs text-brand-gray mt-2 max-w-3xl">{(profile as any)?.description}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-350 px-2 py-0.5 rounded">
                      Curated learning sequence
                    </span>
                    <span className="text-xs font-mono text-zinc-400">Verified: {profile?.isVerified ? 'Yes' : 'Pending Review'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-bold text-brand-accent uppercase tracking-wider pb-1 border-b border-brand-border">
                    Course Chapter Lectures ({lectures.length})
                  </h3>

                  {lectures.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-10 text-center font-mono bg-[#111111] rounded-2xl">
                      No validated chapters registered in this curriculum yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {lectures.map((lec) => (
                        <div
                          key={lec.id}
                          onClick={() => {
                            onSelectLecture(lec);
                            onClose();
                          }}
                          className="p-3 bg-[#0A0A0A] border border-[#1F1F1F] rounded-xl flex items-center gap-4 hover:border-zinc-500 cursor-pointer transition-colors"
                        >
                          <img src={getLectureThumbnail(lec)} alt={lec.title} className="aspect-video w-24 object-cover rounded border border-[#111]" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-white line-clamp-1 truncate uppercase">{lec.title}</h4>
                            <p className="text-[10px] font-mono text-brand-gray mt-1">Teacher: {lec.teacherName}</p>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-[8px] font-mono bg-zinc-800 text-zinc-350 px-1.5 py-0.5 rounded-full uppercase">
                                {lec.duration}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : targetType === 'batch' ? (
              <div className="space-y-6 max-w-3xl mx-auto">
                {batches.map((b) => (
                  <div key={b.id} className="p-6 bg-[#0A0A0A] border border-[#1F1F1F] rounded-2xl space-y-4 text-left">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span className="text-[9px] font-mono uppercase bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full">
                          {b.examType} BATCH COHORT
                        </span>
                        <h2 className="text-xl font-display font-medium text-brand-accent mt-2">{b.name}</h2>
                      </div>
                      {b.price && (
                        <div className="text-right">
                          <span className="text-xs text-zinc-500 line-through block">₹{b.price * 1.2}</span>
                          <span className="text-xl font-bold font-mono text-white">₹{b.price}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-brand-gray leading-relaxed">{b.description || 'Comprehensive learning path including lectures, mock papers and structured mentorship.'}</p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-4 border-t border-b border-brand-border/45 font-mono text-xs">
                      <div>
                        <span className="text-zinc-500 block">SUBJECT EXPERTISE</span>
                        <span className="text-white font-medium">{b.subject}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">LAUNCH DATE</span>
                        <span className="text-white font-medium">{b.startDate}</span>
                      </div>
                      {b.couponCode && (
                        <div>
                          <span className="text-zinc-500 block">COUPON CODE</span>
                          <span className="text-emerald-400 font-bold tracking-wider">{b.couponCode}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 flex justify-end">
                      <a
                        href={b.link || '#'}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="bg-white hover:bg-zinc-200 text-black text-xs font-bold py-2.5 px-6 rounded-lg transition-all cursor-pointer whitespace-nowrap uppercase tracking-wider"
                      >
                        Enroll in Cohort
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {targetType !== 'teacher' ? (
                  <>
                    {/* Section 1: Educator details row */}
                    {profile && (
                      <div className="flex flex-col md:flex-row items-center md:items-start gap-6 border-b border-brand-border/60 pb-6">
                        <img
                          src={targetType === 'teacher' ? (profile as TeacherProfile).avatar : (profile as InstituteProfile).logo}
                          alt={profile.name}
                          className="w-24 h-24 rounded-xl object-cover border border-brand-border"
                        />
                        <div className="flex-1 text-center md:text-left space-y-2">
                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                            <h2 className="text-xl md:text-2xl font-display font-medium text-brand-accent">
                              {profile.name}
                            </h2>
                            {profile.isVerified && (
                              <span className="flex items-center gap-0.5 text-[9px] font-mono bg-white text-black px-1.5 py-0.5 rounded uppercase font-bold">
                                Verified Channel
                              </span>
                            )}
                          </div>
                          
                          <p className="text-xs text-brand-gray max-w-2xl">
                            {targetType === 'teacher' ? (profile as TeacherProfile).bio : (profile as InstituteProfile).description}
                          </p>

                          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
                            {profile.officialLinks?.map((url: string, i: number) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                className="text-[11px] text-brand-accent hover:underline flex items-center gap-1 font-mono"
                              >
                                <ExternalLink className="w-3.5 h-3.5" /> Official Link
                              </a>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic metrics block */}
                        <div className="bg-brand-black border border-brand-border rounded-xl p-4 min-w-[200px] text-center md:text-right space-y-1">
                          <span className="block text-[10px] font-mono text-brand-gray uppercase">Aggregate Score</span>
                          {dynamicAverageRating ? (
                            <span className="text-3xl font-display font-bold text-[#FFEFD5]">{dynamicAverageRating}★</span>
                          ) : (
                            <span className="text-sm font-mono font-medium text-[#FFEFD5] block uppercase tracking-wide">No ratings yet</span>
                          )}
                          <span className="block text-[10px] font-mono text-brand-gray uppercase mt-1">Review Volume</span>
                          <span className="text-sm font-mono font-medium text-brand-accent">{dynamicRatingCount} Student reviews</span>
                        </div>
                      </div>
                    )}

                    {/* Section 2: Trust Breakdown Indicators */}
                    {profile?.isVerified ? (
                      <div className="bg-brand-black border border-brand-border rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-2 justify-between">
                          <h3 className="text-xs font-mono font-bold text-brand-accent uppercase tracking-wider flex items-center gap-1">
                            <Award className="w-4 h-4" /> Explainable Trust Indicators 
                            {(!trustBreakdown || trustBreakdown.totalScore === null || trustBreakdown.totalScore === undefined || trustBreakdown.partial) ? (
                              <span className="text-indigo-400 font-mono ml-1 font-semibold">(Not enough data yet)</span>
                            ) : (
                              <span className="text-brand-accent font-mono ml-1">({trustBreakdown.totalScore}/100)</span>
                            )}
                          </h3>
                          {trustBreakdown && (
                            <span className="text-[10px] bg-neutral-800 text-brand-gray px-2 py-0.5 rounded font-mono">
                              Synced: {new Date(trustBreakdown.updatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {(!trustBreakdown || trustBreakdown.partial) && (
                          <p className="text-[10px] text-zinc-400 font-mono italic leading-relaxed bg-[#1A1A22]/40 border border-brand-border/45 p-3 rounded-lg text-left">
                            ⚠️ This educator has some partial or missing input signals (such as client watch metrics or reviews). Missing indicators contribute exactly 0, and the score is marked partial. "Not enough data yet" is shown instead of a manufactured standard rating.
                          </p>
                        )}

                        {trustBreakdown && (
                          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-brand-gray mb-1">
                                <span>Profile (3% max)</span>
                                <span className="text-white">{trustBreakdown.profileCompleteness}/3</span>
                              </div>
                              <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-450 h-full" style={{ width: `${(trustBreakdown.profileCompleteness / 3) * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-brand-gray mb-1">
                                <span>Verified Link (2% max)</span>
                                <span className="text-white">{trustBreakdown.officialLinksScore}/2</span>
                              </div>
                              <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-450 h-full" style={{ width: `${(trustBreakdown.officialLinksScore / 2) * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-brand-gray mb-1">
                                <span>Reviews (40% max)</span>
                                <span className="text-white">{trustBreakdown.reviewReliability}/40</span>
                              </div>
                              <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-450 h-full" style={{ width: `${(trustBreakdown.reviewReliability / 40) * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-brand-gray mb-1">
                                <span>Consistency (1% max)</span>
                                <span className="text-white">{trustBreakdown.contentConsistency}/1</span>
                              </div>
                              <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-450 h-full" style={{ width: `${(trustBreakdown.contentConsistency / 1) * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-brand-gray mb-1">
                                <span>Engagement (40% max)</span>
                                <span className="text-white">{trustBreakdown.communityEngagement || 0}/40</span>
                              </div>
                              <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-450 h-full" style={{ width: `${(((trustBreakdown.communityEngagement || 0) / 40) * 100)}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-[10px] font-mono text-brand-gray mb-1">
                                <span>Completion (14% max)</span>
                                <span className="text-white">{trustBreakdown.verifiedCredentials || 0}/14</span>
                              </div>
                              <div className="h-1 bg-brand-border rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-600 to-indigo-450 h-full" style={{ width: `${(((trustBreakdown.verifiedCredentials || 0) / 14) * 100)}%` }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-brand-black border border-brand-border/40 rounded-xl p-5 text-left">
                        <h3 className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-zinc-600" /> Explainable Trust Indicators disabled
                        </h3>
                        <p className="text-xs text-zinc-500 font-mono mt-2">
                          Unverified profiles do not qualify for trust rating indices. Once this instructor profile is systematically verified, the server will calibrate the multi-dimensional trust score signals.
                        </p>
                      </div>
                    )}

                    {/* Section 3: Related Content Lists */}
                    <div className="space-y-4">
                      <h3 className="text-xs font-mono font-bold text-brand-accent uppercase tracking-wider pb-1 border-b border-brand-border">
                        Academic Discovery Material
                      </h3>
                      
                      {lectures.length > 0 && (
                        <div>
                          <h4 className="text-xs text-brand-gray font-mono mb-2 uppercase tracking-wide">Streamable Lectures ({lectures.length})</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {lectures.map(lec => (
                              <div
                                key={lec.id}
                                onClick={() => { onSelectLecture(lec); onClose(); }}
                                className="p-3 bg-brand-black border border-brand-border rounded-lg flex items-center gap-3 hover:border-neutral-500 cursor-pointer transition-colors"
                              >
                                <img src={getLectureThumbnail(lec)} alt={lec.title} className="w-16 h-10 object-cover rounded border border-brand-border" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-brand-accent font-medium leading-tight truncate">{lec.title}</p>
                                  <span className="text-[10px] font-mono text-brand-gray uppercase mt-0.5 block">{lec.duration}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {playlists.length > 0 && (
                        <div className="pt-3">
                          <h4 className="text-xs text-brand-gray font-mono mb-2 uppercase tracking-wide">Structured Curriculums</h4>
                          <div className="flex flex-wrap gap-3">
                            {playlists.map(p => (
                              <div key={p.id} className="p-3 bg-brand-black border border-brand-border rounded-lg text-left w-52">
                                <p className="text-xs text-brand-accent font-medium truncate leading-tight">{p.title}</p>
                                <span className="text-[10px] font-mono text-brand-gray uppercase mt-1 block">{p.lecturesCount} Video chapters</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {batches.length > 0 && (
                        <div className="pt-3">
                          <h4 className="text-xs text-brand-gray font-mono mb-2 uppercase tracking-wide">Active Batches</h4>
                          <div className="flex flex-wrap gap-3">
                            {batches.map(b => (
                              <div key={b.id} className="p-3 bg-brand-black border border-brand-border rounded-lg text-left w-60">
                                <p className="text-xs text-brand-accent font-medium truncate leading-tight">{b.name}</p>
                                <span className="text-[10px] font-mono text-brand-gray uppercase mt-1 block">Starts: {b.startDate}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Teacher DM Mode: Clean Message Header and direct display */
                  <div className="border-b border-brand-border/60 pb-4 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {profile && (
                        <img
                          src={(profile as TeacherProfile).avatar}
                          alt={profile.name}
                          className="w-12 h-12 rounded-xl object-cover border border-brand-border"
                        />
                      )}
                      <div>
                        <h2 className="text-base font-bold text-white">
                          Message {profile?.name || 'Educator'}
                        </h2>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          Send feedback, ask questions or leave a rating.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 4: Reviews & Opinions List */}
                <div className="space-y-4">
                  <h3 className="text-xs font-mono font-bold text-brand-accent uppercase tracking-wider pb-1 border-b border-brand-border">
                    Verified Student Commentary ({reviews.length})
                  </h3>

                  {reviews.length === 0 ? (
                    <p className="text-xs text-brand-gray text-center py-6 bg-brand-black rounded-lg border border-brand-border">
                      No reports submitted yet by students. If you took classes with this educator, leave feedback below!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map((r) => (
                        <div key={r.id} className="p-4 bg-brand-black border border-brand-border rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-brand-gray" />
                              <span className="text-xs font-medium text-brand-accent font-sans">{r.userDisplayName}</span>
                              {r.isVerifiedStudent && (
                                <span className="text-[8px] font-mono uppercase bg-neutral-800 text-[#A9C0E0] px-1 py-0.2 rounded font-bold">
                                  Verified Candidate
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 text-[#FFEFD5] font-mono text-xs font-bold bg-brand-dark px-2 py-0.5 rounded">
                              {r.rating}★
                            </div>
                          </div>
                          <p className="text-xs text-brand-gray font-sans italic">"{r.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 5: Leave Feedback + Report abusive triggers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-brand-border">
                  {/* Review form */}
                  <div className="bg-brand-black border border-brand-border rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-mono font-bold text-brand-accent uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-4.5 h-4.5 text-white/80" /> Log Class Feedback
                    </h3>

                    {reviewSuccess && (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-lg font-mono">
                        {reviewSuccess}
                      </div>
                    )}

                    {reviewError && (
                      <div className="p-3 bg-red-950/40 border border-red-900/50 text-red-200 text-xs rounded-lg font-mono">
                        {reviewError}
                      </div>
                    )}

                    <form onSubmit={handleReviewSubmit} className="space-y-3">
                      <div>
                        <label className="block text-xs font-mono text-brand-gray mb-1 bg-transparent">Rating Indicator</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setRating(index)}
                              className={`text-sm font-mono py-1 px-3.5 rounded-lg border transition-all cursor-pointer ${
                                rating >= index ? 'border-white bg-white text-black font-semibold' : 'border-brand-border bg-brand-black text-brand-gray'
                              }`}
                            >
                              {index}★
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-mono text-brand-gray mb-1 uppercase tracking-wider">Commentary Details</label>
                        <textarea
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Describe class pedagogy, syllabus coverage, lecture quality..."
                          rows={3}
                          maxLength={100}
                          className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-lg p-3 text-xs text-brand-accent outline-none font-sans"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-brand-accent hover:bg-neutral-200 text-brand-black transition-colors font-medium text-xs font-sans py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" /> Submit Evaluation
                      </button>
                    </form>
                  </div>

                  {/* Abusive spam reporting console */}
                  <div className="bg-brand-black border border-brand-border rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-mono font-bold text-brand-accent uppercase tracking-wider flex items-center gap-1.5 text-red-400">
                      <AlertOctagon className="w-4.5 h-4.5 text-red-400" /> Moderation Reporting
                    </h3>

                    {reportError && (
                      <div className="p-3 bg-red-950/40 border border-red-905/50 text-red-200 text-xs rounded-lg font-mono">
                        {reportError}
                      </div>
                    )}

                    {reportSuccess ? (
                      <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 text-emerald-200 text-xs rounded-lg font-mono">
                        {reportSuccess}
                      </div>
                    ) : !showReportForm ? (
                      <div className="space-y-3">
                        <p className="text-xs text-brand-gray">
                          If this channel broadcasts copied, unverified or inaccurate material, flag it for moderator analysis.
                        </p>
                        <button
                          onClick={() => setShowReportForm(true)}
                          className="w-full bg-transparent hover:bg-red-950/20 text-red-400 border border-red-900/50 hover:border-red-900 font-medium text-xs py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          Flag Profile Abuse
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleReportSubmit} className="space-y-3 font-sans">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-mono text-brand-gray mb-1 uppercase tracking-wide">Reason</label>
                            <select
                              value={reportReason}
                              onChange={(e) => setReportReason(e.target.value)}
                              className="w-full bg-brand-dark border border-brand-border rounded-lg py-1.5 px-2 text-xs text-brand-accent outline-none"
                            >
                              <option value="unverified">Inaccurate/Unverified Details</option>
                              <option value="spam">Aggressive Advertising/Spam</option>
                              <option value="copy">Copyright Infringement</option>
                              <option value="abuse">Inappropriate Pedagogy</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-mono text-brand-gray mb-1 uppercase tracking-wide">Evidence details</label>
                          <textarea
                            value={reportDetails}
                            required
                            onChange={(e) => setReportDetails(e.target.value)}
                            placeholder="Indicate playlist names, timestamps, or reasons..."
                            rows={2}
                            className="w-full bg-brand-dark border border-brand-border focus:border-brand-accent rounded-lg p-2.5 text-xs text-brand-accent outline-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium text-xs py-1.5 rounded-lg cursor-pointer"
                          >
                            Lodge Complaint
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowReportForm(false)}
                            className="bg-brand-dark hover:bg-neutral-800 text-brand-gray border border-brand-border font-medium text-xs py-1.5 px-3 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
