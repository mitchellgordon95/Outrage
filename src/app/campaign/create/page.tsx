'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { parseDraftData, saveDraftData } from '@/utils/navigation';
import { Representative } from '@/services/representatives'; // Assuming this path and type are correct
import { geocodeAddressWithCache, loadGeocodingCache, LocationInfo } from '@/utils/geocoding';

export default function CreateCampaignPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [demands, setDemands] = useState<string[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedCampaignReps, setSelectedCampaignReps] = useState<Representative[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localStorageLoaded, setLocalStorageLoaded] = useState(false);
  const [isGeneratingInfo, setIsGeneratingInfo] = useState(false);
  const isInitialLoadDone = useRef(false);
  const hasGeneratedInfo = useRef(false);
  
  // Location state
  const [userLocation, setUserLocation] = useState<LocationInfo | null>(null);
  const [makeLocalCampaign, setMakeLocalCampaign] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

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
      router.replace('/pick-representatives'); // Or where reps are selected
      return;
    }
    // Also ensure selectedReps (IDs) are present if your logic relies on them elsewhere,
    // though for this page, draftData.representatives are primary.
    if (!draftData.selectedReps || draftData.selectedReps.length === 0) {
        alert('No representative selections found. Please select representatives first.');
        router.replace('/pick-representatives');
        return;
    }

    setDemands(draftData.demands.filter(d => d && d.trim())); // Ensure valid demands
    setRepresentatives(draftData.representatives || []); // Use draftData.representatives
    setLocalStorageLoaded(true);
    
    // Load geocoding cache
    loadGeocodingCache();
    
    // Geocode user's address
    const userAddress = localStorage.getItem('userAddress');
    if (userAddress) {
      geocodeUserAddress(userAddress);
    }
  }, [router]);
  
  const geocodeUserAddress = async (address: string) => {
    setLocationLoading(true);
    try {
      const location = await geocodeAddressWithCache(address);
      setUserLocation(location);
      // Default to making it a local campaign if location is found
      if (location.city || location.state) {
        setMakeLocalCampaign(true);
      }
    } catch (error) {
      console.error('Failed to geocode address:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  useEffect(() => {
    if (representatives.length > 0) {
      setSelectedCampaignReps(representatives);
      isInitialLoadDone.current = true;
    }
  }, [representatives]);

  // Generate campaign title and description when demands are loaded
  useEffect(() => {
    const generateCampaignInfo = async () => {
      if (demands.length > 0 && !hasGeneratedInfo.current && !title && !description) {
        hasGeneratedInfo.current = true;
        setIsGeneratingInfo(true);
        
        try {
          const response = await fetch('/api/generate-campaign-info', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ demands }),
          });

          if (response.ok) {
            const data = await response.json();
            setTitle(data.title || '');
            setDescription(data.description || '');
          } else {
            console.error('Failed to generate campaign info');
          }
        } catch (error) {
          console.error('Error generating campaign info:', error);
        } finally {
          setIsGeneratingInfo(false);
        }
      }
    };

    generateCampaignInfo();
  }, [demands, title, description]);

  // Effect to save changes to localStorage
  useEffect(() => {
    // Only save if:
    // 1. localStorage has been loaded (localStorageLoaded is true)
    // 2. The initial population of selectedCampaignReps from representatives is complete (isInitialLoadDone.current is true)
    if (localStorageLoaded && isInitialLoadDone.current) {
      const currentDraftData = parseDraftData();
      if (currentDraftData) {
        // Avoid saving if the content is identical to prevent loops or unnecessary writes
        if (JSON.stringify(currentDraftData.representatives) !== JSON.stringify(selectedCampaignReps)) {
          const updatedDraftData = {
            ...currentDraftData,
            representatives: selectedCampaignReps,
            selectedReps: [], // Clear old indices
          };
          saveDraftData(updatedDraftData);
        }
      }
    }
  }, [selectedCampaignReps, localStorageLoaded]); // This effect runs when selectedCampaignReps or localStorageLoaded changes.

  const handleToggleRepresentative = (toggledRep: Representative) => {
    setSelectedCampaignReps(prev =>
      prev.find(r => r.id === toggledRep.id)
        ? prev.filter(r => r.id !== toggledRep.id)
        : [...prev, toggledRep]
    );
  };

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

    setIsLoading(true);

    try {
      const campaignData: any = {
        title,
        description,
        demands,
        representatives: selectedCampaignReps.map(r => ({ id: r.id, name: r.name /* Add other rep fields if needed by API */ })),
      };
      
      // Add location data if making a local campaign
      if (makeLocalCampaign && userLocation) {
        campaignData.city = userLocation.city;
        campaignData.state = userLocation.stateCode || userLocation.state;
        campaignData.locationDisplay = userLocation.locationDisplay;
      }
      
      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });

      const responseData = await response.json();

      if (response.ok) { // Typically 201 for created
        if (responseData.id) {
          localStorage.setItem('activeCampaignId', responseData.id.toString());
          // Redirect to the campaign view page
          router.push(`/campaign/${responseData.id}`);
        } else {
          // Fallback if no ID returned
          router.push('/');
        }
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
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Pre-Selected Representatives (Optional):</h2>
            <p className="text-sm text-gray-600 mb-3">Choose representatives to suggest. Users can always add more.</p>
            {representatives.length > 0 ? (
              <div className="space-y-2">
                {representatives.map((rep, index) => {
                  const isSelected = selectedCampaignReps.some(r => r.id === rep.id);
                  
                  // Level-based colors
                  const levelColors = {
                    local: 'bg-indigo-50 border-indigo-200 text-indigo-700',
                    state: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                    country: 'bg-amber-50 border-amber-200 text-amber-700'
                  };
                  
                  const colorClass = levelColors[rep.level || 'local'];
                  
                  return (
                    <div 
                      key={rep.id || index} 
                      className={`flex items-center p-3 border rounded-md transition-all ${
                        isSelected 
                          ? `${colorClass} ring-2 ring-offset-1 ${
                              rep.level === 'local' ? 'ring-indigo-400' :
                              rep.level === 'state' ? 'ring-emerald-400' :
                              'ring-amber-400'
                            }`
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`rep-${rep.id || index}`}
                        name={rep.name}
                        checked={isSelected}
                        onChange={() => handleToggleRepresentative(rep)}
                        className="mr-3 h-4 w-4 text-primary accent-primary"
                      />
                      <label 
                        htmlFor={`rep-${rep.id || index}`} 
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {/* Photo */}
                          <div className="flex-shrink-0">
                            {rep.photoUrl ? (
                              <img 
                                src={rep.photoUrl} 
                                alt={`Photo of ${rep.name}`}
                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.onerror = null;
                                  target.parentElement!.innerHTML = `
                                    <div class="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-gray-500 font-medium">
                                      ${rep.name.charAt(0)}
                                    </div>
                                  `;
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center text-gray-500 font-medium">
                                {rep.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <div className={`font-medium ${isSelected ? '' : 'text-gray-900'}`}>
                              {rep.office}
                            </div>
                            <div className={`text-sm ${isSelected ? 'opacity-90' : 'text-gray-600'}`}>
                              {rep.name}
                              {rep.party && (
                                <span className="ml-2 text-xs">
                                  ({rep.party})
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {/* Level indicator */}
                          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                            rep.level === 'local' ? 'bg-indigo-100 text-indigo-700' :
                            rep.level === 'state' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {rep.level === 'country' ? 'Federal' : rep.level || 'Local'}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500">No representatives selected.</p>
            )}
          </div>
          
          <hr className="my-6" />

          <div className="mb-4">
            <label htmlFor="campaignTitle" className="block text-lg font-medium text-gray-700 mb-1">
              Campaign Title <span className="text-red-500">*</span>
              {isGeneratingInfo && (
                <span className="ml-2 text-sm text-gray-500 italic">
                  (AI generating suggestion...)
                </span>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                id="campaignTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                required
                disabled={isGeneratingInfo}
              />
              {isGeneratingInfo && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="campaignDescription" className="block text-lg font-medium text-gray-700 mb-1">
              Campaign Description (Optional)
              {isGeneratingInfo && (
                <span className="ml-2 text-sm text-gray-500 italic">
                  (AI generating suggestion...)
                </span>
              )}
            </label>
            <div className="relative">
              <textarea
                id="campaignDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                disabled={isGeneratingInfo}
              />
              {isGeneratingInfo && (
                <div className="absolute right-3 top-3">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>

          {/* Location Selection */}
          {userLocation && (userLocation.city || userLocation.state) && (
            <div className="mb-6 p-4 bg-gray-50 rounded-md border border-gray-200">
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={makeLocalCampaign}
                  onChange={(e) => setMakeLocalCampaign(e.target.checked)}
                  className="mt-1 h-4 w-4 text-primary accent-primary"
                  disabled={locationLoading}
                />
                <div className="flex-1">
                  <span className="font-medium text-gray-700">
                    Make this a local campaign for {userLocation.locationDisplay}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    Local campaigns are shown to users in your area, helping mobilize your community around shared issues.
                  </p>
                </div>
              </label>
            </div>
          )}
          
          {locationLoading && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
              <p className="flex items-center">
                <span className="mr-2">Detecting your location...</span>
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded-md">
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !title.trim() || demands.length === 0}
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
