'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Campaign } from '@/types/campaign';
import CampaignCard from './CampaignCard';
import Link from 'next/link';

interface CampaignCarouselProps {
  userMessage: string;
  onCampaignSelect?: (campaign: Campaign) => void;
}

function CreateCampaignCard() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleClick = () => {
    if (session) {
      router.push('/campaigns/create');
    } else {
      router.push('/login?redirect=/campaigns/create');
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex-shrink-0 w-48 md:w-64 p-3 md:p-4 bg-white border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:shadow-md transition-all text-left group"
    >
      <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full mb-3 group-hover:bg-gray-200 transition-colors">
        <span className="text-primary text-xl font-bold">+</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">
        Create Your Own Campaign
      </h3>
      <p className="text-sm text-gray-600">
        Start a movement around an issue you care about
      </p>
    </button>
  );
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
      <div className="flex justify-center py-4">
        <CreateCampaignCard />
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
          <CreateCampaignCard />
        </div>
      </div>

      {/* Scroll hint */}
      {campaigns.length >= 3 && (
        <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
      )}
    </div>
  );
}
