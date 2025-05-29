'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Representative } from '@/services/representatives';
import { parseDraftData, getProgressState } from '@/utils/navigation';

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
      router.replace('/issue-details');
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
      router.replace('/issue-details');
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

  const handleSendMessages = async () => { // Made async
    const campaignId = localStorage.getItem('activeCampaignId');

    // Create an array of links to open to avoid popup blocking
    const linksToOpen: LinkToOpen[] = [];
    
    representatives.forEach((rep: Representative, index: number) => {
      const draft = drafts.get(index);
      if (draft?.status === 'complete' && rep.contacts && rep.contacts.length > 0) {
        // Look for email contact first, then webform, then social media
        const emailContact = rep.contacts.find(contact => contact.type === 'email');
        const webformContact = rep.contacts.find(contact => contact.type === 'webform');
        const twitterContact = rep.contacts.find(contact => contact.type === 'twitter');
        const facebookContact = rep.contacts.find(contact => contact.type === 'facebook');
        const instagramContact = rep.contacts.find(contact => contact.type === 'instagram');
        
        // Prioritize email for sending messages
        if (emailContact) {
          const mailtoLink = `mailto:${emailContact.value}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.content)}`;
          linksToOpen.push({ url: mailtoLink, name: rep.name, type: 'email' });
        } else if (webformContact) {
          linksToOpen.push({ url: webformContact.value, name: rep.name, type: 'webform' });
        } 
        
        // Add social media links for posting (optional)
        if (twitterContact) {
          // Create a Twitter intent URL with pre-filled content
          const tweetText = `@${twitterContact.value.replace('@', '')} ${draft.subject}\n\n${draft.content.substring(0, 240)}...`;
          const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
          linksToOpen.push({ url: tweetUrl, name: rep.name, type: 'twitter' });
        }
      }
    });
    
    if (linksToOpen.length === 0) {
      alert("No contact methods available for your selected representatives.");
      return;
    }
    
    // Show confirmation with count of tabs to be opened
    const emailCount = linksToOpen.filter(link => link.type === 'email').length;
    const webformCount = linksToOpen.filter(link => link.type === 'webform').length;
    const twitterCount = linksToOpen.filter(link => link.type === 'twitter').length;
    
    const confirmMessage = `This will open:\n` + 
      (emailCount > 0 ? `${emailCount} email ${emailCount === 1 ? 'draft' : 'drafts'}\n` : '') +
      (webformCount > 0 ? `${webformCount} web ${webformCount === 1 ? 'form' : 'forms'}\n` : '') +
      (twitterCount > 0 ? `${twitterCount} Twitter ${twitterCount === 1 ? 'post' : 'posts'}\n` : '') +
      `\nYour browser may block popups. Please allow popups for this site.`;
    
    if (confirm(confirmMessage)) {
      // Increment campaign counter if activeCampaignId exists
      if (campaignId) {
        localStorage.removeItem('activeCampaignId'); // Remove immediately
        try {
          const incrementResponse = await fetch(`/api/campaigns/${campaignId}/increment`, { method: 'POST' });
          if (!incrementResponse.ok) {
            const errorData = await incrementResponse.json();
            console.error('Failed to increment campaign count:', incrementResponse.status, errorData.error);
            // Optionally, inform user if critical, but likely silent failure is okay
            // alert(`Note: Could not update campaign statistics for campaign ${campaignId}. Your messages are still being prepared.`);
          } else {
            console.log(`Campaign ${campaignId} count incremented successfully.`);
          }
        } catch (err) {
          console.error('Error during campaign increment fetch:', err);
          // alert(`Note: An error occurred while updating campaign statistics. Your messages are still being prepared.`);
        }
      }

      // Open each link with a slight delay to avoid popup blockers
      linksToOpen.forEach((link: LinkToOpen, i: number) => {
        setTimeout(() => {
          window.open(link.url, '_blank');
        }, i * 500); // 500ms delay between each window.open call
      });
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
              <span className="mr-1">←</span> Back to Personal Info
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
              <div className="text-sm">Personal Info</div>
            </div>
            <div className="h-1 bg-primary flex-1 mx-2"></div>
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center mr-2">4</div>
              <div className="text-sm font-bold">Preview</div>
            </div>
          </div>
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
                    <div className="flex items-center">
                      <div className="mr-2 flex-shrink-0">
                        {rep.photoUrl ? (
                          <img 
                            src={rep.photoUrl} 
                            alt={`Photo of ${rep.name}`}
                            className="w-6 h-6 rounded-full object-cover border border-gray-200"
                            onError={(e) => {
                              // Replace broken images with placeholder
                              const target = e.target as HTMLImageElement;
                              target.onerror = null;
                              target.parentElement!.innerHTML = `
                                <div class="w-6 h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 font-medium text-xs">
                                  ${rep.name.charAt(0)}
                                </div>
                              `;
                            }}
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-500 font-medium text-xs">
                            {rep.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium truncate">{rep.name}</div>
                        {rep.contacts && rep.contacts.length > 0 && (
                          <div className="flex items-center mt-1 text-xs text-gray-500">
                            {rep.contacts.map((contact, i) => (
                              <span key={i} className="mr-2">
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
                    </div>
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
        </div>
        
        <div className="flex justify-between mt-8">
          <button
            onClick={() => router.push('/personal-info')}
            className="py-3 px-6 border border-gray-300 rounded-md hover:bg-gray-100"
          >
            Back to Personal Info
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
      </div>
    </main>
  );
}