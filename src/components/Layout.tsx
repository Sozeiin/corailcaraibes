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
import { PageShell } from '@/components/layout/PageShell';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated } = useAuth();
  const { isNative } = useMobileCapacitor();
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
  return (
    <SidebarProvider defaultOpen={false}>
      <MobileOfflineBar />
      <PageShell>
        <div className="flex flex-col sm:flex-row w-full bg-slate-50">
          <AppSidebar />
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <Header />
            <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
              {children}
            </main>
          </div>
          <MobileQuickActions />
        </div>
      </PageShell>
    </SidebarProvider>
  );
};
