'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CampaignForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !message) {
      setError('All fields are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
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
        // Handle moderation rejection
        if (data.reason) {
          setError(`Content moderation: ${data.reason}${data.suggestion ? `\n\nSuggestion: ${data.suggestion}` : ''}`);
        } else {
          setError(data.error || 'Failed to create campaign');
        }
        return;
      }

      // Success! Redirect to campaign page
      router.push(`/campaigns/${data.campaign.id}`);
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError('Failed to create campaign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-sm font-semibold text-red-800 mb-1">Error</h3>
          <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
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
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px]"
          placeholder="Write about the issues that matter to you..."
          required
          disabled={submitting}
        />
        <p className="text-xs text-gray-500 mt-1">
          This is the issue or message people will use when they join your campaign
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating campaign...
          </span>
        ) : (
          'Create Campaign'
        )}
      </button>
    </form>
  );
}
