'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { LocationInfo } from '@/utils/geocoding';

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

interface LocalCampaignsCarouselProps {
  userLocation: LocationInfo;
  onSwitchToManual?: () => void;
}

export default function LocalCampaignsCarousel({ userLocation, onSwitchToManual }: LocalCampaignsCarouselProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userLocation || (!userLocation.city && !userLocation.state)) {
      setLoading(false);
      return;
    }

    fetchLocalCampaigns();
  }, [userLocation]);

  const fetchLocalCampaigns = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '10',
        sortBy: 'message_sent_count',
        order: 'DESC',
        includeNational: 'false'
      });

      if (userLocation.city) {
        params.append('city', userLocation.city);
      }
      if (userLocation.stateCode || userLocation.state) {
        params.append('state', userLocation.stateCode || userLocation.state || '');
      }

      const response = await fetch(`/api/campaigns?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch campaigns');
      }

      const allCampaigns: Campaign[] = await response.json();
      setCampaigns(allCampaigns);
    } catch (err) {
      console.error('Error fetching local campaigns:', err);
      setError('Failed to load local campaigns');
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

  if (!userLocation || (!userLocation.city && !userLocation.state)) {
    return null;
  }

  if (loading) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Local Campaigns</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error || campaigns.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">
          Local Campaigns in {userLocation.locationDisplay}
        </h3>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">
            No local campaigns yet. Be the first to start one!
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
      <h3 className="text-lg font-semibold mb-4">
        Local Campaigns in {userLocation.locationDisplay}
      </h3>
      
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
          {campaigns.map((campaign) => {
            const isLocalCampaign = campaign.city === userLocation.city;
            
            return (
              <Link
                key={campaign.id}
                href={`/campaign/${campaign.id}`}
                className="flex-shrink-0 w-80 p-4 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900 line-clamp-2 flex-1">
                    {campaign.title}
                  </h4>
                  {campaign.location_display && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      isLocalCampaign 
                        ? 'bg-indigo-100 text-indigo-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      📍 {isLocalCampaign ? 'Your City' : campaign.location_display}
                    </span>
                  )}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}