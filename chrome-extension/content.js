// Content script injected into representative websites
console.log('Outrage Form Filler content script loaded');

// UI helper functions (defined first so they're available immediately)
function showStatus(message, type = 'info') {
  removeExistingStatus();
  
  const status = document.createElement('div');
  status.id = 'outrage-status';
  status.textContent = message;
  status.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${type === 'success' ? '#10b981' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(status);
  
  if (type === 'success') {
    setTimeout(() => status.remove(), 5000);
  }
}

function showError(message) {
  removeExistingStatus();
  
  const error = document.createElement('div');
  error.id = 'outrage-status';
  error.textContent = message;
  error.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 24px;
    background: #ef4444;
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(error);
}

function removeExistingStatus() {
  const existing = document.getElementById('outrage-status');
  if (existing) {
    existing.remove();
  }
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Show initial status indicator
showStatus('Loading form...');

// Function to wait for a form to appear
async function waitForForm(timeout = 10000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const forms = document.querySelectorAll('form');
    if (forms.length > 0) {
      return forms;
    }
    
    // Also check for common form containers that might not be <form> tags
    const formContainers = document.querySelectorAll('[id*="contact"], [class*="contact"], [id*="form"], [class*="form"]');
    if (formContainers.length > 0) {
      console.log('Found potential form containers:', formContainers.length);
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return [];
}

// Function to extract form HTML with context
function extractFormHTML() {
  // Try to find forms on the page
  const forms = document.querySelectorAll('form');
  
  if (forms.length === 0) {
    // Look for common form containers even if not in a <form> tag
    const formContainers = document.querySelectorAll(
      '[id*="contact"], [class*="contact"], [id*="form"], [class*="form"], ' +
      '[id*="email"], [class*="email"], [id*="message"], [class*="message"]'
    );
    
    if (formContainers.length > 0) {
      console.log('Found potential form container without <form> tag');
      // Return the most likely container (usually the largest one)
      let largestContainer = formContainers[0];
      let largestSize = formContainers[0].innerHTML.length;
      
      formContainers.forEach(container => {
        if (container.innerHTML.length > largestSize) {
          largestSize = container.innerHTML.length;
          largestContainer = container;
        }
      });
      
      return largestContainer.outerHTML;
    }
    
    return null;
  }
  
  // If multiple forms, try to find the most relevant one
  let targetForm = forms[0];
  if (forms.length > 1) {
    // Look for contact/message forms specifically
    for (const form of forms) {
      const formText = form.textContent.toLowerCase();
      const formHTML = form.outerHTML.toLowerCase();
      if (formText.includes('contact') || formText.includes('message') || 
          formText.includes('email') || formHTML.includes('contact') ||
          formHTML.includes('message')) {
        targetForm = form;
        break;
      }
    }
  }
  
  console.log('Extracted form HTML, length:', targetForm.outerHTML.length);
  return targetForm.outerHTML;
}

// Wait for the page to fully load
window.addEventListener('load', async () => {
  console.log('Page loaded, waiting for forms...');
  
  // Update status to show we're waiting for forms
  showStatus('Waiting for form to load...');
  
  // Wait for forms to appear (they might be loaded dynamically)
  const forms = await waitForForm();
  
  if (forms.length === 0) {
    console.log('No forms found on this page after waiting');
    showError('No forms found on this page');
    return;
  }
  
  console.log(`Found ${forms.length} forms after page load`);
  showStatus('Form found, preparing...');
  
  // Get session data from background script
  chrome.runtime.sendMessage({ action: 'getFormData' }, async (sessionData) => {
    if (!sessionData) {
      console.log('No session data found for this tab');
      return;
    }
    
    console.log('Session data received:', sessionData);
    
    // Extract form HTML for analysis
    const formHTML = extractFormHTML();
    if (!formHTML) {
      console.error('Could not extract form HTML');
      showError('Could not find a form to analyze on this page');
      return;
    }
    
    // Show analyzing status
    showStatus('Analyzing form...');
    
    // Update form status to analyzing
    chrome.runtime.sendMessage({
      action: 'updateFormStatus',
      data: { status: 'analyzing' }
    });
    
    // Request form analysis from the API
    chrome.runtime.sendMessage(
      { 
        action: 'analyzeForm', 
        url: window.location.href,
        formHTML: formHTML,
        pageTitle: document.title
      },
      async (response) => {
        if (response.success) {
          await fillForm(response.data, sessionData.userData);
        } else {
          console.error('Form analysis failed:', response.error);
          showError('Failed to analyze form: ' + response.error);
          
          // Update status to failed
          chrome.runtime.sendMessage({
            action: 'updateFormStatus',
            data: { status: 'failed' }
          });
        }
      }
    );
  });
});

async function fillForm(formAnalysis, userData) {
  console.log('Filling form with analysis:', formAnalysis);
  console.log('User data:', userData);
  
  // Debug: Show all forms on the page
  const allForms = document.querySelectorAll('form');
  console.log(`Found ${allForms.length} forms on the page`);
  allForms.forEach((form, index) => {
    console.log(`Form ${index}:`, {
      id: form.id,
      className: form.className,
      action: form.action,
      innerHTML: form.innerHTML.substring(0, 200) + '...'
    });
  });
  
  try {
    const { fieldMappings, formSelector = 'form', submitSelector, parsedData } = formAnalysis;
    console.log('Form analysis parsedData:', parsedData);
    console.log('Looking for form with selector:', formSelector);
    const form = document.querySelector(formSelector);
    
    if (!form) {
      throw new Error('Form not found with selector: ' + formSelector);
    }
    
    // Show filling indicator
    showStatus('Filling form...');
    
    // Notify background that we're filling
    chrome.runtime.sendMessage({
      action: 'updateFormStatus',
      data: { status: 'filling' }
    });
    
    // Check if fieldMappings exists and is an object
    if (!fieldMappings || typeof fieldMappings !== 'object') {
      console.error('Invalid fieldMappings:', fieldMappings);
      throw new Error('Invalid form analysis: fieldMappings is missing or invalid');
    }
    
    // Merge parsedData with userData if it exists
    const mergedData = parsedData ? { ...userData, parsedData } : userData;
    console.log('Original userData:', userData);
    console.log('Merged data for form filling:', mergedData);
    
    // Fill each mapped field
    for (const [dataKey, fieldInfo] of Object.entries(fieldMappings)) {
      const value = getNestedValue(mergedData, dataKey);
      console.log(`Field mapping: ${dataKey} = ${value}`, fieldInfo);
      if (value !== undefined && value !== null && value !== '') {
        await fillField(fieldInfo, value);
      } else {
        console.log(`Skipping empty field: ${dataKey}`);
      }
    }
    
    // Highlight submit button
    if (submitSelector) {
      const submitButton = document.querySelector(submitSelector);
      if (submitButton) {
        submitButton.style.border = '3px solid #10b981';
        submitButton.style.boxShadow = '0 0 10px rgba(16, 185, 129, 0.5)';
      }
    }
    
    showStatus('Form filled! Please review and submit.', 'success');
    
    // Notify background script
    chrome.runtime.sendMessage({
      action: 'formFilled',
      data: { success: true }
    });
    
  } catch (error) {
    console.error('Error filling form:', error);
    showError('Failed to fill form: ' + error.message);
    
    chrome.runtime.sendMessage({
      action: 'formFilled',
      data: { success: false, error: error.message }
    });
  }
}

async function fillField(fieldInfo, value) {
  const { selector, type = 'text', triggerEvents = true } = fieldInfo;
  
  // Try multiple selectors if comma-separated
  const selectors = selector.split(',').map(s => s.trim());
  let element = null;
  
  for (const sel of selectors) {
    try {
      element = document.querySelector(sel);
      if (element) {
        console.log(`Found field with selector: ${sel}`);
        break;
      }
    } catch (e) {
      console.warn(`Invalid selector: ${sel}`, e);
    }
  }
  
  if (!element) {
    console.warn(`Field not found with any selector: ${selector}`);
    return;
  }
  
  // Highlight the field being filled
  element.style.border = '2px solid #3b82f6';
  element.style.transition = 'border-color 0.3s';
  
  switch (type) {
    case 'text':
    case 'email':
    case 'tel':
    case 'textarea':
      await setInputValue(element, value, triggerEvents);
      break;
      
    case 'select':
      await setSelectValue(element, value, triggerEvents);
      break;
      
    case 'radio':
      await setRadioValue(selector, value, triggerEvents);
      break;
      
    case 'checkbox':
      await setCheckboxValue(element, value, triggerEvents);
      break;
      
    default:
      console.warn(`Unknown field type: ${type}`);
  }
  
  // Remove highlight after a delay
  setTimeout(() => {
    element.style.border = '';
  }, 1000);
}

async function setInputValue(element, value, triggerEvents) {
  element.focus();
  element.value = value;
  
  if (triggerEvents) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  }
  
  // Small delay to simulate human typing
  await sleep(100);
}

async function setSelectValue(element, value, triggerEvents) {
  element.focus();
  
  // Try to find option by value or text
  const options = Array.from(element.options);
  const option = options.find(opt => 
    opt.value === value || 
    opt.text.toLowerCase() === value.toLowerCase()
  );
  
  if (option) {
    element.value = option.value;
    
    if (triggerEvents) {
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else {
    console.warn(`Option not found for value: ${value}`);
  }
  
  await sleep(100);
}

async function setRadioValue(selector, value, triggerEvents) {
  const radios = document.querySelectorAll(selector);
  const radio = Array.from(radios).find(r => r.value === value);
  
  if (radio) {
    radio.checked = true;
    
    if (triggerEvents) {
      radio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  } else {
    console.warn(`Radio option not found for value: ${value}`);
  }
  
  await sleep(100);
}

async function setCheckboxValue(element, value, triggerEvents) {
  element.checked = !!value;
  
  if (triggerEvents) {
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  await sleep(100);
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// These UI helper functions have been moved to the top of the file