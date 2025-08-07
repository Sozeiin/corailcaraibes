import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Wrench, Package } from 'lucide-react';
import { BoatSubComponent, SubComponentFormData } from '@/types/component';

interface SubComponentManagerProps {
  parentComponentId: string;
  parentComponentName: string;
}

export function SubComponentManager({ parentComponentId, parentComponentName }: SubComponentManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubComponent, setEditingSubComponent] = useState<BoatSubComponent | null>(null);
  const [formData, setFormData] = useState<SubComponentFormData>({
    subComponentName: '',
    subComponentType: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    installationDate: '',
    maintenanceIntervalDays: 365,
    status: 'operational',
    positionInComponent: '',
    notes: ''
  });

  // Fetch sub-components
  const { data: subComponents, isLoading } = useQuery({
    queryKey: ['sub-components', parentComponentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_sub_components')
        .select('*')
        .eq('parent_component_id', parentComponentId)
        .order('sub_component_name');

      if (error) throw error;
      return data as BoatSubComponent[];
    }
  });

  // Save sub-component mutation
  const saveSubComponentMutation = useMutation({
    mutationFn: async (data: SubComponentFormData) => {
      const subComponentData = {
        parent_component_id: parentComponentId,
        sub_component_name: data.subComponentName,
        sub_component_type: data.subComponentType || null,
        manufacturer: data.manufacturer || null,
        model: data.model || null,
        serial_number: data.serialNumber || null,
        installation_date: data.installationDate || null,
        maintenance_interval_days: data.maintenanceIntervalDays,
        status: data.status,
        position_in_component: data.positionInComponent || null,
        notes: data.notes || null
      };

      if (editingSubComponent) {
        const { error } = await supabase
          .from('boat_sub_components')
          .update(subComponentData)
          .eq('id', editingSubComponent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('boat_sub_components')
          .insert([subComponentData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-components', parentComponentId] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Succès",
        description: editingSubComponent 
          ? "Le sous-composant a été mis à jour avec succès."
          : "Le sous-composant a été ajouté avec succès."
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'enregistrement du sous-composant.",
        variant: "destructive"
      });
    }
  });

  // Delete sub-component mutation
  const deleteSubComponentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('boat_sub_components')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub-components', parentComponentId] });
      toast({
        title: "Succès",
        description: "Le sous-composant a été supprimé avec succès."
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la suppression du sous-composant.",
        variant: "destructive"
      });
    }
  });

  const resetForm = () => {
    setFormData({
      subComponentName: '',
      subComponentType: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      installationDate: '',
      maintenanceIntervalDays: 365,
      status: 'operational',
      positionInComponent: '',
      notes: ''
    });
    setEditingSubComponent(null);
  };

  const handleEdit = (subComponent: BoatSubComponent) => {
    setFormData({
      subComponentName: subComponent.sub_component_name,
      subComponentType: subComponent.sub_component_type || '',
      manufacturer: subComponent.manufacturer || '',
      model: subComponent.model || '',
      serialNumber: subComponent.serial_number || '',
      installationDate: subComponent.installation_date || '',
      maintenanceIntervalDays: subComponent.maintenance_interval_days,
      status: subComponent.status,
      positionInComponent: subComponent.position_in_component || '',
      notes: subComponent.notes || ''
    });
    setEditingSubComponent(subComponent);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subComponentName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du sous-composant est requis.",
        variant: "destructive"
      });
      return;
    }
    saveSubComponentMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Opérationnel</Badge>;
      case 'maintenance':
        return <Badge variant="secondary">En maintenance</Badge>;
      case 'needs_replacement':
        return <Badge variant="destructive">À remplacer</Badge>;
      case 'out_of_order':
        return <Badge variant="destructive">Hors service</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Chargement des sous-composants...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">
          Sous-composants de {parentComponentName}
        </h4>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                console.log('Add subcomponent button clicked');
                resetForm();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un sous-composant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingSubComponent ? 'Modifier le sous-composant' : 'Ajouter un sous-composant'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subComponentName">Nom du sous-composant *</Label>
                  <Input
                    id="subComponentName"
                    value={formData.subComponentName}
                    onChange={(e) => setFormData({ ...formData, subComponentName: e.target.value })}
                    placeholder="Ex: Courroie d'accessoires"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="subComponentType">Type de sous-composant</Label>
                  <Input
                    id="subComponentType"
                    value={formData.subComponentType}
                    onChange={(e) => setFormData({ ...formData, subComponentType: e.target.value })}
                    placeholder="Ex: Courroie, Joint, Filtre"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="manufacturer">Fabricant</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="Nom du fabricant"
                  />
                </div>
                <div>
                  <Label htmlFor="model">Modèle</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="Référence du modèle"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="serialNumber">Numéro de série</Label>
                  <Input
                    id="serialNumber"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="Numéro de série"
                  />
                </div>
                <div>
                  <Label htmlFor="positionInComponent">Position</Label>
                  <Input
                    id="positionInComponent"
                    value={formData.positionInComponent}
                    onChange={(e) => setFormData({ ...formData, positionInComponent: e.target.value })}
                    placeholder="Ex: Côté bâbord, Avant"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="installationDate">Date d'installation</Label>
                  <Input
                    id="installationDate"
                    type="date"
                    value={formData.installationDate}
                    onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenanceIntervalDays">Intervalle de maintenance (jours)</Label>
                  <Input
                    id="maintenanceIntervalDays"
                    type="number"
                    value={formData.maintenanceIntervalDays}
                    onChange={(e) => setFormData({ ...formData, maintenanceIntervalDays: parseInt(e.target.value) || 365 })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Statut</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operational">Opérationnel</SelectItem>
                    <SelectItem value="maintenance">En maintenance</SelectItem>
                    <SelectItem value="needs_replacement">À remplacer</SelectItem>
                    <SelectItem value="out_of_order">Hors service</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes supplémentaires..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={saveSubComponentMutation.isPending}>
                  {saveSubComponentMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!subComponents || subComponents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Aucun sous-composant</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subComponents.map((subComponent) => (
            <Card key={subComponent.id} className="border-l-4 border-l-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium">{subComponent.sub_component_name}</h5>
                      {getStatusBadge(subComponent.status)}
                      {subComponent.sub_component_type && (
                        <Badge variant="outline">{subComponent.sub_component_type}</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      {subComponent.manufacturer && (
                        <div>
                          <span className="font-medium">Fabricant:</span> {subComponent.manufacturer}
                        </div>
                      )}
                      {subComponent.model && (
                        <div>
                          <span className="font-medium">Modèle:</span> {subComponent.model}
                        </div>
                      )}
                      {subComponent.position_in_component && (
                        <div>
                          <span className="font-medium">Position:</span> {subComponent.position_in_component}
                        </div>
                      )}
                      {subComponent.installation_date && (
                        <div>
                          <span className="font-medium">Installation:</span> {new Date(subComponent.installation_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {subComponent.notes && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {subComponent.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(subComponent)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => deleteSubComponentMutation.mutate(subComponent.id)}
                      disabled={deleteSubComponentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}