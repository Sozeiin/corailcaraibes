import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CheckCircle, XCircle } from 'lucide-react';

interface TenantStatsProps {
  tenants: Array<{ id: string; is_active: boolean }>;
}

export function TenantStats({ tenants }: TenantStatsProps) {
  const { data: userStats } = useQuery({
    queryKey: ['tenant-user-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('tenant_id, user_id');
      
      if (error) throw error;
      
      const uniqueUsers = new Set(data.map(r => r.user_id)).size;
      return { totalUsers: uniqueUsers };
    }
  });

  const activeTenants = tenants.filter(t => t.is_active).length;
  const inactiveTenants = tenants.filter(t => !t.is_active).length;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sociétés</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{tenants.length}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sociétés Actives</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeTenants}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sociétés Inactives</CardTitle>
          <XCircle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{inactiveTenants}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Utilisateurs</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{userStats?.totalUsers || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}
