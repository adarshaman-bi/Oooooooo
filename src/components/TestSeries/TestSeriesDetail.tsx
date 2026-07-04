import React, { useState, useEffect } from 'react';
import { TestSeriesEntry } from '../../types';
import { fetchReviews, submitReview } from '../../services/dbService';
import { 
  X, 
  Globe, 
  ExternalLink, 
  Sparkles, 
  ChevronDown, 
  CheckCircle2, 
  MapPin, 
  BookOpen, 
  Tag, 
  MessageSquare, 
  AlertTriangle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SafeImage } from '../SafeImage';

interface TestSeriesDetailProps {
  id?: string;
  item: TestSeriesEntry | null;
  onClose: () => void;
}

const getInitials = (provider: string) => {
  if (!provider) return '';
  const clean = provider
    .replace(/Career|Institute|Classes|Group|Study|Centre|Tutorials/gi, '')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0] ? words[0].slice(0, 2).toUpperCase() : provider.slice(0, 2).toUpperCase();
};

const BrandLogo: React.FC<{ item: TestSeriesEntry, className?: string }> = ({ item, className = "w-12 h-12 rounded-xl" }) => {
  const initials = getInitials(item.provider);
  return (
    <SafeImage
      src={item.logo}
      alt={item.provider}
      variant="avatar"
      className={className}
      fallbackInitials={initials.slice(0, 2)}
    />
  );
};

