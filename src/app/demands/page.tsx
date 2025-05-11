'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DemandsPage() {
  const router = useRouter();
  const DEFAULT_DEMAND = 'Do a better job';
  const [demands, setDemands] = useState<string[]>([DEFAULT_DEMAND]);
  const [personalInfo, setPersonalInfo] = useState('');
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Get the address from localStorage
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      router.push('/'); // Redirect to home page to enter address
      return;
    }
    
    setAddress(storedAddress);
    
    // Check if we have draft data from previous visit
    const storedDraftData = localStorage.getItem('draftData');
    if (storedDraftData) {
      try {
        const {
          demands: storedDemands,
          personalInfo: storedPersonalInfo
        } = JSON.parse(storedDraftData);
        
        // Restore demands and personal info
        if (Array.isArray(storedDemands) && storedDemands.length > 0) {
          setDemands(storedDemands);
        }
        
        if (storedPersonalInfo) {
          setPersonalInfo(storedPersonalInfo);
        }
      } catch (error) {
        console.error('Error restoring draft data:', error);
      }
    }
  }, [router]);
  
  // Save state whenever any relevant state changes
  useEffect(() => {
    if (!address) return; // Don't save if we don't have an address yet (initial load)
    
    const draftData = localStorage.getItem('draftData');
    let updatedDraftData = { demands, personalInfo };
    
    // Preserve other properties if draftData exists
    if (draftData) {
      try {
        const parsedData = JSON.parse(draftData);
        updatedDraftData = { ...parsedData, demands, personalInfo };
      } catch (error) {
        console.error('Error parsing existing draft data:', error);
      }
    }
    
    localStorage.setItem('draftData', JSON.stringify(updatedDraftData));
  }, [demands, personalInfo, address]);

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

  const handleClearForm = () => {
    // Ask for confirmation
    if (confirm("Are you sure you want to clear all entries? This cannot be undone.")) {
      // Clear demands
      setDemands(['']);
      
      // Clear personal info
      setPersonalInfo('');
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
            Be clear and concise for the most effective communication.
          </p>
          
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
        
        {/* Action Buttons */}
        <div className="mt-8 mb-4 flex gap-4">
          {/* Clear Form Button */}
          <button
            onClick={handleClearForm}
            className="py-3 px-6 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Clear Form
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