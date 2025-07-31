import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize Capacitor for mobile platforms
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) {
  import('./hooks/useMobileCapacitor').catch(err => {
    console.error('Failed to load mobile capacitor hooks:', err);
  });
}

createRoot(document.getElementById("root")!).render(<App />);
