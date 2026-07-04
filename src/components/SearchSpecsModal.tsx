import { Filter, X, Check, Award, BookOpen, Star, RefreshCw, Layers, Radio, Shield, ListFilter, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SearchSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectFilter: string;
  setSubjectFilter: (val: string) => void;
  examFilter: string;
  setExamFilter: (val: string) => void;
  contentTypeFilter: 'All' | 'lecture' | 'oneshot';
  setContentTypeFilter: (val: 'All' | 'lecture' | 'oneshot') => void;
  sortBy: 'rating' | 'trustScore' | 'popularity';
  setSortBy: (val: 'rating' | 'trustScore' | 'popularity') => void;
  searchQuery: string;
  verifiedOnly?: boolean;
  setVerifiedOnly?: (val: boolean) => void;
  
  // Optional Test Segment filters passed under the same popup controller
  activeExploreTab?: string;
  testExamTag?: string;
  setTestExamTag?: (val: string) => void;
  testDelivery?: string;
  setTestDelivery?: (val: string) => void;
  testVerification?: string;
  setTestVerification?: (val: string) => void;
  testMinRating?: number;
  setTestMinRating?: (val: number) => void;
  testSortBy?: 'trustScore' | 'rating' | 'priceAsc' | 'priceDesc';
  setTestSortBy?: (val: 'trustScore' | 'rating' | 'priceAsc' | 'priceDesc') => void;
}

