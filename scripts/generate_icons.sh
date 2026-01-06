#!/bin/bash
# Generate favicon files using sips (macOS built-in)
sips -z 32 32 assets/icon.png --out app/public/favicon-32x32.png
sips -z 16 16 assets/icon.png --out app/public/favicon-16x16.png
sips -z 180 180 assets/icon.png --out app/public/apple-touch-icon.png
sips -z 192 192 assets/icon.png --out app/public/android-chrome-192x192.png
sips -z 512 512 assets/icon.png --out app/public/android-chrome-512x512.png
cp assets/icon.png app/public/favicon.png
