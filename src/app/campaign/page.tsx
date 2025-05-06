'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CampaignPage() {
  const router = useRouter();
  const [campaignName, setCampaignName] = useState('');
  const [facts, setFacts] = useState<string[]>([]);
  const [campaignLink, setCampaignLink] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // Get facts from localStorage
    const storedFacts = localStorage.getItem('userFacts');
    if (storedFacts) {
      try {
        setFacts(JSON.parse(storedFacts));
      } catch (error) {
        console.error('Error parsing stored facts:', error);
      }
    } else {
      // No facts found, redirect back to the issue details page
      router.push('/issue-details');
    }
  }, [router]);

  const handleCreateCampaign = async () => {
    if (!campaignName.trim()) return;
    
    setIsCreating(true);
    
    try {
      // In a real implementation, we would send this to an API endpoint
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const campaignId = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
      const link = `${window.location.origin}/campaign/${campaignId}`;
      
      setCampaignLink(link);
      
      // Store campaign info in localStorage for demo purposes
      localStorage.setItem('campaign', JSON.stringify({
        id: campaignId,
        name: campaignName,
        facts,
        createdAt: new Date().toISOString(),
        draftsCreated: 1,
      }));
    } catch (error) {
      console.error('Error creating campaign:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(campaignLink);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="max-w-2xl w-full bg-white p-6 md:p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Create a Campaign</h1>
        
        {!campaignLink ? (
          <>
            <p className="mb-6 text-gray-600">
              Turn your message into a campaign that others can join. Share it with friends, family, and on social media to amplify your impact.
            </p>
            
            <div className="mb-6">
              <label htmlFor="campaign-name" className="block mb-2 font-medium">
                Campaign Name
              </label>
              <input
                id="campaign-name"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md"
                placeholder="e.g. Support Local Climate Action"
              />
            </div>
            
            <div className="mb-8">
              <h2 className="font-medium mb-2">Campaign Facts</h2>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <ul className="list-disc pl-5 space-y-2">
                  {facts.map((fact, index) => (
                    <li key={index}>{fact}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <button
              onClick={handleCreateCampaign}
              disabled={isCreating || !campaignName.trim()}
              className="w-full py-3 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating Campaign...' : 'Create Campaign'}
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className="p-6 mb-6 bg-green-50 border border-green-200 rounded-md">
              <h2 className="text-2xl font-semibold mb-3 text-green-700">Campaign Created!</h2>
              <p className="mb-4 text-gray-600">
                Share this link with others to join your campaign:
              </p>
              <div className="flex items-center justify-between p-3 bg-white border border-gray-300 rounded-md mb-4">
                <span className="text-sm truncate">{campaignLink}</span>
                <button
                  onClick={handleCopyLink}
                  className="ml-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <div className="flex flex-col space-y-4">
              <Link
                href={campaignLink}
                className="py-3 px-6 bg-secondary text-white rounded-md hover:bg-opacity-90"
              >
                View Campaign
              </Link>
              
              <Link
                href="/"
                className="py-3 px-6 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200"
              >
                Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}