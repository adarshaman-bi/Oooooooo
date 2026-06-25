import React, { useMemo, useState } from 'react';
import { TEST_SERIES_CATALOG } from '../data/testSeriesData';
import { TestSeriesGrid } from './TestSeries/TestSeriesGrid';
import { TestSeriesDetail } from './TestSeries/TestSeriesDetail';

interface TestSeriesDirectoryProps {
  searchQuery: string;
  selectedExamTag: string;
  setSelectedExamTag: (val: string) => void;
  selectedDelivery: string;
  setSelectedDelivery: (val: string) => void;
  selectedVerification: string;
  setSelectedVerification: (val: string) => void;
  minRating: number;
  setMinRating: (val: number) => void;
  sortBy: 'trustScore' | 'rating' | 'priceAsc' | 'priceDesc';
  setSortBy: (val: 'trustScore' | 'rating' | 'priceAsc' | 'priceDesc') => void;
}

export default function TestSeriesDirectory({
  searchQuery,
  selectedExamTag,
  setSelectedExamTag,
  selectedDelivery,
  setSelectedDelivery,
  selectedVerification,
  setSelectedVerification,
  minRating,
  setMinRating,
  sortBy,
  setSortBy
}: TestSeriesDirectoryProps) {
  
  // Active selected test series for detail modal/drawer
  const [activeDetailsId, setActiveDetailsId] = useState<string | null>(null);

  // Filter & Search logic
  const filteredCatalog = useMemo(() => {
    return TEST_SERIES_CATALOG.filter(item => {
      // 1. Search Query
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.shortDescription && item.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.longDescription && item.longDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.subjects.some(sub => sub.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.features.some(feat => feat.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. Exam Tag Filter (NEET / JEE Main / JEE Advanced / CUET)
      const selExamUpper = selectedExamTag.toUpperCase();
      const matchesExamTag = 
        selExamUpper === 'ALL' || 
        item.examTags.some(tag => {
          const tUpper = tag.toUpperCase();
          if (selExamUpper === 'NEET') {
            return tUpper.includes('NEET');
          }
          if (selExamUpper === 'JEE') {
            return tUpper.includes('JEE');
          }
          return tUpper === selExamUpper;
        });

      // 3. Delivery (Type) Filter (Online | Offline | All segmented control)
      const matchesDelivery = 
        selectedDelivery === 'ALL' || 
        item.type === selectedDelivery || 
        item.delivery === selectedDelivery;

      // 4. Verification Filter
      const matchesVerification = 
        selectedVerification === 'ALL' || 
        (selectedVerification === 'VERIFIED' && !item.needsManualVerification) ||
        (selectedVerification === 'UNVERIFIED' && item.needsManualVerification);

      // 5. Min Rating Filter (handles null safely)
      const itemRating = item.rating !== null ? item.rating : 0;
      const matchesRating = itemRating >= minRating;

      return matchesSearch && matchesExamTag && matchesDelivery && matchesVerification && matchesRating;
    }).sort((a, b) => {
      if (sortBy === 'trustScore') {
        const scoreA = a.trustScore !== null && a.trustScore !== undefined ? a.trustScore : -1;
        const scoreB = b.trustScore !== null && b.trustScore !== undefined ? b.trustScore : -1;
        return scoreB - scoreA;
      }
      if (sortBy === 'rating') {
        const ratingA = a.rating !== null ? a.rating : -1;
        const ratingB = b.rating !== null ? b.rating : -1;
        return ratingB - ratingA;
      }
      if (sortBy === 'priceAsc') {
        const getPrice = (p: any) => p && typeof p === 'object' && 'amount' in p ? p.amount : (typeof p === 'number' ? p : Infinity);
        return getPrice(a.price) - getPrice(b.price);
      }
      if (sortBy === 'priceDesc') {
        const getPrice = (p: any) => p && typeof p === 'object' && 'amount' in p ? p.amount : (typeof p === 'number' ? p : -1);
        return getPrice(b.price) - getPrice(a.price);
      }
      return 0;
    });
  }, [searchQuery, selectedExamTag, selectedDelivery, selectedVerification, minRating, sortBy]);

  // Selected details item
  const selectedDetailsItem = useMemo(() => {
    return TEST_SERIES_CATALOG.find(item => item.id === activeDetailsId) || null;
  }, [activeDetailsId]);

  const handleResetFilters = () => {
    setSelectedExamTag('ALL');
    setSelectedDelivery('ALL');
    setSelectedVerification('ALL');
    setMinRating(0);
  };

  return (
    <div id="test-series-directory-root" className="w-full max-w-7xl mx-auto px-4 py-4 md:py-8 space-y-6 select-none text-white">
      {/* Catalog Grid */}
      <TestSeriesGrid 
        items={filteredCatalog}
        onItemClick={setActiveDetailsId}
        onResetFilters={handleResetFilters}
        searchQuery={searchQuery}
      />

      {/* Interactive Detail Drawer / Side-Modal Overlay */}
      <TestSeriesDetail 
        item={selectedDetailsItem}
        onClose={() => setActiveDetailsId(null)}
      />
    </div>
  );
}
