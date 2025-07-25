# Mobile Deployment Guide

This guide will help you deploy the Corail Caraibes Fleet Manager to the Google Play Store and Apple App Store.

## Prerequisites

### Android
- Android Studio installed
- Java 11 or higher
- Android SDK
- Google Play Console account ($25 one-time fee)

### iOS
- macOS with Xcode installed
- Apple Developer Account ($99/year)
- iOS provisioning profiles

## Setup Instructions

### 1. Initial Setup

```bash
# Install dependencies
npm install

# Add platforms (first time only)
npx cap add android
npx cap add ios

# Build and sync
npm run build
npx cap sync
```

### 2. Android Configuration

#### App Signing
1. Generate a signing key:
```bash
keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Configure `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../../my-release-key.keystore')
            storePassword 'your-store-password'
            keyAlias 'my-key-alias'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### App Information
Update `android/app/src/main/AndroidManifest.xml`:
- App name and description
- Permissions required
- Version code and name

#### Required Permissions
The app uses these permissions:
- `INTERNET` - For API calls
- `CAMERA` - For barcode scanning
- `WRITE_EXTERNAL_STORAGE` - For file downloads

### 3. iOS Configuration

#### App Information
Update `ios/App/App/Info.plist`:
- Bundle identifier
- App name and version
- Required permissions

#### Required Permissions
Add usage descriptions for:
- Camera usage (barcode scanning)
- Network access

### 4. App Store Assets

#### App Icons
- Android: 512x512 PNG (adaptive icon)
- iOS: 1024x1024 PNG (no alpha channel)

#### Screenshots
Required for both stores:
- Phone screenshots (various sizes)
- Tablet screenshots (optional but recommended)

#### Store Listing
Prepare:
- App description (short and full)
- Keywords for ASO
- Privacy policy URL
- Support contact information

## Build and Release

### Android (Google Play Store)

1. Build release APK/AAB:
```bash
# Open Android Studio
npx cap open android

# Or build from command line
cd android
./gradlew assembleRelease
# Or for AAB (recommended)
./gradlew bundleRelease
```

2. Upload to Google Play Console:
   - Create app listing
   - Upload APK/AAB
   - Complete store listing
   - Submit for review

### iOS (Apple App Store)

1. Open Xcode:
```bash
npx cap open ios
```

2. Configure signing:
   - Select your team
   - Set bundle identifier
   - Configure provisioning profiles

3. Archive and upload:
   - Product → Archive
   - Upload to App Store Connect
   - Complete app listing
   - Submit for review

## Testing

### Internal Testing
- Android: Internal testing track in Play Console
- iOS: TestFlight for beta testing

### Store Review Process
- Android: Usually 1-3 days
- iOS: Usually 24-48 hours

## App Store Guidelines

### Google Play Store
- Follow Material Design guidelines
- Include privacy policy
- Test on various Android versions
- Ensure app stability

### Apple App Store
- Follow Human Interface Guidelines
- Include privacy policy
- Test on various iOS devices
- Ensure app stability

## Maintenance

### Updates
1. Increment version numbers
2. Build and test
3. Upload new version
4. Update store listing if needed

### Monitoring
- Monitor crash reports
- Check user reviews
- Update as needed

## Troubleshooting

### Common Issues
1. **Build failures**: Check Android Studio/Xcode logs
2. **Signing issues**: Verify certificates and profiles
3. **Store rejection**: Follow store guidelines carefully

### Support Resources
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/distribute/console)
- [iOS Developer Guide](https://developer.apple.com/app-store/review/guidelines/)

## Security Considerations

### Production Configuration
- Remove development URLs from Capacitor config
- Enable production builds only
- Secure API endpoints
- Implement proper authentication

### Privacy
- Update privacy policy
- Implement GDPR compliance if needed
- Handle user data securely