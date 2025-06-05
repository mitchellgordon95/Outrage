'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Representative } from '@/services/representatives';
import { parseDraftData, getProgressState } from '@/utils/navigation';
import ChromeExtensionHelper from '@/components/ChromeExtensionHelper';
import ActiveCampaignBanner from '@/components/ActiveCampaignBanner';

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
  const [feedbackText, setFeedbackText] = useState('');
  const [showExtensionHelper, setShowExtensionHelper] = useState(false);

  useEffect(() => {
    // Check for address
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      router.replace('/'); // Redirect to home if no address
      return;
    }
    
    // Get draft data
    const draftData = parseDraftData();
    if (!draftData) {
      router.replace('/demands'); // Redirect to demands if no draft data
      return;
    }
    
    // Check progress state
    const progress = getProgressState(draftData);
    
    // Check and verify each required step
    if (!progress.demands) {
      router.replace('/demands');
      return;
    }
    
    if (!progress.representatives) {
      router.replace('/pick-representatives');
      return;
    }
    
    if (!progress.personalInfo) {
      router.replace('/personal-info');
      return;
    }
    
    // Get data for the draft generation
    const {
      demands: storedDemands,
      personalInfo: storedPersonalInfo,
      representatives: reps,
      selectionSummary,
      selectionExplanations,
      selectedReps,
    } = draftData;
    
    // Filter out invalid demands
    const validDemands = (storedDemands || []).filter(demand => demand && demand.trim());
    
    // Double check that we have valid demands
    if (validDemands.length === 0) {
      console.error('No valid demands for draft generation');
      router.replace('/demands');
      return;
    }
    
    // And representatives
    if (!reps || !Array.isArray(reps) || reps.length === 0) {
      console.error('No representatives found');
      router.replace('/pick-representatives');
      return;
    }
    
    // Set state
    setDemands(validDemands);
    setPersonalInfo(storedPersonalInfo || '');
    setRepresentatives(reps);
    
    // Initialize drafts with loading state
    const initialDrafts = new Map<number, RepresentativeDraft>();
    reps.forEach((rep: Representative, index: number) => {
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
      // Generate drafts for each representative in parallel
      reps.forEach((rep: Representative, index: number) => {
        generateDraftForRepresentativeWithDemands(rep, index, validDemands, storedPersonalInfo || '');
      });
    }, 0);
  }, [router]);

  // Generate draft for a specific representative
  const generateDraftForRepresentativeWithDemands = async (
    representative: Representative,
    index: number,
    demandsList: string[],
    personalInfoData: string,
    workingDraft?: string,
    feedback?: string
  ) => {
    try {
      console.log(
        `Generating${workingDraft && feedback ? ' revised' : ''} draft for ${
          representative.name
        } (index: ${index})`
      );
      console.log('Using demands:', demandsList);
      
      // Validate the demands parameter
      if (!demandsList || demandsList.length === 0) {
        console.error('Invalid demands list provided to draft generation');
        throw new Error('No valid demands to include in the draft');
      }
      
      console.log('Sending personal info to API:', personalInfoData);
      
      const requestBody: any = {
        demands: demandsList,
        personalInfo: personalInfoData,
        recipient: representative,
      };

      if (workingDraft && feedback) {
        requestBody.workingDraft = workingDraft;
        requestBody.feedback = feedback;
      }
      
      console.log('Full request body:', JSON.stringify(requestBody));
      
      const response = await fetch('/api/generate-representative-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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

  interface LinkToOpen {
    url: string;
    name: string;
    type: string;
  }

  const handleSendMessages = async () => {
    // Simply show the extension helper modal
    // The modal will handle both emails and web forms
    setShowExtensionHelper(true);
  };
  
  const handleEmailsSent = async (count?: number) => {
    // Handle campaign increment when emails are sent
    const campaignId = localStorage.getItem('activeCampaignId');
    if (campaignId) {
      localStorage.removeItem('activeCampaignId');
      try {
        const incrementResponse = await fetch(`/api/campaigns/${campaignId}/increment`, { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ count: count || 1 })
        });
        if (!incrementResponse.ok) {
          const errorData = await incrementResponse.json();
          console.error('Failed to increment campaign count:', incrementResponse.status, errorData.error);
        } else {
          console.log(`Campaign ${campaignId} count incremented by ${count || 1} successfully.`);
        }
      } catch (err) {
        console.error('Error during campaign increment fetch:', err);
      }
    }
  };

  const getSelectedDraft = () => {
    if (selectedRepIndex === null) return null;
    return drafts.get(selectedRepIndex) || null;
  };

  const handleReviseAll = async () => {
    if (!feedbackText.trim()) return; // Should be disabled, but as a safeguard

    const feedback = feedbackText.trim();
    let revisionsStarted = false;

    drafts.forEach((draft, index) => {
      if (draft.status === 'complete') {
        revisionsStarted = true;
        // Immediately update status to 'loading' for this draft
        setDrafts(prev => {
          const newDrafts = new Map(prev);
          const current = newDrafts.get(index);
          if (current) {
            newDrafts.set(index, { ...current, status: 'loading' });
          }
          return newDrafts;
        });

        // Call generation function
        generateDraftForRepresentativeWithDemands(
          representatives[index],
          index,
          demands,
          personalInfo,
          draft.content, // workingDraft
          feedback       // feedback
        );
      }
    });

    if (revisionsStarted) {
      setFeedbackText(''); // Clear feedback text after starting revisions
    }
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
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <button
              onClick={() => router.push('/personal-info')}
              className="text-primary hover:underline flex items-center"
            >
              <span className="mr-1">←</span> Back to Personalize
            </button>
          </div>

          <div className="flex items-center justify-between">
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
              <div className="text-sm">Personalize</div>
            </div>
            <div className="h-1 bg-primary flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">4</div>
              <div className="text-sm font-bold">Preview</div>
            </div>
          </div>
        </div>
        
        {/* Active Campaign Banner */}
        <ActiveCampaignBanner />
        
        <h1 className="text-2xl font-bold mb-6">Draft Preview</h1>
        
        <div className="space-y-6">
          {/* To Section with Selectable Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3">To</h2>
            <div className="flex flex-wrap gap-2">
              {representatives.map((rep, index) => {
                const draft = drafts.get(index);
                const isSelected = selectedRepIndex === index;
                
                // Color coding based on level
                const levelColors = {
                  local: isSelected 
                    ? 'bg-indigo-600 border-indigo-700 text-white' 
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
                  state: isSelected 
                    ? 'bg-emerald-600 border-emerald-700 text-white' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
                  country: isSelected 
                    ? 'bg-amber-600 border-amber-700 text-white' 
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                };
                
                const colorClass = levelColors[rep.level || 'local'];
                
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedRepIndex(index)}
                    className={`px-3 py-2 border rounded-md transition-all text-left flex items-center gap-2 ${colorClass}`}
                  >
                    {/* Photo */}
                    <div className="flex-shrink-0">
                      {rep.photoUrl ? (
                        <img 
                          src={rep.photoUrl} 
                          alt={`Photo of ${rep.name}`}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.parentElement!.innerHTML = `
                              <div class="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 font-medium text-xs">
                                ${rep.name.charAt(0)}
                              </div>
                            `;
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 font-medium text-xs">
                          {rep.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 text-sm">
                      <div className={`font-medium ${isSelected ? 'text-white' : ''}`}>
                        {rep.office} {rep.name}
                      </div>
                      
                      {/* Contact methods */}
                      {rep.contacts && rep.contacts.length > 0 && (
                        <div className="flex items-center gap-0.5 mt-0.5">
                          {rep.contacts.map((contact, i) => (
                            <span key={i} className="text-xs">
                              {contact.type === 'email' ? '✉️' : 
                               contact.type === 'webform' ? '🌐' : 
                               contact.type === 'facebook' ? '📘' :
                               contact.type === 'twitter' ? '🐦' :
                               contact.type === 'instagram' ? '📸' :
                               '📞'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Status indicators */}
                    {draft?.status === 'loading' && (
                      <div className={`w-4 h-4 border-2 rounded-full animate-spin ${
                        isSelected 
                          ? 'border-white/30 border-t-white' 
                          : 'border-gray-300 border-t-gray-600'
                      }`}></div>
                    )}
                    {draft?.status === 'error' && (
                      <span className={`text-xs font-bold ${isSelected ? 'text-red-200' : 'text-red-600'}`}>!</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Draft Display */}
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
                        generateDraftForRepresentativeWithDemands(rep, selectedRepIndex!, demands, personalInfo);
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
                    {currentDraft.status === 'complete' && (
                      <div className="mt-4">
                        <h2 className="text-lg font-semibold mb-2">Feedback</h2>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Enter your feedback here..."
                          className="w-full p-2 border border-gray-300 rounded-md min-h-[100px]"
                        />
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() => {
                              if (selectedRepIndex !== null && currentDraft && feedbackText.trim()) {
                                const rep = representatives[selectedRepIndex];
                                const draftToRevise = drafts.get(selectedRepIndex);

                                if (draftToRevise) {
                                  // Set current draft to loading immediately for UI responsiveness
                                  setDrafts(prev => {
                                    const newDrafts = new Map(prev);
                                    newDrafts.set(selectedRepIndex, {
                                      subject: draftToRevise.subject, // Keep current subject
                                      content: draftToRevise.content, // Keep current content
                                      status: 'loading'
                                    });
                                    return newDrafts;
                                  });
                                }

                                generateDraftForRepresentativeWithDemands(
                                  rep,
                                  selectedRepIndex,
                                  demands,
                                  personalInfo,
                                  currentDraft.content, // Pass original content as workingDraft
                                  feedbackText
                                );
                                setFeedbackText(''); // Clear feedback text after submission
                              }
                            }}
                            disabled={!feedbackText.trim()}
                            className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-400"
                          >
                            Revise Draft
                          </button>
                          <button
                            onClick={handleReviseAll}
                            disabled={
                              !feedbackText.trim() ||
                              !Array.from(drafts.values()).some(draft => draft.status === 'complete')
                            }
                            className="px-4 py-2 bg-secondary text-white rounded-md hover:bg-opacity-90 disabled:bg-gray-400"
                          >
                            Revise All Drafts
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
          ) : (
            <div className="flex justify-center items-center h-64 text-gray-500">
              Select a representative to view their draft
            </div>
          )}
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={() => router.push('/personal-info')}
            className="py-3 px-6 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Back to Personalize
          </button>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/campaign/create')}
              className="py-3 px-6 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              disabled={
                Array.from(drafts.values()).every(
                  draft => draft.status !== 'complete'
                )
              }
            >
              Create a Campaign
            </button>
            <button
              onClick={handleSendMessages}
              className="py-3 px-6 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:opacity-50"
              disabled={
                Array.from(drafts.values()).every(
                  draft => draft.status !== 'complete'
                )
              }
            >
              Send Messages
            </button>
          </div>
        </div>
        
        {/* Chrome Extension Helper Modal/Section */}
        {showExtensionHelper && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Send Messages</h2>
              
              <ChromeExtensionHelper
                representatives={representatives
                  .map((rep, index) => {
                    const draft = drafts.get(index);
                    if (draft?.status === 'complete') {
                      const webformContact = rep.contacts?.find(c => c.type === 'webform');
                      if (webformContact) {
                        return {
                          name: rep.name,
                          webFormUrl: webformContact.value,
                          // Include draft content specific to this representative
                          draftSubject: draft.subject,
                          draftContent: draft.content,
                        };
                      }
                    }
                    return null;
                  })
                  .filter((rep): rep is NonNullable<typeof rep> => rep !== null)
                }
                emailRepresentatives={representatives
                  .map((rep, index) => {
                    const draft = drafts.get(index);
                    if (draft?.status === 'complete') {
                      const emailContact = rep.contacts?.find(c => c.type === 'email');
                      if (emailContact) {
                        return {
                          name: rep.name,
                          email: emailContact.value,
                          draftSubject: draft.subject,
                          draftContent: draft.content,
                        };
                      }
                    }
                    return null;
                  })
                  .filter((rep): rep is NonNullable<typeof rep> => rep !== null)
                }
                userData={{
                  // Don't pre-fill here - let the ChromeExtensionHelper form collect the data
                  // The form will merge this with user-entered data
                }}
                sessionId={Date.now().toString()}
                onEmailsSent={handleEmailsSent}
              />
              
              <button
                onClick={() => setShowExtensionHelper(false)}
                className="mt-4 px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}