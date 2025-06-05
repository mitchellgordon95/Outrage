'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Representative, getRepresentativesByAddress } from '@/services/representatives';
import { parseDraftData, getProgressState, RepresentativeId } from '@/utils/navigation';
import ActiveCampaignBanner from '@/components/ActiveCampaignBanner';

export default function IssueDetailsPage() {
  const router = useRouter();
  const [demands, setDemands] = useState<string[]>([]);
  const [personalInfo, setPersonalInfo] = useState('');
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [manualSelectedReps, setManualSelectedReps] = useState<Set<RepresentativeId>>(new Set()); // For manual selection
  const [aiSelectedReps, setAiSelectedReps] = useState<Set<RepresentativeId>>(new Set()); // Original AI picks (immutable)
  const [aiRefinedReps, setAiRefinedReps] = useState<Set<RepresentativeId>>(new Set()); // User's refined AI selection
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [address, setAddress] = useState('');
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [isAiSelecting, setIsAiSelecting] = useState(false); // For "Pick for Me" feature
  const [selectionSummary, setSelectionSummary] = useState<string | null>(null); // Summary of AI selection
  const [selectionExplanations, setSelectionExplanations] = useState<Record<string, string>>({}); // Individual explanations
  const [pickMode, setPickMode] = useState<'ai' | 'manual'>('ai'); // Toggle between AI and manual selection - default to AI
  const [campaignPreSelectedReps, setCampaignPreSelectedReps] = useState<{id?: string | number; name: string}[]>([]); // Pre-selected reps from campaign
  const [preSelectedIds, setPreSelectedIds] = useState<Set<RepresentativeId>>(new Set()); // IDs of pre-selected reps
  const [demandsUsedForAiSelection, setDemandsUsedForAiSelection] = useState<string[]>([]); // Track demands used for AI selection
  const addressInputRef = useRef<HTMLInputElement>(null);
  
  // Get the appropriate selected reps based on current mode
  // Always include pre-selected representatives
  const currentSelectedReps = (() => {
    const baseSelection = pickMode === 'ai' ? aiRefinedReps : manualSelectedReps;
    const combined = new Set(baseSelection);
    preSelectedIds.forEach(id => combined.add(id));
    return combined;
  })();

  useEffect(() => {
    // Get the address from localStorage
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      router.replace('/'); // Redirect to home page to enter address
      return;
    }

    // Load draft data
    const draftData = parseDraftData();
    if (!draftData) {
      router.replace('/demands'); // Redirect to demands page if no draft data
      return;
    }

    // Check progress state
    const progress = getProgressState(draftData);

    // Check if we have valid demands - required for this page
    if (!progress.demands) {
      router.replace('/demands'); // Redirect to demands page if no valid demands
      return;
    }

    // Set address and continue with the flow
    setAddress(storedAddress);
    setNewAddress(storedAddress);

    // Restore data from draft
    if (draftData.demands && Array.isArray(draftData.demands) && draftData.demands.length > 0) {
      setDemands(draftData.demands);
    }

    if (draftData.personalInfo) {
      setPersonalInfo(draftData.personalInfo);
    }

    // Restore AI selection info if available
    if (draftData.selectionSummary) {
      setSelectionSummary(draftData.selectionSummary);
    }

    if (draftData.selectionExplanations && typeof draftData.selectionExplanations === 'object') {
      setSelectionExplanations(draftData.selectionExplanations);
    }
    
    // Restore demands used for AI selection
    if (draftData.demandsUsedForAiSelection && Array.isArray(draftData.demandsUsedForAiSelection)) {
      setDemandsUsedForAiSelection(draftData.demandsUsedForAiSelection);
    }
    
    // Restore active mode if available
    if (draftData.activeMode === 'ai' || draftData.activeMode === 'manual') {
      setPickMode(draftData.activeMode);
    }
    
    // Check for pre-selected representatives from campaign
    if (draftData.campaignPreSelectedReps && Array.isArray(draftData.campaignPreSelectedReps)) {
      console.log('Loading campaign pre-selected reps from draftData:', draftData.campaignPreSelectedReps);
      setCampaignPreSelectedReps(draftData.campaignPreSelectedReps);
    } else {
      console.log('No campaign pre-selected reps in draftData');
    }

    // We'll restore selected reps after fetching representatives
    const manualSelectedRepsSet = new Set<RepresentativeId>(draftData.manualSelectedReps || []);
    const aiSelectedRepsSet = new Set<RepresentativeId>(draftData.aiSelectedReps || []);
    const aiRefinedRepsSet = new Set<RepresentativeId>(draftData.aiRefinedReps || []);

    // Fetch representatives and then restore selection
    fetchRepresentatives(storedAddress, manualSelectedRepsSet, aiSelectedRepsSet, aiRefinedRepsSet, draftData.campaignPreSelectedReps);
  }, [router]);
  
  // Save state whenever any relevant state changes
  useEffect(() => {
    if (!address) return; // Don't save if we don't have an address yet (initial load)

    // Get existing data
    const existingData = parseDraftData() || {};

    // Update with current state
    const updatedData = {
      ...existingData,
      demands,
      personalInfo,
      selectedReps: Array.from(currentSelectedReps), // Always save the current mode's selection
      manualSelectedReps: Array.from(manualSelectedReps),
      aiSelectedReps: Array.from(aiSelectedReps),
      aiRefinedReps: Array.from(aiRefinedReps),
      selectionSummary,
      selectionExplanations,
      activeMode: pickMode,
      campaignPreSelectedReps: campaignPreSelectedReps,
      demandsUsedForAiSelection: demandsUsedForAiSelection
    };

    localStorage.setItem('draftData', JSON.stringify(updatedData));
  }, [demands, personalInfo, manualSelectedReps, aiSelectedReps, aiRefinedReps, address, selectionSummary, selectionExplanations, pickMode, currentSelectedReps, campaignPreSelectedReps, demandsUsedForAiSelection]);

  // Auto-trigger AI selection when conditions are met
  useEffect(() => {
    // Only trigger if:
    // 1. We're in AI mode
    // 2. Representatives are loaded
    // 3. We have valid demands
    // 4. We're not currently loading or selecting
    // 5. Either:
    //    a. We don't have AI selections yet, OR
    //    b. The demands have changed since last AI selection
    
    const validDemands = demands.filter(d => d.trim());
    const hasValidDemands = validDemands.length > 0;
    const hasContactableReps = representatives.some(rep => rep.contacts && rep.contacts.length > 0);
    
    // Check if demands have changed
    const demandsChanged = JSON.stringify(validDemands.sort()) !== JSON.stringify(demandsUsedForAiSelection.sort());
    
    if (
      pickMode === 'ai' &&
      representatives.length > 0 &&
      hasValidDemands &&
      hasContactableReps &&
      !isLoading &&
      !isAiSelecting &&
      (aiSelectedReps.size === 0 || demandsChanged)
    ) {
      handlePickForMe();
    }
  }, [pickMode, representatives, aiSelectedReps.size, demands, isLoading, isAiSelecting, demandsUsedForAiSelection]);
  
  // Update localStorage when mode changes
  useEffect(() => {
    if (!address) return; // Don't save if we don't have an address yet
    
    // Get existing data
    const existingData = parseDraftData() || {};
    
    // Update active mode in localStorage
    const updatedData = {
      ...existingData,
      activeMode: pickMode
    };
    
    localStorage.setItem('draftData', JSON.stringify(updatedData));
  }, [pickMode, address]);

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

  const fetchRepresentatives = async (address: string, initialManualSelectedReps?: Set<RepresentativeId>, initialAiSelectedReps?: Set<RepresentativeId>, initialAiRefinedReps?: Set<RepresentativeId>, campaignPreSelected?: {id?: string | number; name: string}[]) => {
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
      
      // Log all fetched representative IDs for debugging
      console.log('All fetched representative IDs:', reps.map(r => ({ id: r.id, name: r.name, type: typeof r.id })));
      
      // Handle pre-selected representatives from campaign
      const preSelectedRepsToUse = campaignPreSelected || campaignPreSelectedReps;
      if (preSelectedRepsToUse && preSelectedRepsToUse.length > 0) {
        console.log('Campaign pre-selected reps:', preSelectedRepsToUse);
        const preSelectedIdsSet = new Set<RepresentativeId>();
        
        // Find IDs of pre-selected representatives in the fetched list
        preSelectedRepsToUse.forEach(preSelectedRep => {
          console.log('Looking for pre-selected rep:', preSelectedRep);
          
          // First try to match by ID if available
          let foundRep = null;
          if (preSelectedRep.id !== undefined) {
            // Convert both to strings for comparison since DB stores as int but API returns as string
            const preSelectedIdStr = String(preSelectedRep.id);
            console.log(`Trying to match ID: ${preSelectedIdStr}`);
            foundRep = reps.find(rep => {
              if (rep.id) {
                console.log(`  Comparing with rep.id: ${rep.id} (type: ${typeof rep.id})`);
              }
              return rep.id === preSelectedIdStr;
            });
          }
          
          // If not found by ID, try to match by name (case-insensitive)
          if (!foundRep && preSelectedRep.name) {
            foundRep = reps.find(rep => 
              rep.name && rep.name.toLowerCase().trim() === preSelectedRep.name.toLowerCase().trim()
            );
          }
          
          console.log('Found matching rep:', foundRep);
          if (foundRep && foundRep.id) {
            preSelectedIdsSet.add(foundRep.id);
          } else {
            console.log('WARNING: Could not find rep in current list:', preSelectedRep);
          }
        });
        
        console.log('Pre-selected IDs set:', Array.from(preSelectedIdsSet));
        setPreSelectedIds(preSelectedIdsSet);
        
        // Add pre-selected IDs to manual selections
        const newManualSelected = new Set<RepresentativeId>(preSelectedIdsSet);
        if (initialManualSelectedReps && initialManualSelectedReps.size > 0) {
          initialManualSelectedReps.forEach(id => {
            // Verify this ID exists in the fetched reps
            if (reps.some(rep => rep.id === id)) {
              newManualSelected.add(id);
            }
          });
        }
        setManualSelectedReps(newManualSelected);
      } else {
        // Restore manual selections if we have them
        if (initialManualSelectedReps && initialManualSelectedReps.size > 0) {
          // Filter out any invalid IDs
          const validSelectedReps = new Set<RepresentativeId>();
          
          initialManualSelectedReps.forEach(id => {
            // Verify this ID exists in the fetched reps
            if (reps.some(rep => rep.id === id)) {
              validSelectedReps.add(id);
            }
          });
          
          setManualSelectedReps(validSelectedReps);
        } else {
          // Start with no selected representatives for new addresses
          setManualSelectedReps(new Set<RepresentativeId>());
        }
      }
      
      // Restore AI selections if we have them
      let hasValidAiSelections = false;
      let validAiSelectedReps = new Set<RepresentativeId>();
      
      if (initialAiSelectedReps && initialAiSelectedReps.size > 0) {
        initialAiSelectedReps.forEach(id => {
          // Verify this ID exists in the fetched reps
          if (reps.some(rep => rep.id === id)) {
            validAiSelectedReps.add(id);
          }
        });
        
        if (validAiSelectedReps.size > 0) {
          setAiSelectedReps(validAiSelectedReps);
          hasValidAiSelections = true;
        }
      }
      
      // Note: preSelectedIdsSet will be set by the state after this function completes
      
      // Restore AI refined selections (user's subset of AI picks)
      if (initialAiRefinedReps && initialAiRefinedReps.size > 0) {
        const validAiRefinedReps = new Set<RepresentativeId>();
        
        initialAiRefinedReps.forEach(id => {
          // Verify this ID exists in the fetched reps
          if (reps.some(rep => rep.id === id)) {
            validAiRefinedReps.add(id);
          }
        });
        
        // Note: pre-selected IDs will be included via the state
        
        if (validAiRefinedReps.size > 0) {
          setAiRefinedReps(validAiRefinedReps);
        }
      } else if (hasValidAiSelections && validAiSelectedReps.size > 0) {
        // If no refined selection exists but we have AI selections, use the AI selections
        setAiRefinedReps(new Set(validAiSelectedReps));
      }
      
      // Don't auto-trigger here - let useEffect handle it after state is settled
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

  // No longer need demand handling functions

  const toggleRepresentative = (repId: RepresentativeId) => {
    // Check if this is a pre-selected representative
    if (preSelectedIds.has(repId)) {
      // Don't allow deselecting pre-selected representatives
      return;
    }
    
    // Check if the representative has any contact methods
    const rep = representatives.find(r => r.id === repId);
    const hasContacts = rep?.contacts && rep.contacts.length > 0;
    
    // Only allow toggling if the representative has at least one contact method
    if (hasContacts) {
      if (pickMode === 'ai') {
        // In AI mode, toggle within the refined selection
        // But only allow toggling if it's in the original AI selection
        if (aiSelectedReps.has(repId)) {
          const newRefined = new Set(aiRefinedReps);
          if (newRefined.has(repId)) {
            newRefined.delete(repId);
          } else {
            newRefined.add(repId);
          }
          setAiRefinedReps(newRefined);
        }
      } else {
        // In manual mode, toggle in manual selection
        const newSelected = new Set(manualSelectedReps);
        if (newSelected.has(repId)) {
          newSelected.delete(repId);
        } else {
          newSelected.add(repId);
        }
        setManualSelectedReps(newSelected);
      }
    }
  };
  
  const handleSelectAll = () => {
    // Select all representatives that have contact methods
    const representativesWithContacts = representatives
      .filter(rep => rep.contacts && rep.contacts.length > 0 && rep.id)
      .map(rep => rep.id)
      .filter((id): id is string => id !== undefined);
    
    setManualSelectedReps(new Set(representativesWithContacts));
  };
  
  const handleUnselectAll = () => {
    // Unselect all representatives except pre-selected ones
    setManualSelectedReps(new Set(preSelectedIds));
  };
  
  // Handler for the "Pick for Me" feature
  const handlePickForMe = async (repsToUse?: Representative[]) => {
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
      // Use passed representatives or fall back to state
      const repsForSelection = repsToUse || representatives;
      
      // Filter out representatives without contacts
      const contactableReps = repsForSelection.filter(rep => rep.contacts && rep.contacts.length > 0);
      
      // Create a mapping from filtered index to original index
      const indexMap = contactableReps.map(rep => repsForSelection.findIndex(r => r === rep));
      
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
      if (data.selectedIds && Array.isArray(data.selectedIds)) {
        const newAiSelection = new Set<RepresentativeId>(data.selectedIds);
        
        // Always include pre-selected representatives in AI selection
        preSelectedIds.forEach(id => {
          newAiSelection.add(id);
        });
        
        setAiSelectedReps(newAiSelection);
        setAiRefinedReps(new Set(newAiSelection)); // Initially, refined = original AI picks
        
        // Update summary
        if (data.summary) {
          setSelectionSummary(data.summary);
        }
        
        // Store the explanations by representative ID
        if (data.explanations && typeof data.explanations === 'object') {
          setSelectionExplanations(data.explanations);
        }
        
        // Store the demands used for this AI selection
        setDemandsUsedForAiSelection(validDemands);
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
    
    // Fetch representatives for the new address (clear all selections for new address)
    fetchRepresentatives(newAddress, new Set(), new Set(), new Set(), []);
  };

  const handleClearSelections = () => {
    // Ask for confirmation
    if (confirm("Are you sure you want to clear all representative selections? This cannot be undone.")) {
      // Clear all selected representatives except pre-selected ones
      setManualSelectedReps(new Set<RepresentativeId>(preSelectedIds));
      setAiSelectedReps(new Set<RepresentativeId>(preSelectedIds));
      setAiRefinedReps(new Set<RepresentativeId>(preSelectedIds));

      // Clear selection summary and explanations
      setSelectionSummary(null);
      setSelectionExplanations({});
      setDemandsUsedForAiSelection([]);

      // Update localStorage
      const draftData = localStorage.getItem('draftData');
      if (draftData) {
        try {
          const parsedData = JSON.parse(draftData);
          const updatedData = {
            ...parsedData,
            selectedReps: [],
            manualSelectedReps: [],
            aiSelectedReps: [],
            aiRefinedReps: [],
            selectionSummary: null,
            selectionExplanations: {}
          };
          localStorage.setItem('draftData', JSON.stringify(updatedData));
        } catch (error) {
          console.error('Error updating draft data:', error);
        }
      }
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
        representatives: representatives.filter(rep => rep.id && currentSelectedReps.has(rep.id)),
        selectedReps: Array.from(currentSelectedReps),
        // Use current AI selection data or fall back to previously stored data
        selectionSummary: existingSelectionSummary || existingData.selectionSummary,
        selectionExplanations: existingSelectionExplanations || existingData.selectionExplanations
      };
      
      console.log('Draft data being saved:', draftData);

      // Save to localStorage
      localStorage.setItem('draftData', JSON.stringify(draftData));

      // Navigate to the personal info page
      router.push('/personal-info');
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
        <h1 className="text-2xl font-bold mb-6">Select Your Representatives</h1>

        {/* Navigation progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => router.push('/demands')} className="text-primary hover:underline flex items-center">
              <span className="mr-1">←</span> Back to Demands
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">1</div>
              <div className="text-sm">Demands</div>
            </div>
            <div className="h-1 bg-primary flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">2</div>
              <div className="text-sm font-bold">Representatives</div>
            </div>
            <div className="h-1 bg-gray-300 flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center mr-2">3</div>
              <div className="text-sm text-gray-600">Personalize</div>
            </div>
            <div className="h-1 bg-gray-300 flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center mr-2">4</div>
              <div className="text-sm text-gray-600">Preview</div>
            </div>
          </div>
        </div>
        
        {/* Active Campaign Banner */}
        <ActiveCampaignBanner />
        
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

        <div className="grid grid-cols-1 gap-8">
          {/* Demands section */}
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-md mb-4">
            <h2 className="text-xl font-semibold mb-3">Demands</h2>
            <ul className="list-disc pl-5 space-y-1">
              {demands.map((demand, index) => (
                <li key={index} className="text-gray-800">{demand}</li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/demands')}
              className="mt-4 py-2 px-4 border border-blue-300 text-blue-600 rounded-md hover:bg-blue-100 inline-flex items-center"
            >
              <span className="mr-1">✏️</span> Edit Demands
            </button>
          </div>

          {/* Representatives */}
          <div>
            <div className="flex flex-col space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Your Representatives</h2>
                </div>
              </div>
              
              {/* Show message if there are pre-selected representatives from campaign */}
              {campaignPreSelectedReps.length > 0 && (
                <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <p className="text-sm text-purple-700 font-medium">
                        Campaign-selected representatives ({campaignPreSelectedReps.length})
                      </p>
                      <p className="text-xs text-purple-600 mt-0.5">
                        These representatives were chosen by the campaign creator and will be included automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Toggle between AI and Manual selection */}
              <div className="flex mb-4">
                {!isLoading && representatives.length > 0 && (
                  <div className="flex items-center">
                    <div className="inline-flex rounded-md shadow-sm" role="group">
                      <button
                        type="button"
                        onClick={() => setPickMode('ai')}
                        className={`px-4 py-2 text-sm font-medium border ${pickMode === 'ai' 
                          ? 'bg-primary text-white border-primary z-10' 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'} 
                          rounded-l-lg focus:z-10 focus:ring-2 focus:ring-primary`}
                      >
                        AI Picks For Me
                      </button>
                      <button
                        type="button"
                        onClick={() => setPickMode('manual')}
                        className={`px-4 py-2 text-sm font-medium border ${pickMode === 'manual' 
                          ? 'bg-primary text-white border-primary z-10' 
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'} 
                          rounded-r-lg focus:z-10 focus:ring-2 focus:ring-primary`}
                      >
                        Pick Manually
                      </button>
                    </div>
                    {/* Help Tooltip */}
                    <div className="relative ml-2 group">
                      <div className="flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full border border-gray-300 cursor-help text-gray-500 hover:bg-gray-200">
                        <span>?</span>
                      </div>
                      <div className="absolute z-10 right-0 transform translate-y-2 w-64 px-4 py-3 bg-white rounded shadow-lg invisible group-hover:visible border border-gray-200">
                        <p className="text-sm text-gray-600">
                          {pickMode === 'ai' 
                            ? "AI will analyze your demands and automatically select the most relevant representatives based on their jurisdiction and responsibilities."
                            : "Manually select which representatives you want to contact by checking the boxes next to their names."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* AI Mode: Show AI summary and selected reps */}
            {pickMode === 'ai' && !isLoading && !apiError && (
              <>
                {/* AI Selection Summary */}
                {selectionSummary && !isAiSelecting && (
                  <div className="mb-3 py-2 px-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">{selectionSummary}</p>
                  </div>
                )}
                
                {/* AI Pick Button or loading state if no selection yet */}
                {(aiSelectedReps.size === 0 || isAiSelecting) && (
                  <div className="text-center py-8">
                    {/* Show loading state if conditions suggest auto-selection will trigger */}
                    {(isAiSelecting || (representatives.length === 0 && demands.filter(d => d.trim()).length > 0)) ? (
                      <div className="flex flex-col items-center">
                        <div className="flex items-center space-x-2">
                          <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-gray-700">AI is selecting representatives...</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">This may take a moment</p>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handlePickForMe()}
                          disabled={
                            isAiSelecting || 
                            demands.filter(d => d.trim()).length === 0 ||
                            representatives.filter(rep => rep.contacts && rep.contacts.length > 0).length === 0
                          }
                          className="px-6 py-3 bg-primary text-white rounded-md hover:bg-opacity-90 flex items-center space-x-2 disabled:bg-gray-300 disabled:cursor-not-allowed mx-auto"
                        >
                          {isAiSelecting ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>AI is selecting representatives...</span>
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          <span>Let AI Pick Representatives</span>
                        </>
                          )}
                        </button>
                        <p className="text-sm text-gray-500 mt-2">AI will select the most relevant representatives based on your demands</p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
            
            {/* Selected Representatives Section - Show only in AI mode */}
            {pickMode === 'ai' && !isLoading && aiSelectedReps.size > 0 && !apiError && !isAiSelecting && (
              <div className="mb-4 bg-blue-50 border border-blue-100 rounded-md p-3">
                <h3 className="text-lg font-semibold mb-2 pb-2 border-b border-blue-200 text-primary">AI Selected Representatives</h3>
                {/* Show count and unselect all only in AI mode */}
                {pickMode === 'ai' && aiRefinedReps.size > 0 && (
                  <div className="flex space-x-2 text-sm mb-3">
                    <span className="px-2 py-1 bg-blue-50 text-primary rounded-full border border-blue-100">
                      {aiRefinedReps.size} of {aiSelectedReps.size} selected
                    </span>
                    <button
                      onClick={() => setAiRefinedReps(new Set(preSelectedIds))}
                      className="px-2 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Unselect All
                    </button>
                    {aiRefinedReps.size < aiSelectedReps.size && (
                      <button
                        onClick={() => setAiRefinedReps(new Set(aiSelectedReps))}
                        className="px-2 py-1 text-primary border border-primary rounded hover:bg-blue-50"
                      >
                        Select All AI Picks
                      </button>
                    )}
                  </div>
                )}
                <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-1">
                  {Array.from(aiSelectedReps).sort((aId, bId) => {
                    // Sort by contact availability
                    const aRep = representatives.find(r => r.id === aId);
                    const bRep = representatives.find(r => r.id === bId);
                    if (!aRep || !bRep) return 0;
                    
                    const aHasContacts = aRep.contacts && aRep.contacts.length > 0;
                    const bHasContacts = bRep.contacts && bRep.contacts.length > 0;
                    
                    if (aHasContacts && !bHasContacts) return -1; // a comes first
                    if (!aHasContacts && bHasContacts) return 1;  // b comes first
                    return 0; // keep original order
                  }).map(repId => {
                    const rep = representatives.find(r => r.id === repId);
                    if (!rep) return null;
                    
                    return (
                      <div key={`selected-fixed-${repId}`} className={`p-2 border rounded-md ${
                        preSelectedIds.has(repId) ? 'bg-purple-50 border-purple-300' : 'bg-white border-primary'
                      }`}>
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id={`selected-fixed-rep-${repId}`}
                            checked={aiRefinedReps.has(repId)}
                            onChange={() => toggleRepresentative(repId)}
                            disabled={preSelectedIds.has(repId)}
                            className="mt-1 mr-2 h-4 w-4 text-primary accent-primary disabled:opacity-50"
                            title={preSelectedIds.has(repId) ? "This representative was selected by the campaign creator and cannot be removed" : ""}
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
                              <div className="flex items-center gap-1">
                                <h3 className="font-medium text-primary truncate">{rep.name}</h3>
                                {preSelectedIds.has(repId) && (
                                  <div className="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                                      Campaign pick
                                    </span>
                                  </div>
                                )}
                              </div>
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
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Manual Mode: Show full representative list */}
            {pickMode === 'manual' && !isLoading && !apiError && (
              <div className="max-h-[600px] overflow-y-auto pr-2">
                {/* Selection controls */}
                <div className="flex space-x-2 text-sm mb-3">
                  {manualSelectedReps.size > 0 && (
                    <span className="px-2 py-1 bg-blue-50 text-primary rounded-full border border-blue-100">
                      {manualSelectedReps.size} selected
                    </span>
                  )}
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 text-primary border border-primary rounded hover:bg-blue-50"
                  >
                    Select All ({representatives.filter(rep => rep.contacts && rep.contacts.length > 0).length})
                  </button>
                  {manualSelectedReps.size > 0 && (
                    <button
                      onClick={handleUnselectAll}
                      className="px-2 py-1 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Unselect All
                    </button>
                  )}
                </div>
                
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
                        {levelReps.map((rep) => {
                          const repId = rep.id;
                          if (!repId) return null;
                          const isSelected = manualSelectedReps.has(repId);
                          const hasContacts = rep.contacts && rep.contacts.length > 0;
                          
                          return (
                            <div 
                              key={repId} 
                              className={`p-2 border rounded-md ${
                                !hasContacts ? 'opacity-60 bg-gray-50' :
                                preSelectedIds.has(repId) ? 'bg-purple-50 border-purple-300' :
                                isSelected ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-start">
                                <input
                                  type="checkbox"
                                  id={`rep-${repId}`}
                                  checked={isSelected}
                                  onChange={() => toggleRepresentative(repId)}
                                  disabled={!hasContacts || preSelectedIds.has(repId)}
                                  className="mt-1 mr-2 h-4 w-4 text-primary accent-primary disabled:opacity-50"
                                  title={preSelectedIds.has(repId) ? "This representative was selected by the campaign creator and cannot be removed" : ""}
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
                                    <div className="flex items-center gap-1">
                                      <h3 className="font-medium truncate">{rep.name}</h3>
                                      {preSelectedIds.has(repId) && (
                                        <div className="flex items-center gap-1">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                          </svg>
                                          <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                                            Campaign pick
                                          </span>
                                        </div>
                                      )}
                                    </div>
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
                    onClick={() => fetchRepresentatives(address, manualSelectedReps, aiSelectedReps, aiRefinedReps, campaignPreSelectedReps)}
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
              <>
                {/* Empty state */}
              </>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 mb-4 flex gap-4">
          {/* Clear Selections Button */}
          <button
            onClick={handleClearSelections}
            className="py-3 px-6 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Clear Selections
          </button>

          {/* Draft Generation Button */}
          <button
            onClick={handleGenerateDraft}
            disabled={
              isDraftLoading ||
              representatives.length === 0 ||
              currentSelectedReps.size === 0 ||
              demands.filter(d => d.trim()).length === 0
            }
            className="flex-1 py-3 bg-secondary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isDraftLoading ? 'Loading...' : currentSelectedReps.size === 0 ? 'Select Representatives to Continue' : 'Continue to Personal Info'}
          </button>
        </div>
        
        {/* Footer with Cicero attribution */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <div className="text-center text-gray-500 text-sm">
            <p>Representative lookup powered by <a href="https://www.cicerodata.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Cicero</a></p>
          </div>
        </div>
      </div>
    </main>
  );
}