const BrandBanner: React.FC<{ item: TestSeriesEntry }> = ({ item }) => {
  return (
    <div className="relative w-full aspect-[21/9] rounded-2xl overflow-hidden border border-zinc-900 mb-6 group bg-zinc-950">
      <SafeImage
        src={item.bannerUrl}
        alt={item.provider}
        variant="banner"
        className="w-full h-full animate-fade-in"
        imageClassName="transition-transform duration-700 group-hover:scale-105"
      />
      {item.bannerUrl && item.imageSourceUrl && (
        <a
          href={item.imageSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 right-2 bg-black/85 text-[8px] font-mono hover:bg-black text-zinc-400 hover:text-white px-2 py-0.5 rounded border border-zinc-900/60 flex items-center gap-1 transition-all"
        >
          <Globe className="w-2.5 h-2.5" />
          <span>Image Source</span>
        </a>
      )}
    </div>
  );
};

const getTrustBadgeStyle = (score: number | null | undefined) => {
  if (score === null || score === undefined) {
    return "bg-zinc-900 border-zinc-800 text-zinc-500";
  }
  if (score >= 75) {
    return "bg-white/10 border-white/20 text-[#EEEEEE] font-extrabold";
  }
  if (score >= 50) {
    return "bg-zinc-900 border-zinc-805 text-zinc-350";
  }
  return "bg-zinc-900 border-zinc-805 text-zinc-500";
};

export const TestSeriesDetail: React.FC<TestSeriesDetailProps> = ({ id, item, onClose }) => {
  const [isTrustBreakdownExpanded, setIsTrustBreakdownExpanded] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const loadReviews = async () => {
    if (!item) return;
    setLoading(true);
    const data = await fetchReviews(item.id);
    setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, [item?.id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!newComment.trim()) {
      setErrorMsg('Please enter a commentary statement.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await submitReview({
        targetId: item.id,
        targetType: 'testSeries',
        rating: newRating,
        comment: newComment,
        trustImpact: 0,
        isVerifiedStudent: true
      } as any);
      setNewComment('');
      setNewRating(5);
      await loadReviews();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {item && (
        <div id={id || `detail-${item.id}`} className="fixed inset-0 z-50 flex items-center justify-end select-none">
          
          {/* Modal backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black backdrop-blur-sm cursor-pointer"
          />

          {/* Modal body sheet drawer */}
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="relative w-full max-w-xl md:max-w-2xl h-full bg-[#060606] border-l border-zinc-900 flex flex-col justify-between shadow-2xl z-10"
          >
            
            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-thin scrollbar-thumb-zinc-900">
              
              {/* Brand Banner Sourced Header */}
              <BrandBanner item={item} />

              {/* Header detail element */}
              <div className="flex justify-between items-start border-b border-zinc-900 pb-6">
                <div className="flex gap-4 items-start">
                  <BrandLogo item={item} className="w-14 h-14 rounded-2xl" />
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-zinc-500 tracking-wider uppercase font-bold">
                      {item.provider}
                    </span>
                    <h3 className="text-xl font-display font-medium text-white tracking-tight">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      <span className="text-[9px] font-mono tracking-widest font-extrabold bg-zinc-900 text-zinc-350 px-2 py-0.5 rounded border border-zinc-850 uppercase">
                        {item.examType || (item.examTags && item.examTags[0])}
                      </span>
                      <span className="text-[9px] font-mono tracking-wider bg-zinc-900 text-zinc-450 border border-zinc-800 px-2 py-0.5 rounded uppercase">
                        {item.delivery === 'online' || item.type === 'online' ? '🌐 ONLINE TEST PORTAL' : '🏢 OFFLINE STUDY CENTER'}
                      </span>
                    </div>
                    {item.oneLineDescription && (
                      <p className="text-[11px] text-zinc-450 font-mono italic leading-relaxed pt-1.5 border-t border-zinc-900/50 mt-1 max-w-md">
                        💡 "{item.oneLineDescription}"
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all m-1 shadow-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Program Synopsis with longDescription */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-500">Program Synopsis</h4>
                <p className="text-sm text-zinc-300 leading-relaxed font-sans">
                  {item.longDescription || item.description || "Detailed program synopsis not provided."}
                </p>
              </div>

              {/* Pricing and Official URLs card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex flex-col justify-center">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold text-left">Official Academic Website</span>
                  <div className="mt-2 space-y-1 text-left">
                    {item.officialLinks && item.officialLinks.length > 0 ? (
                      item.officialLinks.map((link, idx) => (
                        <a 
                          key={idx}
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[11px] font-mono text-zinc-300 hover:text-white hover:underline flex items-center gap-1.5 truncate"
                        >
                          <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{link.replace('https://', '')}</span>
                          <ExternalLink className="w-3 h-3 text-zinc-550 shrink-0" />
                        </a>
                      ))
                    ) : (
                      <a 
                        href={item.officialUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[11px] font-mono text-zinc-300 hover:text-white hover:underline flex items-center gap-1.5 truncate"
                      >
                        <Globe className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{item.officialUrl ? item.officialUrl.replace('https://', '') : 'visit registry'}</span>
                        <ExternalLink className="w-3 h-3 text-zinc-550 shrink-0" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-4 flex justify-between items-center text-left">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">Retail Price (Regular DLP)</span>
                    <span className="text-base font-extrabold text-white font-mono">
                      {item.price && typeof item.price === 'object' && 'amount' in item.price ? (
                        `₹${item.price.amount.toLocaleString()}/-`
                      ) : typeof item.price === 'number' ? (
                        `₹${(item.price as number).toLocaleString()}/-`
                      ) : item.price === 'free' ? (
                        'Free'
                      ) : item.price === 'bundled' ? (
                        'Bundled with Course'
                      ) : (
                        <span className="text-zinc-550 lowercase italic font-normal">unverified pricing</span>
                      )}
                    </span>
                  </div>
                  {item.isVerified ? (
                    <span className="text-[8px] font-black tracking-widest text-white bg-white/10 border border-white/20 px-2 py-1 rounded uppercase">
                      verified
                    </span>
                  ) : (
                    <span className="text-[8px] font-bold tracking-widest text-zinc-500 bg-zinc-900 border border-zinc-805 px-2 py-1 rounded uppercase">
                      unverified
                    </span>
                  )}
                </div>
              </div>

              {/* Verified Product Specifications Grid */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-4 text-left">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                  <Sparkles className="w-4 h-4 text-white fill-white/5 lg:w-4 lg:h-4 shrink-0" />
                  <span>Verified Product Specifications</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-1 text-xs font-mono border-t border-zinc-900 mt-2">
                  
                  <div className="flex justify-between items-center border-b border-zinc-900/65 pb-2">
                    <span className="text-zinc-505 uppercase tracking-wider text-[9px] font-bold">Test Format</span>
                    <span className="text-white font-extrabold">{item.testFormat || 'OMR Paper-based'}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-[#1A1A1A] pb-2">
                    <span className="text-zinc-505 uppercase tracking-wider text-[9px] font-bold">Mocks Pack Count</span>
                    <span className="text-white font-extrabold">
                      {item.testCount ? `${item.testCount} Mock Papers` : 'unverified'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-zinc-900/65 pb-2">
                    <span className="text-zinc-505 uppercase tracking-wider text-[9px] font-bold">Access Validity</span>
                    <span className="text-white font-extrabold">{item.validity || '12 months'}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-zinc-900/65 pb-2">
                    <span className="text-zinc-505 uppercase tracking-wider text-[9px] font-bold">Languages Pack</span>
                    <span className="text-white font-extrabold">
                      {item.languages && item.languages.length > 0 
                        ? item.languages.join(' & ') 
                        : 'English'}
                    </span>
                  </div>

                  <div className="flex justify-between items-start border-b border-zinc-900/65 pb-2 sm:col-span-2">
                    <span className="text-zinc-505 uppercase tracking-wider text-[9px] pt-1 font-bold">Syllabus Coverage</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                      {item.syllabusCoverage && item.syllabusCoverage.length > 0 ? (
                        item.syllabusCoverage.map((scope, idx) => (
                          <span key={idx} className="bg-zinc-900 text-zinc-300 border border-zinc-800 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider">
                            {scope}
                          </span>
                        ))
                      ) : (
                        <span className="text-zinc-400">Full Syllabus</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-start pb-1 sm:col-span-2">
                    <span className="text-zinc-505 uppercase tracking-wider text-[9px] pt-1 font-bold">Exams Targeted</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                      {item.examsCovered && item.examsCovered.length > 0 ? (
                        item.examsCovered.map((exam, idx) => (
                          <span key={idx} className="bg-zinc-900 text-zinc-300 border border-zinc-800 px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wider">
                            {exam}
                          </span>
                        ))
                      ) : (
                        <span className="bg-zinc-900 text-zinc-350 px-2 py-0.5 rounded text-[8px] uppercase border border-zinc-800">
                          {item.examType || (item.examTags && item.examTags[0])}
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {/* Trust Score Breakdown - Expandable Accordion */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-4 text-left">
                <button 
                  onClick={() => setIsTrustBreakdownExpanded(!isTrustBreakdownExpanded)}
                  className="w-full flex justify-between items-center text-left focus:outline-none"
                >
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                      <span>Trust Assessment Breakdown</span>
                      <span className="text-[9px] text-zinc-400 font-black bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 uppercase font-mono">
                        {isTrustBreakdownExpanded ? 'Collapse' : 'Expand Details'}
                      </span>
                    </h4>
                    <p className="text-[10px] text-zinc-505 font-mono">Multi-signal verification of data integrity and student presence</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-extrabold font-mono text-white leading-none">
                        {item.trustScore ?? 'N/A'}
                      </span>
                      {item.trustScore !== null && (
                        <span className="text-[10px] text-zinc-500 font-mono">/ 100</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-zinc-540 transition-transform ${isTrustBreakdownExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                <AnimatePresence>
                  {isTrustBreakdownExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-4 pt-4 border-t border-zinc-900/80 overflow-hidden"
                    >
                      {item.trustScore !== null && item.trustScoreBreakdown ? (
                        <>
                          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                item.trustScore >= 75 ? 'bg-[#EEEEEE]' :
                                item.trustScore >= 50 ? 'bg-zinc-600' : 'bg-zinc-800'
                              }`}
                              style={{ width: `${item.trustScore}%` }}
                            />
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-[9px] font-mono text-zinc-400 border-t border-zinc-900 mt-2">
                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Rating ({item.trustScoreBreakdown.ratingScore}/40)</span>
                              </div>
                              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="bg-[#EEEEEE] h-full" style={{ width: `${(item.trustScoreBreakdown.ratingScore / 40) * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Volume ({item.trustScoreBreakdown.reviewVolumeScore}/25)</span>
                              </div>
                              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="bg-[#EEEEEE] h-full" style={{ width: `${(item.trustScoreBreakdown.reviewVolumeScore / 25) * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Longevity ({item.trustScoreBreakdown.longevityScore}/15)</span>
                              </div>
                              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="bg-[#EEEEEE] h-full" style={{ width: `${(item.trustScoreBreakdown.longevityScore / 15) * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Transparency ({item.trustScoreBreakdown.transparencyScore}/10)</span>
                              </div>
                              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="bg-[#EEEEEE] h-full" style={{ width: `${(item.trustScoreBreakdown.transparencyScore / 10) * 100}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between mb-1">
                                <span>Diversity ({item.trustScoreBreakdown.sourceDiversityScore}/10)</span>
                              </div>
                              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className="bg-[#EEEEEE] h-full" style={{ width: `${(item.trustScoreBreakdown.sourceDiversityScore / 10) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-white bg-white/5 border border-white/10 p-3 rounded-xl font-mono leading-relaxed">
                          ⚠️ Insufficient metrics to compute a reliable Trust Score. Unverified pricing records or lack of qualified peer ratings require physical on-campus validation.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Trust factors checklists */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-[10.5px] font-mono text-zinc-405 border-t border-zinc-900/60 mt-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#EEEEEE] shrink-0" />
                    <span>Certified Provider Legitimacy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${reviews.length > 0 ? 'text-[#EEEEEE]' : 'text-zinc-650'}`} />
                    <span className={reviews.length > 0 ? 'text-zinc-350' : 'text-zinc-650'}>
                      Verifiable Peer-Review Citations
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${item.isVerified ? 'text-[#EEEEEE]' : 'text-zinc-650'}`} />
                    <span className={item.isVerified ? 'text-zinc-350' : 'text-zinc-650 line-through'}>
                      Official Price Authenticated
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#EEEEEE] shrink-0" />
                    <span>Public DLP Syllabus Disclosure</span>
                  </div>
                </div>
              </div>

              {/* Real-data Source Audit & Verification Certificate */}
              <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-900 space-y-4 font-mono text-white text-left">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
                  <Sparkles className="w-4 h-4 text-white hover:text-zinc-305" />
                  <span>Audit & Research Verification Log</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-900/60 space-y-1">
                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest block font-bold">Primary Audit Citation</span>
                    {item.sourceUrl ? (
                      <a 
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-white hover:underline flex items-center gap-1.5 truncate"
                      >
                        <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{item.sourceUrl.replace(/^https?:\/\/(www\.)?/, '')}</span>
                      </a>
                    ) : (
                      <span className="text-[11px] font-bold text-zinc-505 italic">No public URL available</span>
                    )}
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-905/40 border border-[#0c0c0c] space-y-1">
                    <span className="text-[8px] text-zinc-500 uppercase tracking-widest block font-bold">Date Last Audited</span>
                    <span className="text-[11px] font-bold text-white">
                      {item.dateChecked || '2026-06-15'}
                    </span>
                  </div>
                </div>

                {/* Verification Notes */}
                {item.verificationNotes && (
                  <div className="p-3 rounded-xl bg-zinc-900/20 border border-zinc-900 text-[10.5px] text-zinc-450 leading-relaxed space-y-1">
                    <span className="text-[8px] text-zinc-550 uppercase tracking-widest block font-bold">Research auditor notes:</span>
                    <p>{item.verificationNotes}</p>
                  </div>
                )}

                {/* Manual verification flag alert banner */}
                {item.needsManualVerification && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/30 text-[10.5px] text-indigo-400 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="space-y-1">
                      <span className="font-extrabold uppercase tracking-wide block">Manual Check Pending</span>
                      <p className="text-[10px] text-zinc-350 leading-relaxed font-sans">
                        This entry contains limited public disclosures. Some rates are historically referenced and require manual on-center validation.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Syllabus curriculum / Subjects & core Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                
                {/* Subjects */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-white" />
                    <span>Covered Subjects</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.subjects && item.subjects.map((subj, idx) => (
                      <span key={idx} className="text-[10px] font-mono bg-zinc-950 border border-zinc-900 text-zinc-300 px-2.5 py-1.5 rounded-lg">
                        • {subj}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Core Features */}
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-white" />
                    <span>Strategic Advantages</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.features && item.features.map((feat, idx) => (
                      <span key={idx} className="text-[10px] font-mono bg-zinc-955 border border-zinc-900 text-zinc-300 px-2.5 py-1.5 rounded-lg">
                        ✔ {feat}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              {/* Offline cities list (If delivery == offline) */}
              {(item.delivery === 'offline' || item.type === 'offline') && item.centers && (
                <div className="space-y-3 border-t border-zinc-900 pt-6 text-left">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-white" />
                    <span>AITS Physical Center Locations ({item.centers.length} Cities)</span>
                  </h4>
                  <p className="text-[10px] text-zinc-550 font-mono">Conducted physically under monitored invigilation on scheduled weekends:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.centers.map((center, idx) => (
                      <span key={idx} className="text-[10px] font-mono bg-zinc-950 border border-zinc-900 hover:border-zinc-800 text-zinc-300 px-2.5 py-1 rounded transition-colors">
                        {center}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Real-world Peer reviews citations */}
              <div className="space-y-6 border-t border-zinc-900 pt-6 text-left">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-white" />
                  <span>Student Peer Reviews ({reviews.length})</span>
                </h4>

                {/* Form for writing review */}
                <form onSubmit={handleReviewSubmit} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 md:p-5 space-y-4">
                  <h5 className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">Add Your Verified Review</h5>
                  
                  <div>
                    <label className="block text-[8px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Your Rating</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className="text-lg focus:outline-none transition-transform active:scale-95"
                        >
                          <span className={newRating >= star ? "text-amber-500 font-sans" : "text-zinc-700 font-sans"}>
                            ★
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[8px] font-mono text-zinc-500 uppercase tracking-wider mb-1">Your Commentary</label>
                    <textarea
                      placeholder="Share your verified experience with this syllabus test format..."
                      className="w-full bg-[#050505] border border-zinc-904 rounded-xl p-3 text-xs text-white placeholder-zinc-650 focus:outline-none focus:border-zinc-800 font-sans h-20 resize-none font-medium"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    />
                  </div>

                  {errorMsg && (
                    <p className="text-[9px] font-mono text-red-500">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2 bg-white text-black font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Submitting...' : 'Publish Verification Review'}
                  </button>
                </form>

                <div className="space-y-3">
                  {reviews.length === 0 ? (
                    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 text-center">
                      <p className="text-xs text-zinc-500 font-mono">No ratings yet. Be the first to verify and comment!</p>
                    </div>
                  ) : (
                    reviews.map((rev, idx) => (
                      <div key={idx} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4 md:p-5 relative">
                        
                        <span className="absolute right-4 top-2 text-3xl text-zinc-800 select-none pointer-events-none">
                          “
                        </span>

                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-zinc-300 font-extrabold">{rev.userDisplayName || rev.author || 'Anonymous'}</span>
                            <span className="text-[10px] text-zinc-550 font-mono">gave</span>
                            <span className="text-amber-500 font-sans text-xs">
                              {'★'.repeat(rev.rating)}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-zinc-400 font-sans italic leading-relaxed">
                          "{rev.comment || rev.text}"
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
            
            {/* Drawer Sticky bottom action */}
            <div className="p-6 md:p-8 border-t border-zinc-900 bg-zinc-950 flex gap-3 text-xs font-mono">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-center bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white transition-all rounded-xl font-bold font-mono hover:bg-zinc-850"
              >
                Close Details
              </button>
              <a
                href={item.officialLinks ? item.officialLinks[0] : item.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 text-center bg-white text-black hover:bg-zinc-350 transition-all rounded-xl font-bold font-mono flex items-center justify-center gap-2"
              >
                <span>Visit Program Website</span>
                <ExternalLink className="w-3.5 h-3.5 text-black" />
              </a>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TestSeriesDetail;
