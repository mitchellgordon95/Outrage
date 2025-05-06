'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Import from our custom type definition
/// <reference path="../../types/globals.d.ts" />

export default function AddressPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
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

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        setAddress(place.formatted_address);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    
    setIsLoading(true);
    
    // Store address in localStorage for use in the next page
    localStorage.setItem('userAddress', address);
    
    // Navigate to the next page
    router.push('/issue-details');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Enter Your Address</h1>
        
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
          <>
            <p className="mb-6 text-gray-600">
              We'll use your address to find your elected representatives.
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="address" className="block mb-2 text-sm font-medium">
                  Your Address
                </label>
                <input
                  ref={inputRef}
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your full address"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors"
                disabled={isLoading || !address}
              >
                {isLoading ? 'Loading...' : 'Next'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}