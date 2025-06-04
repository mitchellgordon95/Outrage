# Chrome Extension Debugging Guide

## Extension Not Detected Issue

If the extension is installed but not being detected, follow these steps:

### 1. Check Extension ID
- Go to `chrome://extensions/`
- Find "Outrage Form Filler"
- Copy the Extension ID
- Make sure it matches what's in your `.env.local` file:
  ```
  NEXT_PUBLIC_CHROME_EXTENSION_ID=your-extension-id-here
  ```

### 2. Reload Everything
1. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the extension
   - Or toggle the extension off and on

2. **Restart your Next.js dev server**:
   - Stop the server (Ctrl+C)
   - Run `npm run dev` again
   - Environment variables are only loaded on startup

3. **Hard refresh the web page**:
   - Open Chrome DevTools (F12)
   - Right-click the refresh button
   - Select "Empty Cache and Hard Reload"

### 3. Check Console Logs
Open the browser console (F12) and look for these messages:
- `Checking extension with ID: [your-extension-id]`
- `Extension response:` (should show `{pong: true}`)
- `Chrome runtime error:` (should be `undefined`)

Common errors:
- `"Could not establish connection"` - Extension not installed or wrong ID
- `"Specified native messaging host not found"` - Extension ID mismatch

### 4. Check Extension Background Page
1. Go to `chrome://extensions/`
2. Click "background page" or "service worker" link under your extension
3. Look for `Received external message: {action: "ping"}`

### 5. Verify URL Match
The extension only accepts messages from:
- `http://localhost:3000/*`
- `https://*.outrage.gg/*`

Make sure you're accessing the app via `http://localhost:3000` (not `127.0.0.1` or another port).

### 6. Manual Test
In the browser console, run:
```javascript
chrome.runtime.sendMessage(
  'YOUR_EXTENSION_ID_HERE',
  { action: 'ping' },
  (response) => {
    console.log('Response:', response);
    console.log('Error:', chrome.runtime.lastError);
  }
);
```

This should return `{pong: true}` if the extension is working.

### 7. Common Fixes
- **Wrong Extension ID**: Double-check the ID matches exactly
- **Environment variable not loaded**: Restart Next.js server
- **Extension not reloaded**: Always reload after changes
- **Browser cache**: Hard refresh the page
- **URL mismatch**: Use `http://localhost:3000`

### 8. If Still Not Working
1. Uninstall and reinstall the extension
2. Check if other Chrome extensions might interfere
3. Try in an incognito window (with extension allowed in incognito)
4. Check Chrome version (should be relatively recent)