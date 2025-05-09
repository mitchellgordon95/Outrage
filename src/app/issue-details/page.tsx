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
          selectedReps: storedSelectedReps,
          selectionSummary: storedSummary,
          selectionExplanations: storedExplanations
        } = JSON.parse(storedDraftData);
        
        // Restore demands and personal info
        if (Array.isArray(storedDemands) && storedDemands.length > 0) {
          setDemands(storedDemands);
        }
        
        if (storedPersonalInfo) {
          setPersonalInfo(storedPersonalInfo);
        }
        
        // Restore AI selection info if available
        if (storedSummary) {
          setSelectionSummary(storedSummary);
        }
        
        if (storedExplanations && typeof storedExplanations === 'object') {
          setSelectionExplanations(storedExplanations);
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
      selectedReps: Array.from(selectedReps),
      selectionSummary,
      selectionExplanations
    };
    localStorage.setItem('draftData', JSON.stringify(draftData));
  }, [demands, personalInfo, selectedReps, address, selectionSummary, selectionExplanations]);

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

  const fetchRepresentatives = async (address: string, initialSelectedReps?: Set<unknown>) => {
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
      
      // Log officials without email
      const repsWithoutEmail = reps.filter(rep => !rep.contacts || !rep.contacts.some(c => c.type === 'email'));
      console.log(`Representatives without email: ${repsWithoutEmail.length}/${reps.length}`);
      
      setLoadingProgress(100);
      
      setRepresentatives(reps);
      
      // If we have previously selected representatives, use those
      // Otherwise start with no selection for new addresses
      if (initialSelectedReps && initialSelectedReps.size > 0) {
        // Filter out any invalid indexes
        const validSelectedReps = new Set<number>();
        
        // Convert to array and filter
        Array.from(initialSelectedReps).forEach(item => {
          const index = Number(item);
          if (!isNaN(index) && index < reps.length) {
            validSelectedReps.add(index);
          }
        });
        
        setSelectedReps(validSelectedReps);
      } else {
        // Start with no selected representatives for new addresses
        setSelectedReps(new Set<number>());
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
    // Check if the representative has any contact methods
    const rep = representatives[index];
    const hasContacts = rep?.contacts && rep.contacts.length > 0;
    
    // Only allow toggling if the representative has at least one contact method
    if (hasContacts) {
      const newSelected = new Set(selectedReps);
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      setSelectedReps(newSelected);
    }
  };
  
  const handleSelectAll = () => {
    // Select all representatives that have contact methods
    const representativesWithContacts = representatives
      .map((rep, index) => ({ rep, index }))
      .filter(item => item.rep.contacts && item.rep.contacts.length > 0)
      .map(item => item.index);
    
    setSelectedReps(new Set(representativesWithContacts));
  };
  
  const handleUnselectAll = () => {
    // Unselect all representatives
    setSelectedReps(new Set());
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
      // Filter out representatives without contacts
      const contactableReps = representatives.filter(rep => rep.contacts && rep.contacts.length > 0);
      
      // Create a mapping from filtered index to original index
      const indexMap = contactableReps.map(rep => representatives.findIndex(r => r === rep));
      
      // Call the AI selection API - only send representatives that have contacts
      const response = await fetch('/api/select-representatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          demands: validDemands,
          representatives: contactableReps
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Update selected representatives based on the AI's recommendations
      if (data.selectedIndices && Array.isArray(data.selectedIndices)) {
        // Map the filtered indices back to original indices
        const originalIndices = data.selectedIndices.map((idx: number) => indexMap[idx]).filter((idx: number | undefined) => idx !== undefined);
        setSelectedReps(new Set(originalIndices as number[]));
        
        // Update summary
        if (data.summary) {
          setSelectionSummary(data.summary);
        }
        
        // Store the explanations by representative ID
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

  const handleClearForm = () => {
    // Ask for confirmation
    if (confirm("Are you sure you want to clear all entries? This cannot be undone.")) {
      // Clear demands
      setDemands(['']);
      
      // Clear personal info
      setPersonalInfo('');
      
      // Clear selected representatives
      setSelectedReps(new Set<number>());
      
      // Clear selection summary and explanations
      setSelectionSummary('');
      setSelectionExplanations({});
    }
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
      
      // Check if we need to retain existing AI selection data from localStorage
      const existingDraftData = localStorage.getItem('draftData');
      const existingSelectionSummary = selectionSummary;
      const existingSelectionExplanations = selectionExplanations;
      
      // Parse existing data if available
      let existingData: {
        selectionSummary?: string;
        selectionExplanations?: Record<string, string>;
      } = {};
      if (existingDraftData) {
        try {
          existingData = JSON.parse(existingDraftData);
        } catch (e) {
          console.log('Could not parse existing draft data');
        }
      }
      
      // Prepare data for draft generation
      const draftData = {
        demands: validDemands,
        personalInfo: personalInfo.trim(),
        representatives: representatives.filter((_, index) => selectedReps.has(index)),
        selectedReps: Array.from(selectedReps),
        // Use current AI selection data or fall back to previously stored data
        selectionSummary: existingSelectionSummary || existingData.selectionSummary,
        selectionExplanations: existingSelectionExplanations || existingData.selectionExplanations
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
            <div className="flex flex-col space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Your Representatives</h2>
                </div>
                
                <div className="flex items-center">
                  {/* Help Tooltip */}
                  <div className="relative mr-2 group">
                    <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full border border-gray-300 cursor-help text-gray-500 hover:bg-gray-200">
                      <span>?</span>
                    </div>
                    <div className="absolute z-10 right-0 transform translate-y-2 w-64 px-4 py-3 bg-white rounded shadow-lg invisible group-hover:visible border border-gray-200">
                      <p className="text-sm text-gray-600">
                        AI will analyze your demands and automatically select the most relevant representatives based on their jurisdiction and responsibilities.
                      </p>
                    </div>
                  </div>
                  
                  {/* Pick for Me button */}
                  {!isLoading && representatives.length > 0 && (
                    <button
                      onClick={handlePickForMe}
                      disabled={
                        isAiSelecting || 
                        demands.filter(d => d.trim()).length === 0 ||
                        representatives.filter(rep => rep.contacts && rep.contacts.length > 0).length === 0
                      }
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
              </div>
              
              {/* Selection controls */}
              {!isLoading && representatives.length > 0 && (
                <div className="flex space-x-2 text-sm">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-primary border border-primary rounded hover:bg-blue-50"
                  >
                    Select All ({representatives.filter(rep => rep.contacts && rep.contacts.length > 0).length})
                  </button>
                  {selectedReps.size > 0 && (
                    <button
                      onClick={handleUnselectAll}
                      className="px-2 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Unselect All
                    </button>
                  )}
                  {selectedReps.size > 0 && (
                    <span className="px-2 py-1 bg-blue-50 text-primary rounded-full border border-blue-100">
                      {selectedReps.size} selected
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Selection Summary - Compact version at the top */}
            {!isLoading && selectionSummary && !apiError && (
              <div className="mb-3 py-2 px-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-700">{selectionSummary}</p>
              </div>
            )}
            
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
              <div className="max-h-[600px] overflow-y-auto pr-2">
                {/* Selected Representatives Section */}
                {selectedReps.size > 0 && (
                  <div className="mb-4 bg-blue-50 border border-blue-100 rounded-md p-3">
                    <h3 className="text-lg font-semibold mb-2 pb-2 border-b border-blue-200 text-primary">Selected Representatives</h3>
                    <div className="grid gap-2">
                      {Array.from(selectedReps).sort((a, b) => {
                        // Sort by contact availability
                        const aRep = representatives[a];
                        const bRep = representatives[b];
                        if (!aRep || !bRep) return 0;
                        
                        const aHasContacts = aRep.contacts && aRep.contacts.length > 0;
                        const bHasContacts = bRep.contacts && bRep.contacts.length > 0;
                        
                        if (aHasContacts && !bHasContacts) return -1; // a comes first
                        if (!aHasContacts && bHasContacts) return 1;  // b comes first
                        return 0; // keep original order
                      }).map(index => {
                        const rep = representatives[index];
                        if (!rep) return null;
                        
                        return (
                          <div key={`selected-${index}`} className="p-2 bg-white border border-primary rounded-md">
                            <div className="flex items-start">
                              <input
                                type="checkbox"
                                id={`selected-rep-${index}`}
                                checked={true}
                                onChange={() => toggleRepresentative(index)}
                                className="mt-1 mr-2 h-4 w-4 text-primary accent-primary"
                              />
                              <div className="mr-2 flex-shrink-0">
                                {rep.photoUrl ? (
                                  <img 
                                    src={rep.photoUrl} 
                                    alt={`Photo of ${rep.name}`}
                                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                    onError={(e) => {
                                      // Replace broken images with placeholder
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null; // Prevent infinite loop
                                      target.parentElement!.innerHTML = `
                                        <div class="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 font-medium">
                                          ${rep.name.charAt(0)}
                                        </div>
                                      `;
                                    }}
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 font-medium">
                                    {rep.name.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                  <h3 className="font-medium text-primary truncate">{rep.name}</h3>
                                  {rep.party && (
                                    <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                                      rep.party.toLowerCase().includes('democrat') ? 'bg-blue-100 text-blue-800' : 
                                      rep.party.toLowerCase().includes('republican') ? 'bg-red-100 text-red-800' : 
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {rep.party}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500">{rep.office}</p>
                                
                                {/* Display tooltip with AI explanation if available */}
                                {selectionExplanations && rep.id && selectionExplanations[rep.id] && (
                                  <div className="mt-1 group relative">
                                    <div className="flex items-center">
                                      <span className="text-xs py-0.5 px-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-full inline-flex items-center cursor-help">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Why selected
                                      </span>
                                    </div>
                                    <div className="absolute z-10 left-0 transform translate-y-1 w-64 px-3 py-2 bg-white rounded shadow-lg invisible group-hover:visible border border-blue-100">
                                      <p className="text-xs text-blue-700">{selectionExplanations[rep.id]}</p>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Display contact methods */}
                                {rep.contacts && rep.contacts.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {rep.contacts.map((contact, contactIndex) => (
                                      <span 
                                        key={contactIndex}
                                        className={`text-xs px-2 py-0.5 rounded-full ${
                                          contact.type === 'email' ? 'bg-green-50 text-green-700 border border-green-200' : 
                                          contact.type === 'webform' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                          'bg-gray-50 text-gray-700 border border-gray-200'
                                        }`}
                                      >
                                        {contact.type === 'email' ? '✉️' : 
                                         contact.type === 'webform' ? '🌐' : 
                                         '📞'} {contact.description || contact.type}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Group and display all representatives by level */}
                {['local', 'state', 'country'].map(level => {
                  // Filter representatives by level
                  let levelReps = representatives.filter(rep => rep.level === level);
                  
                  // Skip empty sections
                  if (levelReps.length === 0) return null;
                  
                  // Sort representatives: Those with contacts first, those without contacts last
                  levelReps = [...levelReps].sort((a, b) => {
                    const aHasContacts = a.contacts && a.contacts.length > 0;
                    const bHasContacts = b.contacts && b.contacts.length > 0;
                    
                    if (aHasContacts && !bHasContacts) return -1; // a comes first
                    if (!aHasContacts && bHasContacts) return 1;  // b comes first
                    return 0; // keep original order for reps with the same contact status
                  });
                  
                  // Convert level to display name
                  const levelTitle = level === 'local' ? 'Local' : level === 'state' ? 'State' : 'Federal';
                  const bgColor = level === 'local' ? 'bg-indigo-50' : level === 'state' ? 'bg-emerald-50' : 'bg-amber-50';
                  const borderColor = level === 'local' ? 'border-indigo-100' : level === 'state' ? 'border-emerald-100' : 'border-amber-100';
                  const textColor = level === 'local' ? 'text-indigo-700' : level === 'state' ? 'text-emerald-700' : 'text-amber-700';
                  
                  return (
                    <div key={level} className={`mb-4 ${bgColor} border ${borderColor} rounded-md p-3`}>
                      <h3 className={`text-lg font-semibold mb-2 pb-2 border-b ${borderColor} ${textColor}`}>{levelTitle} Representatives</h3>
                      <div className="grid gap-2">
                        {levelReps.map((rep, repIndex) => {
                          // Find the original index in the full representatives array
                          const index = representatives.findIndex(r => r === rep);
                          const isSelected = selectedReps.has(index);
                          const hasContacts = rep.contacts && rep.contacts.length > 0;
                          
                          return (
                            <div 
                              key={index} 
                              className={`p-2 border rounded-md ${
                                !hasContacts ? 'opacity-60 bg-gray-50' :
                                isSelected ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start">
                                <input
                                  type="checkbox"
                                  id={`rep-${index}`}
                                  checked={isSelected}
                                  onChange={() => toggleRepresentative(index)}
                                  disabled={!hasContacts}
                                  className="mt-1 mr-2 h-4 w-4 text-primary accent-primary disabled:opacity-50"
                                />
                                <div className="mr-2 flex-shrink-0">
                                  {rep.photoUrl ? (
                                    <img 
                                      src={rep.photoUrl} 
                                      alt={`Photo of ${rep.name}`}
                                      className="w-8 h-8 rounded-full object-cover border border-gray-200"
                                      onError={(e) => {
                                        // Replace broken images with placeholder
                                        const target = e.target as HTMLImageElement;
                                        target.onerror = null; // Prevent infinite loop
                                        target.parentElement!.innerHTML = `
                                          <div class="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 font-medium">
                                            ${rep.name.charAt(0)}
                                          </div>
                                        `;
                                      }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 font-medium">
                                      {rep.name.charAt(0)}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start">
                                    <h3 className="font-medium truncate">{rep.name}</h3>
                                    {rep.party && (
                                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${
                                        rep.party.toLowerCase().includes('democrat') ? 'bg-blue-100 text-blue-800' : 
                                        rep.party.toLowerCase().includes('republican') ? 'bg-red-100 text-red-800' : 
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {rep.party}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500">{rep.office}</p>
                                  
                                  {/* Display contact methods */}
                                  {hasContacts ? (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {rep.contacts.map((contact, contactIndex) => (
                                        <span 
                                          key={contactIndex}
                                          className={`text-xs px-2 py-0.5 rounded-full ${
                                            contact.type === 'email' ? 'bg-green-50 text-green-700 border border-green-200' : 
                                            contact.type === 'webform' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                            contact.type === 'facebook' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                            contact.type === 'twitter' ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                                            contact.type === 'instagram' ? 'bg-pink-50 text-pink-700 border border-pink-200' :
                                            'bg-gray-50 text-gray-700 border border-gray-200'
                                          }`}
                                        >
                                          {contact.type === 'email' ? '✉️' : 
                                           contact.type === 'webform' ? '🌐' : 
                                           contact.type === 'facebook' ? '📘' :
                                           contact.type === 'twitter' ? '🐦' :
                                           contact.type === 'instagram' ? '📸' :
                                           '📞'} {contact.description || contact.type}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-red-500 mt-1">No contact methods available</p>
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
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 mb-4 flex gap-4">
          {/* Clear Form Button */}
          <button
            onClick={handleClearForm}
            className="py-3 px-6 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Clear Form
          </button>
          
          {/* Draft Generation Button */}
          <button
            onClick={handleGenerateDraft}
            disabled={
              isDraftLoading || 
              representatives.length === 0 || 
              selectedReps.size === 0 || 
              demands.filter(d => d.trim()).length === 0
            }
            className="flex-1 py-3 bg-secondary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isDraftLoading ? 'Generating Draft...' : selectedReps.size === 0 ? 'Select Representatives to Continue' : 'Preview Draft'}
          </button>
        </div>
      </div>
    </main>
  );
}