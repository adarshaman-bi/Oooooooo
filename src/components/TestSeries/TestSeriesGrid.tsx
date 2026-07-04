import React from 'react';
import { TestSeriesEntry } from '../../types';
import TestSeriesCard from './TestSeriesCard';
import { AnimatePresence } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

interface TestSeriesGridProps {
  id?: string;
  items: TestSeriesEntry[];
  onItemClick: (id: string) => void;
  onResetFilters: () => void;
  searchQuery: string;
}

export const TestSeriesGrid: React.FC<TestSeriesGridProps> = ({
  id,
  items,
  onItemClick,
  onResetFilters,
  searchQuery
}) => {
  if (items.length === 0) {
    return (
      <div className="p-12 text-center rounded-3xl bg-zinc-950 border border-zinc-900 space-y-4 max-w-lg mx-auto py-16">
        <AlertTriangle className="w-10 h-10 text-zinc-650 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">No matching test series</h3>
          <p className="text-xs text-zinc-450 max-w-sm mx-auto leading-relaxed">
            We couldn't locate any records aligning with "{searchQuery}". Try modifying your filter preferences or clarifying words.
          </p>
        </div>
        <button 
          onClick={onResetFilters}
          className="px-4 py-2 bg-white text-black font-mono font-bold hover:bg-zinc-300 transition-all text-xs rounded-xl"
        >
          Reset All Filters
        </button>
      </div>
    );
  }

  return (
    <div id={id || "test-series-grid"} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <AnimatePresence mode="popLayout">
        {items.map((item) => (
          <TestSeriesCard 
            key={item.id} 
            item={item} 
            onClick={() => onItemClick(item.id)} 
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default TestSeriesGrid;