export default function SearchSpecsModal({
  isOpen,
  onClose,
  subjectFilter,
  setSubjectFilter,
  examFilter,
  setExamFilter,
  contentTypeFilter,
  setContentTypeFilter,
  sortBy,
  setSortBy,
  searchQuery,
  verifiedOnly = false,
  setVerifiedOnly,
  
  activeExploreTab = 'home',
  testExamTag = 'ALL',
  setTestExamTag,
  testDelivery = 'ALL',
  setTestDelivery,
  testVerification = 'ALL',
  setTestVerification,
  testMinRating = 0,
  setTestMinRating,
  testSortBy = 'trustScore',
  setTestSortBy
}: SearchSpecsModalProps) {
  if (!isOpen) return null;

  const isTestTab = activeExploreTab === 'tests';

  const handleReset = () => {
    if (isTestTab) {
      if (setTestExamTag) setTestExamTag('ALL');
      if (setTestDelivery) setTestDelivery('ALL');
      if (setTestVerification) setTestVerification('ALL');
      if (setTestMinRating) setTestMinRating(0);
      if (setTestSortBy) setTestSortBy('trustScore');
    } else {
      setSubjectFilter('All');
      setExamFilter('All');
      setContentTypeFilter('All');
      setSortBy('trustScore' as any);
      if (setVerifiedOnly) setVerifiedOnly(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        {/* Animated backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 cursor-pointer"
        />

        {/* Modal Panel Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-[#0E0E0E] border border-[#1F1F1F] shadow-[0_12px_45px_rgba(0,0,0,0.9)] rounded-2xl p-6 overflow-hidden z-10 text-left space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#1A1A1A] pb-4">
            <div className="space-y-1">
              <span className="text-[9px] font-mono font-bold uppercase py-0.5 px-2 bg-white text-black rounded mr-2 tracking-wider">
                {isTestTab ? 'Mock Test Matrix' : 'Refine Query'}
              </span>
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2 mt-1">
                <Filter className="w-4 h-4 text-white" /> 
                {isTestTab ? 'Test Series Specifications' : 'Search Specifications'}
              </h3>
              {searchQuery && (
                <p className="text-[11px] text-zinc-405 font-mono">
                  Criteria segment: <span className="text-white font-semibold">"{searchQuery}"</span>
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 min-w-0 bg-transparent hover:bg-zinc-900 border border-transparent hover:border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-5">
            {isTestTab ? (
              // Test Series SPECIFIC FILTERS
              <>
                {/* 1. Exam Target goal */}
                <div className="space-y-2">
                  <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-400" /> Exam Preference
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['ALL', 'JEE', 'NEET'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setTestExamTag && setTestExamTag(tag)}
                        className={`py-1.5 px-4 rounded-lg text-[10.5px] font-mono font-bold text-center border cursor-pointer transition-all ${
                          testExamTag === tag
                            ? 'bg-white text-black border-white'
                            : 'bg-transparent border-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-600'
                        }`}
                      >
                        {tag === 'ALL' ? 'All Exams' : tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Delivery Mode & Verification Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-zinc-400" /> Delivery Mode
                    </label>
                    <select
                      value={testDelivery}
                      onChange={(e) => setTestDelivery && setTestDelivery(e.target.value)}
                      className="w-full bg-[#030303] border border-[#1C1C1C] focus:border-zinc-550 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all cursor-pointer font-sans"
                    >
                      <option value="ALL">All Delivery Modes</option>
                      <option value="ONLINE">Online CBT Format</option>
                      <option value="OFFLINE">Offline Centers & OMR</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-zinc-400" /> Verification Status
                    </label>
                    <select
                      value={testVerification}
                      onChange={(e) => setTestVerification && setTestVerification(e.target.value)}
                      className="w-full bg-[#030303] border border-[#1C1C1C] focus:border-zinc-550 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all cursor-pointer font-sans"
                    >
                      <option value="ALL">All Providers</option>
                      <option value="VERIFIED">Verified / Certified Providers</option>
                      <option value="UNVERIFIED">Self-Published / Manual Review</option>
                    </select>
                  </div>
                </div>

                {/* 3. Star Stars Rating & Ordering */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center justify-between">
                      <span>Minimum Rating</span>
                      <span className="text-[#FFEFD5] font-mono">{testMinRating ? `${testMinRating}★+` : 'Any rating'}</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={testMinRating}
                      onChange={(e) => setTestMinRating && setTestMinRating(parseFloat(e.target.value))}
                      className="w-full accent-white cursor-pointer h-1.5 bg-zinc-900 rounded-lg outline-none"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-zinc-650 leading-none">
                      <span>Any rating</span>
                      <span>5.0★</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" /> Sorting priority
                    </label>
                    <select
                      value={testSortBy}
                      onChange={(e) => setTestSortBy && setTestSortBy(e.target.value as any)}
                      className="w-full bg-[#030303] border border-[#1C1C1C] focus:border-zinc-550 rounded-xl px-3 py-2 text-xs text-white outline-none transition-all cursor-pointer font-sans"
                    >
                      <option value="trustScore">Verified Trust Score</option>
                      <option value="rating">Stars Rating (High to Low)</option>
                      <option value="priceAsc">Price (Lowest item first)</option>
                      <option value="priceDesc">Price (Highest item first)</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              // GENERAL Academic Courseware Filters
              <>
                {/* Subject Selector */}
                <div className="space-y-2">
                  <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                    Subject Stream
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(['All', 'Physics', 'Chemistry', 'Mathematics', 'Biology'] as const).map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setSubjectFilter(sub)}
                        className={`py-1.5 px-2.5 rounded-lg text-[10.5px] font-mono font-semibold text-center border cursor-pointer transition-all ${
                          subjectFilter === sub
                            ? 'bg-white text-black border-white'
                            : 'bg-transparent border-zinc-805 text-zinc-450 hover:text-white hover:border-zinc-600'
                        }`}
                      >
                        {sub}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exam Goal Selector */}
                <div className="space-y-2">
                  <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                    Exam target goal
                  </label>
                  <select
                    value={examFilter}
                    onChange={(e) => setExamFilter(e.target.value)}
                    className="w-full bg-[#030303] border border-[#1C1C1C] focus:border-zinc-550 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all cursor-pointer font-sans"
                  >
                    <option value="All">All Exams & Goals</option>
                    <option value="JEE">JEE Main & Advanced</option>
                    <option value="NEET">NEET Medical Prep</option>
                  </select>
                </div>

                {/* Two Column Grid for Content Format and Sorting */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                      Content Class
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'All', label: 'All' },
                        { id: 'lecture', label: 'Lectures' },
                        { id: 'oneshot', label: 'One Shots' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setContentTypeFilter(f.id as any)}
                          className={`text-[10.5px] font-mono py-1.5 px-3 rounded-lg border cursor-pointer transition-all ${
                            contentTypeFilter === f.id
                              ? 'bg-white text-black border-white font-semibold'
                              : 'bg-transparent border-zinc-805 text-zinc-450 hover:text-zinc-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10.5px] uppercase font-mono font-bold text-zinc-400 tracking-wider">
                      Order Priority
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e: any) => setSortBy(e.target.value)}
                      className="w-full bg-[#030303] border border-[#1C1C1C] focus:border-zinc-550 rounded-xl px-4 py-2.5 text-xs text-white outline-none transition-all cursor-pointer font-sans"
                    >
                      <option value="trustScore">Verified Trust Score</option>
                      <option value="rating">Student stars rating</option>
                      <option value="popularity">Cumulative Subscribers</option>
                    </select>
                  </div>
                </div>

                {/* Verified Only Toggle */}
                {setVerifiedOnly && (
                  <div className="flex items-center justify-between p-3.5 bg-zinc-950/40 border border-[#1f1f1f] rounded-xl text-left">
                    <div className="space-y-0.5">
                      <span className="block text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-400" /> Verified Only mode
                      </span>
                      <span className="block text-[10px] text-zinc-500 font-mono leading-tight">
                        Hides any sources with unverified or pending review metrics.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVerifiedOnly(!verifiedOnly)}
                      className={`w-11 h-6 rounded-full flex items-center p-1 cursor-pointer transition-all ${
                        verifiedOnly ? 'bg-indigo-600 justify-end' : 'bg-neutral-800 justify-start'
                      }`}
                    >
                      <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-md" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer Action Segment */}
          <div className="flex items-center justify-between pt-4 border-t border-[#161616] mt-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-lg text-xs font-mono transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
            </button>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-bold uppercase rounded-full transition-all cursor-pointer"
            >
              Apply Specifications
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
