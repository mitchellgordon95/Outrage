'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

interface Campaign {
  id: number;
  title: string;
  description: string | null;
  message_sent_count: number;
  created_at: string;
  city?: string | null;
  state?: string | null;
  location_display?: string | null;
}

interface PopularCampaignsCarouselProps {
  onSwitchToManual?: () => void;
}

export default function PopularCampaignsCarousel({ onSwitchToManual }: PopularCampaignsCarouselProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPopularCampaigns();
  }, []);

  const fetchPopularCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch national campaigns (no location) sorted by popularity
      const params = new URLSearchParams({
        limit: '10',
        sortBy: 'message_sent_count',
        order: 'DESC'
      });

      const response = await fetch(`/api/campaigns?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const allCampaigns: Campaign[] = await response.json();
      
      // Filter to only show national campaigns (no location set)
      const nationalCampaigns = allCampaigns.filter(c => !c.city && !c.state);
      setCampaigns(nationalCampaigns);
    } catch (err) {
      console.error('Error fetching popular campaigns:', err);
      setError('Failed to load popular campaigns');
    } finally {
      setLoading(false);
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Popular National Campaigns</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || campaigns.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Popular National Campaigns</h3>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">
            No national campaigns yet. Start one to mobilize people across the country!
          </p>
          {onSwitchToManual && (
            <button
              onClick={onSwitchToManual}
              className="text-primary hover:underline text-sm"
            >
              Add your own demands →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold mb-4">Popular National Campaigns</h3>
      
      <div className="relative">
        {campaigns.length > 3 && (
          <>
            <button
              onClick={scrollLeft}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 bg-white rounded-full shadow-md p-2 hover:shadow-lg transition-shadow"
              aria-label="Scroll left"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={scrollRight}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 bg-white rounded-full shadow-md p-2 hover:shadow-lg transition-shadow"
              aria-label="Scroll right"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/campaign/${campaign.id}`}
              className="flex-shrink-0 w-80 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all"
            >
              <div className="mb-2">
                <h4 className="font-medium text-gray-900 line-clamp-2">
                  {campaign.title}
                </h4>
              </div>
              
              {campaign.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {campaign.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{campaign.message_sent_count} messages sent</span>
                <span className="text-primary hover:underline">
                  Join →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}