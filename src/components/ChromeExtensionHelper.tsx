'use client';

import { useState, useEffect } from 'react';

interface Representative {
  name: string;
  webFormUrl?: string;
  email?: string;
}

interface ChromeExtensionHelperProps {
  representatives: Representative[];
  userData: any;
  sessionId: string;
}

export default function ChromeExtensionHelper({ 
  representatives, 
  userData, 
  sessionId 
}: ChromeExtensionHelperProps) {
  const [extensionInstalled, setExtensionInstalled] = useState(false);
  const [filling, setFilling] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  
  // Use different extension IDs for development and production
  const EXTENSION_ID = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_CHROME_EXTENSION_ID_PROD
    : process.env.NEXT_PUBLIC_CHROME_EXTENSION_ID_DEV;
  
  useEffect(() => {
    // Check if extension is installed
    checkExtensionInstalled();
  }, []);
  
  const checkExtensionInstalled = () => {
    console.log('Checking extension with ID:', EXTENSION_ID);
    console.log('Environment:', process.env.NODE_ENV);
    
    if (!EXTENSION_ID || EXTENSION_ID === 'extension_id') {
      console.error('Extension ID not properly configured in environment variables');
      setExtensionInstalled(false);
      return;
    }
    
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Try to send a test message to the extension
      try {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { action: 'ping' },
          (response) => {
            console.log('Extension ping response:', response);
            console.log('Chrome runtime last error:', chrome.runtime.lastError);
            
            if (chrome.runtime.lastError) {
              console.error('Extension not detected:', chrome.runtime.lastError.message);
              setExtensionInstalled(false);
            } else if (response && response.pong) {
              console.log('Extension detected successfully!');
              setExtensionInstalled(true);
            } else {
              console.error('Unexpected response from extension:', response);
              setExtensionInstalled(false);
            }
          }
        );
      } catch (error) {
        console.error('Error checking extension:', error);
        setExtensionInstalled(false);
      }
    } else {
      console.error('Chrome runtime not available');
      setExtensionInstalled(false);
    }
  };
  
  const handleFillForms = async () => {
    if (!extensionInstalled) {
      alert('Please install the Outrage Form Filler extension first!');
      // Could open Chrome Web Store link here
      return;
    }
    
    setFilling(true);
    
    try {
      // Send message to extension to start filling forms
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          action: 'startFormFilling',
          data: {
            representatives: representatives.filter(rep => rep.webFormUrl),
            userData,
            sessionId
          }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Extension communication error:', chrome.runtime.lastError);
            alert('Failed to communicate with extension. Please make sure it\'s enabled.');
          } else if (response && response.success) {
            setResults(response.data);
          } else {
            console.error('Extension error:', response?.error);
            alert('Extension error: ' + (response?.error || 'Unknown error'));
          }
          setFilling(false);
        }
      );
    } catch (error) {
      console.error('Error starting form filling:', error);
      setFilling(false);
    }
  };
  
  const webFormReps = representatives.filter(rep => rep.webFormUrl);
  
  if (webFormReps.length === 0) {
    return null;
  }
  
  return (
    <div className="mt-6 p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Web Forms Required</h3>
      <p className="text-sm text-gray-600 mb-4">
        {webFormReps.length} representative{webFormReps.length > 1 ? 's' : ''} require{webFormReps.length === 1 ? 's' : ''} web form submission:
      </p>
      
      <ul className="list-disc list-inside mb-4 text-sm">
        {webFormReps.map((rep, index) => (
          <li key={index}>{rep.name}</li>
        ))}
      </ul>
      
      {!extensionInstalled && (
        <div className="mb-4 p-3 bg-yellow-100 rounded text-sm">
          <strong>Extension Required:</strong> Install the Outrage Form Filler extension to automatically fill these forms.
          <a 
            href={process.env.NODE_ENV === 'production' 
              ? `https://chrome.google.com/webstore/detail/${process.env.NEXT_PUBLIC_CHROME_EXTENSION_ID_PROD}`
              : '#'
            } 
            className="block mt-2 text-blue-600 hover:underline"
            onClick={(e) => {
              if (process.env.NODE_ENV !== 'production') {
                e.preventDefault();
                alert('In development: Load the extension from chrome-extension/ folder using Developer Mode in chrome://extensions/');
              }
            }}
            target="_blank"
            rel="noopener noreferrer"
          >
            {process.env.NODE_ENV === 'production' ? 'Install Extension →' : 'Load Development Extension →'}
          </a>
        </div>
      )}
      
      <button
        onClick={handleFillForms}
        disabled={!extensionInstalled || filling}
        className={`px-4 py-2 rounded font-medium ${
          extensionInstalled && !filling
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {filling ? 'Opening Forms...' : 'Fill Web Forms'}
      </button>
      
      {results.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">Results:</h4>
          <ul className="text-sm space-y-1">
            {results.map((result, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className={result.status === 'opened' ? 'text-green-600' : 'text-red-600'}>
                  {result.status === 'opened' ? '✓' : '✗'}
                </span>
                {result.representative}
                {result.error && <span className="text-red-600 text-xs">({result.error})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}