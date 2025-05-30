'use client';

import { useState, useEffect } from 'react';
import { parseDraftData } from '@/utils/navigation';

interface Campaign {
  id: number;
  title: string;
}

export default function ActiveCampaignBanner() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for active campaign ID
    const activeCampaignId = localStorage.getItem('activeCampaignId');
    if (!activeCampaignId) {
      setIsLoading(false);
      return;
    }

    // Fetch campaign details
    fetchCampaign(activeCampaignId);
  }, []);

  const fetchCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`);
      if (response.ok) {
        const data = await response.json();
        setCampaign({ id: data.id, title: data.title });
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopUsingCampaign = () => {
    if (confirm('Are you sure you want to stop using this campaign? Your current progress will be kept but won\'t be associated with the campaign.')) {
      // Remove campaign-related data from localStorage
      localStorage.removeItem('activeCampaignId');
      
      // Update draft data to remove campaign references
      const draftData = parseDraftData();
      if (draftData) {
        delete draftData.activeCampaignId;
        delete draftData.campaignPreSelectedReps;
        localStorage.setItem('draftData', JSON.stringify(draftData));
      }
      
      // Reload the page to reflect changes
      window.location.reload();
    }
  };

  if (isLoading || !campaign) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-md">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm font-medium text-indigo-900">
            Using Campaign: <span className="font-bold">{campaign.title}</span>
          </p>
          <p className="text-xs text-indigo-700 mt-1">
            Your message will be tracked as part of this campaign
          </p>
        </div>
        <button
          onClick={handleStopUsingCampaign}
          className="px-3 py-1 text-sm bg-white text-indigo-700 border border-indigo-300 rounded hover:bg-indigo-50 transition-colors"
        >
          Stop Using Campaign
        </button>
      </div>
    </div>
  );
}