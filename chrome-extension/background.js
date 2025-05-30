// Background service worker for Chrome extension
let formSessions = new Map();

// Listen for messages from the web app
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    console.log('Received external message:', request);
    
    if (request.action === 'ping') {
      // For extension detection
      sendResponse({ pong: true });
      return; // Don't return true for synchronous responses
    } else if (request.action === 'startFormFilling') {
      handleFormFillingRequest(request.data)
        .then(response => sendResponse({ success: true, data: response }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously
    }
  }
);

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  
  if (request.action === 'getFormData') {
    const sessionData = formSessions.get(sender.tab?.id);
    sendResponse(sessionData || null);
  } else if (request.action === 'formFilled') {
    handleFormCompletion(sender.tab?.id, request.data);
  } else if (request.action === 'analyzeForm') {
    analyzeForm(request.url, sender.tab?.id)
      .then(analysis => sendResponse({ success: true, data: analysis }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (request.action === 'getActiveSessions') {
    // For popup to display active sessions
    const activeSessions = Array.from(formSessions.entries()).map(([tabId, session]) => ({
      tabId,
      ...session
    }));
    sendResponse(activeSessions);
  } else if (request.action === 'ping') {
    // For extension detection
    sendResponse({ pong: true });
  }
});

async function handleFormFillingRequest(data) {
  const { representatives, sessionId } = data;
  const results = [];
  
  for (const rep of representatives) {
    if (rep.webFormUrl) {
      try {
        // Create a new tab for the form
        const tab = await chrome.tabs.create({ 
          url: rep.webFormUrl,
          active: true 
        });
        
        // Store session data for this tab with rep-specific userData
        formSessions.set(tab.id, {
          sessionId,
          representative: {
            name: rep.name,
            webFormUrl: rep.webFormUrl,
            email: rep.email
          },
          userData: rep.userData, // Use the rep-specific userData
          status: 'pending'
        });
        
        results.push({
          representative: rep.name,
          tabId: tab.id,
          status: 'opened'
        });
      } catch (error) {
        console.error(`Failed to open form for ${rep.name}:`, error);
        results.push({
          representative: rep.name,
          error: error.message,
          status: 'failed'
        });
      }
    }
  }
  
  return results;
}

async function analyzeForm(url, tabId) {
  const sessionData = formSessions.get(tabId);
  if (!sessionData) {
    throw new Error('No session data found for this tab');
  }
  
  try {
    // Call your Next.js API to analyze the form
    const response = await fetch('http://localhost:3000/api/analyze-form', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        userData: sessionData.userData,
        representative: sessionData.representative
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const analysis = await response.json();
    
    // Update session with form analysis
    sessionData.formAnalysis = analysis;
    formSessions.set(tabId, sessionData);
    
    return analysis;
  } catch (error) {
    console.error('Form analysis failed:', error);
    throw error;
  }
}

function handleFormCompletion(tabId, data) {
  const sessionData = formSessions.get(tabId);
  if (sessionData) {
    sessionData.status = data.success ? 'completed' : 'failed';
    sessionData.completedAt = new Date().toISOString();
    formSessions.set(tabId, sessionData);
    
    // Notify the web app about completion
    // You could implement a webhook or store results for later retrieval
    console.log(`Form ${data.success ? 'completed' : 'failed'} for ${sessionData.representative.name}`);
  }
}

// Clean up old sessions
chrome.tabs.onRemoved.addListener((tabId) => {
  formSessions.delete(tabId);
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Outrage Form Filler extension installed');
});