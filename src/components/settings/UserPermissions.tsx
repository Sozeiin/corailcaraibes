import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PAGE_PERMISSIONS, PagePermission } from '@/hooks/usePermissions';
import { Separator } from '@/components/ui/separator';

interface UserPermissionsProps {
  userId: string;
  userName: string;
  userRole: string;
}

export const UserPermissions: React.FC<UserPermissionsProps> = ({
  userId,
  userName,
  userRole
}) => {
  const queryClient = useQueryClient();

  // Only show permissions for technicians
  if (userRole !== 'technicien') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions des pages</CardTitle>
          <CardDescription>
            Les utilisateurs {userRole} ont automatiquement accès à toutes les pages.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data: permissions = {}, isLoading } = useQuery({
    queryKey: ['user-permissions', userId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_user_page_permissions', {
        user_id_param: userId
      });
      
      const permissionsMap: Record<PagePermission, boolean> = {} as Record<PagePermission, boolean>;
      
      if (data) {
        data.forEach((perm: { page_permission: PagePermission; granted: boolean }) => {
          permissionsMap[perm.page_permission] = perm.granted;
        });
      }
      
      return permissionsMap;
    }
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async ({ page, granted }: { page: PagePermission; granted: boolean }) => {
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          page_permission: page,
          granted,
          granted_by: (await supabase.auth.getUser()).data.user?.id
        }, {
          onConflict: 'user_id,page_permission'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions', userId] });
      toast.success('Permissions mises à jour');
    },
    onError: (error) => {
      console.error('Error updating permission:', error);
      toast.error('Erreur lors de la mise à jour des permissions');
    }
  });

  const handlePermissionChange = (page: PagePermission, granted: boolean) => {
    updatePermissionMutation.mutate({ page, granted });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permissions des pages</CardTitle>
          <CardDescription>Chargement...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permissions des pages - {userName}</CardTitle>
        <CardDescription>
          Gérez l'accès aux différentes pages de l'application pour ce technicien.
          Par défaut, tous les techniciens ont accès à toutes les pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(PAGE_PERMISSIONS).map(([page, label], index) => {
          const isGranted = permissions[page as PagePermission] !== false;
          
          return (
            <div key={page}>
              <div className="flex items-center justify-between">
                <Label htmlFor={`permission-${page}`} className="text-sm font-medium">
                  {label}
                </Label>
                <Switch
                  id={`permission-${page}`}
                  checked={isGranted}
                  onCheckedChange={(checked) => 
                    handlePermissionChange(page as PagePermission, checked)
                  }
                  disabled={updatePermissionMutation.isPending}
                />
              </div>
              {index < Object.entries(PAGE_PERMISSIONS).length - 1 && (
                <Separator className="mt-4" />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};