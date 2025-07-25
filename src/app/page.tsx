'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Added for potential campaign links
import { parseDraftData, hasSubstantialProgress } from '@/utils/navigation';

// Import from our custom type definition
/// <reference path="../types/globals.d.ts" />

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Campaign state variables
  interface Campaign {
    id: number;
    title: string;
    description: string | null; // Description can be null
    message_sent_count: number;
    created_at: string; // Assuming string representation from API
    demands: any[]; // Define more specifically if structure is known
    representatives: any[]; // Define more specifically if structure is known
    city?: string | null;
    state?: string | null;
    location_display?: string | null;
  }
  const [popularCampaigns, setPopularCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if the API key is available
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.error('Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.');
      setApiKeyMissing(true);
      return;
    }
    
    // Load Google Maps API script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setGoogleMapsLoaded(true);
      initAutocomplete();
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API script. Check your API key.');
    };
    document.head.appendChild(script);

    return () => {
      // Only remove if it exists
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  // useEffect for fetching popular campaigns
  useEffect(() => {
    const fetchPopularCampaigns = async () => {
      setCampaignsLoading(true);
      setCampaignsError(null);
      try {
        const response = await fetch('/api/campaigns?sortBy=message_sent_count&order=DESC&limit=5');
        if (!response.ok) {
          throw new Error(`Failed to fetch campaigns: ${response.status}`);
        }
        const data: Campaign[] = await response.json();
        setPopularCampaigns(data);
      } catch (error) {
        console.error("Error fetching popular campaigns:", error);
        setCampaignsError("Failed to load campaigns.");
        setPopularCampaigns([]);
      } finally {
        setCampaignsLoading(false);
      }
    };

    fetchPopularCampaigns();
  }, []);

  const initAutocomplete = () => {
    if (!inputRef.current || !window.google) return;
    
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address', 'geometry'],
      types: ['address']
    });
    
    // Store the autocomplete instance in a ref for later use
    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        setAddress(place.formatted_address);
        
        // We're no longer in autocomplete selection mode
        setAutoCompleteActive(false);
        
        // If the place has a formatted address, we can submit right away
        // This helps when user selects with mouse click
        if (inputRef.current) {
          // Focus on the input to ensure blur events fire correctly
          inputRef.current.focus();
          
          // Small timeout to ensure the address state is updated
          setTimeout(() => {
            if (place.formatted_address) {
              submitAddress(place.formatted_address);
            }
          }, 100);
        }
      }
    });
  };
  
  // Helper function to handle address submission
  const submitAddress = (addressToSubmit: string) => {
    if (!addressToSubmit) return;

    setIsLoading(true);

    // Store address in localStorage for use in the next page
    localStorage.setItem('userAddress', addressToSubmit);

    // Check if we have existing draft data in localStorage with substantial progress
    const draftData = parseDraftData();

    // If there's substantial progress, show the continue session page
    if (draftData && hasSubstantialProgress(draftData)) {
      // Navigate to continue-session page to let user decide
      router.push('/continue-session');
      return;
    }

    // Navigate to the demands page first (if no existing data or no demands)
    router.push('/demands');
  };

  // We'll define a state variable to track if we're in the middle of selecting
  const [autoCompleteActive, setAutoCompleteActive] = useState(false);

  // Update the useEffect to setup event listeners for autoComplete keyboard navigation
  useEffect(() => {
    // Handle autoComplete keyboard navigation
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check if the key is arrow down/up which activates autoComplete selection mode
      if (e.target === inputRef.current && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        setAutoCompleteActive(true);
      }
      
      // If Enter is pressed and we're in autoComplete selection mode, prevent default
      if (e.key === 'Enter' && autoCompleteActive) {
        e.preventDefault();
      }
    };
    
    // When user clicks anywhere else, we're no longer in autoComplete selection mode
    const handleGlobalClick = () => {
      setAutoCompleteActive(false);
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown, true);
    document.addEventListener('click', handleGlobalClick);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [autoCompleteActive]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    // If we're in autoComplete selection mode, don't submit yet
    if (autoCompleteActive) {
      return;
    }
    
    // Otherwise, submit with the current address value
    submitAddress(address);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // When user starts typing or navigating with arrow keys, we're in autoComplete mode
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      setAutoCompleteActive(true);
    }
    
    // If Enter is pressed during autoComplete, prevent form submission
    if (e.key === 'Enter' && autoCompleteActive) {
      e.preventDefault();
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-4xl w-full p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">Outrage</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Contact your elected representatives about issues you care about, in just a few minutes.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 space-y-6">
            <h2 className="text-3xl font-semibold text-gray-800">Make your voice heard</h2>
            <p className="text-lg text-gray-600">
              Contacting your representatives is one of the most effective ways to advocate for change. 
              Our tool helps you:
            </p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center mr-2">1</span>
                <span>Find all your elected officials in seconds</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center mr-2">2</span>
                <span>Create personalized, AI-generated emails</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-white flex items-center justify-center mr-2">3</span>
                <span>Send your message with just a few clicks</span>
              </li>
            </ul>
          </div>
          
          <div className="md:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-md">
              {apiKeyMissing ? (
                <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md">
                  <h2 className="text-lg font-semibold text-red-600 mb-2">API Key Missing</h2>
                  <p className="text-red-700">
                    The Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.
                  </p>
                  <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                    <code className="text-sm text-gray-700">
                      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key
                    </code>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-xl font-semibold mb-3">Enter your address</h3>
                  <p className="text-gray-600 mb-4 text-sm">
                    We'll use this to find your elected representatives.
                  </p>
                  
                  <div>
                    <input
                      ref={inputRef}
                      id="address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="123 Main St, City, State"
                      required
                    />
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium"
                    disabled={isLoading || !address}
                  >
                    {isLoading ? 'Loading...' : 'Find My Representatives'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
        
      </div>

      {/* Popular Campaigns Section */}
      <section className="w-full max-w-4xl mt-16 px-4">
        <h2 className="text-3xl font-semibold text-gray-800 mb-8 text-center">
          Popular Campaigns
        </h2>
        {campaignsLoading ? (
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Loading campaigns...</p>
          </div>
        ) : campaignsError ? (
          <div className="text-center text-red-500 bg-red-50 p-4 rounded-md border border-red-200">
            <p>{campaignsError}</p>
          </div>
        ) : popularCampaigns.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularCampaigns.map((campaign) => (
              <Link 
                key={campaign.id} 
                href={`/campaign/${campaign.id}`}
                className="bg-white p-6 rounded-lg shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow"
              >
                <div>
                  <h3 className="text-xl font-semibold text-primary mb-2 truncate" title={campaign.title}>
                    {campaign.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-3" title={campaign.description || ''}>
                    {campaign.description || 'No description provided.'}
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-gray-500">
                      Created: {new Date(campaign.created_at).toLocaleDateString()}
                    </p>
                    {campaign.location_display && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        📍 {campaign.location_display}
                      </span>
                    )}
                  </div>
                  <p className="text-md font-semibold text-gray-700">
                    Messages Sent: {campaign.message_sent_count}
                  </p>
                  <span className="text-primary hover:underline mt-2 inline-block">
                    View Details →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 bg-gray-50 p-4 rounded-md border border-gray-200">
            <p>No campaigns found yet. Be the first to start one!</p>
          </div>
        )}
      </section>
    </main>
  );
}