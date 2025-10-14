import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Pencil, Trash2, Building2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserDialog } from "./UserDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string | null;
  company_name?: string;
}

export function UserManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Fetch all users with their tenant info
  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users', selectedTenantFilter],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('id, name, email, role, tenant_id')
        .order('name');

      if (selectedTenantFilter !== 'all') {
        if (selectedTenantFilter === 'none') {
          query = query.is('tenant_id', null);
        } else {
          query = query.eq('tenant_id', selectedTenantFilter);
        }
      }

      const { data: profiles, error } = await query;
      if (error) throw error;

      // Fetch tenant names separately
      const tenantIds = [...new Set(profiles?.filter(p => p.tenant_id).map(p => p.tenant_id))];
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, company_name')
        .in('id', tenantIds);

      const tenantMap = new Map(tenantData?.map(t => [t.id, t.company_name]) || []);

      return profiles?.map(user => ({
        ...user,
        company_name: user.tenant_id ? tenantMap.get(user.tenant_id) : undefined,
      })) as User[];
    },
  });

  // Fetch tenants for filter
  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('is_active', true)
        .order('company_name');
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès.",
      });
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: any) => {
      let description = "Impossible de supprimer l'utilisateur.";
      
      if (error.message?.includes('policy')) {
        description = "Vous n'avez pas les permissions nécessaires pour supprimer cet utilisateur.";
      } else if (error.message?.includes('foreign key')) {
        description = "Impossible de supprimer cet utilisateur car il a des données associées.";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Erreur de suppression",
        description,
      });
    },
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'direction': return 'default';
      case 'chef_base': return 'secondary';
      case 'technicien': return 'outline';
      case 'administratif': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'direction': return 'Direction';
      case 'chef_base': return 'Chef de base';
      case 'technicien': return 'Technicien';
      case 'administratif': return 'Administratif';
      default: return role;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Users className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Gestion des utilisateurs</h2>
            <p className="text-muted-foreground">
              Gérer tous les utilisateurs de toutes les sociétés
            </p>
          </div>
        </div>
        <Button onClick={handleCreate}>
          <UserPlus className="h-4 w-4 mr-2" />
          Créer un utilisateur
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <label className="text-sm font-medium">Filtrer par société:</label>
        <Select value={selectedTenantFilter} onValueChange={setSelectedTenantFilter}>
          <SelectTrigger className="w-[250px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sociétés</SelectItem>
            <SelectItem value="none">Super Admins (Sans société)</SelectItem>
            {tenants?.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                {tenant.company_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Utilisateurs ({users?.length || 0})</CardTitle>
          <CardDescription>
            Liste de tous les utilisateurs du système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users?.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{user.name}</p>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{user.company_name || "Aucune société (Super Admin)"}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(user)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {users?.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun utilisateur trouvé
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        isSuperAdmin={true}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur "{userToDelete?.name}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
