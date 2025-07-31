#!/bin/bash

# Script de build optimisé pour la production
echo "🚀 Building Corail Caraibes Fleet Manager for PRODUCTION deployment..."

# Nettoyage complet
echo "🧹 Cleaning all build artifacts..."
rm -rf dist/
rm -rf node_modules/.cache/
rm -rf android/app/src/main/assets/public/
rm -rf ios/App/App/public/

# Vérification des dépendances
echo "📦 Verifying dependencies..."
npm audit --audit-level=moderate
if [ $? -ne 0 ]; then
    echo "⚠️  Security vulnerabilities detected! Please fix before deploying."
    exit 1
fi

# Installation propre des dépendances
echo "📥 Installing dependencies..."
npm ci --production=false

# Build de production avec optimisations
echo "🏗️ Building for production..."
export NODE_ENV=production
npm run build

# Vérification du build
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo "❌ Build failed! No dist directory found."
    exit 1
fi

echo "📊 Build statistics:"
echo "  - Total files: $(find dist -type f | wc -l)"
echo "  - Total size: $(du -sh dist | cut -f1)"
echo "  - JS files: $(find dist -name "*.js" -type f | wc -l)"
echo "  - CSS files: $(find dist -name "*.css" -type f | wc -l)"

# Test de sécurité de base
echo "🔒 Running basic security checks..."
if grep -r "console.log" dist/ > /dev/null 2>&1; then
    echo "⚠️  Warning: console.log statements found in production build"
fi

# Synchronisation Capacitor pour mobile
if command -v cap &> /dev/null; then
    echo "📱 Syncing with Capacitor..."
    npx cap sync
fi

echo "✅ Production build complete!"
echo ""
echo "📋 Next steps for deployment:"
echo "  🌐 Web: Deploy the 'dist' folder to your web server"
echo "  📱 Android: npx cap open android (then build release in Android Studio)"
echo "  🍎 iOS: npx cap open ios (then archive in Xcode)"
echo ""
echo "🔒 Security reminders:"
echo "  - Verify all environment variables are set correctly"
echo "  - Test authentication and authorization thoroughly"
echo "  - Monitor application logs after deployment"
echo "  - Set up proper backup procedures for production database"