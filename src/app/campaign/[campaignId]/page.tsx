'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Representative {
  id: string;
  name: string;
}

interface Campaign {
  id: number;
  title: string;
  description: string | null;
  demands: string[];
  representatives: Representative[];
  created_at: string;
  message_sent_count: number;
}

export default function ViewCampaignPage({ params }: { params: { campaignId: string } }) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareButtonText, setShareButtonText] = useState('Copy Link');
  
  // Address input state
  const [address, setAddress] = useState('');
  const [showAddressInput, setShowAddressInput] = useState(false);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    fetchCampaign();
  }, [params.campaignId]);

  // Set up Google Maps autocomplete when showing address input
  useEffect(() => {
    if (!showAddressInput || !addressInputRef.current) return;
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key is missing');
      return;
    }
    
    // Check if the Google Maps script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      initAddressAutocomplete();
      return;
    }
    
    // Load Google Maps API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = initAddressAutocomplete;
    script.onerror = () => {
      console.error('Failed to load Google Maps API script');
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [showAddressInput]);

  const initAddressAutocomplete = () => {
    if (!addressInputRef.current || !window.google) return;
    
    const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address', 'geometry'],
      types: ['address']
    });

    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        setAddress(place.formatted_address);
      }
    });
  };

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${params.campaignId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Campaign not found');
        } else {
          setError('Failed to load campaign');
        }
        return;
      }

      const data = await response.json();
      setCampaign(data);
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError('Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCampaign = () => {
    if (!campaign) return;
    
    // Show address input
    setShowAddressInput(true);
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address || !campaign) return;

    // Store address
    localStorage.setItem('userAddress', address);

    // Store campaign data in localStorage
    const draftData = {
      demands: campaign.demands,
      demandsCompleted: true,
      // Store pre-selected representatives info separately
      campaignPreSelectedReps: campaign.representatives,
      activeCampaignId: campaign.id
    };
    
    localStorage.setItem('draftData', JSON.stringify(draftData));
    localStorage.setItem('activeCampaignId', campaign.id.toString());
    
    // Navigate to pick-representatives page
    router.push('/pick-representatives');
  };


  const handleShareCampaign = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareButtonText('Copied!');
      setTimeout(() => setShareButtonText('Copy Link'), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
        <p className="mt-2 text-gray-600">Loading campaign...</p>
      </main>
    );
  }

  if (error || !campaign) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || 'Campaign not found'}
          </h1>
          <Link
            href="/"
            className="text-primary hover:underline"
          >
            Return to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      {/* Header with title that links back home */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-6">
        <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-primary">
          Outrage
        </Link>
      </header>
      
      <div className="max-w-4xl w-full bg-white p-6 md:p-8 rounded-lg shadow-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{campaign.title}</h1>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span>Created {formatDate(campaign.created_at)}</span>
            <span>•</span>
            <span>{campaign.message_sent_count} messages sent</span>
          </div>
          
          {campaign.description && (
            <p className="text-gray-700 mb-6">{campaign.description}</p>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Campaign Demands</h2>
          <ul className="list-disc list-inside bg-gray-50 p-4 rounded-md border border-gray-200 space-y-2">
            {campaign.demands.map((demand, index) => (
              <li key={index} className="text-gray-700">{demand}</li>
            ))}
          </ul>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Pre-Selected Representatives ({campaign.representatives.length})
          </h2>
          <p className="text-sm text-gray-600 mb-4">Users can add more representatives when using this campaign</p>
          <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {campaign.representatives.map((rep, index) => (
                <div key={rep.id || index} className="text-gray-700">
                  • {rep.name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {!showAddressInput ? (
          <>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleUseCampaign}
                className="flex-1 py-3 px-6 bg-primary text-white font-semibold rounded-md hover:bg-opacity-90 transition-colors"
              >
                Use This Campaign
              </button>
              <button
                onClick={handleShareCampaign}
                className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-50 transition-colors"
              >
                {shareButtonText}
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center mt-6">
              By using this campaign, you'll send personalized messages to these representatives about these issues.
            </p>
          </>
        ) : (
          <>
            {/* Address Input Section */}
            <div className="border-t pt-6 mt-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Enter Your Address</h2>
              <p className="text-gray-600 mb-4">
                We'll find your local representatives and add them to this campaign.
              </p>
              
              <form onSubmit={handleAddressSubmit} className="space-y-4">
                <div>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="123 Main St, City, State"
                    required
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50"
                  disabled={!address}
                >
                  Continue
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </main>
  );
}