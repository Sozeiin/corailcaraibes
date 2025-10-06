import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, Users, MapPin } from 'lucide-react';
import { TenantDialog } from './TenantDialog';
import { TenantStats } from './TenantStats';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  company_name: string;
  slug: string;
  country: string;
  contact_email: string | null;
  is_active: boolean;
  created_at: string;
}

export function TenantManager() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Tenant[];
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('tenants')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('Statut du tenant mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour du statut');
      console.error('Toggle active error:', error);
    }
  });

  const handleEdit = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedTenant(null);
    setDialogOpen(true);
  };

  const handleToggleActive = (tenant: Tenant) => {
    toggleActiveMutation.mutate({ id: tenant.id, is_active: !tenant.is_active });
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <TenantStats tenants={tenants} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Sociétés</CardTitle>
            <CardDescription>
              Gérez les différentes sociétés utilisant le système
            </CardDescription>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle société
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tenants.map((tenant) => (
              <Card key={tenant.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{tenant.company_name}</CardTitle>
                    </div>
                    <Badge variant={tenant.is_active ? 'default' : 'secondary'}>
                      {tenant.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{tenant.country}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <code className="bg-muted px-2 py-1 rounded">{tenant.slug}</code>
                  </div>
                  {tenant.contact_email && (
                    <div className="text-sm text-muted-foreground truncate">
                      {tenant.contact_email}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEdit(tenant)}
                      className="flex-1"
                    >
                      Modifier
                    </Button>
                    <Button 
                      variant={tenant.is_active ? 'destructive' : 'default'}
                      size="sm" 
                      onClick={() => handleToggleActive(tenant)}
                      className="flex-1"
                    >
                      {tenant.is_active ? 'Désactiver' : 'Activer'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <TenantDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenant={selectedTenant}
      />
    </div>
  );
}
