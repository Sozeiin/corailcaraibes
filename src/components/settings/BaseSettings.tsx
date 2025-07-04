import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Save, X, Building, MapPin, Phone, Mail, User, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function BaseSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingBase, setEditingBase] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  const { data: bases = [], isLoading } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (baseData: any) => {
      const { data, error } = await supabase
        .from('bases')
        .insert([baseData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      setIsCreating(false);
      toast({
        title: "Base créée",
        description: "La nouvelle base a été ajoutée avec succès."
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer la base.",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { error } = await supabase
        .from('bases')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      setEditingBase(null);
      toast({
        title: "Base modifiée",
        description: "Les informations de la base ont été mises à jour."
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la base.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] });
      toast({
        title: "Base supprimée",
        description: "La base a été supprimée avec succès."
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la base. Vérifiez qu'elle n'est pas utilisée.",
        variant: "destructive"
      });
    }
  });

  const handleSave = (baseData: any) => {
    if (isCreating) {
      createMutation.mutate(baseData);
    } else {
      updateMutation.mutate({ id: editingBase.id, data: baseData });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const BaseForm = ({ base, onSave, onCancel }: any) => {
    const [formData, setFormData] = useState({
      name: base?.name || '',
      location: base?.location || '',
      phone: base?.phone || '',
      email: base?.email || '',
      manager: base?.manager || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Nom de la base *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Label htmlFor="manager">Responsable</Label>
            <Input
              id="manager"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location">Localisation *</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
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
    return <div>Chargement des bases...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des bases</h3>
        <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle base
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Nouvelle base
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BaseForm
              onSave={handleSave}
              onCancel={() => setIsCreating(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {bases.map((base) => (
          <Card key={base.id}>
            <CardContent className="p-6">
              {editingBase?.id === base.id ? (
                <BaseForm
                  base={base}
                  onSave={handleSave}
                  onCancel={() => setEditingBase(null)}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-lg font-semibold flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        {base.name}
                      </h4>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {base.location}
                        </div>
                        {base.manager && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            {base.manager}
                          </div>
                        )}
                        {base.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {base.phone}
                          </div>
                        )}
                        {base.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {base.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingBase(base)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Modifier
                      </Button>
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
                            <AlertDialogTitle>Supprimer la base</AlertDialogTitle>
                            <AlertDialogDescription>
                              Êtes-vous sûr de vouloir supprimer la base "{base.name}" ? 
                              Cette action est irréversible et tous les utilisateurs, bateaux et données associés seront supprimés.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(base.id)}
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
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}