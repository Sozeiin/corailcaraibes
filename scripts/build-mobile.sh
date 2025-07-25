#!/bin/bash

# Build script for mobile deployment
echo "🚀 Building Corail Caraibes Fleet Manager for mobile deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf android/app/src/main/assets/public
rm -rf ios/App/App/public

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the web app
echo "🏗️ Building web application..."
npm run build

# Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync

echo "✅ Build complete!"
echo "📋 Next steps:"
echo "  • For Android: npx cap open android"
echo "  • For iOS: npx cap open ios"
echo "  • Make sure to update app icons and splash screens in the native projects"