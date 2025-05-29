#!/bin/bash
# Script to generate placeholder icons for the extension
# You can replace these with actual icons later

for size in 16 48 128; do
  echo "Creating ${size}x${size} icon..."
  cat > icon${size}.png << 'EOF'
# Placeholder - replace with actual PNG icons
# The icon should be a PNG file with dimensions ${size}x${size}
EOF
done

echo "Placeholder icon files created. Replace these with actual PNG icons."