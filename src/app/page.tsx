'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
        
        // If the place has a formatted address, we can submit right away
        // This helps when user selects with mouse click
        if (inputRef.current) {
          // Focus on the input to ensure blur events fire correctly
          inputRef.current.focus();
          
          // Small timeout to ensure the address state is updated
          setTimeout(() => {
            submitAddress(place.formatted_address);
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
    
    // Navigate to the next page
    router.push('/issue-details');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    // Check if there's a Google prediction active
    // If so, let the place_changed event handle the submission
    if (document.querySelector('.pac-container')?.matches(':visible')) {
      // Google's autocomplete dropdown is visible, don't submit yet
      return;
    }
    
    // Otherwise, submit with the current address value
    submitAddress(address);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Detect when user presses Enter or ArrowDown/Up in the address field
    if (e.key === 'Enter' && document.querySelector('.pac-container')?.matches(':visible')) {
      // Prevent form submission if dropdown is visible
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
        
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-gray-500 text-sm">
            <p>Powered by data from the Governance Project at techandciviclife.org</p>
          </div>
        </div>
      </div>
    </main>
  );
}