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
  const { isAuthenticated, loading } = useAuth();
  const { isNative } = useMobileCapacitor();

  useEffect(() => {
    // Add mobile-specific classes
    if (isNative) {
      document.body.classList.add('mobile-native');
    }
  }, [isNative]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-marine-50 to-slate-100">
        <div className="text-center p-8 rounded-xl bg-white shadow-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-marine-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'application...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-slate-50">
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