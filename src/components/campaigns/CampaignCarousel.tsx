'use client';

import React, { useEffect, useState } from 'react';
import { Campaign } from '@/types/campaign';
import CampaignCard from './CampaignCard';
import Link from 'next/link';

interface CampaignCarouselProps {
  userMessage: string;
  onCampaignSelect?: (campaign: Campaign) => void;
}

export default function CampaignCarousel({ userMessage, onCampaignSelect }: CampaignCarouselProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query params
        const params = new URLSearchParams({
          limit: '10',
        });

        // If user has typed something, use it for filtering
        if (userMessage.trim()) {
          params.append('search', userMessage);
        }

        const response = await fetch(`/api/campaigns?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }

        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setError('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(fetchCampaigns, 300);

    return () => clearTimeout(timeoutId);
  }, [userMessage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        {error}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm mb-2">No campaigns found</p>
        <Link
          href="/campaigns/create"
          className="text-primary hover:underline text-sm font-medium"
        >
          Be the first to create one!
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto pb-4 -mx-4 px-4">
        <div className="flex gap-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={(c) => onCampaignSelect?.(c)}
            />
          ))}
        </div>
      </div>

      {/* Scroll hint */}
      {campaigns.length > 3 && (
        <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
