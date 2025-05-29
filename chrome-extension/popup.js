// Popup script for the extension
document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const contentEl = document.getElementById('content');
  
  // Check connection to the app
  try {
    const response = await fetch('http://localhost:3000/api/extension-status');
    if (response.ok) {
      statusEl.className = 'status connected';
      statusEl.textContent = 'Connected to Outrage app';
    } else {
      throw new Error('Not connected');
    }
  } catch (error) {
    statusEl.className = 'status disconnected';
    statusEl.textContent = 'Not connected to Outrage app';
  }
  
  // Get active sessions
  chrome.runtime.sendMessage({ action: 'getActiveSessions' }, (sessions) => {
    if (sessions && sessions.length > 0) {
      displaySessions(sessions);
    }
  });
});

function displaySessions(sessions) {
  const contentEl = document.getElementById('content');
  
  let html = '<div class="section">';
  html += '<div class="section-title">Active Sessions</div>';
  
  sessions.forEach(session => {
    html += `
      <div class="session-info">
        <div class="session-item">
          <span class="label">Representative:</span>
          <span class="value">${session.representative.name}</span>
        </div>
        <div class="session-item">
          <span class="label">Status:</span>
          <span class="value">${getStatusLabel(session.status)}</span>
        </div>
        <div class="session-item">
          <span class="label">Tab:</span>
          <span class="value">${session.tabId}</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  contentEl.innerHTML = html;
}

function getStatusLabel(status) {
  const labels = {
    pending: '⏳ Waiting',
    filling: '✍️ Filling',
    completed: '✅ Completed',
    failed: '❌ Failed'
  };
  return labels[status] || status;
}