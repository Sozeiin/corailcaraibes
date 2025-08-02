import React, { useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useMobileCapacitor } from '@/hooks/useMobileCapacitor';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const { isAuthenticated } = useAuth();
  const { isNative } = useMobileCapacitor();

  useEffect(() => {
    // Add mobile-specific classes
    if (isNative) {
      document.body.classList.add('mobile-native');
    }
  }, [isNative]);

  // Pour les pages non authentifiées (comme /auth), on affiche juste les enfants
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Pour les pages authentifiées, on affiche le layout complet
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex flex-col sm:flex-row w-full bg-slate-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header />
          <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};