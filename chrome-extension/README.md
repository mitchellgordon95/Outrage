# Outrage Form Filler Chrome Extension

This Chrome extension automates filling out web forms for government representatives.

## Installation (Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" 
4. Select the `chrome-extension` folder from this project
5. The extension will be installed and ready to use

## How It Works

1. The main Outrage app identifies representatives that use web forms instead of email
2. When you click "Fill Web Forms", the app communicates with this extension
3. The extension:
   - Opens each representative's contact form in a new tab
   - Sends the form URL to our API for analysis
   - Receives field mapping instructions
   - Automatically fills in the form fields
   - Highlights the submit button for you to review and click

## Features

- Automatic form field detection and mapping
- Visual indicators during form filling
- Support for various form types (text, email, select, etc.)
- Status tracking for each form
- Clean UI in the extension popup

## Development

### Update Extension ID

After loading the extension, update the `EXTENSION_ID` in:
- `/src/components/ChromeExtensionHelper.tsx`

You can find your extension ID in `chrome://extensions/`

### Icons

Replace the placeholder icon files in the `icons/` directory with actual PNG images:
- `icon16.png` - 16x16 pixels
- `icon48.png` - 48x48 pixels  
- `icon128.png` - 128x128 pixels

### Testing

1. Load the extension in developer mode
2. Run the main Outrage app locally
3. Generate drafts for representatives with web forms
4. Click "Fill Web Forms" to test the integration

## Publishing

To publish to the Chrome Web Store:

1. Create production icons
2. Update the manifest version
3. Create a ZIP file of the extension
4. Upload to Chrome Developer Dashboard
5. Update the `EXTENSION_ID` in the main app with the published ID