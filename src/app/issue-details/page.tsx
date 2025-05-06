'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Representative, getRepresentativesByAddress } from '@/services/representatives';

export default function IssueDetailsPage() {
  const router = useRouter();
  const [facts, setFacts] = useState<string[]>(['']);
  const [name, setName] = useState('');
  const [votingHistory, setVotingHistory] = useState('');
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedReps, setSelectedReps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [address, setAddress] = useState('');
  const [draftSubject, setDraftSubject] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isDraftLoading, setIsDraftLoading] = useState(false);

  useEffect(() => {
    // Get the address from localStorage
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      router.push('/address');
      return;
    }
    
    setAddress(storedAddress);
    
    // Fetch representatives
    fetchRepresentatives(storedAddress);
  }, [router]);
  
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchRepresentatives = async (address: string) => {
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
      
      setLoadingProgress(100);
      
      // Select all representatives by default
      const initialSelected = new Set(reps.map((_, index) => index));
      
      setRepresentatives(reps);
      setSelectedReps(initialSelected);
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

  const handleAddFact = () => {
    setFacts([...facts, '']);
  };

  const handleFactChange = (index: number, value: string) => {
    const newFacts = [...facts];
    newFacts[index] = value;
    setFacts(newFacts);
  };

  const handleRemoveFact = (index: number) => {
    if (facts.length <= 1) return;
    const newFacts = facts.filter((_, i) => i !== index);
    setFacts(newFacts);
  };

  const toggleRepresentative = (index: number) => {
    const newSelected = new Set(selectedReps);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedReps(newSelected);
  };

  const handleGenerateDraft = async () => {
    setIsDraftLoading(true);
    
    try {
      // This would typically call an API endpoint that uses LiteLLM
      // For now, we'll create a mock implementation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Creating a simple draft template based on the facts
      const subject = `Concerns from a constituent about ${facts[0].substring(0, 30)}...`;
      
      let content = `Dear Representative,\n\n`;
      content += `My name is ${name || 'a concerned citizen'}, and I am a constituent living in your district. `;
      
      if (votingHistory) {
        content += `${votingHistory} `;
      }
      
      content += `I am writing to express my concerns about several issues that are important to me:\n\n`;
      
      facts.forEach((fact, index) => {
        if (fact.trim()) {
          content += `${index + 1}. ${fact}\n`;
        }
      });
      
      content += `\nI would appreciate hearing your position on these matters and what actions you are taking to address them. These issues affect me and many others in our community, and I believe they deserve your attention.\n\n`;
      content += `Thank you for your time and consideration.\n\n`;
      content += `Sincerely,\n${name || 'A Concerned Constituent'}`;
      
      setDraftSubject(subject);
      setDraftContent(content);
    } catch (error) {
      console.error('Error generating draft:', error);
    } finally {
      setIsDraftLoading(false);
    }
  };

  const handleSendEmails = () => {
    // Create mailto links for each selected representative
    representatives.forEach((rep, index) => {
      if (selectedReps.has(index) && rep.emails && rep.emails.length > 0) {
        const email = rep.emails[0];
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftContent)}`;
        
        // Open in a new tab
        window.open(mailtoLink, '_blank');
      }
    });
    
    // Navigate to campaign creation page
    // router.push('/campaign');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      <div className="max-w-4xl w-full bg-white p-6 md:p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6">Issue Details</h1>
        
        {/* Address display */}
        <div className="mb-6 p-4 bg-gray-100 rounded-md">
          <p className="font-medium">Your address:</p>
          <p>{address}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column: Facts and personal info */}
          <div>
            <h2 className="text-xl font-semibold mb-4">What issues concern you?</h2>
            <div className="space-y-4 mb-6">
              {facts.map((fact, index) => (
                <div key={index} className="flex items-start gap-2">
                  <textarea
                    value={fact}
                    onChange={(e) => handleFactChange(index, e.target.value)}
                    placeholder={`Fact ${index + 1} about an issue you care about`}
                    className="flex-1 p-2 border border-gray-300 rounded-md min-h-[60px]"
                  />
                  <button
                    onClick={() => handleRemoveFact(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                    disabled={facts.length <= 1}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <button
              onClick={handleAddFact}
              className="mb-8 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              + Add Another Fact
            </button>
            
            <h2 className="text-xl font-semibold mb-4">Personal Information (Optional)</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block mb-1 font-medium">
                  Your Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Jane Smith"
                />
              </div>
              
              <div>
                <label htmlFor="voting-history" className="block mb-1 font-medium">
                  Your Voting History / Demographic Info
                </label>
                <textarea
                  id="voting-history"
                  value={votingHistory}
                  onChange={(e) => setVotingHistory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md min-h-[80px]"
                  placeholder="e.g. I've voted in every election since 2008. I'm a parent of two children in public schools."
                />
              </div>
            </div>
          </div>
          
          {/* Right column: Representatives */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Representatives</h2>
            
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
                    <li>Verify that your Google Civic API key is correct in .env.local</li>
                    <li>Make sure the API key has the Google Civic Information API enabled</li>
                    <li>Check that you entered a valid US address on the previous screen</li>
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
                    onClick={() => router.push('/address')}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Change Address
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {representatives.map((rep, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-md hover:border-gray-300">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id={`rep-${index}`}
                        checked={selectedReps.has(index)}
                        onChange={() => toggleRepresentative(index)}
                        className="mt-1 mr-3"
                      />
                      <div>
                        <h3 className="font-medium">{rep.name}</h3>
                        <p className="text-sm text-gray-600">{rep.office}</p>
                        {rep.party && <p className="text-sm text-gray-600">{rep.party}</p>}
                        {rep.emails && rep.emails.length > 0 && (
                          <p className="text-sm break-words">{rep.emails[0]}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {representatives.length === 0 && !apiError && (
                  <div className="text-center py-4 text-gray-500">
                    No representatives found for your address.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Draft Generation Button */}
        <div className="mt-8 mb-4">
          <button
            onClick={handleGenerateDraft}
            disabled={isDraftLoading || facts.every(f => !f.trim())}
            className="w-full py-3 bg-secondary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isDraftLoading ? 'Generating Draft...' : 'Generate Draft'}
          </button>
        </div>
        
        {/* Email Draft */}
        {draftContent && (
          <div className="mt-6 border border-gray-300 rounded-md p-4">
            <h2 className="text-xl font-semibold mb-2">Email Draft</h2>
            <div className="mb-2">
              <span className="font-medium">Subject:</span> {draftSubject}
            </div>
            <div className="whitespace-pre-line bg-gray-50 p-3 rounded border border-gray-200">
              {draftContent}
            </div>
            
            <div className="mt-4">
              <button
                onClick={handleSendEmails}
                className="w-full py-3 bg-primary text-white rounded-md hover:bg-opacity-90"
                disabled={selectedReps.size === 0}
              >
                Send Emails ({selectedReps.size} {selectedReps.size === 1 ? 'representative' : 'representatives'})
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}