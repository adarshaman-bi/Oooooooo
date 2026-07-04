import { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { logAdminAction } from '../../services/adminService';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ThumbsUp,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  Award,
  Eye,
  Activity
} from 'lucide-react';

interface MetricRating {
  metricName: string;
  score: number;
}

export interface ReviewExtended {
  id: string;
  studentId: string;
  targetType: 'TEACHER' | 'INSTITUTE' | 'BATCH' | 'TEST_SERIES';
  targetId: string;
  text: string;
  characterCount: number;
  categoryRatings: MetricRating[];
  overallCalculatedScore: number;
  isAnonymous: boolean;
  verifiedStudentBadge: boolean;
  proofDocumentPath: string | null;
  uploadedScreenshots: string[];
  upvoteCount: number;
  reportedFlagsCount: number;
  moderationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminReply: {
    responderId: string;
    text: string;
    updatedAt: string;
  } | null;
  authenticityScore: number;
}

export default function ReviewModerator() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<ReviewExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReview, setSelectedReview] = useState<ReviewExtended | null>(null);
  const [replyText, setReplyText] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllReviews();
  }, []);

  const loadAllReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('reviews').select('*');
      if (error) throw error;

      const list: ReviewExtended[] = (data || []).map((d: any) => {
        const textStr = d.comment || d.text || '';
        const feat = d.features || {};
        return {
          id: d.id,
          studentId: d.user_id || feat.studentId || 'anonymous_student',
          targetType: feat.targetType ? feat.targetType.toUpperCase() : 'TEACHER',
          targetId: d.entity_id || feat.targetId || 'unknown_target',
          text: textStr,
          characterCount: textStr.length,
          categoryRatings: feat.categoryRatings || [
            { metricName: 'Clarity', score: Number(d.rating) || 4 },
            { metricName: 'Punctuality', score: Number(d.rating) || 5 }
          ],
          overallCalculatedScore: feat.overallCalculatedScore || Number(d.rating) || 4.5,
          isAnonymous: feat.isAnonymous || false,
          verifiedStudentBadge: feat.verifiedStudentBadge !== undefined ? feat.verifiedStudentBadge : (feat.isVerifiedStudent || false),
          proofDocumentPath: feat.proofDocumentPath || null,
          uploadedScreenshots: feat.uploadedScreenshots || [],
          upvoteCount: feat.upvoteCount || feat.trustImpact || 0,
          reportedFlagsCount: feat.reportedFlagsCount || (d.is_flagged ? 1 : 0),
          moderationStatus: feat.moderationStatus || 'PENDING',
          adminReply: feat.adminReply || null,
          authenticityScore: feat.authenticityScore || 85
        };
      });

      // Recalculate authenticityScore for duplicate evaluation
      const withAuthenticity = list.map(rev => {
        return {
          ...rev,
          authenticityScore: calculateAuthenticityScore(rev, list)
        };
      });

      setReviews(withAuthenticity);
    } catch (err) {
      console.error('Failed to load system review catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Anti-fraud automated rules checker
  const calculateAuthenticityScore = (review: ReviewExtended, all: ReviewExtended[]): number => {
    let score = 100;

    // RULE 1: Minimum text length constraints (minimum 30 chars penalty)
    if (!review.text || review.text.trim().length < 30) {
      score -= 35; // Fail to expand explanation gets major penalty
    } else if (review.text.length > 120) {
      score += 10; // Extra verbose detailed context is reliable
    }

    // RULE 2: Screenshot proof availability tracking
    if (!review.uploadedScreenshots || review.uploadedScreenshots.length === 0) {
      score -= 20; // Default penalization for lack of screenshots or documents
    } else {
      score += 10;
    }

    // RULE 3: Duplicate transactions patterns matching (exact strings matching other catalog records)
    if (review.text) {
      const matchPattern = review.text.trim().toLowerCase();
      const duplicatesCount = all.filter(
        r => r.id !== review.id && r.text && r.text.trim().toLowerCase() === matchPattern
      ).length;

      if (duplicatesCount > 0) {
        score -= 55; // High confidence duplicate spam transaction!
      }
    }

    return Math.max(0, Math.min(100, score));
  };

  const handleUpdateStatus = async (reviewId: string, status: 'APPROVED' | 'REJECTED') => {
    setUpdating(true);
    setMessage(null);
    try {
      const reviewObj = reviews.find(r => r.id === reviewId);
      if (!reviewObj) return;

      const updated = { ...reviewObj, moderationStatus: status };

      const { error } = await supabase.from('reviews').update({
        is_flagged: status === 'REJECTED',
        features: {
          studentId: reviewObj.studentId,
          targetType: reviewObj.targetType,
          targetId: reviewObj.targetId,
          categoryRatings: reviewObj.categoryRatings,
          overallCalculatedScore: reviewObj.overallCalculatedScore,
          isAnonymous: reviewObj.isAnonymous,
          verifiedStudentBadge: reviewObj.verifiedStudentBadge,
          proofDocumentPath: reviewObj.proofDocumentPath,
          uploadedScreenshots: reviewObj.uploadedScreenshots,
          upvoteCount: reviewObj.upvoteCount,
          reportedFlagsCount: status === 'REJECTED' ? 1 : reviewObj.reportedFlagsCount,
          moderationStatus: status,
          adminReply: reviewObj.adminReply,
          authenticityScore: reviewObj.authenticityScore
        }
      }).eq('id', reviewId);

      if (error) throw error;

      // Build security logging for verified status set
      await logAdminAction(
        user?.uid || 'anonymous_moderator',
        'VERIFY_SET',
        'TEACHERS', // target collection context fallback
        reviewId,
        reviewObj,
        updated
      );

      // update states
      setReviews(prev => prev.map(r => r.id === reviewId ? updated : r));
      setSelectedReview(updated);
      setMessage(`Review status overridden to [${status}] and logged securely.`);
    } catch (err: any) {
      console.error(err);
      setMessage('Error updating moderation status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddReply = async () => {
    if (!selectedReview || !replyText.trim()) return;
    setUpdating(true);
    setMessage(null);
    try {
      const replyObj = {
        responderId: user?.email || 'admin_eval',
        text: replyText,
        updatedAt: new Date().toISOString()
      };

      const updated = { ...selectedReview, adminReply: replyObj };

      const { error } = await supabase.from('reviews').update({
        features: {
          studentId: selectedReview.studentId,
          targetType: selectedReview.targetType,
          targetId: selectedReview.targetId,
          categoryRatings: selectedReview.categoryRatings,
          overallCalculatedScore: selectedReview.overallCalculatedScore,
          isAnonymous: selectedReview.isAnonymous,
          verifiedStudentBadge: selectedReview.verifiedStudentBadge,
          proofDocumentPath: selectedReview.proofDocumentPath,
          uploadedScreenshots: selectedReview.uploadedScreenshots,
          upvoteCount: selectedReview.upvoteCount,
          reportedFlagsCount: selectedReview.reportedFlagsCount,
          moderationStatus: selectedReview.moderationStatus,
          adminReply: replyObj,
          authenticityScore: selectedReview.authenticityScore
        }
      }).eq('id', selectedReview.id);

      if (error) throw error;

      // Log update action
      await logAdminAction(
        user?.uid || 'anonymous_moderator',
        'UPDATE',
        'TEACHERS',
        selectedReview.id,
        selectedReview,
        updated
      );

      setReviews(prev => prev.map(r => r.id === selectedReview.id ? updated : r));
      setSelectedReview(updated);
      setReplyText('');
      setMessage('Official administrator rebuttal posted successfully.');
    } catch (err: any) {
      console.error(err);
      setMessage('Posting response failed.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Delete this user comment and remove references entirely?')) return;
    try {
      const prevDoc = reviews.find(r => r.id === reviewId);
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
      if (error) throw error;

      await logAdminAction(
        user?.uid || 'anonymous_moderator',
        'DELETE',
        'TEACHERS',
        reviewId,
        prevDoc || null,
        null
      );

      setReviews(prev => prev.filter(r => r.id !== reviewId));
      if (selectedReview?.id === reviewId) setSelectedReview(null);
      setMessage('Review catalog record successfully purged.');
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = reviews.filter(r => {
    const sQuery = searchQuery.toLowerCase();
    const textMatch = r.text.toLowerCase().includes(sQuery) || r.id.toLowerCase().includes(sQuery);
    if (filterStatus === 'ALL') return textMatch;
    return r.moderationStatus === filterStatus && textMatch;
  });

  return (
    <div className="bg-[#0b0b0e] border border-zinc-900 rounded-3xl p-6 mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[700px] text-zinc-100 font-sans">
      
      {/* LEFT LIST COLUMN */}
      <div className="lg:col-span-5 border-r border-[#151520] pr-0 lg:pr-6 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold flex items-center gap-2 text-zinc-100">
            <ShieldAlert className="w-5 h-5 text-indigo-400" /> Review Moderation
          </h2>
          <button
            onClick={loadAllReviews}
            className="p-1 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] text-zinc-400 rounded-lg flex items-center gap-1 transition"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* Tab-styled quick filtration controls */}
        <div className="flex gap-1 bg-zinc-950 p-1 border border-zinc-900 rounded-xl text-center">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition ${
                filterStatus === status
                  ? 'bg-zinc-900 text-indigo-400 border border-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search keywords / student ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#121216] border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition text-zinc-300"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filtered.map(r => {
              const isSpam = r.authenticityScore < 60;
              return (
                <div
                  key={r.id}
                  onClick={() => { setSelectedReview(r); setMessage(null); }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                    selectedReview?.id === r.id
                      ? 'bg-zinc-900 border-indigo-500/50'
                      : 'bg-[#121216] border-zinc-900/90'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono tracking-wider text-zinc-500 font-semibold truncate max-w-[150px]">
                      {r.isAnonymous ? 'Anonymous Cadet' : `@${r.studentId}`}
                    </span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      r.moderationStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                      r.moderationStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {r.moderationStatus}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 font-medium line-clamp-2 mt-2 leading-relaxed">"{r.text}"</p>

                  <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-zinc-900">
                    <div className="flex gap-2 items-center">
                      <span className="text-[9px] text-[#8080ff] px-1.5 py-0.5 rounded bg-[#0e0e16] uppercase border border-indigo-500/10 font-bold">{r.targetType}</span>
                      <span className="text-[10px] text-zinc-500">ID: {r.targetId}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                        isSpam ? 'bg-rose-500/15 text-rose-450 border border-rose-550/25' : 'bg-emerald-500/10 text-emerald-400'
                      }`} title="Client-Side Authenticity automated calculation score">
                        <Award className="w-3 h-3" /> {r.authenticityScore}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-zinc-500 text-xs text-center py-10">No matching comments recorded.</p>
            )}
          </div>
        )}
      </div>

      {/* RIGHT AUDITING WORKFLOW & REPLY CONTAINER COLUMN */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        {selectedReview ? (
          <div className="space-y-4 animate-fade-in text-xs">
            
            {/* Header control banner */}
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <div>
                <span className="text-[9px] font-mono bg-black text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/15 inline-block">
                  CATALOG ID: {selectedReview.id}
                </span>
                <p className="text-sm font-bold text-zinc-100 mt-1">Review Audit Controls</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedReview.id, 'APPROVED')}
                  disabled={updating || selectedReview.moderationStatus === 'APPROVED'}
                  className="px-3.5 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 font-bold hover:text-white rounded-xl text-[11px] flex items-center gap-1.5 transition duration-200 disabled:opacity-30"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedReview.id, 'REJECTED')}
                  disabled={updating || selectedReview.moderationStatus === 'REJECTED'}
                  className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 font-bold hover:text-white rounded-xl text-[11px] flex items-center gap-1.5 transition duration-200 disabled:opacity-30"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject / Flag
                </button>
                <button
                  onClick={() => handleDeleteReview(selectedReview.id)}
                  className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-rose-450 rounded-xl text-[11px] border border-zinc-850 hover:border-rose-500/20 transition"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Quick status report box */}
            {message && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {/* Content Display cards */}
            <div className="bg-[#121216] border border-zinc-850 p-4 rounded-xl space-y-4">
              <div className="flex justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500">Student Account</span>
                  <p className="font-bold text-zinc-200 mt-0.5">
                    {selectedReview.isAnonymous ? 'Anonymous Cadet (Incognito)' : `@${selectedReview.studentId}`}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 text-right block">Verification Badge</span>
                  <span className={`text-[10px] font-semibold mt-0.5 inline-block ${selectedReview.verifiedStudentBadge ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {selectedReview.verifiedStudentBadge ? '● Verified Student' : '○ Self-Claimed Account'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 block mb-1">User Testimonial Text ({selectedReview.characterCount} ch)</label>
                <div className="bg-zinc-950 p-3.5 border border-zinc-900 rounded-xl text-zinc-200 leading-relaxed font-sans text-xs">
                  "{selectedReview.text}"
                </div>
              </div>

              {/* AUTOMATED COMPLIANCE & FRAUD RADAR SYSTEM (Section 2.4 specified) */}
              <div className="bg-[#0b0b0e] border border-zinc-900 p-4 rounded-xl space-y-3">
                <h4 className="font-bold text-rose-450 flex items-center gap-1.5 border-b border-zinc-900 pb-2">
                  <AlertTriangle className="w-4 h-4" /> Anti-Fraud Security Audit Matrix
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10.5px] text-zinc-400">
                      Calculated Trust Value:{' '}
                      <strong className={`font-mono ${selectedReview.authenticityScore < 60 ? 'text-rose-450' : 'text-emerald-400'}`}>
                        {selectedReview.authenticityScore}% Score
                      </strong>
                    </p>
                    <div className="w-full bg-[#1b1b22] h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${selectedReview.authenticityScore < 60 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${selectedReview.authenticityScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 bg-zinc-950 p-2.5 rounded border border-zinc-900 text-[10.5px] text-zinc-500">
                    <p className="flex justify-between items-center">
                      <span>Length &gt;= 30 characters:</span>
                      <span className={selectedReview.characterCount >= 30 ? 'text-emerald-400 font-semibold' : 'text-rose-450 font-semibold'}>
                        {selectedReview.characterCount >= 30 ? 'Pass' : 'Failed'}
                      </span>
                    </p>
                    <p className="flex justify-between items-center">
                      <span>Screenshot/Invoice Attached:</span>
                      <span className={selectedReview.uploadedScreenshots.length > 0 ? 'text-emerald-400 font-semibold' : 'text-zinc-600'}>
                        {selectedReview.uploadedScreenshots.length > 0 ? 'Verified' : 'None'}
                      </span>
                    </p>
                    <p className="flex justify-between items-center">
                      <span>Duplicate review check:</span>
                      <span className={reviews.filter(r => r.id !== selectedReview.id && r.text.trim().toLowerCase() === selectedReview.text.trim().toLowerCase()).length > 0 ? 'text-rose-450 font-bold' : 'text-emerald-400'}>
                        {reviews.filter(r => r.id !== selectedReview.id && r.text.trim().toLowerCase() === selectedReview.text.trim().toLowerCase()).length > 0 ? 'DUPLICATE RADAR FLAGGED' : 'Clear'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* RATING CATEGORY SUBMETRICS */}
              <div className="space-y-2.5">
                <label className="text-[10px] text-zinc-500 block">Relative Multi-Metric Category Scores</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedReview.categoryRatings.map((cat, i) => (
                    <div key={i} className="bg-zinc-950 border border-zinc-900 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] text-zinc-500 block truncate">{cat.metricName}</span>
                      <strong className="text-zinc-200 mt-0.5 text-xs font-mono font-bold">{cat.score} / 5.0</strong>
                    </div>
                  ))}
                  <div className="bg-zinc-950 border border-indigo-500/10 p-2.5 rounded-lg text-center">
                    <span className="text-[10px] text-indigo-400 block truncate font-bold">Overall Rating</span>
                    <strong className="text-indigo-300 mt-0.5 text-xs font-mono font-bold">{selectedReview.overallCalculatedScore} ★</strong>
                  </div>
                </div>
              </div>

              {/* PROOF DOCUMENTS CAROUSEL */}
              {selectedReview.uploadedScreenshots.length > 0 && (
                <div className="space-y-2 bg-zinc-950 p-3 rounded-xl border border-zinc-900">
                  <label className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-400" /> Uploaded Credential Invoices / Evidence screenshots
                  </label>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {selectedReview.uploadedScreenshots.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0 group relative aspect-video w-32 rounded border border-zinc-800 overflow-hidden bg-black">
                        <img src={url} alt="Credential Proof" className="w-full h-full object-cover" />
                        <span className="absolute inset-0 bg-black/60 hidden group-hover:flex items-center justify-center text-[10px] font-semibold text-white">
                          <Eye className="w-4.5 h-4.5" /> View
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* OFFICIAL REBUTTALS / DISCUSSION PANEL AND COMMENT REPLIES */}
              <div className="border-t border-zinc-900 pt-4 space-y-4">
                <h4 className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-indigo-400" /> Moderator Response Rebuttal Interface
                </h4>

                {selectedReview.adminReply ? (
                  <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl space-y-2 text-zinc-400 relative">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Responder: <strong className="text-indigo-400 font-mono font-bold">{selectedReview.adminReply.responderId}</strong></span>
                      <span>{new Date(selectedReview.adminReply.updatedAt).toLocaleString()}</span>
                    </div>
                    <p className="text-medium text-zinc-300">"{selectedReview.adminReply.text}"</p>
                    <button
                      onClick={async () => {
                        const updated = { ...selectedReview, adminReply: null };
                        await supabase.from('reviews').update({
                          features: {
                            studentId: selectedReview.studentId,
                            targetType: selectedReview.targetType,
                            targetId: selectedReview.targetId,
                            categoryRatings: selectedReview.categoryRatings,
                            overallCalculatedScore: selectedReview.overallCalculatedScore,
                            isAnonymous: selectedReview.isAnonymous,
                            verifiedStudentBadge: selectedReview.verifiedStudentBadge,
                            proofDocumentPath: selectedReview.proofDocumentPath,
                            uploadedScreenshots: selectedReview.uploadedScreenshots,
                            upvoteCount: selectedReview.upvoteCount,
                            reportedFlagsCount: selectedReview.reportedFlagsCount,
                            moderationStatus: selectedReview.moderationStatus,
                            adminReply: null,
                            authenticityScore: selectedReview.authenticityScore
                          }
                        }).eq('id', selectedReview.id);
                        setReviews(prev => prev.map(r => r.id === selectedReview.id ? updated : r));
                        setSelectedReview(updated);
                        setMessage('Official reply retracted.');
                      }}
                      className="absolute top-2 right-2 text-rose-455 hover:text-rose-400 hover:underline text-[9px]"
                    >
                      Retract Reply
                    </button>
                  </div>
                ) : (
                  <p className="text-zinc-600 text-xs italic">No official rebuttal published for this rating.</p>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type official rebuttal (e.g. 'We verified that this student attended the batch...')"
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-zinc-300 focus:outline-none"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button
                    onClick={handleAddReply}
                    disabled={updating || !replyText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white font-semibold flex items-center gap-1.5 transition disabled:opacity-30"
                  >
                    Post Rebuttal
                  </button>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl p-12 py-24 bg-black/20 text-center">
            <ShieldAlert className="w-12 h-12 text-zinc-700 mb-3" />
            <p className="text-zinc-400 font-semibold text-sm">Select Review For Moderation</p>
            <p className="text-zinc-650 text-xs mt-1 max-w-sm">
              Tap a user rating review from the filters sidebar on the left to verify credentials authenticity scores, evaluate duplicate spam patterns, or publish replies.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
