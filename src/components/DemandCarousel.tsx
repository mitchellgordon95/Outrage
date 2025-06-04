'use client';

import { useState, useRef, useEffect } from 'react';

interface Demand {
  id: string;
  text: string;
  source?: string;
  metadata?: any;
}

interface DemandCarouselProps {
  title: string;
  demands: Demand[];
  onSelectDemand: (demand: string) => void;
  selectedDemands: string[];
}

export default function DemandCarousel({ title, demands, onSelectDemand, selectedDemands }: DemandCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const checkScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [demands]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
    scrollContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  if (!demands || demands.length === 0) return null;

  return (
    <div className="mb-8 relative group">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      
      <div className="relative">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-r opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-70"
            aria-label="Scroll left"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-l opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-opacity-70"
            aria-label="Scroll right"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {demands.map((demand) => {
            const isSelected = selectedDemands.includes(demand.text);
            return (
              <button
                key={demand.id}
                onClick={() => onSelectDemand(demand.text)}
                className={`
                  flex-shrink-0 w-72 p-4 rounded-lg border-2 transition-all duration-200
                  ${isSelected 
                    ? 'border-primary bg-primary bg-opacity-10 shadow-md' 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                  }
                `}
              >
                <p className="text-left font-medium text-gray-800">{demand.text}</p>
                {demand.source && (
                  <p className="text-sm text-gray-500 mt-2">Source: {demand.source}</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}