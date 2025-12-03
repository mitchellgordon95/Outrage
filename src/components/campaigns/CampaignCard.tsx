'use client';

import React from 'react';
import { Campaign } from '@/types/campaign';

interface CampaignCardProps {
  campaign: Campaign;
  onClick: (campaign: Campaign) => void;
}

export default function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  return (
    <button
      onClick={() => onClick(campaign)}
      className="flex-shrink-0 w-48 md:w-64 p-3 md:p-4 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all text-left"
    >
      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
        {campaign.title}
      </h3>

      {campaign.location_display && (
        <p className="text-xs text-gray-500 mb-2">
          📍 {campaign.location_display}
        </p>
      )}

      <div className="flex items-center gap-2 text-sm">
        <span className="text-primary font-medium">
          {campaign.message_sent_count.toLocaleString()}
        </span>
        <span className="text-gray-500">
          {campaign.message_sent_count === 1 ? 'message sent' : 'messages sent'}
        </span>
      </div>
    </button>
  );
}
