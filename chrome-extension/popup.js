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
  
});