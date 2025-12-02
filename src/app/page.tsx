'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

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
  const { data: session, status } = useSession();

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

  // Section 4: Sign In
  const [signInEmail, setSignInEmail] = useState('');
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInSuccess, setSignInSuccess] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Section 5: Generate Messages
  const [personalInfo, setPersonalInfo] = useState('');
  const [generatedDrafts, setGeneratedDrafts] = useState<Record<string, { subject: string; content: string }>>({});
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [draftsGenerated, setDraftsGenerated] = useState(false);

  // Section 6: Send Messages
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);
  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);

  // Check for auth errors in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      const errorMessages: Record<string, string> = {
        'Configuration': 'Authentication configuration error. Please try again.',
        'Verification': 'The magic link has expired or already been used. Please request a new one.',
        'Default': 'An authentication error occurred. Please try again.'
      };
      setAuthError(errorMessages[error] || errorMessages['Default']);
      // Clean up URL
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      // Restore address
      const savedAddress = localStorage.getItem('userAddress');
      if (savedAddress) {
        setAddress(savedAddress);
        setAddressSubmitted(true);
      }

      // Restore message
      const savedMessage = localStorage.getItem('userMessage');
      if (savedMessage) {
        setMessage(savedMessage);
        setMessageSubmitted(true);
      }

      // Restore representatives data
      const savedReps = localStorage.getItem('representatives');
      if (savedReps) {
        const parsedReps = JSON.parse(savedReps);
        setRepresentatives(parsedReps);
      }

      const savedSelectedIds = localStorage.getItem('selectedRepIds');
      if (savedSelectedIds) {
        const parsedIds = JSON.parse(savedSelectedIds);
        setSelectedRepIds(parsedIds);
      }

      const savedSummary = localStorage.getItem('selectionSummary');
      if (savedSummary) {
        setSelectionSummary(savedSummary);
      }

      const savedExplanations = localStorage.getItem('explanations');
      if (savedExplanations) {
        const parsedExplanations = JSON.parse(savedExplanations);
        setExplanations(parsedExplanations);
      }
    } catch (error) {
      console.error('Failed to restore state from localStorage:', error);
      // If there's an error parsing localStorage, clear it to prevent future issues
      localStorage.removeItem('userAddress');
      localStorage.removeItem('userMessage');
      localStorage.removeItem('representatives');
      localStorage.removeItem('selectedRepIds');
      localStorage.removeItem('selectionSummary');
      localStorage.removeItem('explanations');
    }
  }, []);

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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail) return;

    setSignInLoading(true);
    try {
      await signIn('resend', {
        email: signInEmail,
        redirect: false,
      });
      setSignInSuccess(true);
    } catch (error) {
      console.error('Failed to sign in:', error);
    } finally {
      setSignInLoading(false);
    }
  };

  const handleGenerateDrafts = async () => {
    if (!message) return;

    setGeneratingDrafts(true);
    setGenerationError(null);

    try {
      const selectedReps = representatives.filter(rep =>
        selectedRepIds.includes(rep.id || '')
      );

      const drafts: Record<string, { subject: string; content: string }> = {};

      // Generate draft for each selected representative
      for (const rep of selectedReps) {
        try {
          const response = await fetch('/api/generate-representative-draft', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              demands: [message],
              personalInfo: personalInfo || undefined,
              recipient: {
                name: rep.name,
                office: rep.office,
                contacts: rep.contacts,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate draft');
          }

          const draft = await response.json();
          if (rep.id) {
            drafts[rep.id] = draft;
          }
        } catch (error) {
          console.error(`Failed to generate draft for ${rep.name}:`, error);
          // Continue with other reps even if one fails
        }
      }

      if (Object.keys(drafts).length === 0) {
        throw new Error('Failed to generate any drafts');
      }

      setGeneratedDrafts(drafts);
      setDraftsGenerated(true);

      // Auto-expand first draft
      const firstRepId = selectedReps[0]?.id;
      if (firstRepId) {
        setExpandedDraft(firstRepId);
      }
    } catch (error) {
      console.error('Failed to generate drafts:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate messages');
    } finally {
      setGeneratingDrafts(false);
    }
  };

  const toggleDraft = (repId: string) => {
    setExpandedDraft(prev => prev === repId ? null : repId);
  };

  const copyDraft = async (text: string, type: 'subject' | 'content', repId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDraft(`${repId}-${type}`);
      setTimeout(() => setCopiedDraft(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="max-w-4xl w-full p-8">
        {/* Auth Error Modal */}
        {authError && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Error</h3>
                  <p className="text-gray-700">{authError}</p>
                </div>
              </div>
              <button
                onClick={() => setAuthError(null)}
                className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-gray-900">Outrage!!</h1>
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

                <p className="text-xs text-gray-500 mb-4">
                  Using data published by{' '}
                  <a
                    href="https://www.cicerodata.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-primary"
                  >
                    Cicero
                  </a>
                </p>

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

        {/* Section 4: Sign In */}
        {messageSubmitted && representatives.length > 0 && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                4
              </span>
              <h2 className="text-2xl font-semibold text-gray-800">Sign In</h2>
            </div>

            {session ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-800 font-medium">Signed in as {session.user?.email}</p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-primary underline text-sm"
                >
                  Sign out
                </button>
              </div>
            ) : signInSuccess ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-blue-800 font-medium">Check your email!</p>
                <p className="text-blue-700 text-sm mt-2">
                  We sent you a magic link to sign in. Click the link in your email to continue.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="space-y-4">
                <p className="text-gray-600 text-sm">
                  Login to generate copy-pastable messages and manage campaigns!
                </p>

                <input
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your.email@example.com"
                  required
                  disabled={signInLoading}
                />

                <button
                  type="submit"
                  className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50"
                  disabled={!signInEmail || signInLoading}
                >
                  {signInLoading ? 'Sending magic link...' : 'Sign in with email'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Section 5: Generate Messages (only shows when logged in and not yet generated) */}
        {session && messageSubmitted && representatives.length > 0 && !draftsGenerated && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                5
              </span>
              <h2 className="text-2xl font-semibold text-gray-800">Generate Messages</h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Add your personal information to make the messages more impactful, then generate drafts for your selected representatives.
              </p>

              <div>
                <label htmlFor="personalInfo" className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Information (Optional)
                </label>
                <textarea
                  id="personalInfo"
                  value={personalInfo}
                  onChange={(e) => setPersonalInfo(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="e.g., Your name, email, phone, city/state, party affiliation, relevant demographics, or anything that might help personalize your message..."
                  rows={4}
                  disabled={generatingDrafts}
                />
              </div>

              {generationError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 text-sm">{generationError}</p>
                </div>
              )}

              <button
                onClick={handleGenerateDrafts}
                disabled={generatingDrafts}
                className="w-full bg-primary text-white py-3 px-4 rounded-md hover:bg-opacity-90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generatingDrafts ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating messages...
                  </span>
                ) : (
                  'Generate Messages'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Section 6: Send Messages (only shows when drafts are generated) */}
        {session && messageSubmitted && representatives.length > 0 && draftsGenerated && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                6
              </span>
              <h2 className="text-2xl font-semibold text-gray-800">Your Generated Messages</h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                Click on each representative to view their contact information and generated message. Copy and paste the message to send it via email or their web form.
              </p>

              {representatives
                .filter(rep => selectedRepIds.includes(rep.id || '') && generatedDrafts[rep.id || ''])
                .map((rep) => {
                  const repId = rep.id || '';
                  const draft = generatedDrafts[repId];
                  const isExpanded = expandedDraft === repId;

                  return (
                    <div key={repId} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header - Always visible */}
                      <button
                        onClick={() => toggleDraft(repId)}
                        className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          {rep.photoUrl && (
                            <img
                              src={rep.photoUrl}
                              alt={rep.name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          )}
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900">{rep.name}</h3>
                            <p className="text-sm text-gray-600">{rep.office}</p>
                            {rep.party && (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-gray-200 text-gray-700">
                                {rep.party}
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          className={`w-6 h-6 text-gray-500 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-4 space-y-4 border-t border-gray-200">
                          {/* Contact Information */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Contact Information</h4>
                            <div className="space-y-2">
                              {rep.contacts.map((contact, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-lg flex-shrink-0">{getContactIcon(contact.type)}</span>
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs text-gray-500 uppercase">{contact.type}</span>
                                      <p className="text-sm text-gray-900 truncate">{contact.value}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(contact.value, `${repId}-contact-${idx}`)}
                                    className="ml-2 px-3 py-1 text-xs bg-primary text-white rounded hover:bg-opacity-90 transition-colors flex-shrink-0"
                                  >
                                    {copiedContact === `${repId}-contact-${idx}` ? 'Copied!' : 'Copy'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Generated Message */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Generated Message</h4>

                            {/* Subject */}
                            <div className="mb-3">
                              <label className="text-xs text-gray-500 uppercase mb-1 block">Subject</label>
                              <div className="flex gap-2">
                                <div className="flex-1 p-3 bg-gray-50 rounded border border-gray-200">
                                  <p className="text-sm text-gray-900">{draft.subject}</p>
                                </div>
                                <button
                                  onClick={() => copyDraft(draft.subject, 'subject', repId)}
                                  className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90 transition-colors flex-shrink-0"
                                >
                                  {copiedDraft === `${repId}-subject` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            </div>

                            {/* Message Body */}
                            <div>
                              <label className="text-xs text-gray-500 uppercase mb-1 block">Message</label>
                              <div className="flex gap-2">
                                <div className="flex-1 p-3 bg-gray-50 rounded border border-gray-200">
                                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{draft.content}</p>
                                </div>
                                <button
                                  onClick={() => copyDraft(draft.content, 'content', repId)}
                                  className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90 transition-colors flex-shrink-0"
                                >
                                  {copiedDraft === `${repId}-content` ? 'Copied!' : 'Copy'}
                                </button>
                              </div>
                            </div>

                            {/* Copy Both Button */}
                            <button
                              onClick={() => copyDraft(`${draft.subject}\n\n${draft.content}`, 'content', repId)}
                              className="mt-3 w-full px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                            >
                              Copy Subject + Message
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* Generate New Messages Button */}
              <button
                onClick={() => {
                  setDraftsGenerated(false);
                  setGeneratedDrafts({});
                  setExpandedDraft(null);
                }}
                className="w-full mt-4 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Generate New Messages
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
