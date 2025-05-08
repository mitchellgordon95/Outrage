'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Representative, getRepresentativesByAddress } from '@/services/representatives';

export default function IssueDetailsPage() {
  const router = useRouter();
  const DEFAULT_DEMAND = 'Do a better job';
  const [demands, setDemands] = useState<string[]>([DEFAULT_DEMAND]);
  const [personalInfo, setPersonalInfo] = useState('');
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedReps, setSelectedReps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [address, setAddress] = useState('');
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [isAiSelecting, setIsAiSelecting] = useState(false); // For "Pick for Me" feature
  const [selectionSummary, setSelectionSummary] = useState<string | null>(null); // Summary of AI selection
  const [selectionExplanations, setSelectionExplanations] = useState<Record<string, string>>({}); // Individual explanations
  const addressInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Get the address from localStorage
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      router.push('/'); // Redirect to home page to enter address
      return;
    }
    
    setAddress(storedAddress);
    setNewAddress(storedAddress);
    
    // Check if we have draft data from previous visit
    const storedDraftData = localStorage.getItem('draftData');
    if (storedDraftData) {
      try {
        const {
          demands: storedDemands,
          personalInfo: storedPersonalInfo,
          selectedReps: storedSelectedReps
        } = JSON.parse(storedDraftData);
        
        // Restore demands and personal info
        if (Array.isArray(storedDemands) && storedDemands.length > 0) {
          setDemands(storedDemands);
        }
        
        if (storedPersonalInfo) {
          setPersonalInfo(storedPersonalInfo);
        }
        
        // We'll restore selected reps after fetching representatives
        const selectedRepsSet = new Set(storedSelectedReps || []);
        
        // Fetch representatives and then restore selection
        fetchRepresentatives(storedAddress, selectedRepsSet);
      } catch (error) {
        console.error('Error restoring draft data:', error);
        // Fetch representatives normally if there's an error
        fetchRepresentatives(storedAddress);
      }
    } else {
      // Fetch representatives normally if there's no stored draft data
      fetchRepresentatives(storedAddress);
    }
  }, [router]);
  
  // Save state whenever any relevant state changes
  useEffect(() => {
    if (!address) return; // Don't save if we don't have an address yet (initial load)
    
    const draftData = {
      demands,
      personalInfo,
      selectedReps: Array.from(selectedReps)
    };
    localStorage.setItem('draftData', JSON.stringify(draftData));
  }, [demands, personalInfo, selectedReps, address]);

  // Set up Google Maps autocomplete when editing address
  useEffect(() => {
    if (!isEditingAddress || !addressInputRef.current) return;
    
    // Check if the API key is available
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
      // Only remove if it exists
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [isEditingAddress]);
  
  const initAddressAutocomplete = () => {
    if (!addressInputRef.current || !window.google) return;
    
    const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address', 'geometry'],
      types: ['address']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place && place.formatted_address) {
        setNewAddress(place.formatted_address);
      }
    });
  };
  
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchRepresentatives = async (address: string, initialSelectedReps?: Set<number>) => {
    let progressInterval: NodeJS.Timeout | null = null;
    
    try {
      setIsLoading(true);
      setApiError(null);
      setLoadingProgress(0);
      
      // Simulate progress for UX
      progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          const newProgress = prev + 5;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 200);
      
      const reps = await getRepresentativesByAddress(address);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      setLoadingProgress(100);
      
      setRepresentatives(reps);
      
      // If we have previously selected representatives, use those
      // Otherwise select all representatives by default
      if (initialSelectedReps && initialSelectedReps.size > 0) {
        // Filter out any invalid indexes
        const validSelectedReps = new Set(
          [...initialSelectedReps].filter(index => index < reps.length)
        );
        
        // If all previously selected reps are invalid, select all by default
        if (validSelectedReps.size === 0) {
          setSelectedReps(new Set(reps.map((_, index) => index)));
        } else {
          setSelectedReps(validSelectedReps);
        }
      } else {
        // Select all representatives by default
        setSelectedReps(new Set(reps.map((_, index) => index)));
      }
    } catch (error) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      console.error('Error fetching representatives:', error);
      
      if (error instanceof Error) {
        setApiError(error.message);
      } else {
        setApiError('An unexpected error occurred while fetching representatives');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddDemand = () => {
    setDemands([...demands, '']);
  };

  const handleDemandChange = (index: number, value: string) => {
    const newDemands = [...demands];
    newDemands[index] = value;
    setDemands(newDemands);
  };

  const handleRemoveDemand = (index: number) => {
    if (demands.length <= 1) return;
    const newDemands = demands.filter((_, i) => i !== index);
    setDemands(newDemands);
  };

  const toggleRepresentative = (index: number) => {
    const newSelected = new Set(selectedReps);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedReps(newSelected);
  };
  
  // Handler for the "Pick for Me" feature
  const handlePickForMe = async () => {
    // Check if there are any valid demands entered
    const validDemands = demands.filter(demand => demand.trim());
    if (validDemands.length === 0) {
      console.error('No valid demands to analyze');
      return;
    }
    
    // Reset previous summary and explanations
    setSelectionSummary(null);
    setSelectionExplanations({});
    
    // Set loading state
    setIsAiSelecting(true);
    
    try {
      // Call the AI selection API
      const response = await fetch('/api/select-representatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          demands: validDemands,
          representatives: representatives
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update selected representatives based on the AI's recommendations
      if (data.selectedIndices && Array.isArray(data.selectedIndices)) {
        setSelectedReps(new Set(data.selectedIndices));
        
        // Update summary and explanations
        if (data.summary) {
          setSelectionSummary(data.summary);
        }
        
        if (data.explanations && typeof data.explanations === 'object') {
          setSelectionExplanations(data.explanations);
        }
      }
    } catch (error) {
      console.error('Error during AI selection:', error);
      // You could add a toast notification here in a real app
    } finally {
      setIsAiSelecting(false);
    }
  };
  
  const handleEditAddress = () => {
    setIsEditingAddress(true);
  };
  
  const handleCancelEditAddress = () => {
    setIsEditingAddress(false);
    setNewAddress(address); // Reset to current address
  };
  
  const handleSaveAddress = () => {
    if (!newAddress.trim()) return;
    
    // Save to localStorage and update state
    localStorage.setItem('userAddress', newAddress);
    setAddress(newAddress);
    setIsEditingAddress(false);
    
    // Fetch representatives for the new address
    fetchRepresentatives(newAddress);
  };

  const handleGenerateDraft = async () => {
    // First check if there are any valid demands entered
    const validDemands = demands.filter(demand => demand.trim());
    if (validDemands.length === 0) {
      console.error('No valid demands to generate draft');
      return;
    }
    
    setIsDraftLoading(true);
    
    try {
      console.log('Original demands:', demands);
      console.log('Valid demands after filtering:', validDemands);
      
      // Prepare data for draft generation
      const draftData = {
        demands: validDemands,
        personalInfo: personalInfo.trim(),
        representatives: representatives.filter((_, index) => selectedReps.has(index)),
        selectedReps: Array.from(selectedReps)
      };
      
      console.log('Draft data being saved:', draftData);
      
      // Save to localStorage for the draft preview page
      localStorage.setItem('draftData', JSON.stringify(draftData));
      
      // Navigate to the draft preview page where actual generation will happen
      router.push('/draft-preview');
    } catch (error) {
      console.error('Error preparing draft data:', error);
      setIsDraftLoading(false);
    }
  };


  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      {/* Header with title that links back home */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-6">
        <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-primary">
          Outrage
        </Link>
      </header>
      
      <div className="max-w-4xl w-full bg-white p-6 md:p-8 rounded-lg shadow-md">
        {/* Address display with change button */}
        <div className="mb-6 p-4 bg-gray-100 rounded-md">
          {isEditingAddress ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-medium">Update your address:</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={addressInputRef}
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter your full address"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveAddress}
                    className="px-3 py-1 bg-primary text-white rounded hover:bg-opacity-90 text-sm"
                    disabled={!newAddress.trim()}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEditAddress}
                    className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Your address:</p>
                <p>{address}</p>
              </div>
              <button
                onClick={handleEditAddress}
                className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
              >
                Change
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column: Demands and Personal Info */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Demands</h2>
            <div className="space-y-3 mb-6">
              {demands.map((demand, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={demand}
                    onChange={(e) => handleDemandChange(index, e.target.value)}
                    placeholder={`Enter your demand here`}
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={() => handleRemoveDemand(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                    disabled={demands.length <= 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleAddDemand}
              className="mb-6 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              + Add Another Demand
            </button>
            
            <h2 className="text-xl font-semibold mb-4">Personal Information (Optional)</h2>
            <div className="mb-8">
              <textarea
                value={personalInfo}
                onChange={(e) => setPersonalInfo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md min-h-[80px]"
                placeholder="Name, Party Affiliation, Demographic Info, etc."
              />
              <p className="text-sm text-gray-500 mt-1">
                This information will make your email more personal and effective.
              </p>
            </div>
          </div>
          
          {/* Right column: Representatives */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Your Representatives</h2>
              
              {/* Pick for Me button */}
              {!isLoading && representatives.length > 0 && (
                <button
                  onClick={handlePickForMe}
                  disabled={isAiSelecting || demands.filter(d => d.trim()).length === 0}
                  className="px-3 py-1.5 bg-primary text-white rounded hover:bg-opacity-90 flex items-center space-x-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isAiSelecting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Selecting...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Pick for Me</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {isLoading ? (
              <div className="text-center py-8">
                <div className="mb-4 h-2 bg-gray-200 rounded">
                  <div
                    className="h-full bg-primary rounded transition-all duration-300"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                <p>Loading your representatives...</p>
              </div>
            ) : apiError ? (
              <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-md">
                <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Representatives</h2>
                <p className="text-red-700 mb-4">
                  {apiError}
                </p>
                <div className="mb-4 text-sm text-gray-700">
                  <p>Possible solutions:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Check that you entered a valid US address</li>
                    <li>Try a different address if the problem persists</li>
                  </ul>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => fetchRepresentatives(address)}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90"
                  >
                    Retry
                  </button>
                  <button 
                    onClick={handleEditAddress}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 inline-flex items-center"
                  >
                    Change Address
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
                {/* Group and display representatives by level - Local first */}
                {['local', 'state', 'country'].map(level => {
                  // Filter representatives by level
                  const levelReps = representatives.filter(rep => rep.level === level);
                  
                  // Skip empty sections
                  if (levelReps.length === 0) return null;
                  
                  // Convert level to display name
                  const levelTitle = level === 'local' ? 'Local' : level === 'state' ? 'State' : 'Federal';
                  
                  return (
                    <div key={level} className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 border-b pb-2">{levelTitle} Representatives</h3>
                      <div className="space-y-3">
                        {levelReps.map((rep, repIndex) => {
                          // Find the original index in the full representatives array
                          const index = representatives.findIndex(r => r === rep);
                          
                          return (
                            <div key={index} className="p-4 border border-gray-200 rounded-md hover:border-gray-300">
                              <div className="flex items-start">
                                <input
                                  type="checkbox"
                                  id={`rep-${index}`}
                                  checked={selectedReps.has(index)}
                                  onChange={() => toggleRepresentative(index)}
                                  className="mt-1 mr-3"
                                />
                                <div>
                                  <h3 className="font-medium">{rep.name}</h3>
                                  <p className="text-sm text-gray-600">{rep.office}</p>
                                  {rep.party && <p className="text-sm text-gray-600">{rep.party}</p>}
                                  {rep.emails && rep.emails.length > 0 && (
                                    <p className="text-sm break-words">{rep.emails[0]}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                
                {representatives.length === 0 && !apiError && (
                  <div className="text-center py-4 text-gray-500">
                    No representatives found for your address.
                  </div>
                )}
              </div>
            )}
            
            {/* Selection Summary */}
            {!isLoading && selectionSummary && (
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">AI Selection Summary</h3>
                <p className="text-blue-700 mb-3">{selectionSummary}</p>
                
                {Object.keys(selectionExplanations).length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-blue-800 mb-1">Why these representatives were selected:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-blue-700">
                      {Object.entries(selectionExplanations).map(([index, explanation]) => {
                        const rep = representatives[parseInt(index)];
                        return rep ? (
                          <li key={index} className="text-sm">
                            <span className="font-semibold">{rep.name}</span>: {explanation}
                          </li>
                        ) : null;
                      })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Draft Generation Button */}
        <div className="mt-8 mb-4">
          <button
            onClick={handleGenerateDraft}
            disabled={
              isDraftLoading || 
              representatives.length === 0 || 
              selectedReps.size === 0 || 
              demands.filter(d => d.trim()).length === 0
            }
            className="w-full py-3 bg-secondary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isDraftLoading ? 'Generating Draft...' : 'Preview Draft'}
          </button>
        </div>
      </div>
    </main>
  );
}