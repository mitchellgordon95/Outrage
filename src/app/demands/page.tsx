'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseDraftData } from '@/utils/navigation';

export default function DemandsPage() {
  const router = useRouter();
  const [demands, setDemands] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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
  };

  const handleClearForm = () => {
    // Ask for confirmation
    if (confirm("Are you sure you want to clear all demands? This cannot be undone.")) {
      // Clear demands
      setDemands([]);
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
    router.push('/issue-details');
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
          <h2 className="text-xl font-semibold mb-4">What Do You Want Your Representatives to Do?</h2>
          <p className="text-gray-600 mb-6">
            Enter specific demands or issues you want your elected officials to address.
            Feel free to be informal and direct - short, passionate statements often work best!
          </p>

          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-1 text-sm">Common Issues (Click to Add)</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Bring home Kilmar Garcia who was wrongfully deported",
                "End the trade war by eliminating tariffs",
                "Fix potholes on Main St between Oak and Pine",
                "Lower property taxes by reducing millage to 15",
                "Increase funding for McKinley High's science lab"
              ].map((issue, index) => (
                <button
                  key={index}
                  onClick={() => {
                    // Add this issue as a new demand if it doesn't already exist
                    if (!demands.includes(issue)) {
                      setDemands([...demands, issue]);
                    }
                  }}
                  className="px-2 py-1 bg-blue-50 border border-blue-200 rounded text-blue-700 text-xs hover:bg-blue-100"
                >
                  {issue}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3 mb-6">
            {demands.length > 0 ? (
              demands.map((demand, index) => (
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
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div className="p-3 text-center bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-gray-500">No demands added yet. Click an issue above or use the "Add Demand" button below.</p>
              </div>
            )}
          </div>
          
          <button
            onClick={handleAddDemand}
            className="mb-6 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            + Add Another Demand
          </button>
        </div>
        
        {/* Navigation progress */}
        <div className="mb-8 mt-8">
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

        {/* Action Buttons */}
        <div className="mt-8 mb-4 flex gap-4">
          {/* Clear Form Button */}
          <button
            onClick={handleClearForm}
            className="py-3 px-6 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Clear Demands
          </button>

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