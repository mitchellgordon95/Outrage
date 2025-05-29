# Creating Extension Icons

You need to create PNG icons in these sizes:
- 16x16 pixels (for favicon)
- 48x48 pixels (for extension management page)
- 128x128 pixels (for Chrome Web Store)

## Quick Icon Creation Options:

### Option 1: Use an online tool
- https://favicon.io/favicon-generator/
- https://www.canva.com/ (free with account)
- https://www.figma.com/ (free)

### Option 2: Create a simple "O" icon
Create a simple icon with:
- Background: #3b82f6 (blue)
- Text: White "O" for Outrage
- Font: Bold, sans-serif

### Option 3: Use ImageMagick (if installed)
```bash
# Create a simple blue square with white "O"
convert -size 128x128 xc:'#3b82f6' -fill white -gravity center \
  -pointsize 80 -font Arial-Bold -annotate +0+0 'O' icon128.png
  
# Resize for other sizes
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png
```

Replace the placeholder .png files with your actual icons before uploading.