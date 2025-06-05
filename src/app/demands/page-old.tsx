'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseDraftData } from '@/utils/navigation';
import ActiveCampaignBanner from '@/components/ActiveCampaignBanner';
import DemandCarousel from '@/components/DemandCarousel';
import VideoCarousel from '@/components/VideoCarousel';
import DemandsList from '@/components/DemandsList';
import DemandTabs from '@/components/DemandTabs';
import SelectedDemandsSummary from '@/components/SelectedDemandsSummary';

export default function DemandsPage() {
  const router = useRouter();
  const [demands, setDemands] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [hasCampaign, setHasCampaign] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'manual'>('browse');
  
  useEffect(() => {
    // Get the address from localStorage
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      router.replace('/'); // Redirect to home page to enter address
      return;
    }

    setAddress(storedAddress);

    // Check if we have draft data from previous visit
    const draftData = parseDraftData();
    if (draftData?.demands) {
      // Restore demands if they exist
      if (Array.isArray(draftData.demands) && draftData.demands.length > 0) {
        setDemands(draftData.demands);
      }
    }
    
    // Check if using a campaign
    const activeCampaignId = localStorage.getItem('activeCampaignId');
    setHasCampaign(!!activeCampaignId);
    
    // Fetch demand categories
    fetchCategories();
  }, [router]);
  
  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch('/api/demands/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };
  
  // Save state whenever any relevant state changes
  useEffect(() => {
    if (!address) return; // Don't save if we don't have an address yet (initial load)

    // Get existing data or create new object
    const existingData = parseDraftData() || {};

    // Update with current demands and save
    const updatedData = {
      ...existingData,
      demands
    };

    localStorage.setItem('draftData', JSON.stringify(updatedData));
  }, [demands, address]);

  const handleAddDemand = () => {
    setDemands([...demands, '']);
  };

  const handleDemandChange = (index: number, value: string) => {
    const newDemands = [...demands];
    newDemands[index] = value;
    setDemands(newDemands);
  };

  const handleRemoveDemand = (index: number) => {
    const newDemands = demands.filter((_, i) => i !== index);
    setDemands(newDemands);
    // Reset editing state if we're removing the item being edited
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingValue(demands[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const newDemands = [...demands];
      newDemands[editingIndex] = editingValue.trim();
      setDemands(newDemands);
      setEditingIndex(null);
      setEditingValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const handleClearForm = () => {
    // Ask for confirmation
    if (confirm("Are you sure you want to clear all demands? This cannot be undone.")) {
      // Clear demands
      setDemands([]);
    }
  };


  const handleSelectDemand = (demandText: string) => {
    if (demands.includes(demandText)) {
      // Remove if already selected
      setDemands(demands.filter(d => d !== demandText));
    } else {
      // Add if not selected
      setDemands([...demands, demandText]);
    }
  };

  const handleContinue = () => {
    // Check if there are any valid demands
    const validDemands = demands.filter(demand => demand.trim());
    if (validDemands.length === 0) {
      alert("Please enter at least one demand.");
      return;
    }
    
    setIsLoading(true);
    
    // Navigate to the representatives selection page
    router.push('/pick-representatives');
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
        {/* Navigation progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">1</div>
              <div className="text-sm font-bold">Demands</div>
            </div>
            <div className="h-1 bg-gray-300 flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center mr-2">2</div>
              <div className="text-sm text-gray-600">Representatives</div>
            </div>
            <div className="h-1 bg-gray-300 flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center mr-2">3</div>
              <div className="text-sm text-gray-600">Personal Info</div>
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
        
        {/* Address display */}
        <div className="mb-6 p-4 bg-gray-100 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Your address:</p>
              <p>{address}</p>
            </div>
            <Link
              href="/"
              className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm"
            >
              Change
            </Link>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-2xl font-bold">
              {hasCampaign ? 'Campaign Demands' : 'Choose Your Demands'}
            </h2>
            {demands.length > 0 && (
              <span className="px-3 py-1 bg-primary text-white text-sm rounded-full font-medium">
                {demands.length} selected
              </span>
            )}
          </div>
          
          {hasCampaign ? (
            <p className="text-gray-600 mb-6">
              These are the demands included in this campaign. They cannot be modified while using the campaign.
            </p>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                Browse existing issues or manually add your own specific demands.
              </p>
              <DemandTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </>
          )}

          {/* Show demands list in manual tab or for campaigns */}
          {(hasCampaign || activeTab === 'manual') && (
            <div className="space-y-3 mb-2">
              <DemandsList
                demands={demands}
                hasCampaign={hasCampaign}
                editingIndex={editingIndex}
                editingValue={editingValue}
                onEditingValueChange={setEditingValue}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onStartEdit={handleStartEdit}
                onRemoveDemand={handleRemoveDemand}
              />
            </div>

          {/* Add Custom Demand button - only show in manual mode */}
          {!hasCampaign && activeTab === 'manual' && (
            <button
              onClick={handleAddDemand}
              className="mb-6 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              + Add Custom Demand
            </button>
          )}
        </div>
        
        {/* Browse Existing tab content */}
        {!hasCampaign && activeTab === 'browse' && (
          <div className="mt-6">
            {/* Remove the Explore Issues header since it's now part of the tab system */}
            
            {categoriesLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-8">
                {categories.map(category => {
                  // Use VideoCarousel for YouTube channels, DemandCarousel for others
                  if (category.type === 'youtube_channel' && category.videos) {
                    return (
                      <VideoCarousel
                        key={category.id}
                        title={category.title}
                        videos={category.videos}
                        onSelectDemand={handleSelectDemand}
                        selectedDemands={demands}
                      />
                    );
                  } else if (category.demands) {
                    return (
                      <DemandCarousel
                        key={category.id}
                        title={category.title}
                        demands={category.demands}
                        onSelectDemand={handleSelectDemand}
                        selectedDemands={demands}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No issues available at the moment. Check back later!</p>
              </div>
            )}
          </div>
        )}
        
        {/* Selected Demands Summary */}
        {!hasCampaign && <SelectedDemandsSummary demands={demands} />}
        
        {/* Action Buttons */}
        <div className="mt-6 mb-4 flex gap-4">
          {/* Clear Form Button - only show when not using campaign */}
          {!hasCampaign && (
            <button
              onClick={handleClearForm}
              className="py-3 px-6 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
            >
              Clear Demands
            </button>
          )}

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={isLoading || demands.filter(d => d.trim()).length === 0}
            className="flex-1 py-3 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Continue to Representatives'}
          </button>
        </div>
      </div>
    </main>
  );
}