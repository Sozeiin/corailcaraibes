#!/bin/bash

# Production build script for mobile deployment
echo "🚀 Building Corail Caraibes Fleet Manager for production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist
rm -rf android/app/src/main/assets/public
rm -rf ios/App/App/public

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run linting
echo "🔍 Running linter..."
npm run lint

# Build the web app for production
echo "🏗️ Building web application..."
NODE_ENV=production npm run build

if [ $? -ne 0 ]; then
    echo "❌ Web build failed"
    exit 1
fi

# Sync with Capacitor
echo "📱 Syncing with Capacitor..."
npx cap sync

if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed"
    exit 1
fi

# Build Android APK
echo "📱 Building Android APK..."
if [ -d "android" ]; then
    cd android
    ./gradlew assembleRelease
    if [ $? -eq 0 ]; then
        echo "✅ Android APK built successfully!"
        echo "📍 Location: android/app/build/outputs/apk/release/app-release.apk"
    else
        echo "❌ Android build failed"
    fi
    cd ..
else
    echo "⚠️ Android directory not found. Run 'npx cap add android' first."
fi

# Build Android App Bundle (AAB) - preferred for Play Store
echo "📱 Building Android App Bundle..."
if [ -d "android" ]; then
    cd android
    ./gradlew bundleRelease
    if [ $? -eq 0 ]; then
        echo "✅ Android App Bundle built successfully!"
        echo "📍 Location: android/app/build/outputs/bundle/release/app-release.aab"
    else
        echo "❌ Android bundle build failed"
    fi
    cd ..
fi

# iOS build instructions (requires Xcode on macOS)
echo "📱 iOS Build Instructions:"
if [ "$(uname)" = "Darwin" ]; then
    echo "To build for iOS:"
    echo "1. Run: npx cap open ios"
    echo "2. In Xcode, select your team and provisioning profile"
    echo "3. Choose 'Generic iOS Device' or your connected device"
    echo "4. Product > Archive"
    echo "5. Upload to App Store Connect"
else
    echo "⚠️ iOS builds require macOS and Xcode"
    echo "Transfer your project to a Mac to build for iOS"
fi

echo ""
echo "✅ Production build complete!"
echo ""
echo "📋 Next steps for store deployment:"
echo "• Android: Upload app-release.aab to Google Play Console"
echo "• iOS: Archive in Xcode and upload to App Store Connect"
echo "• Test thoroughly on real devices before publishing"
echo ""
echo "📚 Store preparation checklist:"
echo "• App icons (512x512 for Android, 1024x1024 for iOS)"
echo "• Screenshots for all device sizes"
echo "• App description and metadata"
echo "• Privacy policy URL"
echo "• Age rating and content categories"