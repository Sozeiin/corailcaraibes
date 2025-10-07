import { Navigate } from 'react-router-dom';
import { useIsSuperAdmin } from '@/hooks/useIsSuperAdmin';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { TenantManager } from '@/components/admin/TenantManager';
import { UserManagement } from '@/components/admin/UserManagement';
import { Building2 } from 'lucide-react';
import AdminPush from '@/pages/AdminPush';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

      <Tabs defaultValue="tenants" className="w-full">
        <TabsList>
          <TabsTrigger value="tenants">Sociétés</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="push">Push Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-6">
          <TenantManager />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="push" className="mt-6">
          <AdminPush />
        </TabsContent>
      </Tabs>
    </div>
  );
}
