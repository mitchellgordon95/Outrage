'use client';

import { useEffect, useRef, useState } from 'react';

// Import from our custom type definition
/// <reference path="../types/globals.d.ts" />

interface Representative {
  id?: string;
  name: string;
  office: string;
  party?: string;
  photoUrl?: string;
  contacts: Contact[];
  level: 'country' | 'state' | 'local';
}

interface Contact {
  type: string;
  value: string;
  description?: string;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Section 1: Address
  const [address, setAddress] = useState('');
  const [addressSubmitted, setAddressSubmitted] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  // Section 2: What's on your mind
  const [message, setMessage] = useState('');
  const [messageSubmitted, setMessageSubmitted] = useState(false);

  // Section 3: Representatives
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedRepIds, setSelectedRepIds] = useState<string[]>([]);
  const [selectionSummary, setSelectionSummary] = useState<string>('');
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const [copiedContact, setCopiedContact] = useState<string | null>(null);
  const [repsLoading, setRepsLoading] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);

  // Load Google Maps on mount
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.');
      setApiKeyMissing(true);
      return;
    }

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

    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        setAddress(place.formatted_address);
      }
    });
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    localStorage.setItem('userAddress', address);
    setAddressSubmitted(true);
  };

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;

    localStorage.setItem('userMessage', message);
    setMessageSubmitted(true);
    setRepsLoading(true);
    setRepsError(null);

    try {
      // Step 1: Lookup representatives by address
      const lookupResponse = await fetch('/api/lookup-representatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      if (!lookupResponse.ok) {
        throw new Error('Failed to lookup representatives');
      }

      const { representatives: reps } = await lookupResponse.json();
      setRepresentatives(reps);

      // Step 2: AI auto-select relevant representatives
      const selectResponse = await fetch('/api/select-representatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demands: [message], // Pass message as a single demand
          representatives: reps
        })
      });

      if (!selectResponse.ok) {
        throw new Error('Failed to select representatives');
      }

      const { selectedIds, summary, explanations: repExplanations } = await selectResponse.json();
      setSelectedRepIds(selectedIds);
      setSelectionSummary(summary || '');
      setExplanations(repExplanations || {});

      // Store in localStorage
      localStorage.setItem('representatives', JSON.stringify(reps));
      localStorage.setItem('selectedRepIds', JSON.stringify(selectedIds));
      localStorage.setItem('selectionSummary', summary || '');
      localStorage.setItem('explanations', JSON.stringify(repExplanations || {}));

    } catch (error) {
      console.error('Error fetching representatives:', error);
      setRepsError('Failed to load representatives. Please try again.');
    } finally {
      setRepsLoading(false);
    }
  };

  const getContactIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'email':
        return '✉️';
      case 'webform':
      case 'web form':
        return '🌐';
      case 'twitter':
      case 'x':
        return '𝕏';
      case 'facebook':
        return '👤';
      default:
        return '📧';
    }
  };

  const getLevelColor = (level: 'country' | 'state' | 'local') => {
    switch (level) {
      case 'country':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'state':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'local':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLevelLabel = (level: 'country' | 'state' | 'local') => {
    switch (level) {
      case 'country':
        return 'Federal';
      case 'state':
        return 'State';
      case 'local':
        return 'Local';
      default:
        return level;
    }
  };

  const toggleExplanation = (repId: string) => {
    setExpandedExplanations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(repId)) {
        newSet.delete(repId);
      } else {
        newSet.add(repId);
      }
      return newSet;
    });
  };

  const copyToClipboard = async (text: string, contactKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedContact(contactKey);
      setTimeout(() => setCopiedContact(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="max-w-4xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">Outrage</h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Contact your elected representatives about issues you care about, in just a few minutes.
          </p>
        </div>

        {/* Section 1: Address Input */}
        <div className="bg-white p-8 rounded-lg shadow-md mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
              1
            </span>
            <h2 className="text-2xl font-semibold text-gray-800">Enter your address</h2>
          </div>

          {apiKeyMissing ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-lg font-semibold text-red-600 mb-2">API Key Missing</h3>
              <p className="text-red-700">
                The Google Maps API key is missing. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your .env.local file.
              </p>
            </div>
          ) : addressSubmitted ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800 font-medium">{address}</p>
              <button
                onClick={() => setAddressSubmitted(false)}
                className="text-primary underline text-sm mt-2"
              >
                Change address
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddressSubmit} className="space-y-4">
              <p className="text-gray-600 text-sm">
                We'll use this to find your elected representatives.
              </p>

              <input
                ref={inputRef}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="123 Main St, City, State"
                required
              />

              <button
                type="submit"
                className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50"
                disabled={!address}
              >
                Continue
              </button>
            </form>
          )}
        </div>

        {/* Section 2: What's on your mind */}
        {addressSubmitted && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                2
              </span>
              <h2 className="text-2xl font-semibold text-gray-800">What's on your mind?</h2>
            </div>

            {messageSubmitted ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 whitespace-pre-wrap">{message}</p>
                <button
                  onClick={() => setMessageSubmitted(false)}
                  className="text-primary underline text-sm mt-2"
                >
                  Edit message
                </button>
              </div>
            ) : (
              <form onSubmit={handleMessageSubmit} className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Tell us what issues you want to address with your representatives.
                </p>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[150px]"
                  placeholder="Write about the issues that matter to you..."
                  required
                />

                <button
                  type="submit"
                  className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50"
                  disabled={!message}
                >
                  Continue
                </button>
              </form>
            )}
          </div>
        )}

        {/* Section 3: Your Representatives */}
        {messageSubmitted && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                3
              </span>
              <h2 className="text-2xl font-semibold text-gray-800">Your Representatives</h2>
            </div>

            {repsLoading ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">Finding your representatives...</p>
              </div>
            ) : repsError ? (
              <div className="text-center text-red-500 bg-red-50 p-4 rounded-md border border-red-200">
                <p>{repsError}</p>
              </div>
            ) : representatives.length > 0 ? (
              <div className="space-y-4">
                {selectionSummary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-blue-900 mb-1">Selection Summary</p>
                    <p className="text-sm text-blue-800">{selectionSummary}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {representatives
                    .filter(rep => rep.id && selectedRepIds.includes(rep.id))
                    .map((rep) => (
                      <div
                        key={rep.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          {rep.photoUrl && (
                            <img
                              src={rep.photoUrl}
                              alt={rep.name}
                              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-1">
                              <h3 className="font-semibold text-lg text-gray-900 flex-1">{rep.name}</h3>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded-full border flex-shrink-0 ${getLevelColor(rep.level)}`}>
                                {getLevelLabel(rep.level)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{rep.office}</p>
                            {rep.party && (
                              <p className="text-xs text-gray-500 mt-1">{rep.party}</p>
                            )}

                            {/* Contact methods */}
                            <div className="flex gap-2 mt-2">
                              {rep.contacts.slice(0, 3).map((contact, idx) => {
                                const contactKey = `${rep.id}-${idx}`;
                                const isCopied = copiedContact === contactKey;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => copyToClipboard(contact.value, contactKey)}
                                    className="text-lg hover:scale-110 transition-transform cursor-pointer relative group"
                                    title={`Click to copy ${contact.type}`}
                                  >
                                    {getContactIcon(contact.type)}
                                    {isCopied && (
                                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                        Copied!
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* AI Explanation */}
                        {rep.id && explanations[rep.id] && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <button
                              onClick={() => toggleExplanation(rep.id!)}
                              className="w-full text-left flex items-center justify-between hover:text-primary transition-colors"
                            >
                              <p className="text-xs font-medium text-gray-500">
                                {expandedExplanations.has(rep.id) ? 'Hide reasoning' : 'Why selected?'}
                              </p>
                              <span className="text-gray-400">
                                {expandedExplanations.has(rep.id) ? '▼' : '▶'}
                              </span>
                            </button>
                            {expandedExplanations.has(rep.id) && (
                              <p className="text-sm text-gray-700 mt-2">{explanations[rep.id]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 bg-gray-50 p-4 rounded-md border border-gray-200">
                <p>No representatives found for your address.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
