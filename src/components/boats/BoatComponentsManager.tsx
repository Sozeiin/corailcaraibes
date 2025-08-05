import React, { useState, useMemo } from 'react';
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
import { BoatSchematicView } from './BoatSchematicView';
import { BoatTreeView } from './BoatTreeView';
import { ComponentFilters, type FilterState } from './ComponentFilters';
import { ComponentViewSelector, type ViewMode } from './ComponentViewSelector';
import { ComponentDetailsModal } from './ComponentDetailsModal';

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
  console.log('BoatComponentsManager rendered', { boatId, boatName });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('schematic');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<BoatComponent | null>(null);
  const [editingComponent, setEditingComponent] = useState<BoatComponent | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    componentType: '',
    maintenanceStatus: ''
  });
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
  const { data: allComponents = [], isLoading } = useQuery({
    queryKey: ['boat-components', boatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_components')
        .select('*')
        .eq('boat_id', boatId)
        .order('component_name');

      if (error) throw error;
      // Map database column names to TypeScript interface
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

  // Filter components based on active filters
  const filteredComponents = useMemo(() => {
    return allComponents.filter(component => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          component.componentName.toLowerCase().includes(searchLower) ||
          component.componentType.toLowerCase().includes(searchLower) ||
          (component.manufacturer && component.manufacturer.toLowerCase().includes(searchLower)) ||
          (component.model && component.model.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && component.status !== filters.status) {
        return false;
      }

      // Component type filter
      if (filters.componentType && component.componentType !== filters.componentType) {
        return false;
      }

      // Maintenance status filter
      if (filters.maintenanceStatus) {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        if (filters.maintenanceStatus === 'overdue') {
          if (!component.nextMaintenanceDate || new Date(component.nextMaintenanceDate) >= today) {
            return false;
          }
        } else if (filters.maintenanceStatus === 'due_soon') {
          if (!component.nextMaintenanceDate || 
              new Date(component.nextMaintenanceDate) < today || 
              new Date(component.nextMaintenanceDate) > thirtyDaysFromNow) {
            return false;
          }
        } else if (filters.maintenanceStatus === 'up_to_date') {
          if (!component.nextMaintenanceDate || new Date(component.nextMaintenanceDate) < thirtyDaysFromNow) {
            return false;
          }
        }
      }

      return true;
    });
  }, [allComponents, filters]);

  // Get unique component types for filter dropdown
  const uniqueComponentTypes = useMemo(() => {
    return Array.from(new Set(allComponents.map(c => c.componentType))).sort();
  }, [allComponents]);

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

  const handleComponentClick = (component: BoatComponent) => {
    setSelectedComponent(component);
    setIsDetailsModalOpen(true);
  };

  const handleComponentEdit = (component: BoatComponent) => {
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

  const renderComponentsView = () => {
    console.log('renderComponentsView called', { viewMode, isLoading, allComponentsLength: allComponents.length, filteredComponentsLength: filteredComponents.length });
    
    if (isLoading) {
      console.log('Rendering loading state');
      return (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              Chargement des composants...
            </div>
          </CardContent>
        </Card>
      );
    }

    if (allComponents.length === 0) {
      console.log('Rendering empty state');
      return (
        <Card>
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground space-y-2">
              <Wrench className="h-12 w-12 mx-auto opacity-50" />
              <p>Aucun composant configuré pour ce bateau</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    console.log('Rendering view mode:', viewMode);
    switch (viewMode) {
      case 'schematic':
        return (
          <BoatSchematicView
            components={filteredComponents}
            onComponentClick={handleComponentClick}
          />
        );
      case 'tree':
        return (
          <BoatTreeView
            components={filteredComponents}
            onComponentEdit={handleComponentEdit}
            onComponentDetails={handleComponentClick}
          />
        );
      case 'grid':
        return renderGridView();
      case 'list':
        return renderListView();
      default:
        return null;
    }
  };

  // Keep the existing grid view for backward compatibility
  const renderGridView = () => {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4">
            {filteredComponents.map((component) => {
              const statusBadge = statusOptions.find(opt => opt.value === component.status) || statusOptions[0];
              
              return (
                <Card key={component.id} className="border-l-4 border-l-primary cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4" onClick={() => handleComponentClick(component)}>
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleComponentEdit(component);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteComponentMutation.mutate(component.id);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Simple list view
  const renderListView = () => {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            {filteredComponents.map((component) => {
              const statusBadge = statusOptions.find(opt => opt.value === component.status) || statusOptions[0];
              
              return (
                <div
                  key={component.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleComponentClick(component)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium">{component.componentName}</h4>
                      <p className="text-sm text-muted-foreground">{component.componentType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusBadge.color} variant="outline">
                      {statusBadge.label}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleComponentEdit(component);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
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
      <CardContent className="space-y-6">
        <div className="p-4 border border-dashed border-gray-300 rounded-lg">
          <p className="text-center text-muted-foreground">
            Composants Manager - Test de rendu
          </p>
          <p className="text-sm text-center mt-2">
            Boat ID: {boatId} | Boat Name: {boatName}
          </p>
          <p className="text-sm text-center mt-1">
            View Mode: {viewMode} | Loading: {isLoading ? 'Yes' : 'No'}
          </p>
          <p className="text-sm text-center mt-1">
            Components Count: {allComponents.length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}