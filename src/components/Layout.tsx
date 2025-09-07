import React, { useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';
import { MobileQuickActions } from '@/components/mobile/MobileQuickActions';
import { MobileOfflineBar } from '@/components/mobile/MobileOfflineBar';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { backgroundSyncService } from '@/services/backgroundSync';
interface LayoutProps {
  children: React.ReactNode;
}
export const Layout = ({
  children
}: LayoutProps) => {
  const {
    isAuthenticated
  } = useAuth();
  const {
    isNative
  } = useMobileCapacitor();
  // Initialize offline sync (SQLite DB setup & auto-sync when back online)
  useOfflineSync();
  useEffect(() => {
    // Add mobile-specific classes
    if (isNative) {
      document.body.classList.add('mobile-native');
      // Initialize background sync for mobile
      backgroundSyncService.initialize();
    }
  }, [isNative]);

  // Pour les pages non authentifiées (comme /auth), on affiche juste les enfants
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Pour les pages authentifiées, on affiche le layout complet
  return <SidebarProvider defaultOpen={!isNative}>
      <MobileOfflineBar />
      <div className="min-h-screen flex flex-col lg:flex-row w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8 bg-background">
            <div className="max-w-none mx-auto">
              {children}
            </div>
          </main>
        </div>
        <MobileQuickActions />
      </div>
    </SidebarProvider>;
};