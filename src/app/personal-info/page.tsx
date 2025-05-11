'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseDraftData, getProgressState } from '@/utils/navigation';

export default function PersonalInfoPage() {
  const router = useRouter();
  const [personalInfo, setPersonalInfo] = useState('');
  const [address, setAddress] = useState('');
  const [demands, setDemands] = useState<string[]>([]);
  const [selectedReps, setSelectedReps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Get the address from localStorage
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      router.replace('/'); // Redirect to home page to enter address
      return;
    }

    setAddress(storedAddress);

    // Check for draft data
    const draftData = parseDraftData();
    if (!draftData) {
      router.replace('/demands'); // Redirect to demands page if no draft data
      return;
    }

    // Check progress state
    const progress = getProgressState(draftData);

    // Check if we have valid demands - required for this page
    if (!progress.demands) {
      router.replace('/demands');
      return;
    }

    // Check if we have selected representatives - required for this page
    if (!progress.representatives) {
      router.replace('/issue-details');
      return;
    }

    // Set stored data
    setDemands(draftData.demands || []);
    setSelectedReps(draftData.selectedReps || []);

    // Set personal info if available
    if (draftData.personalInfo) {
      setPersonalInfo(draftData.personalInfo);
    }
  }, [router]);
  
  // Save state whenever personal info changes
  useEffect(() => {
    if (!address || personalInfo === undefined) return; // Don't save if address is not loaded yet

    // Get existing data
    const existingData = parseDraftData() || {};

    // Update with current state
    const updatedData = {
      ...existingData,
      personalInfo
    };

    localStorage.setItem('draftData', JSON.stringify(updatedData));
  }, [personalInfo, address]);

  const handleClearInfo = () => {
    if (confirm("Are you sure you want to clear your personal information? This cannot be undone.")) {
      setPersonalInfo('');
    }
  };

  const handleContinue = () => {
    setIsLoading(true);

    // Mark this step as completed in localStorage
    const existingData = parseDraftData() || {};

    const updatedData = {
      ...existingData,
      personalInfo, // Make sure personal info is saved
      personalInfoCompleted: true // Mark this step as completed
    };

    localStorage.setItem('draftData', JSON.stringify(updatedData));

    // Navigate to the draft preview page
    router.push('/draft-preview');
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
        <h1 className="text-2xl font-bold mb-6">Personalize Your Message</h1>
        
        {/* Navigation progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <button onClick={() => router.push('/issue-details')} className="text-primary hover:underline flex items-center">
              <span className="mr-1">←</span> Back to Representatives
            </button>
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">1</div>
              <div className="text-sm">Demands</div>
            </div>
            <div className="h-1 bg-primary flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">2</div>
              <div className="text-sm">Representatives</div>
            </div>
            <div className="h-1 bg-primary flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">3</div>
              <div className="text-sm font-bold">Personal Info</div>
            </div>
            <div className="h-1 bg-gray-300 flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center mr-2">4</div>
              <div className="text-sm text-gray-600">Preview</div>
            </div>
          </div>
        </div>
        
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
        
        {/* Summary of demands and representatives */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-md">
            <h2 className="font-semibold mb-2">Your Demands</h2>
            <ul className="list-disc pl-5 space-y-1">
              {demands.map((demand, index) => (
                <li key={index} className="text-gray-800 text-sm">{demand}</li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/demands')}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>
          
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-md">
            <h2 className="font-semibold mb-2">Selected Representatives</h2>
            <p className="text-sm">{selectedReps.length} representatives selected</p>
            <button
              onClick={() => router.push('/issue-details')}
              className="mt-3 text-xs text-purple-600 hover:underline"
            >
              Edit
            </button>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
          <p className="text-gray-600 mb-6">
            Adding personal information helps make your message more effective. 
            Include relevant details such as:
          </p>
          
          <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-1">
            <li>Your name</li>
            <li>Voting history / party affiliation</li>
            <li>Demographics (race, age)</li>
          </ul>
          
          <textarea
            value={personalInfo}
            onChange={(e) => setPersonalInfo(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md min-h-[200px]"
            placeholder="Enter your personal information here..."
          />
          <p className="text-sm text-gray-500 mt-2">
            This information is optional but strongly recommended for a more personal and effective message.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-8 mb-4 flex gap-4">
          {/* Clear Info Button */}
          <button
            onClick={handleClearInfo}
            className="py-3 px-6 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Clear Information
          </button>
          
          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={isLoading}
            className="flex-1 py-3 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Continue to Preview'}
          </button>
        </div>
      </div>
    </main>
  );
}