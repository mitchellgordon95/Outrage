'use client';

import { useState, useEffect } from 'react';

interface Representative {
  name: string;
  webFormUrl?: string;
  email?: string;
  draftSubject?: string;
  draftContent?: string;
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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    email: '',
    phone: ''
  });
  
  // Use different extension IDs for development and production
  const EXTENSION_ID = process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_CHROME_EXTENSION_ID_PROD
    : process.env.NEXT_PUBLIC_CHROME_EXTENSION_ID_DEV;
  
  useEffect(() => {
    // Check if extension is installed
    checkExtensionInstalled();
    
    // Pre-populate form data from localStorage
    // Get personal info from draftData
    const draftDataStr = localStorage.getItem('draftData');
    if (draftDataStr) {
      try {
        const draftData = JSON.parse(draftDataStr);
        if (draftData.personalInfo) {
          // Personal info is stored as multi-line string, first line is the name
          const lines = draftData.personalInfo.split('\n').filter(line => line.trim() !== '');
          if (lines.length > 0) {
            setFormData(prev => ({
              ...prev,
              name: lines[0] || ''
            }));
          }
        }
      } catch (e) {
        console.error('Error parsing draft data:', e);
      }
    }
    
    // Get address from userAddress
    const storedAddress = localStorage.getItem('userAddress');
    if (storedAddress) {
      setFormData(prev => ({
        ...prev,
        address: storedAddress
      }));
    }
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
    
    // Show form to collect user data
    setShowForm(true);
  };
  
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields only
    if (!formData.name || !formData.address) {
      alert('Please fill in your name and address');
      return;
    }
    
    setFilling(true);
    setShowForm(false);
    
    try {
      // Prepare representatives with their specific draft content in userData
      const representativesWithData = representatives
        .filter(rep => rep.webFormUrl)
        .map(rep => ({
          ...rep,
          userData: {
            ...userData,
            ...formData,
            // Include this representative's specific draft content
            subject: rep.draftSubject || '',
            message: rep.draftContent || ''
          }
        }));
      
      // Send message to extension to start filling forms
      chrome.runtime.sendMessage(
        EXTENSION_ID,
        {
          action: 'startFormFilling',
          data: {
            representatives: representativesWithData,
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
      
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Your Contact Information</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide your contact information to fill the representative forms.
            </p>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Address *
                </label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St, City, State 12345"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email (optional)
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number (optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                >
                  Start Filling Forms
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-md font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
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