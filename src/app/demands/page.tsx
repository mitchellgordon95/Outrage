'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { parseDraftData } from '@/utils/navigation';
import IssueCategory from '@/components/IssueCategory';

export default function DemandsPage() {
  const router = useRouter();
  const [demands, setDemands] = useState<string[]>([]);
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  // toggleCategory function removed as it's now handled by the IssueCategory component

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
          <h2 className="text-xl font-semibold mb-4">What Do You Care About?</h2>
          <p className="text-gray-600 mb-6">
            Enter specific demands or issues you want your elected officials to address.
            Feel free to be informal and direct - short, passionate statements often work best!
          </p>

          <div className="space-y-3 mb-2">
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
                <p className="text-gray-500">No demands added yet. Select issues from categories below or add your own.</p>
              </div>
            )}
          </div>

          {/* Add Custom Demand button */}
          <button
            onClick={handleAddDemand}
            className="mb-6 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            + Add Custom Demand
          </button>

          {/* Economy Category */}
          <IssueCategory
            title="Economy & Business"
            category="economy"
            previewIssues={[
              "End the trade war by eliminating tariffs",
              "Lower property taxes for homeowners",
              "Increase the minimum wage to $15 per hour"
            ]}
            moreIssues={[
              "Provide tax incentives for small businesses",
              "Reform corporate tax loopholes",
              "Increase funding for job training programs",
              "Pass a balanced budget amendment",
              "Support local businesses affected by construction"
            ]}
            bgColorClass="bg-yellow-50"
            borderColorClass="border border-yellow-200"
            textColorClass="text-yellow-800"
            hoverColorClass="hover:bg-yellow-100"
            demands={demands}
            onIssueClick={addIssue}
          />

          {/* Environment Category */}
          <IssueCategory
            title="Environment & Climate"
            category="environment"
            previewIssues={[
              "Implement stronger clean water protections",
              "Address climate change with bold legislation",
              "Oppose fracking in our county"
            ]}
            moreIssues={[
              "Fund renewable energy research and development",
              "Improve public transport to reduce emissions",
              "Address flooding issues in our community",
              "Enforce stricter pollution regulations",
              "Create more green spaces in urban areas"
            ]}
            bgColorClass="bg-green-50"
            borderColorClass="border border-green-200"
            textColorClass="text-green-800"
            hoverColorClass="hover:bg-green-100"
            demands={demands}
            onIssueClick={addIssue}
          />

          {/* Politics Category */}
          <IssueCategory
            title="Politics & Governance"
            category="politics"
            previewIssues={[
              "Support ranked choice voting reform",
              "End partisan gerrymandering",
              "Protect voting rights and access"
            ]}
            moreIssues={[
              "Limit corporate money in politics",
              "Increase transparency in campaign financing",
              "Support term limits for elected officials",
              "Hold town halls more frequently",
              "Reform the electoral college system"
            ]}
            bgColorClass="bg-blue-50"
            borderColorClass="border border-blue-200"
            textColorClass="text-blue-800"
            hoverColorClass="hover:bg-blue-100"
            demands={demands}
            onIssueClick={addIssue}
          />

          {/* Healthcare Category */}
          <IssueCategory
            title="Healthcare & Wellbeing"
            category="healthcare"
            previewIssues={[
              "Lower prescription drug prices",
              "Support Medicare for All legislation",
              "Improve mental health resources"
            ]}
            moreIssues={[
              "Protect reproductive healthcare access",
              "Increase funding for addiction treatment",
              "Address hospital staffing shortages",
              "Improve healthcare for veterans",
              "Fund medical research for rare diseases"
            ]}
            bgColorClass="bg-red-50"
            borderColorClass="border border-red-200"
            textColorClass="text-red-800"
            hoverColorClass="hover:bg-red-100"
            demands={demands}
            onIssueClick={addIssue}
          />

          {/* International Affairs Category */}
          <IssueCategory
            title="International Affairs"
            category="international"
            previewIssues={[
              "Support peace negotiations in Ukraine",
              "Address the humanitarian crisis in Gaza",
              "Reform immigration policies"
            ]}
            moreIssues={[
              "Reconsider foreign aid priorities",
              "Advocate for human rights in authoritarian countries",
              "Increase diplomatic engagement globally",
              "Support international climate agreements",
              "Bring home Kilmar Garcia who was wrongfully deported"
            ]}
            bgColorClass="bg-purple-50"
            borderColorClass="border border-purple-200"
            textColorClass="text-purple-800"
            hoverColorClass="hover:bg-purple-100"
            demands={demands}
            onIssueClick={addIssue}
          />

          {/* Local Issues */}
          <IssueCategory
            title="Local Community Issues"
            category="other"
            previewIssues={[
              "Fix potholes on Main St between Oak and Pine",
              "Lower property taxes by reducing millage to 15",
              "Increase funding for McKinley High's science lab"
            ]}
            moreIssues={[
              "Improve streetlights in the downtown area",
              "Address noise pollution from the local factory",
              "Increase funding for public libraries",
              "Build more affordable housing in our community",
              "Fix the flooding problems on Elm Street"
            ]}
            bgColorClass="bg-gray-50"
            borderColorClass="border border-gray-300"
            textColorClass="text-gray-800"
            hoverColorClass="hover:bg-gray-100"
            demands={demands}
            onIssueClick={addIssue}
          />

          {/* Custom demands section removed */}
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