'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import PersonalInfoCheckboxes from '@/components/PersonalInfoCheckboxes';
import CampaignCarousel from '@/components/campaigns/CampaignCarousel';
import { Campaign } from '@/types/campaign';
import Link from 'next/link';
import Autocomplete from 'react-google-autocomplete';
import MarkdownContent from '@/components/MarkdownContent';

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
  const { data: session, status } = useSession();

  // Section 1: Address
  const [address, setAddress] = useState('');
  const [addressSubmitted, setAddressSubmitted] = useState(false);

  // Section 2: What's on your mind
  const [message, setMessage] = useState('');
  const [messageSubmitted, setMessageSubmitted] = useState(false);
  const [previousMessage, setPreviousMessage] = useState('');
  const [showUndo, setShowUndo] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Section 3: Representatives
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedRepIds, setSelectedRepIds] = useState<string[]>([]); // AI-selected reps
  const [userSelectedRepIds, setUserSelectedRepIds] = useState<string[]>([]); // User-checked reps
  const [selectionSummary, setSelectionSummary] = useState<string>('');
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [copiedContact, setCopiedContact] = useState<string | null>(null);
  const [repsLoading, setRepsLoading] = useState(false);
  const [repsError, setRepsError] = useState<string | null>(null);
  const [expandedRep, setExpandedRep] = useState<string | null>(null);

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

  // Personal info detection
  const [detectedCategories, setDetectedCategories] = useState({
    name: false,
    email: false,
    phone: false,
    location: false,
    party: false,
    demographics: false,
    occupation: false,
    community_role: false,
    why_you_care: false,
  });
  const [detecting, setDetecting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

      // Restore personal info
      const savedPersonalInfo = localStorage.getItem('personalInfo');
      if (savedPersonalInfo) {
        setPersonalInfo(savedPersonalInfo);
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

      const savedUserSelectedIds = localStorage.getItem('userSelectedRepIds');
      if (savedUserSelectedIds) {
        const parsedIds = JSON.parse(savedUserSelectedIds);
        setUserSelectedRepIds(parsedIds);
      } else {
        // If no user selection exists, default to AI-selected reps
        const savedSelectedIds = localStorage.getItem('selectedRepIds');
        if (savedSelectedIds) {
          const parsedIds = JSON.parse(savedSelectedIds);
          setUserSelectedRepIds(parsedIds);
        }
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
      localStorage.removeItem('personalInfo');
      localStorage.removeItem('representatives');
      localStorage.removeItem('selectedRepIds');
      localStorage.removeItem('selectionSummary');
      localStorage.removeItem('explanations');
    }
  }, []);

  // Handle campaign URL flow - when user comes from a campaign page
  useEffect(() => {
    try {
      const fromCampaign = localStorage.getItem('fromCampaign');
      if (fromCampaign) {
        // Clear the flag
        localStorage.removeItem('fromCampaign');

        // If we have both address and message (set by campaign page), scroll to Section 3
        const savedAddress = localStorage.getItem('userAddress');
        const savedMessage = localStorage.getItem('userMessage');

        if (savedAddress && savedMessage) {
          // Trigger the message submit to fetch representatives
          setAddressSubmitted(true);
          setMessageSubmitted(true);

          // Auto-submit to load representatives
          setTimeout(async () => {
            try {
              setRepsLoading(true);
              setRepsError(null);

              const lookupResponse = await fetch('/api/lookup-representatives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: savedAddress })
              });

              if (!lookupResponse.ok) {
                throw new Error('Failed to lookup representatives');
              }

              const { representatives: reps } = await lookupResponse.json();
              setRepresentatives(reps);

              const selectResponse = await fetch('/api/select-representatives', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  demands: [savedMessage],
                  representatives: reps
                })
              });

              if (!selectResponse.ok) {
                throw new Error('Failed to select representatives');
              }

              const { selectedIds, summary, explanations: repExplanations } = await selectResponse.json();
              setSelectedRepIds(selectedIds);
              setUserSelectedRepIds(selectedIds);
              setSelectionSummary(summary || '');
              setExplanations(repExplanations || {});

              localStorage.setItem('representatives', JSON.stringify(reps));
              localStorage.setItem('selectedRepIds', JSON.stringify(selectedIds));
              localStorage.setItem('userSelectedRepIds', JSON.stringify(selectedIds));
              localStorage.setItem('selectionSummary', summary || '');
              localStorage.setItem('explanations', JSON.stringify(repExplanations || {}));

            } catch (error) {
              console.error('Error fetching representatives:', error);
              setRepsError('Failed to load representatives. Please try again.');
            } finally {
              setRepsLoading(false);
            }
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to handle campaign flow:', error);
    }
  }, []);


  // Save personal info to localStorage when it changes
  useEffect(() => {
    if (personalInfo) {
      localStorage.setItem('personalInfo', personalInfo);
    } else {
      localStorage.removeItem('personalInfo');
    }
  }, [personalInfo]);

  // Debounced personal info detection
  useEffect(() => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!personalInfo.trim()) {
      setDetectedCategories({
        name: false,
        email: false,
        phone: false,
        location: false,
        party: false,
        demographics: false,
        occupation: false,
        community_role: false,
        why_you_care: false,
      });
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timeoutId = setTimeout(async () => {
      setDetecting(true);
      try {
        const response = await fetch('/api/detect-personal-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: personalInfo }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Detection failed');
        }

        const data = await response.json();
        setDetectedCategories(data.detected);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // Request was cancelled - ignore
          return;
        }
        console.error('Detection failed:', error);
        // Fail silently - keep existing checkboxes state
      } finally {
        setDetecting(false);
        abortControllerRef.current = null;
      }
    }, 800); // 800ms debounce

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [personalInfo]);

  const resetDownstreamState = () => {
    // Reset Section 2: Message
    setMessage('');
    setMessageSubmitted(false);
    setPreviousMessage('');
    setShowUndo(false);
    setSelectedCampaign(null);

    // Reset Section 3: Representatives
    setRepresentatives([]);
    setSelectedRepIds([]);
    setUserSelectedRepIds([]);
    setSelectionSummary('');
    setExplanations({});
    setExpandedRep(null);
    setRepsError(null);

    // Reset Section 5: Generate Messages
    setGeneratedDrafts({});
    setGeneratingDrafts(false);
    setGenerationError(null);
    setDraftsGenerated(false);

    // Reset Section 6: Send Messages
    setExpandedDraft(null);

    // Clear localStorage for downstream data
    localStorage.removeItem('userMessage');
    localStorage.removeItem('representatives');
    localStorage.removeItem('selectedRepIds');
    localStorage.removeItem('userSelectedRepIds');
    localStorage.removeItem('selectionSummary');
    localStorage.removeItem('explanations');
    localStorage.removeItem('fromCampaign');
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    // Check if address actually changed
    const previousAddress = localStorage.getItem('userAddress');
    if (previousAddress && previousAddress !== address) {
      resetDownstreamState();
    }

    localStorage.setItem('userAddress', address);
    setAddressSubmitted(true);
  };

  const handleCampaignSelect = (campaign: Campaign) => {
    // Save current message before replacing it
    setPreviousMessage(message);
    setSelectedCampaign(campaign);

    // Update message with campaign message
    const campaignMessage = campaign.message || campaign.description || '';
    setMessage(campaignMessage);
    setShowUndo(true);

    // Store campaign ID so we can track when message is actually sent
    localStorage.setItem('fromCampaign', campaign.id.toString());
  };

  const handleUndo = () => {
    setMessage(previousMessage);
    setPreviousMessage('');
    setSelectedCampaign(null);
    setShowUndo(false);
    localStorage.removeItem('fromCampaign');
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
      setUserSelectedRepIds(selectedIds); // Initialize user selection with AI selection
      setSelectionSummary(summary || '');
      setExplanations(repExplanations || {});

      // Store in localStorage
      localStorage.setItem('representatives', JSON.stringify(reps));
      localStorage.setItem('selectedRepIds', JSON.stringify(selectedIds));
      localStorage.setItem('userSelectedRepIds', JSON.stringify(selectedIds));
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

  const toggleRepSelection = (repId: string) => {
    setUserSelectedRepIds(prev => {
      const newIds = prev.includes(repId)
        ? prev.filter(id => id !== repId)
        : [...prev, repId];
      localStorage.setItem('userSelectedRepIds', JSON.stringify(newIds));
      return newIds;
    });
  };

  const handleSelectAll = () => {
    setUserSelectedRepIds(selectedRepIds);
    localStorage.setItem('userSelectedRepIds', JSON.stringify(selectedRepIds));
  };

  const handleSelectNone = () => {
    setUserSelectedRepIds([]);
    localStorage.setItem('userSelectedRepIds', JSON.stringify([]));
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
      // Use user-selected reps instead of AI-selected
      const selectedReps = representatives.filter(rep =>
        userSelectedRepIds.includes(rep.id || '')
      );

      if (selectedReps.length === 0) {
        throw new Error('Please select at least one representative');
      }

      // Generate all drafts in parallel for better performance
      const draftPromises = selectedReps.map(async (rep) => {
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
          return { repId: rep.id!, draft };
        } catch (error) {
          console.error(`Failed to generate draft for ${rep.name}:`, error);
          return null;
        }
      });

      const results = await Promise.all(draftPromises);
      const drafts: Record<string, { subject: string; content: string }> = {};

      results.forEach(result => {
        if (result && result.repId) {
          drafts[result.repId] = result.draft;
        }
      });

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

  const copyDraft = async (text: string, type: 'subject' | 'content' | 'both', repId: string) => {
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
          <div className="flex justify-end mb-2">
            {session && (
              <Link
                href="/campaigns/manage"
                className="text-sm text-primary hover:underline font-medium"
              >
                Manage Campaigns →
              </Link>
            )}
          </div>
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

          {addressSubmitted ? (
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

              <Autocomplete
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                onPlaceSelected={(place) => {
                  if (place && place.formatted_address) {
                    setAddress(place.formatted_address);
                  }
                }}
                options={{
                  componentRestrictions: { country: 'us' },
                  fields: ['address_components', 'formatted_address', 'geometry'],
                  types: ['address']
                }}
                value={address}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddress(e.target.value)}
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
                <div className="text-green-800">
                  <MarkdownContent content={message} className="prose-green" />
                </div>
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

                <div className="space-y-2">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary min-h-[100px]"
                    placeholder="Write about the issues that matter to you..."
                    required
                  />

                  {showUndo && (
                    <button
                      type="button"
                      onClick={handleUndo}
                      className="text-sm text-primary hover:underline"
                    >
                      ← Undo (restore previous message)
                    </button>
                  )}
                </div>

                {/* Campaign Carousel */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Or join a campaign:</h3>
                  <CampaignCarousel
                    userMessage={message}
                    onCampaignSelect={handleCampaignSelect}
                  />
                </div>

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

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleSelectNone}
                    className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors font-medium"
                  >
                    Select None
                  </button>
                </div>

                {/* Representative badges */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {representatives
                    .filter(rep => rep.id && selectedRepIds.includes(rep.id))
                    .map((rep) => {
                      const repId = rep.id || '';
                      const isSelected = userSelectedRepIds.includes(repId);
                      const isExpanded = expandedRep === repId;
                      return (
                        <button
                          key={repId}
                          onClick={() => setExpandedRep(isExpanded ? null : repId)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 transition-all ${
                            isExpanded
                              ? `border-current ${getLevelColor(rep.level)}`
                              : isSelected
                              ? 'border-primary bg-blue-50'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}
                        >
                          {rep.photoUrl && (
                            <img
                              src={rep.photoUrl}
                              alt={rep.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <span className={`text-sm font-medium ${isExpanded ? '' : isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                            {rep.name}
                          </span>
                          {isSelected && (
                            <span className="text-green-600 text-sm">✓</span>
                          )}
                        </button>
                      );
                    })}
                </div>

                {/* Expanded representative details */}
                {(() => {
                  const selectedRep = representatives.find(rep => rep.id === expandedRep);
                  if (!selectedRep) return null;

                  const isChecked = userSelectedRepIds.includes(expandedRep || '');

                  return (
                    <div className="space-y-6 border-t border-gray-200 pt-6">
                      {/* Representative header with selection toggle */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {selectedRep.photoUrl && (
                            <img
                              src={selectedRep.photoUrl}
                              alt={selectedRep.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-semibold text-gray-900">{selectedRep.name}</h3>
                              <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getLevelColor(selectedRep.level)}`}>
                                {getLevelLabel(selectedRep.level)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{selectedRep.office}</p>
                            {selectedRep.party && (
                              <p className="text-sm text-gray-500">{selectedRep.party}</p>
                            )}

                            {/* Contact icons */}
                            <div className="flex gap-2 mt-2">
                              {selectedRep.contacts.slice(0, 3).map((contact, idx) => {
                                const contactKey = `${expandedRep}-${idx}`;
                                const isCopied = copiedContact === contactKey;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => copyToClipboard(contact.value, contactKey)}
                                    className="text-xl hover:scale-110 transition-transform cursor-pointer relative group"
                                    title={`Click to copy ${contact.type}`}
                                  >
                                    {getContactIcon(contact.type)}
                                    {isCopied && (
                                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                                        Copied!
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRepSelection(expandedRep || '');
                          }}
                          className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                            isChecked
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {isChecked ? '✓ Selected' : 'Select'}
                        </button>
                      </div>

                      {/* AI Explanation */}
                      {expandedRep && explanations[expandedRep] && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-xs font-semibold text-blue-900 mb-1 uppercase">Why AI selected this representative</p>
                          <p className="text-sm text-blue-800">{explanations[expandedRep]}</p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-center text-gray-500 bg-gray-50 p-4 rounded-md border border-gray-200">
                <p>No representatives found for your address.</p>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Sign In */}
        {messageSubmitted && !repsLoading && representatives.length > 0 && (
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

        {/* Section 5: Generate Messages (only shows when logged in) */}
        {session && messageSubmitted && !repsLoading && representatives.length > 0 && (
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

                {/* Auto-detecting checkboxes */}
                <PersonalInfoCheckboxes detected={detectedCategories} detecting={detecting} />

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
                ) : draftsGenerated ? (
                  'Regenerate Messages'
                ) : (
                  'Generate Messages'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Section 6: Send Messages (only shows when drafts are generated) */}
        {session && messageSubmitted && !repsLoading && representatives.length > 0 && draftsGenerated && (
          <div className="bg-white p-8 rounded-lg shadow-md mb-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                6
              </span>
              <h2 className="text-2xl font-semibold text-gray-800">Your Generated Messages</h2>
            </div>

            <div className="space-y-4">
              <p className="text-gray-600 text-sm mb-4">
                Click on a representative to view their contact information and generated message.
              </p>

              {/* Representative badges */}
              <div className="flex flex-wrap gap-2 mb-6">
                {representatives
                  .filter(rep => userSelectedRepIds.includes(rep.id || '') && generatedDrafts[rep.id || ''])
                  .map((rep) => {
                    const repId = rep.id || '';
                    const isSelected = expandedDraft === repId;
                    return (
                      <button
                        key={repId}
                        onClick={() => setExpandedDraft(repId)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-full border-2 transition-all ${
                          isSelected
                            ? `border-current ${getLevelColor(rep.level)}`
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {rep.photoUrl && (
                          <img
                            src={rep.photoUrl}
                            alt={rep.name}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        )}
                        <span className={`text-sm font-medium ${isSelected ? '' : 'text-gray-600'}`}>
                          {rep.name}
                        </span>
                      </button>
                    );
                  })}
              </div>

              {/* Selected representative's content */}
              {(() => {
                const selectedRep = representatives.find(rep => rep.id === expandedDraft);
                if (!selectedRep || !generatedDrafts[expandedDraft || '']) return null;

                const draft = generatedDrafts[expandedDraft || ''];

                return (
                  <div className="space-y-6">
                    {/* Representative Info */}
                    <div className="pb-4 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900">{selectedRep.office}</h3>
                      {selectedRep.party && (
                        <p className="text-sm text-gray-600 mt-1">{selectedRep.party}</p>
                      )}
                    </div>

                    {/* Generated Message */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Generated Message</h4>

                      {/* Subject */}
                      <div className="mb-4">
                        <label className="text-xs text-gray-500 uppercase mb-2 block">Subject</label>
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <p className="text-sm text-gray-900">{draft.subject}</p>
                        </div>
                      </div>

                      {/* Message Body */}
                      <div>
                        <label className="text-xs text-gray-500 uppercase mb-2 block">Message</label>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-3">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">{draft.content}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyDraft(draft.content, 'content', expandedDraft || '')}
                            className="flex-1 px-4 py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90 transition-colors font-medium"
                          >
                            {copiedDraft === `${expandedDraft}-content` ? 'Copied Message!' : 'Copy Message'}
                          </button>
                          <button
                            onClick={() => copyDraft(`${draft.subject}\n\n${draft.content}`, 'both', expandedDraft || '')}
                            className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                          >
                            {copiedDraft === `${expandedDraft}-both` ? 'Copied Both!' : 'Copy Subject + Message'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Contact Methods</h4>
                      <div className="space-y-2">
                        {selectedRep.contacts.map((contact, idx) => {
                          const contactType = contact.type.toLowerCase();
                          const isEmail = contactType === 'email';
                          const isWebform = contactType === 'webform' || contactType === 'web form';

                          return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-base flex-shrink-0">{getContactIcon(contact.type)}</span>
                                <div className="flex-1 min-w-0">
                                  <span className="text-xs text-gray-500 uppercase block">{contact.type}</span>
                                  <p className="text-sm text-gray-900 truncate">{contact.value}</p>
                                </div>
                              </div>
                              {isEmail ? (
                                <a
                                  href={`mailto:${contact.value}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.content)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    // Track message sent if this came from a campaign
                                    const fromCampaignId = localStorage.getItem('fromCampaign');
                                    if (fromCampaignId) {
                                      fetch(`/api/campaigns/${fromCampaignId}/increment`, {
                                        method: 'POST',
                                      }).catch(err => console.error('Failed to increment campaign count:', err));
                                    }
                                  }}
                                  className="ml-2 px-3 py-1 text-xs bg-primary text-white rounded hover:bg-opacity-90 transition-colors flex-shrink-0"
                                >
                                  Send Email
                                </a>
                              ) : isWebform ? (
                                <a
                                  href={contact.value}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => {
                                    // Track message sent if this came from a campaign
                                    const fromCampaignId = localStorage.getItem('fromCampaign');
                                    if (fromCampaignId) {
                                      fetch(`/api/campaigns/${fromCampaignId}/increment`, {
                                        method: 'POST',
                                      }).catch(err => console.error('Failed to increment campaign count:', err));
                                    }
                                  }}
                                  className="ml-2 px-3 py-1 text-xs bg-primary text-white rounded hover:bg-opacity-90 transition-colors flex-shrink-0"
                                >
                                  Open Form
                                </a>
                              ) : (
                                <button
                                  onClick={() => copyToClipboard(contact.value, `${expandedDraft}-contact-${idx}`)}
                                  className="ml-2 px-3 py-1 text-xs bg-primary text-white rounded hover:bg-opacity-90 transition-colors flex-shrink-0"
                                >
                                  {copiedContact === `${expandedDraft}-contact-${idx}` ? 'Copied!' : 'Copy'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
