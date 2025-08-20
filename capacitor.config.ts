import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corailcaraibes.fleetmanager',
  appName: 'Corail Caraibes Fleet Manager',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    Browser: {
      androidCustomTabs: true,
      iOSCustomTabs: true
    },
    BarcodeScanner: {
      shouldShowOverlay: true,
      shouldShowTorchButton: true,
      shouldShowScanArea: true,
      shouldShowBackButton: true
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      showSpinner: false
    },
    StatusBar: {
      style: 'Dark',
      backgroundColor: '#0f172a'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark'
    },
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: true,
      iosKeychainPrefix: 'corail-caraibes',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: "Authentification Biométrique",
        biometricSubTitle: "Utilisez votre empreinte digitale"
      },
      androidIsEncryption: true,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: "Authentification Biométrique", 
        biometricSubTitle: "Utilisez votre empreinte digitale"
      }
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: 'none'
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    backgroundColor: '#0f172a'
  }
};

export default config;