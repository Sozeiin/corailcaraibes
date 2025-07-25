import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corailcaraibes.fleetmanager',
  appName: 'Corail Caraibes Fleet Manager',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
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