'use client';

import React, { useEffect, useState } from 'react';
import { Campaign } from '@/types/campaign';
import Link from 'next/link';

export default function CampaignManageList() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/user/campaigns');

        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }

        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } catch (err) {
        console.error('Error fetching campaigns:', err);
        setError('Failed to load your campaigns');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const copyShareableUrl = async (campaignId: number) => {
    const url = `${window.location.origin}/campaigns/${campaignId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(campaignId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const deleteCampaign = async (campaignId: number) => {
    setDeletingId(campaignId);
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

      // Remove from local state
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete campaign:', err);
      setError('Failed to delete campaign');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">You haven't created any campaigns yet</p>
        <Link
          href="/campaigns/create"
          className="inline-block bg-primary text-white py-2 px-6 rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Create Your First Campaign
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {campaign.title}
              </h3>
              <p className="text-sm text-gray-600 line-clamp-2">
                {campaign.description}
              </p>
            </div>
            <div className="ml-4 flex items-center gap-3">
              <Link
                href={`/campaigns/${campaign.id}`}
                className="text-primary hover:underline text-sm font-medium"
              >
                View
              </Link>
              {confirmDeleteId === campaign.id ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteCampaign(campaign.id)}
                    disabled={deletingId === campaign.id}
                    className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                  >
                    {deletingId === campaign.id ? 'Deleting...' : 'Confirm'}
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDeleteId(campaign.id)}
                  className="text-sm text-gray-400 hover:text-red-600 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6 text-sm mb-4">
            <div>
              <span className="text-gray-500">Messages sent:</span>{' '}
              <span className="font-medium text-gray-900">
                {campaign.message_sent_count.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Views:</span>{' '}
              <span className="font-medium text-gray-900">
                {campaign.view_count.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Created:</span>{' '}
              <span className="font-medium text-gray-900">
                {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={`${window.location.origin}/campaigns/${campaign.id}`}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded"
            />
            <button
              onClick={() => copyShareableUrl(campaign.id)}
              className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90 transition-colors"
            >
              {copiedId === campaign.id ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
