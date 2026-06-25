import React from 'react';
import { Search, X, ArrowUpDown, SlidersHorizontal } from 'lucide-react';

interface TestSeriesFiltersProps {
  id?: string;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedExamTag: string;
  setSelectedExamTag: (val: string) => void;
  selectedDelivery: string;
  setSelectedDelivery: (val: string) => void;
  selectedVerification: string;
  setSelectedVerification: (val: string) => void;
  minRating: number;
  setMinRating: (val: number) => void;
  sortBy: 'trustScore' | 'rating' | 'priceAsc' | 'priceDesc';
  setSortBy: (val: any) => void;
  matchedCount: number;
  totalCount: number;
}

export const TestSeriesFilters: React.FC<TestSeriesFiltersProps> = ({
  id,
  searchQuery,
  setSearchQuery,
  selectedExamTag,
  setSelectedExamTag,
  selectedDelivery,
  setSelectedDelivery,
  selectedVerification,
  setSelectedVerification,
  minRating,
  setMinRating,
  sortBy,
  setSortBy,
  matchedCount,
  totalCount
}) => {
  const [showFilters, setShowFilters] = React.useState(false);

  return (
    <div id={id || "test-series-filters"} className="bg-[#0b0b0b] border border-zinc-900 rounded-2xl p-4 md:p-6 space-y-4 shadow-xl select-none">
      {/* Search & Sort Row */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-grow relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text"
            placeholder="Search by center, provider (Allen, Aakash, MathonGo, PW, etc.), subject, or keys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-24 bg-zinc-950 border border-zinc-800 focus:border-zinc-500 rounded-xl text-xs placeholder:text-zinc-600 text-white transition-all outline-none font-sans"
          />
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1.5 hover:bg-zinc-900 rounded text-zinc-400 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                showFilters 
                  ? 'bg-white text-black border-white shadow-xs' 
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
              title="Filter Specs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        <div className="relative shrink-0">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full md:w-56 h-11 pl-4 pr-10 bg-[#0E0E0F] border border-zinc-800 focus:border-zinc-500 rounded-xl text-xs font-sans text-zinc-350 appearance-none outline-none cursor-pointer"
          >
            <option value="trustScore">Sort: Trust Score</option>
            <option value="rating">Sort: Real Rating</option>
            <option value="priceAsc">Sort: Price (Low → High)</option>
            <option value="priceDesc">Sort: Price (High → Low)</option>
          </select>
          <ArrowUpDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        </div>
      </div>

      {showFilters && (
        <div className="pt-2 space-y-5 animate-fadeIn">
          {/* Filters Controls Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-3 border-t border-zinc-900/80 items-end">
            
            {/* Segmented Control "Online | Offline | All" (drives type) */}
            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Delivery Mode</span>
              <div className="flex bg-zinc-950/85 p-1 rounded-xl border border-zinc-900">
                {['ALL', 'online', 'offline'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedDelivery(mode)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-[10px] font-bold capitalize transition-all duration-150 ${
                      selectedDelivery === mode
                        ? 'bg-white text-black font-extrabold shadow-xs'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {mode === 'ALL' ? 'All' : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Chip filters for examTags (NEET / JEE Main / JEE Advanced / CUET) */}
            <div className="lg:col-span-5 flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Exam Stream</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {['ALL', 'NEET', 'JEE Main', 'JEE Advanced', 'CUET'].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedExamTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wide transition-all border ${
                      selectedExamTag === tag
                        ? 'bg-white text-black border-white font-black'
                        : 'bg-[#0E0E0F] text-zinc-400 border-zinc-900 hover:border-zinc-750'
                    }`}
                  >
                    {tag === 'ALL' ? 'All Streams' : tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum Rating Slider */}
            <div className="lg:col-span-3 flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500">
                <span className="uppercase tracking-wider">Minimum Rating</span>
                <span className="text-white font-extrabold">{minRating > 0 ? `${minRating.toFixed(1)} ★` : 'Any rating'}</span>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full accent-white bg-zinc-900 rounded-lg appearance-none h-1.5 cursor-pointer"
                />
                {minRating > 0 && (
                  <button 
                    onClick={() => setMinRating(0)}
                    className="text-[9px] text-zinc-500 hover:text-white uppercase"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Sub-meta filter & matching stats */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-900/60 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Status:</span>
              <div className="flex items-center gap-1">
                {['ALL', 'VERIFIED', 'UNVERIFIED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSelectedVerification(status)}
                    className={`px-2.5 py-1 rounded text-[9.5px] border uppercase transition-all duration-150 ${
                      selectedVerification === status
                        ? 'bg-zinc-900 border-zinc-750 text-white font-bold'
                        : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-350'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-950 border border-zinc-900 text-zinc-400 rounded-xl px-4 py-1.5 text-right flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest block font-bold">Matched Packages</span>
              <span className="text-xs font-bold text-white">{matchedCount} of {totalCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestSeriesFilters;
