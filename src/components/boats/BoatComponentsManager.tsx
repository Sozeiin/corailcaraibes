import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BoatComponent } from '@/types';

interface BoatComponentsManagerProps {
  boatId: string;
  boatName: string;
}

interface ComponentFormData {
  componentName: string;
  componentType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  maintenanceIntervalDays: number;
  status: string;
  notes: string;
}

const componentTypesOptions = [
  'Moteur bâbord',
  'Moteur tribord',
  'Générateur',
  'Système hydraulique',
  'Système électrique',
  'Système de navigation',
  'Pompe de cale',
  'Climatisation',
  'Système de carburant',
  'Gouvernail',
  'Propulseur d\'étrave',
  'Winch',
  'Gréement',
  'Autre'
];

const statusOptions = [
  { value: 'operational', label: 'Opérationnel', color: 'bg-green-100 text-green-800' },
  { value: 'maintenance_needed', label: 'Maintenance requise', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'out_of_service', label: 'Hors service', color: 'bg-red-100 text-red-800' },
  { value: 'scheduled_maintenance', label: 'Maintenance planifiée', color: 'bg-blue-100 text-blue-800' }
];

export function BoatComponentsManager({ boatId, boatName }: BoatComponentsManagerProps) {
  console.log('BoatComponentsManager rendered with:', { boatId, boatName });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<BoatComponent | null>(null);
  const [formData, setFormData] = useState<ComponentFormData>({
    componentName: '',
    componentType: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    installationDate: '',
    maintenanceIntervalDays: 365,
    status: 'operational',
    notes: ''
  });

  // Fetch boat components
  const { data: components = [], isLoading } = useQuery({
    queryKey: ['boat-components', boatId],
    queryFn: async () => {
      console.log('Fetching components for boat:', boatId);
      const { data, error } = await supabase
        .from('boat_components')
        .select('*')
        .eq('boat_id', boatId)
        .order('component_name');

      if (error) throw error;
      return data.map(item => ({
        id: item.id,
        boatId: item.boat_id,
        componentName: item.component_name,
        componentType: item.component_type,
        manufacturer: item.manufacturer,
        model: item.model,
        serialNumber: item.serial_number,
        installationDate: item.installation_date,
        lastMaintenanceDate: item.last_maintenance_date,
        nextMaintenanceDate: item.next_maintenance_date,
        maintenanceIntervalDays: item.maintenance_interval_days,
        status: item.status,
        notes: item.notes,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      })) as BoatComponent[];
    }
  });

  // Create/Update component mutation
  const saveComponentMutation = useMutation({
    mutationFn: async (data: ComponentFormData) => {
      if (editingComponent) {
        const { error } = await supabase
          .from('boat_components')
          .update({
            component_name: data.componentName,
            component_type: data.componentType,
            manufacturer: data.manufacturer || null,
            model: data.model || null,
            serial_number: data.serialNumber || null,
            installation_date: data.installationDate || null,
            maintenance_interval_days: data.maintenanceIntervalDays,
            status: data.status,
            notes: data.notes || null
          })
          .eq('id', editingComponent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('boat_components')
          .insert({
            boat_id: boatId,
            component_name: data.componentName,
            component_type: data.componentType,
            manufacturer: data.manufacturer || null,
            model: data.model || null,
            serial_number: data.serialNumber || null,
            installation_date: data.installationDate || null,
            maintenance_interval_days: data.maintenanceIntervalDays,
            status: data.status,
            notes: data.notes || null
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boat-components', boatId] });
      setIsDialogOpen(false);
      setEditingComponent(null);
      resetForm();
      toast({
        title: editingComponent ? 'Composant modifié' : 'Composant ajouté',
        description: editingComponent 
          ? 'Le composant a été modifié avec succès.' 
          : 'Le nouveau composant a été ajouté avec succès.'
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la sauvegarde du composant.',
        variant: 'destructive'
      });
    }
  });

  // Delete component mutation
  const deleteComponentMutation = useMutation({
    mutationFn: async (componentId: string) => {
      const { error } = await supabase
        .from('boat_components')
        .delete()
        .eq('id', componentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boat-components', boatId] });
      toast({
        title: 'Composant supprimé',
        description: 'Le composant a été supprimé avec succès.'
      });
    },
    onError: () => {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression du composant.',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      componentName: '',
      componentType: '',
      manufacturer: '',
      model: '',
      serialNumber: '',
      installationDate: '',
      maintenanceIntervalDays: 365,
      status: 'operational',
      notes: ''
    });
  };

  const handleEdit = (component: BoatComponent) => {
    setEditingComponent(component);
    setFormData({
      componentName: component.componentName,
      componentType: component.componentType,
      manufacturer: component.manufacturer || '',
      model: component.model || '',
      serialNumber: component.serialNumber || '',
      installationDate: component.installationDate || '',
      maintenanceIntervalDays: component.maintenanceIntervalDays,
      status: component.status,
      notes: component.notes || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.componentName.trim() || !formData.componentType.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le nom et le type du composant sont obligatoires.',
        variant: 'destructive'
      });
      return;
    }
    saveComponentMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption ? statusOption : statusOptions[0];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Composants de {boatName}
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingComponent(null);
                resetForm();
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un composant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingComponent ? 'Modifier le composant' : 'Ajouter un composant'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="componentName">Nom du composant *</Label>
                    <Input
                      id="componentName"
                      value={formData.componentName}
                      onChange={(e) => setFormData(prev => ({ ...prev, componentName: e.target.value }))}
                      placeholder="ex: Moteur principal bâbord"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="componentType">Type de composant *</Label>
                    <Select 
                      value={formData.componentType} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, componentType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un type" />
                      </SelectTrigger>
                       <SelectContent>
                         {componentTypesOptions.map((type) => (
                           <SelectItem key={type} value={type}>
                             {type}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="manufacturer">Fabricant</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                      placeholder="ex: Volvo Penta"
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Modèle</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="ex: D4-225"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="serialNumber">Numéro de série</Label>
                    <Input
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                      placeholder="ex: VP123456789"
                    />
                  </div>
                  <div>
                    <Label htmlFor="installationDate">Date d'installation</Label>
                    <Input
                      id="installationDate"
                      type="date"
                      value={formData.installationDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, installationDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="maintenanceInterval">Intervalle de maintenance (jours)</Label>
                    <Input
                      id="maintenanceInterval"
                      type="number"
                      min="1"
                      value={formData.maintenanceIntervalDays}
                      onChange={(e) => setFormData(prev => ({ ...prev, maintenanceIntervalDays: parseInt(e.target.value) || 365 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Statut</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Notes additionnelles sur ce composant..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saveComponentMutation.isPending}>
                    {saveComponentMutation.isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">Chargement des composants...</div>
        ) : components.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun composant configuré pour ce bateau</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {components.map((component) => {
              const statusBadge = getStatusBadge(component.status);
              
              return (
                <Card key={component.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <h4 className="font-medium text-lg">{component.componentName}</h4>
                          <p className="text-sm text-muted-foreground">{component.componentType}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusBadge.color}>
                          {statusBadge.label}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(component)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteComponentMutation.mutate(component.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {component.manufacturer && (
                        <div>
                          <span className="font-medium">Fabricant:</span> {component.manufacturer}
                        </div>
                      )}
                      {component.model && (
                        <div>
                          <span className="font-medium">Modèle:</span> {component.model}
                        </div>
                      )}
                      {component.serialNumber && (
                        <div>
                          <span className="font-medium">N° série:</span> {component.serialNumber}
                        </div>
                      )}
                      <div>
                        <span className="font-medium">Maintenance:</span> tous les {component.maintenanceIntervalDays} jours
                      </div>
                    </div>
                    
                    {component.notes && (
                      <div className="mt-3 text-sm">
                        <span className="font-medium">Notes:</span> {component.notes}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}