// Form fill page script
let parsedData = null;
let representativeStatuses = new Map();

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('userForm');
  const statusEl = document.getElementById('statusMessage');
  const submitButton = document.getElementById('submitButton');
  
  // Get the session data passed via URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sessionData = urlParams.get('data');
  
  if (!sessionData) {
    showStatus('No session data found. Please try again from the Outrage app.', 'error');
    form.style.display = 'none';
    return;
  }
  
  try {
    parsedData = JSON.parse(decodeURIComponent(sessionData));
  } catch (e) {
    showStatus('Invalid session data. Please try again from the Outrage app.', 'error');
    form.style.display = 'none';
    return;
  }
  
  // Initialize representative statuses
  parsedData.representatives.forEach((rep, index) => {
    if (rep.webFormUrl) {
      representativeStatuses.set(index, {
        name: rep.name,
        status: 'pending',
        tabId: null
      });
    }
  });
  
  // Show representatives section immediately
  displayRepresentatives();
  
  // Pre-populate form fields if available
  const nameInput = document.getElementById('name');
  const addressInput = document.getElementById('address');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  
  if (parsedData.prefilledData) {
    if (parsedData.prefilledData.name) {
      nameInput.value = parsedData.prefilledData.name;
    }
    if (parsedData.prefilledData.address) {
      addressInput.value = parsedData.prefilledData.address;
    }
    if (parsedData.prefilledData.email) {
      emailInput.value = parsedData.prefilledData.email;
    }
    if (parsedData.prefilledData.phone) {
      phoneInput.value = parsedData.prefilledData.phone;
    }
  }
  
  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = {
      name: nameInput.value,
      address: addressInput.value,
      email: emailInput.value,
      phone: phoneInput.value
    };
    
    // Disable form
    submitButton.disabled = true;
    submitButton.textContent = 'Opening Forms...';
    
    showStatus('Opening forms in background tabs...', 'info');
    
    try {
      // Open tabs for each representative
      for (const [index, rep] of parsedData.representatives.entries()) {
        if (!rep.webFormUrl) continue;
        
        // Update status to opening
        updateRepresentativeStatus(index, 'opening');
        
        try {
          // Prepare user data with representative-specific content
          const userData = {
            ...formData,
            subject: rep.draftSubject || '',
            message: rep.draftContent || ''
          };
          
          // Create a new tab for the form (in background)
          const tab = await chrome.tabs.create({ 
            url: rep.webFormUrl,
            active: false // Keep focus on current tab
          });
          
          // Store session data for this tab
          chrome.runtime.sendMessage({
            action: 'storeFormSession',
            tabId: tab.id,
            data: {
              sessionId: parsedData.sessionId,
              representative: {
                name: rep.name,
                webFormUrl: rep.webFormUrl,
                email: rep.email
              },
              userData: userData,
              status: 'opened',
              repIndex: index
            }
          });
          
          // Update status to opened
          updateRepresentativeStatus(index, 'opened', tab.id);
          
          // Small delay between opening tabs
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`Failed to open form for ${rep.name}:`, error);
          updateRepresentativeStatus(index, 'failed');
        }
      }
      
      // Update UI
      submitButton.textContent = 'Forms Opened';
      showStatus(
        'Forms are being filled in background tabs. You can monitor progress below.',
        'success'
      );
      
      // Hide form section, show summary
      document.getElementById('formSection').style.display = 'none';
      document.getElementById('summarySection').style.display = 'block';
      updateSummary();
      
    } catch (error) {
      console.error('Error opening forms:', error);
      submitButton.disabled = false;
      submitButton.textContent = 'Start Filling Forms';
      showStatus('Failed to open forms. Please try again.', 'error');
    }
  });
  
  // Listen for status updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateFormStatus') {
      const { repIndex, status } = request.data;
      if (repIndex !== undefined) {
        updateRepresentativeStatus(repIndex, status);
      }
    }
  });
  
  // Periodically check for updates
  setInterval(() => {
    chrome.runtime.sendMessage({ action: 'getActiveSessions' }, (sessions) => {
      if (sessions) {
        sessions.forEach(session => {
          if (session.repIndex !== undefined) {
            const currentStatus = representativeStatuses.get(session.repIndex);
            if (currentStatus && currentStatus.status !== session.status) {
              updateRepresentativeStatus(session.repIndex, session.status);
            }
          }
        });
      }
    });
  }, 2000); // Check every 2 seconds
});

function displayRepresentatives() {
  const section = document.getElementById('representativesSection');
  const listEl = document.getElementById('representativesList');
  
  section.style.display = 'block';
  listEl.innerHTML = '';
  
  parsedData.representatives.forEach((rep, index) => {
    if (!rep.webFormUrl) return;
    
    const status = representativeStatuses.get(index);
    const itemEl = createRepresentativeItem(rep.name, status);
    itemEl.dataset.index = index;
    listEl.appendChild(itemEl);
  });
}

function createRepresentativeItem(name, status) {
  const div = document.createElement('div');
  div.className = `rep-item ${status.status}`;
  
  div.innerHTML = `
    <div class="rep-name">${name}</div>
    <div class="rep-status">
      <span class="status-icon">${getStatusIcon(status.status)}</span>
      <span class="status-text">${getStatusText(status.status)}</span>
      ${status.tabId ? `<a href="#" class="tab-link" data-tab="${status.tabId}">View Tab</a>` : ''}
    </div>
  `;
  
  // Add click handler for tab link
  const tabLink = div.querySelector('.tab-link');
  if (tabLink) {
    tabLink.addEventListener('click', (e) => {
      e.preventDefault();
      const tabId = parseInt(e.target.dataset.tab);
      chrome.tabs.update(tabId, { active: true });
    });
  }
  
  return div;
}

function updateRepresentativeStatus(index, newStatus, tabId = null) {
  const status = representativeStatuses.get(index);
  if (!status) return;
  
  status.status = newStatus;
  if (tabId) status.tabId = tabId;
  
  // Update UI
  const itemEl = document.querySelector(`[data-index="${index}"]`);
  if (itemEl) {
    const rep = parsedData.representatives[index];
    const newItem = createRepresentativeItem(rep.name, status);
    newItem.dataset.index = index;
    itemEl.replaceWith(newItem);
  }
  
  updateSummary();
}

function updateSummary() {
  const statuses = Array.from(representativeStatuses.values());
  
  document.getElementById('totalCount').textContent = statuses.length;
  document.getElementById('openedCount').textContent = 
    statuses.filter(s => ['opened', 'filling', 'completed'].includes(s.status)).length;
  document.getElementById('completedCount').textContent = 
    statuses.filter(s => s.status === 'completed').length;
  document.getElementById('failedCount').textContent = 
    statuses.filter(s => s.status === 'failed').length;
}

function getStatusIcon(status) {
  switch (status) {
    case 'pending':
      return '⏳';
    case 'opening':
      return '<span class="spinner"></span>';
    case 'opened':
      return '📋';
    case 'analyzing':
      return '<span class="spinner"></span>';
    case 'filling':
      return '✍️';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
    default:
      return '❓';
  }
}

function getStatusText(status) {
  switch (status) {
    case 'pending':
      return 'Ready to start';
    case 'opening':
      return 'Opening...';
    case 'opened':
      return 'Form Opened';
    case 'analyzing':
      return 'Analyzing form...';
    case 'filling':
      return 'Filling Form';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('statusMessage');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
}