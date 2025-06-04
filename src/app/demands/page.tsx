'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseDraftData } from '@/utils/navigation';
import ActiveCampaignBanner from '@/components/ActiveCampaignBanner';

export default function DemandsPage() {
  const router = useRouter();
  const [demands, setDemands] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [hasCampaign, setHasCampaign] = useState(false);
  // No longer need expandedCategories as the component handles this internally
  
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
  }, [router]);
  
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


  const addIssue = (issue: string) => {
    if (!demands.includes(issue)) {
      setDemands([...demands, issue]);
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
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {hasCampaign ? 'Campaign Demands' : 'What Do You Care About?'}
          </h2>
          <p className="text-gray-600 mb-6">
            {hasCampaign 
              ? 'These are the demands included in this campaign. They cannot be modified while using the campaign.'
              : 'Enter specific demands or issues you want your elected officials to address. Feel free to be informal and direct - short, passionate statements often work best!'
            }
          </p>

          <div className="space-y-3 mb-2">
            {demands.length > 0 ? (
              demands.map((demand, index) => (
                <div key={index} className={`flex items-center gap-2 ${hasCampaign ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'} border rounded-md p-1`}>
                  {editingIndex === index && !hasCampaign ? (
                    <>
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        placeholder={`Enter your demand here`}
                        className="flex-1 p-2 border border-gray-300 rounded-md bg-white"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveEdit}
                        className="p-2 text-green-600 hover:text-green-800"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-2 text-gray-500 hover:text-gray-700"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 p-2 font-medium text-gray-800">{demand}</p>
                      {!hasCampaign && (
                        <>
                          <button
                            onClick={() => handleStartEdit(index)}
                            className="p-2 text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            ✎
                          </button>
                          <button
                            onClick={() => handleRemoveDemand(index)}
                            className="p-2 text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-center bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-gray-500">No demands added yet. Select issues from categories below or add your own.</p>
              </div>
            )}
          </div>

          {/* Add Custom Demand button - only show when not using campaign */}
          {!hasCampaign && (
            <button
              onClick={handleAddDemand}
              className="mb-6 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              + Add Custom Demand
            </button>
          )}

          {/* Issue Categories - only show when not using campaign */}
          {!hasCampaign && (
            <>
              {/* Local Issues Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">Local Issues</h3>
                
                {/* TODO: Implement dynamic local issues based on user's address */}
                {/* District Issues */}
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">District Issues</h4>
                  <p className="text-sm text-gray-600">
                    TODO: Fetch and display issues specific to the user's district
                  </p>
                </div>
                
                {/* City Issues */}
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <h4 className="font-medium text-green-800 mb-2">City Issues</h4>
                  <p className="text-sm text-gray-600">
                    TODO: Fetch and display issues specific to the user's city
                  </p>
                </div>
                
                {/* State Issues */}
                <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <h4 className="font-medium text-purple-800 mb-2">State Issues</h4>
                  <p className="text-sm text-gray-600">
                    TODO: Fetch and display issues specific to the user's state
                  </p>
                </div>
              </div>

              {/* National Issues Section */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">National Issues</h3>
                
                {/* TODO: Implement current national issues */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-gray-600">
                    TODO: Fetch and display current national issues and trending topics
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 mb-4 flex gap-4">
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