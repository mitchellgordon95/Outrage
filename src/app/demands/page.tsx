'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseDraftData } from '@/utils/navigation';
import ActiveCampaignBanner from '@/components/ActiveCampaignBanner';
import DemandTabs from '@/components/DemandTabs';
import DemandsManualTab from '@/components/DemandsManualTab';
import DemandsBrowseTab from '@/components/DemandsBrowseTab';
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
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      router.replace('/');
      return;
    }

    setAddress(storedAddress);

    const draftData = parseDraftData();
    if (draftData?.demands && Array.isArray(draftData.demands) && draftData.demands.length > 0) {
      setDemands(draftData.demands);
    }
    
    const activeCampaignId = localStorage.getItem('activeCampaignId');
    setHasCampaign(!!activeCampaignId);
    
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
  
  useEffect(() => {
    if (!address) return;
    const existingData = parseDraftData() || {};
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
    if (confirm("Are you sure you want to clear all demands? This cannot be undone.")) {
      setDemands([]);
    }
  };

  const handleSelectDemand = (demandText: string) => {
    if (demands.includes(demandText)) {
      setDemands(demands.filter(d => d !== demandText));
    } else {
      setDemands([...demands, demandText]);
    }
  };

  const handleContinue = () => {
    const validDemands = demands.filter(demand => demand.trim());
    if (validDemands.length === 0) {
      alert("Please enter at least one demand.");
      return;
    }
    
    setIsLoading(true);
    router.push('/pick-representatives');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <header className="w-full max-w-4xl flex justify-between items-center mb-6">
        <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-primary">
          Outrage
        </Link>
      </header>
      
      <div className="max-w-4xl w-full bg-white p-6 md:p-8 rounded-lg shadow-md">
        {/* Progress Bar */}
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
              <div className="text-sm text-gray-600">Personalize</div>
            </div>
            <div className="h-1 bg-gray-300 flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center mr-2">4</div>
              <div className="text-sm text-gray-600">Preview</div>
            </div>
          </div>
        </div>

        <ActiveCampaignBanner />
        
        {/* Address Display */}
        <div className="mb-6 p-4 bg-gray-100 rounded-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Your address:</p>
              <p>{address}</p>
            </div>
            <Link href="/" className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm">
              Change
            </Link>
          </div>
        </div>
        
        {/* Main Content */}
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

          {/* Tab Content */}
          {(hasCampaign || activeTab === 'manual') && (
            <DemandsManualTab
              demands={demands}
              hasCampaign={hasCampaign}
              editingIndex={editingIndex}
              editingValue={editingValue}
              onEditingValueChange={setEditingValue}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={handleCancelEdit}
              onStartEdit={handleStartEdit}
              onRemoveDemand={handleRemoveDemand}
              onAddDemand={handleAddDemand}
            />
          )}
        </div>
        
        {/* Browse Tab */}
        {!hasCampaign && activeTab === 'browse' && (
          <div className="mt-6">
            <DemandsBrowseTab
              categories={categories}
              categoriesLoading={categoriesLoading}
              demands={demands}
              onSelectDemand={handleSelectDemand}
            />
          </div>
        )}
        
        {/* Summary */}
        {!hasCampaign && <SelectedDemandsSummary demands={demands} />}
        
        {/* Action Buttons */}
        <div className="mt-6 mb-4 flex gap-4">
          {!hasCampaign && (
            <button
              onClick={handleClearForm}
              className="py-3 px-6 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
            >
              Clear Demands
            </button>
          )}

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