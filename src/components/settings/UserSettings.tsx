import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Edit, Save, X, Mail, User, Building, Trash2, Settings } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { UserPermissions } from './UserPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function UserSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<any>(null);
  const [expandedPermissions, setExpandedPermissions] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          bases(name)
        `)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditingUser(null);
      toast({
        title: "Utilisateur modifié",
        description: "Les informations de l'utilisateur ont été mises à jour."
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier l'utilisateur.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // First delete from auth.users (this will cascade to profiles via trigger)
      const { error } = await supabase.auth.admin.deleteUser(id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: "Utilisateur supprimé",
        description: "L'utilisateur a été supprimé avec succès."
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'utilisateur.",
        variant: "destructive"
      });
    }
  });

  const handleSave = (userData: any) => {
    updateMutation.mutate({ id: editingUser.id, data: userData });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'direction':
        return 'default';
      case 'chef_base':
        return 'secondary';
      case 'technicien':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'direction':
        return 'Direction';
      case 'chef_base':
        return 'Chef de base';
      case 'technicien':
        return 'Technicien';
      default:
        return role;
    }
  };

  const UserForm = ({ user, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'technicien',
      base_id: user.base_id || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nom *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="role">Rôle *</Label>
            <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="technicien">Technicien</SelectItem>
                <SelectItem value="chef_base">Chef de base</SelectItem>
                <SelectItem value="direction">Direction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="base">Base</Label>
            <Select 
              value={formData.base_id} 
              onValueChange={(value) => setFormData({ ...formData, base_id: value })}
              disabled={formData.role === 'direction'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une base" />
              </SelectTrigger>
              <SelectContent>
                {bases.map((base) => (
                  <SelectItem key={base.id} value={base.id}>
                    {base.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Annuler
          </Button>
        </div>
      </form>
    );
  };

  if (isLoading) {
    return <div>Chargement des utilisateurs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des utilisateurs</h3>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              {editingUser?.id === user.id ? (
                <UserForm
                  user={user}
                  onSave={handleSave}
                  onCancel={() => setEditingUser(null)}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-semibold flex items-center gap-2">
                        <User className="h-5 w-5" />
                        {user.name}
                      </h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          {user.email}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {getRoleLabel(user.role)}
                          </Badge>
                          {user.bases && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building className="h-4 w-4" />
                              {user.bases.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
                      
                      {user.role === 'technicien' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedPermissions(
                            expandedPermissions === user.id ? null : user.id
                          )}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Permissions
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer l'utilisateur</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer l'utilisateur "{user.name}" ? 
                              Cette action est irréversible et toutes les données associées à cet utilisateur seront supprimées.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )}
              
              {expandedPermissions === user.id && (
                <div className="mt-4 pt-4 border-t">
                  <UserPermissions 
                    userId={user.id}
                    userName={user.name}
                    userRole={user.role}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}