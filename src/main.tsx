import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize Capacitor
import { Capacitor } from '@capacitor/core';
if (Capacitor.isNativePlatform()) {
  import('./hooks/useMobileCapacitor');
}

createRoot(document.getElementById("root")!).render(<App />);
