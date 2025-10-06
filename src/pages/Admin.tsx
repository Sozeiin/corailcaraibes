import { Navigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { TenantManager } from '@/components/admin/TenantManager';
import { Building2 } from 'lucide-react';

export default function Admin() {
  const { isSuperAdmin, isLoading } = useIsSuperAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Administration Multi-tenant</h1>
          <p className="text-muted-foreground">Gestion des sociétés et configuration globale</p>
        </div>
      </div>

      <TenantManager />
    </div>
  );
}
