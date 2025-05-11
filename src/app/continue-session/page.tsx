'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DraftData,
  ProgressState,
  getProgressState,
  getNextPageFromProgress,
  parseDraftData,
  clearDraftData
} from '@/utils/navigation';

export default function ContinueSessionPage() {
  const router = useRouter();
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [progress, setProgress] = useState<ProgressState>({
    demands: false,
    representatives: false,
    personalInfo: false
  });

  useEffect(() => {
    // Check if we have an address in localStorage
    const storedAddress = localStorage.getItem('userAddress');
    if (!storedAddress) {
      // No address, redirect to home
      router.replace('/');
      return;
    }

    setAddress(storedAddress);

    // Parse and check draft data
    const parsedData = parseDraftData();
    if (!parsedData) {
      // No valid draft data, redirect to demands page
      router.replace('/demands');
      return;
    }

    setDraftData(parsedData);

    // Determine progress
    const progressState = getProgressState(parsedData);
    setProgress(progressState);

    // If there's no real progress, skip this page and go to demands
    if (!progressState.demands && !progressState.representatives && !progressState.personalInfo) {
      router.replace('/demands');
    }
  }, [router]);

  const handleContinue = () => {
    setIsLoading(true);

    // Get the next page based on progress
    const nextPage = getNextPageFromProgress(progress);
    router.push(nextPage);
  };

  const handleStartOver = () => {
    setIsLoading(true);

    // Clear draft data but keep the address
    clearDraftData();

    // Redirect to demands page to start over
    router.push('/demands');
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
        <h1 className="text-2xl font-bold mb-4">Previous Session Found</h1>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            We found a previous session for address: <span className="font-medium">{address}</span>
          </p>
          <p className="text-gray-700">
            Would you like to continue where you left off or start fresh?
          </p>
        </div>
        
        <div className="p-4 border border-gray-200 rounded-lg mb-6">
          <h2 className="font-semibold mb-3">Your Progress:</h2>
          
          <div className="space-y-3">
            <div className="flex items-center">
              <div className={`h-6 w-6 rounded-full mr-3 flex items-center justify-center text-white ${progress.demands ? 'bg-primary' : 'bg-gray-300'}`}>
                {progress.demands ? '✓' : '1'}
              </div>
              <span className={progress.demands ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                {progress.demands ? 'Demands completed' : 'Demands not set'}
              </span>
            </div>
            
            <div className="flex items-center">
              <div className={`h-6 w-6 rounded-full mr-3 flex items-center justify-center text-white ${progress.representatives ? 'bg-primary' : 'bg-gray-300'}`}>
                {progress.representatives ? '✓' : '2'}
              </div>
              <span className={progress.representatives ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                {progress.representatives ? 'Representatives selected' : 'Representatives not selected'}
              </span>
            </div>
            
            <div className="flex items-center">
              <div className={`h-6 w-6 rounded-full mr-3 flex items-center justify-center text-white ${progress.personalInfo ? 'bg-primary' : 'bg-gray-300'}`}>
                {progress.personalInfo ? '✓' : '3'}
              </div>
              <span className={progress.personalInfo ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                {progress.personalInfo ? 'Personal information added' : 'Personal information not added'}
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="h-6 w-6 rounded-full mr-3 bg-gray-300 flex items-center justify-center text-white">
                4
              </div>
              <span className="text-gray-500">Draft preview</span>
            </div>
          </div>
          
          {draftData?.demands && draftData.demands.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md">
              <h3 className="font-medium text-sm mb-2">Your Demands:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {draftData.demands.filter(d => d.trim()).map((demand, i) => (
                  <li key={i} className="text-sm text-gray-700">{demand}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={handleContinue}
            disabled={isLoading}
            className="flex-1 py-3 px-6 bg-primary text-white rounded-md hover:bg-opacity-90 disabled:bg-opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Continue Where I Left Off'}
          </button>
          
          <button
            onClick={handleStartOver}
            disabled={isLoading}
            className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Loading...' : 'Start Fresh'}
          </button>
        </div>
      </div>
    </main>
  );
}