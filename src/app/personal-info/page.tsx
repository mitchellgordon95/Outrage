'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseDraftData, getProgressState } from '@/utils/navigation';

export default function PersonalInfoPage() {
  const router = useRouter();
  const [nameInput, setNameInput] = useState('');
  const [customItems, setCustomItems] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<{[key: string]: boolean}>({});
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
      router.replace('/pick-representatives');
      return;
    }

    // Set stored data
    setDemands(draftData.demands || []);
    setSelectedReps(draftData.selectedReps || []);

    // Set personal info if available
    if (draftData.personalInfo) {
      const lines = draftData.personalInfo.split('\n').filter(line => line.trim() !== '');
      
      if (lines.length > 0) {
        // First line is the name
        setNameInput(lines[0] || '');
        
        if (lines.length > 1) {
          // Process the rest of the lines
          const newSelected: {[key: string]: boolean} = {};
          const newCustomItems: string[] = [];
          
          // Define all predefined items
          const allPredefinedItems = [
            // Identity/Role
            "Concerned citizen", "Longtime resident", "Local business owner", 
            "Parent of school-age children", "Community organizer",
            // Party Affiliation
            "Registered Democrat", "Registered Republican", "Independent",
            "Lifelong Democrat", "Lifelong Republican", "Swing voter",
            // Voting History
            "I vote in every election", "I've voted in this district for 5+ years",
            "I've voted in this district for 10+ years", "I've voted in this district for 20+ years",
            "First-time voter", "Haven't voted in a while",
            // Age
            "18-24 year old", "25-34 year old", "35-44 year old", 
            "45-54 year old", "55-64 year old", "65+ year old",
            // Race/Ethnicity
            "African American / Black", "Asian American / Pacific Islander", 
            "Hispanic / Latino", "Native American / Indigenous", 
            "White / Caucasian", "Multiracial"
          ];
          
          // Process each line after the name
          lines.slice(1).forEach(line => {
            if (allPredefinedItems.includes(line)) {
              // It's a predefined item, mark it as selected
              newSelected[line] = true;
            } else {
              // It's a custom item
              newCustomItems.push(line);
            }
          });
          
          setSelectedItems(newSelected);
          setCustomItems(newCustomItems);
        }
      }
    }
  }, [router]);
  
  // Save state whenever personal info changes
  useEffect(() => {
    if (!address) return; // Don't save if address is not loaded yet
    
    // Combine name, selected items, and custom items for storage
    const personalInfoLines = [nameInput];
    
    // Add selected predefined items
    Object.keys(selectedItems).forEach(item => {
      if (selectedItems[item]) {
        personalInfoLines.push(item);
      }
    });
    
    // Add custom items
    customItems.forEach(item => {
      if (item.trim()) {
        personalInfoLines.push(item);
      }
    });
    
    const personalInfo = personalInfoLines.join('\n');

    // Get existing data
    const existingData = parseDraftData() || {};

    // Update with current state
    const updatedData = {
      ...existingData,
      personalInfo
    };

    localStorage.setItem('draftData', JSON.stringify(updatedData));
  }, [nameInput, selectedItems, customItems, address]);

  const toggleItem = (item: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const addCustomItem = () => {
    setCustomItems([...customItems, ""]);
  };

  const removeCustomItem = (index: number) => {
    const newItems = [...customItems];
    newItems.splice(index, 1);
    setCustomItems(newItems);
  };

  const updateCustomItem = (index: number, value: string) => {
    const newItems = [...customItems];
    newItems[index] = value;
    setCustomItems(newItems);
  };

  const handleClearInfo = () => {
    if (confirm("Are you sure you want to clear your personal information? This cannot be undone.")) {
      setNameInput('');
      setSelectedItems({});
      setCustomItems([]);
    }
  };

  const handleContinue = () => {
    setIsLoading(true);

    // Combine everything for storage (same as in the useEffect)
    const personalInfoLines = [nameInput];
    
    // Add selected predefined items
    Object.keys(selectedItems).forEach(item => {
      if (selectedItems[item]) {
        personalInfoLines.push(item);
      }
    });
    
    // Add custom items
    customItems.forEach(item => {
      if (item.trim()) {
        personalInfoLines.push(item);
      }
    });
    
    const personalInfo = personalInfoLines.join('\n');

    // Mark this step as completed in localStorage
    const existingData = parseDraftData() || {};

    const updatedData = {
      ...existingData,
      personalInfo,
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
            <button onClick={() => router.push('/pick-representatives')} className="text-primary hover:underline flex items-center">
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
            <h2 className="font-semibold mb-2">What Do You Care About?</h2>
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
              onClick={() => router.push('/pick-representatives')}
              className="mt-3 text-xs text-purple-600 hover:underline"
            >
              Edit
            </button>
          </div>
        </div>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Personal Information (Optional)</h2>
          <p className="text-gray-600 mb-4">
            Adding personal information helps make your message more effective.
            Click items to select them.
          </p>

          {/* Name input */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-1">Your Name</h3>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Your Name"
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Identity/Role options */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-1 text-sm">Identity/Role</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Concerned citizen",
                "Longtime resident",
                "Local business owner",
                "Parent of school-age children",
                "Community organizer"
              ].map((item, index) => (
                <button
                  key={`name-${index}`}
                  onClick={() => toggleItem(item)}
                  className={`px-2 py-1 border rounded text-xs transition-colors ${
                    selectedItems[item] 
                      ? 'bg-teal-600 border-teal-700 text-white' 
                      : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Party affiliations */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-1 text-sm">Party Affiliation</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Registered Democrat",
                "Registered Republican",
                "Independent",
                "Lifelong Democrat",
                "Lifelong Republican",
                "Swing voter"
              ].map((item, index) => (
                <button
                  key={`party-${index}`}
                  onClick={() => toggleItem(item)}
                  className={`px-2 py-1 border rounded text-xs transition-colors ${
                    selectedItems[item] 
                      ? 'bg-blue-600 border-blue-700 text-white' 
                      : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Voting history */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-1 text-sm">Voting History</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "I vote in every election",
                "I've voted in this district for 5+ years",
                "I've voted in this district for 10+ years",
                "I've voted in this district for 20+ years",
                "First-time voter",
                "Haven't voted in a while"
              ].map((item, index) => (
                <button
                  key={`voting-${index}`}
                  onClick={() => toggleItem(item)}
                  className={`px-2 py-1 border rounded text-xs transition-colors ${
                    selectedItems[item] 
                      ? 'bg-green-600 border-green-700 text-white' 
                      : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Age */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-1 text-sm">Age</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "Gen Z",
                "Millennial",
                "Gen X",
                "Boomer",
                "Silent Generation",
                "Early 20s",
                "Late 20s",
                "Early 30s",
                "Late 30s",
                "Early 40s",
                "Late 40s",
                "50s",
                "60s",
                "70s",
                "80+"
              ].map((item, index) => (
                <button
                  key={`age-${index}`}
                  onClick={() => toggleItem(item)}
                  className={`px-2 py-1 border rounded text-xs transition-colors ${
                    selectedItems[item] 
                      ? 'bg-amber-600 border-amber-700 text-white' 
                      : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Race/Ethnicity */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-1 text-sm">Race/Ethnicity</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                "African American / Black",
                "Asian American / Pacific Islander",
                "Hispanic / Latino",
                "Native American / Indigenous",
                "White / Caucasian",
                "Multiracial"
              ].map((item, index) => (
                <button
                  key={`race-${index}`}
                  onClick={() => toggleItem(item)}
                  className={`px-2 py-1 border rounded text-xs transition-colors ${
                    selectedItems[item] 
                      ? 'bg-purple-600 border-purple-700 text-white' 
                      : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Personal Info Items */}
          <div className="mb-4">
            <h3 className="font-medium text-gray-700 mb-1">Other</h3>
            <div className="space-y-2">
              {customItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateCustomItem(index, e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-md"
                  />
                  <button
                    onClick={() => removeCustomItem(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addCustomItem}
              className="mt-2 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100 text-sm"
            >
              + Add Custom Information
            </button>
          </div>

          {/* Removed recommendation text */}
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