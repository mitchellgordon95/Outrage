'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Campaign } from '@/types/campaign';

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const campaignId = params.campaignId as string;

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${campaignId}`);

        if (!response.ok) {
          throw new Error('Campaign not found');
        }

        const data = await response.json();
        setCampaign(data.campaign);
        setTitle(data.campaign.title);
        setMessage(data.campaign.message || '');
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

  // Check if user is the owner
  const isOwner = session?.user?.id === campaign?.user_id;

  useEffect(() => {
    if (!loading && !isOwner && session) {
      // User is logged in but not the owner
      router.push(`/campaigns/${campaignId}`);
    }
  }, [loading, isOwner, session, campaignId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !message) {
      setError('All fields are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to update campaign');
        return;
      }

      // Success! Redirect to campaign page
      router.push(`/campaigns/${campaignId}`);
    } catch (err) {
      console.error('Error updating campaign:', err);
      setError('Failed to update campaign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      </main>
    );
  }

  if (error && !campaign) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
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

  if (!isOwner) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You can only edit your own campaigns</p>
          <Link
            href={`/campaigns/${campaignId}`}
            className="text-primary hover:underline font-medium"
          >
            Back to campaign
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href={`/campaigns/${campaignId}`} className="text-primary hover:underline text-sm mb-6 inline-block">
          ← Back to campaign
        </Link>

        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Edit Campaign
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Support Clean Energy in California"
                maxLength={255}
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                What's on your mind? *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[200px]"
                placeholder="Write about the issues that matter to you..."
                required
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                This is the issue or message people will use when they join your campaign.
                Markdown is supported (**bold**, *italic*, headers, lists, links, code, blockquotes).
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-primary text-white py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving changes...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
              <Link
                href={`/campaigns/${campaignId}`}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
