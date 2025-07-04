import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a67ce1cfd84a489ebe55b2c675431676',
  appName: 'catamaran-fleet-manager-pro',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://a67ce1cf-d84a-489e-be55-b2c675431676.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    BarcodeScanner: {
      shouldShowOverlay: true,
      shouldShowTorchButton: true,
      shouldShowScanArea: true,
      shouldShowBackButton: true
    }
  }
};

export default config;