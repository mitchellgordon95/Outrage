'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Representative } from '@/services/representatives';

// Type for generated draft
interface RepresentativeDraft {
  subject: string;
  content: string;
  status: 'loading' | 'complete' | 'error';
  error?: string;
}

export default function DraftPreviewPage() {
  const router = useRouter();
  const [demands, setDemands] = useState<string[]>([]);
  const [personalInfo, setPersonalInfo] = useState('');
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [drafts, setDrafts] = useState<Map<number, RepresentativeDraft>>(new Map());
  const [selectedRepIndex, setSelectedRepIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load draft data from localStorage
    const storedDraftData = localStorage.getItem('draftData');
    if (!storedDraftData) {
      router.push('/issue-details'); // Redirect back if no draft data
      return;
    }

    try {
      const parsedData = JSON.parse(storedDraftData);
      console.log('Parsed data from localStorage:', parsedData);
      
      const {
        demands: storedDemands,
        personalInfo: storedPersonalInfo,
        name: storedName,
        representatives: reps,
      } = parsedData;
      
      console.log('Demands from localStorage:', storedDemands);
      
      // Check if demands is valid
      if (!Array.isArray(storedDemands) || storedDemands.length === 0) {
        console.error('No valid demands found in localStorage data');
        router.push('/issue-details');
        return;
      }
      
      // Check if any demands have content
      const validDemands = storedDemands.filter(demand => demand && demand.trim());
      console.log('Valid demands after filtering:', validDemands);
      
      if (validDemands.length === 0) {
        console.error('No valid demands after filtering');
        router.push('/issue-details');
        return;
      }

      // Set all state first
      setDemands(validDemands); // Set only valid demands
      setPersonalInfo(storedPersonalInfo);
      setRepresentatives(reps);
      
      // Initialize drafts with loading state
      const initialDrafts = new Map<number, RepresentativeDraft>();
      reps.forEach((_, index) => {
        initialDrafts.set(index, {
          subject: '',
          content: '',
          status: 'loading'
        });
      });
      setDrafts(initialDrafts);

      // Set the first representative as selected
      if (reps.length > 0) {
        setSelectedRepIndex(0);
      }
      
      setIsLoading(false);
      
      // Use setTimeout to ensure state updates have been applied
      // before generating drafts
      setTimeout(() => {
        console.log('Generating drafts with demands:', validDemands);
        
        // Generate drafts for each representative in parallel
        reps.forEach((rep, index) => {
          generateDraftForRepresentativeWithDemands(rep, index, validDemands);
        });
      }, 0);
    } catch (error) {
      console.error('Error parsing draft data:', error);
      router.push('/issue-details');
    }
  }, [router]);

  // New function that takes demands as a parameter to avoid state race conditions
  const generateDraftForRepresentativeWithDemands = async (
    representative: Representative, 
    index: number,
    demandsList: string[]
  ) => {
    try {
      console.log(`Generating draft for ${representative.name} (index: ${index})`);
      console.log('Using demands:', demandsList);
      
      // Validate the demands parameter
      if (!demandsList || demandsList.length === 0) {
        console.error('Invalid demands list provided to draft generation');
        throw new Error('No valid demands to include in the draft');
      }
      
      const response = await fetch('/api/generate-representative-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          demands: demandsList,
          personalInfo,
          recipient: representative
        }),
      });
      
      if (!response.ok) {
        console.error(`Error response from API for ${representative.name}:`, {
          status: response.status,
          statusText: response.statusText
        });
        
        try {
          // Try to get more error details from the response
          const errorData = await response.json();
          console.error('Error details:', errorData);
          throw new Error(`Failed to generate draft: ${errorData.error || response.statusText}`);
        } catch (jsonError) {
          // If we can't parse the error JSON, just throw with the status
          throw new Error(`Failed to generate draft: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log(`Draft generated successfully for ${representative.name}`, {
        subject: data.subject ? data.subject.substring(0, 50) + '...' : 'missing',
        contentLength: data.content ? data.content.length : 0
      });
      
      setDrafts(prev => {
        const newDrafts = new Map(prev);
        newDrafts.set(index, {
          subject: data.subject,
          content: data.content,
          status: 'complete'
        });
        return newDrafts;
      });
    } catch (error) {
      console.error(`Error generating draft for ${representative.name}:`, error);
      
      // Log more details about the error
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      setDrafts(prev => {
        const newDrafts = new Map(prev);
        newDrafts.set(index, {
          subject: '',
          content: '',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return newDrafts;
      });
    }
  };

  const handleSendEmails = () => {
    // Create mailto links for each representative with a completed draft
    representatives.forEach((rep, index) => {
      const draft = drafts.get(index);
      if (draft?.status === 'complete' && rep.emails && rep.emails.length > 0) {
        const email = rep.emails[0];
        const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.content)}`;
        
        // Open in a new tab
        window.open(mailtoLink, '_blank');
      }
    });
    
    // Navigate to campaign creation page
    // router.push('/campaign');
  };

  const getSelectedDraft = () => {
    if (selectedRepIndex === null) return null;
    return drafts.get(selectedRepIndex) || null;
  };

  const currentDraft = getSelectedDraft();

  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gray-50">
      {/* Header with title that links back home */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-6">
        <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-primary">
          Outrage
        </Link>
      </header>
      
      <div className="max-w-4xl w-full bg-white p-6 md:p-8 rounded-lg shadow-md">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push('/issue-details')}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <span className="mr-2">←</span> Back to Demands
          </button>
        </div>
        
        <h1 className="text-2xl font-bold mb-6">Email Draft Preview</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recipients - Left Column */}
          <div className="md:col-span-1">
            <h2 className="text-lg font-semibold mb-2">
              Recipients ({representatives.length})
            </h2>
            
            <div className="border border-gray-200 rounded-md overflow-hidden">
              {representatives.map((rep, index) => {
                const draft = drafts.get(index);
                const isSelected = selectedRepIndex === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedRepIndex(index)}
                    className={`w-full py-2 px-3 text-left border-b border-gray-200 last:border-b-0 flex justify-between items-center hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium truncate">{rep.name}</div>
                    <div className="flex items-center">
                      {draft?.status === 'loading' && (
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin ml-2"></div>
                      )}
                      {draft?.status === 'error' && (
                        <div className="text-red-500 ml-2">!</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Email Draft - Right Column */}
          <div className="md:col-span-2">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : currentDraft ? (
              <div className="border border-gray-300 rounded-md p-4">
                {currentDraft.status === 'loading' ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="w-8 h-8 border-4 border-gray-300 border-t-primary rounded-full animate-spin mb-4"></div>
                    <p>Generating personalized email...</p>
                  </div>
                ) : currentDraft.status === 'error' ? (
                  <div className="flex flex-col items-center justify-center h-64 text-red-500">
                    <p>Error generating draft: {currentDraft.error || 'Unknown error'}</p>
                    <button 
                      className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
                      onClick={() => {
                        const rep = representatives[selectedRepIndex!];
                        // When retrying, use the current state of demands
                        console.log('Retrying with current demands:', demands);
                        generateDraftForRepresentativeWithDemands(rep, selectedRepIndex!, demands);
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold mb-2">Subject</h2>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        {currentDraft.subject}
                      </div>
                    </div>
                    
                    <div>
                      <h2 className="text-lg font-semibold mb-2">Message</h2>
                      <div className="whitespace-pre-line bg-gray-50 p-3 rounded border border-gray-200 min-h-[300px] max-h-[400px] overflow-y-auto">
                        {currentDraft.content}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 text-gray-500">
                Select a representative to view their draft
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={() => router.push('/issue-details')}
            className="py-3 px-6 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Edit Demands
          </button>
          
          <button
            onClick={handleSendEmails}
            className="py-3 px-6 bg-primary text-white rounded-md hover:bg-opacity-90"
            disabled={
              Array.from(drafts.values()).every(
                draft => draft.status !== 'complete'
              )
            }
          >
            Send Emails
          </button>
        </div>
      </div>
    </main>
  );
}