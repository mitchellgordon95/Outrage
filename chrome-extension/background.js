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
    } else if (request.action === 'openFormFillPage') {
      // Open the form fill page with session data
      chrome.tabs.create({
        url: chrome.runtime.getURL(`form-fill.html?data=${request.data}`),
        active: true
      }).then(() => {
        sendResponse({ success: true });
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
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
  } else if (request.action === 'updateFormStatus') {
    // Update status for a specific tab
    if (sender.tab?.id) {
      const sessionData = formSessions.get(sender.tab.id);
      if (sessionData && request.data.status) {
        sessionData.status = request.data.status;
        formSessions.set(sender.tab.id, sessionData);
        
        // Forward to form-fill page
        chrome.runtime.sendMessage({
          action: 'updateFormStatus',
          data: {
            repIndex: sessionData.repIndex,
            status: request.data.status
          }
        }).catch(() => {
          // Ignore error if no listener
        });
      }
    }
  } else if (request.action === 'analyzeForm') {
    analyzeForm(request.url, sender.tab?.id, request.formHTML, request.pageTitle)
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
  } else if (request.action === 'storeFormSession') {
    // Store session data for a tab (from form-fill page)
    formSessions.set(request.tabId, request.data);
    sendResponse({ success: true });
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

async function analyzeForm(url, tabId, formHTML, pageTitle) {
  const sessionData = formSessions.get(tabId);
  if (!sessionData) {
    throw new Error('No session data found for this tab');
  }
  
  try {
    // Determine API URL based on extension installation
    // Check if extension is unpacked (development mode)
    const manifest = chrome.runtime.getManifest();
    const isDevelopment = !('update_url' in manifest);
    
    const apiUrl = isDevelopment
      ? 'http://localhost:3000/api/analyze-form'
      : 'https://www.outrage.gg/api/analyze-form';
    
    console.log('Extension mode:', isDevelopment ? 'development' : 'production');
    console.log('Calling analyze-form API at:', apiUrl);
    console.log('Form HTML length:', formHTML ? formHTML.length : 0);
    console.log('Request details:', {
      url: apiUrl,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      bodyData: {
        url,
        formHTML: formHTML ? 'provided' : 'missing',
        pageTitle,
        userData: sessionData.userData,
        representative: sessionData.representative
      }
    });
    
    // Call your Next.js API to analyze the form
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formHTML,
        pageTitle,
        userData: sessionData.userData,
        representative: sessionData.representative
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }
    
    const analysis = await response.json();
    console.log('Form analysis response:', analysis);
    
    // Update session with form analysis
    sessionData.formAnalysis = analysis;
    formSessions.set(tabId, sessionData);
    
    return analysis;
  } catch (error) {
    console.error('Form analysis failed:', error);
    console.error('Error details:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Full error object:', error);
    
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.error('Network error - likely CORS issue or network failure');
      console.error('This usually means:');
      console.error('1. CORS preflight failed (check server logs)');
      console.error('2. Network connection issue');
      console.error('3. Server returned redirect on preflight');
      console.error('4. SSL certificate issue');
    }
    
    // Log the exact URL that was attempted
    console.error('Failed URL:', apiUrl);
    console.error('Session data:', {
      hasUserData: !!sessionData.userData,
      representative: sessionData.representative?.name
    });
    
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
    console.log(`Form ${data.success ? 'completed' : 'failed'} for ${sessionData.representative.name}`);
    
    // Send status update to form-fill page if it's open
    chrome.runtime.sendMessage({
      action: 'updateFormStatus',
      data: {
        repIndex: sessionData.repIndex,
        status: sessionData.status
      }
    }).catch(() => {
      // Ignore error if no listener
    });
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