'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseDraftData } from '@/utils/navigation';
import { Representative } from '@/services/representatives'; // Assuming this path and type are correct

export default function CreateCampaignPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [demands, setDemands] = useState<string[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStorageLoaded, setLocalStorageLoaded] = useState(false);

  useEffect(() => {
    const draftData = parseDraftData();

    if (!draftData || !draftData.demands || draftData.demands.length === 0) {
      alert('No demands found. Please define your demands first.');
      router.replace('/demands');
      return;
    }
    // Check for the actual Representative objects
    if (!draftData.representatives || !Array.isArray(draftData.representatives) || draftData.representatives.length === 0) {
      alert('No representative data found. Please select representatives first.');
      router.replace('/issue-details'); // Or where reps are selected
      return;
    }
    // Also ensure selectedReps (IDs) are present if your logic relies on them elsewhere,
    // though for this page, draftData.representatives are primary.
    if (!draftData.selectedReps || draftData.selectedReps.length === 0) {
        alert('No representative selections found. Please select representatives first.');
        router.replace('/issue-details');
        return;
    }

    setDemands(draftData.demands.filter(d => d && d.trim())); // Ensure valid demands
    setRepresentatives(draftData.representatives || []); // Use draftData.representatives
    setLocalStorageLoaded(true);
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Campaign Title is required.');
      return;
    }
    if (demands.length === 0) {
      setError('Cannot create a campaign with no demands.');
      return;
    }
    if (representatives.length === 0) {
      setError('Cannot create a campaign with no representatives.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          demands,
          representatives: representatives.map(r => ({ name: r.name /* Add other rep fields if needed by API */ })),
        }),
      });

      const responseData = await response.json();

      if (response.ok) { // Typically 201 for created
        alert(`Campaign created successfully! ID: ${responseData.id}`);
        if (responseData.id) {
          localStorage.setItem('activeCampaignId', responseData.id.toString());
        }
        // Optional: Clear parts of localStorage related to the draft
        // localStorage.removeItem('draftData'); // Or more specific keys
        router.push('/'); // Redirect to home page
      } else {
        setError(responseData.error || `Error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error('Failed to create campaign:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!localStorageLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        <p className="mt-2 text-gray-600">Loading campaign data...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
        <button
          onClick={() => router.back()} // Or router.push('/draft-preview')
          className="text-primary hover:underline mb-6 flex items-center"
        >
          <span className="mr-1">←</span> Back
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Create Your Campaign</h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your Demands:</h2>
            {demands.length > 0 ? (
              <ul className="list-disc list-inside bg-gray-50 p-4 rounded-md border border-gray-200">
                {demands.map((demand, index) => (
                  <li key={index} className="text-gray-700 mb-1">{demand}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No demands specified.</p>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Selected Representatives:</h2>
            {representatives.length > 0 ? (
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                {representatives.map((rep, index) => (
                  <div key={index} className="text-gray-700 mb-1 p-2 border-b last:border-b-0">
                    {rep.name} 
                    {/* Optionally display more rep info if available and needed */}
                    {/* rep.party ? `(${rep.party})` : '' */}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No representatives selected.</p>
            )}
          </div>
          
          <hr className="my-6" />

          <div className="mb-4">
            <label htmlFor="campaignTitle" className="block text-lg font-medium text-gray-700 mb-1">
              Campaign Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="campaignTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="campaignDescription" className="block text-lg font-medium text-gray-700 mb-1">
              Campaign Description (Optional)
            </label>
            <textarea
              id="campaignDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !title.trim() || demands.length === 0 || representatives.length === 0}
            className="w-full py-3 px-6 bg-primary text-white font-semibold rounded-md shadow-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading && (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            )}
            {isLoading ? 'Creating...' : 'Create Campaign'}
          </button>
        </form>
      </div>
    </main>
  );
}
