import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';

export const useMobileCapacitor = () => {
  const [isNative, setIsNative] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<'connected' | 'disconnected'>('connected');

  useEffect(() => {
    const initCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        setIsNative(true);
        
        // Hide splash screen after app is loaded
        await SplashScreen.hide();
        
        // Configure status bar
        await StatusBar.setBackgroundColor({ color: '#0f172a' });
        await StatusBar.setStyle({ style: Style.Dark });
        
        // Set up keyboard listeners
        Keyboard.addListener('keyboardWillShow', () => {
          document.body.classList.add('keyboard-is-open');
        });
        
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.classList.remove('keyboard-is-open');
        });
        
        // Monitor network status
        const status = await Network.getStatus();
        setNetworkStatus(status.connected ? 'connected' : 'disconnected');
        
        Network.addListener('networkStatusChange', (status) => {
          setNetworkStatus(status.connected ? 'connected' : 'disconnected');
        });
      }
    };

    initCapacitor();
    
    return () => {
      if (isNative) {
        Keyboard.removeAllListeners();
        Network.removeAllListeners();
      }
    };
  }, [isNative]);

  return {
    isNative,
    networkStatus,
    platform: Capacitor.getPlatform()
  };
};