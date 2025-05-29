// Content script injected into representative websites
console.log('Outrage Form Filler content script loaded');

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

// Wait for the page to fully load
window.addEventListener('load', async () => {
  console.log('Page loaded, waiting for forms...');
  
  // Wait for forms to appear (they might be loaded dynamically)
  const forms = await waitForForm();
  
  if (forms.length === 0) {
    console.log('No forms found on this page after waiting');
    return;
  }
  
  console.log(`Found ${forms.length} forms after page load`);
  
  // Get session data from background script
  chrome.runtime.sendMessage({ action: 'getFormData' }, async (sessionData) => {
    if (!sessionData) {
      console.log('No session data found for this tab');
      return;
    }
    
    console.log('Session data received:', sessionData);
    
    // Request form analysis from the API
    chrome.runtime.sendMessage(
      { 
        action: 'analyzeForm', 
        url: window.location.href 
      },
      async (response) => {
        if (response.success) {
          await fillForm(response.data, sessionData.userData);
        } else {
          console.error('Form analysis failed:', response.error);
          showError('Failed to analyze form: ' + response.error);
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
    const { fieldMappings, formSelector = 'form', submitSelector } = formAnalysis;
    console.log('Looking for form with selector:', formSelector);
    const form = document.querySelector(formSelector);
    
    if (!form) {
      // Try to find any form as fallback
      const anyForm = document.querySelector('form');
      if (anyForm) {
        console.warn(`Form not found with selector "${formSelector}", but found a form on the page. Using first form as fallback.`);
        // Continue with the first form found
      } else {
        throw new Error('Form not found with selector: ' + formSelector);
      }
    }
    
    // Show filling indicator
    showStatus('Filling form...');
    
    // Check if fieldMappings exists and is an object
    if (!fieldMappings || typeof fieldMappings !== 'object') {
      console.error('Invalid fieldMappings:', fieldMappings);
      throw new Error('Invalid form analysis: fieldMappings is missing or invalid');
    }
    
    // Use the form we found (either the specified one or the fallback)
    const formToUse = form || document.querySelector('form');
    if (!formToUse) {
      throw new Error('No form found on the page');
    }
    
    // Fill each mapped field
    for (const [dataKey, fieldInfo] of Object.entries(fieldMappings)) {
      const value = getNestedValue(userData, dataKey);
      if (value !== undefined && value !== null && value !== '') {
        await fillField(fieldInfo, value);
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

// UI helper functions
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