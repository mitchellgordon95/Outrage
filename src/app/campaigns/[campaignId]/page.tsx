'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Campaign } from '@/types/campaign';

export default function CampaignPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const campaignId = params.campaignId as string;
  const isOwner = session?.user?.id === campaign?.user_id;

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`);

        if (!response.ok) {
          throw new Error('Campaign not found');
        }

        const data = await response.json();
        setCampaign(data.campaign);

        // Increment view count
        await fetch(`/api/campaigns/${campaignId}/view`, {
          method: 'POST',
        });
      } catch (err) {
        console.error('Error fetching campaign:', err);
        setError('Failed to load campaign');
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  const handleStartDrafting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !campaign) return;

    // Store campaign message and address in localStorage
    localStorage.setItem('userAddress', address);
    localStorage.setItem('userMessage', campaign.message || campaign.description || '');
    localStorage.setItem('fromCampaign', campaignId);

    // Redirect to home page - it will pick up the stored data
    router.push('/');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This campaign does not exist'}</p>
          <Link
            href="/"
            className="text-primary hover:underline font-medium"
          >
            Go to home page
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-primary hover:underline text-sm mb-6 inline-block">
          ← Back to home
        </Link>

        {/* Campaign header */}
        <div className="bg-white p-8 rounded-lg shadow-md mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                {campaign.title}
              </h1>
              {campaign.location_display && (
                <p className="text-gray-500 text-sm mb-4">
                  📍 {campaign.location_display}
                </p>
              )}
            </div>
            {isOwner && (
              <Link
                href={`/campaigns/${campaign.id}/edit`}
                className="ml-4 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Edit
              </Link>
            )}
          </div>

          <div className="mb-6">
            <p className="text-gray-700 text-lg whitespace-pre-wrap">
              {campaign.message && campaign.message.length > 300 && !isExpanded
                ? campaign.message.substring(0, 300) + '...'
                : campaign.message}
            </p>
            {campaign.message && campaign.message.length > 300 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-primary hover:underline text-sm font-medium"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 pt-6 border-t border-gray-200">
            <div>
              <p className="text-3xl font-bold text-primary">
                {campaign.message_sent_count.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                {campaign.message_sent_count === 1 ? 'message sent' : 'messages sent'}
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-700">
                {campaign.view_count.toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">
                {campaign.view_count === 1 ? 'view' : 'views'}
              </p>
            </div>
          </div>
        </div>

        {/* Start drafting section */}
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Join This Campaign
          </h2>
          <p className="text-gray-600 mb-6">
            Enter your address to find your representatives and send them a message about this issue.
          </p>

          <form onSubmit={handleStartDrafting} className="space-y-4">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                Your Address
              </label>
              <input
                type="text"
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="123 Main St, City, State"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors font-medium"
            >
              Start Drafting Messages
            </button>
          </form>
        </div>

        {/* Share section */}
        <div className="mt-6 bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-3">
            Share this campaign
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={typeof window !== 'undefined' ? window.location.href : ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm bg-white border border-blue-300 rounded"
            />
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  alert('Link copied!');
                } catch (err) {
                  console.error('Failed to copy:', err);
                }
              }}
              className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90 transition-colors"
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
