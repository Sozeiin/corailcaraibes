import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';

import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import App from './App.tsx';
import './index.css';

// Configure React Query with aggressive refresh for real-time sync
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always consider data stale to force refresh
      refetchOnWindowFocus: true, // Refresh when window gets focus
      refetchOnMount: true, // Refresh when component mounts
      refetchOnReconnect: true, // Refresh when reconnecting
      refetchInterval: 30000, // Auto-refresh every 30 seconds
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 408 (timeout)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
          return false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

// Mobile performance optimizations
const setupMobileOptimizations = () => {
  // Disable iOS bounce scroll
  document.addEventListener('touchmove', (e) => {
    if (e.target === document.body) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent zoom on double tap
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);

  // Optimize viewport for mobile
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    );
  }

  // Add safe area CSS variables
  document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
  document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
  document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
  document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
};

// Initialize mobile optimizations
setupMobileOptimizations();

// Register Service Worker for Web Push (not for Capacitor native apps)
if ('serviceWorker' in navigator && !window.location.pathname.includes('capacitor')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>
);
