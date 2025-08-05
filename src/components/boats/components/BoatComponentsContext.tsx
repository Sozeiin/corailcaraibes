import React, { createContext, useContext, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { BoatComponent } from '@/types';

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

interface BoatComponentsContextType {
  boatId: string;
  boatName: string;
  components: BoatComponent[];
  isLoading: boolean;
  queryError: Error | null;
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingComponent: BoatComponent | null;
  setEditingComponent: (component: BoatComponent | null) => void;
  formData: ComponentFormData;
  setFormData: React.Dispatch<React.SetStateAction<ComponentFormData>>;
  resetForm: () => void;
  handleEdit: (component: BoatComponent) => void;
  saveComponentMutation: any;
  deleteComponentMutation: any;
}

const BoatComponentsContext = createContext<BoatComponentsContextType | undefined>(undefined);

export const useBoatComponents = () => {
  const context = useContext(BoatComponentsContext);
  if (context === undefined) {
    throw new Error('useBoatComponents must be used within a BoatComponentsProvider');
  }
  return context;
};

const initialFormData: ComponentFormData = {
  componentName: '',
  componentType: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  installationDate: '',
  maintenanceIntervalDays: 365,
  status: 'operational',
  notes: ''
};

interface BoatComponentsProviderProps {
  children: React.ReactNode;
  boatId: string;
  boatName: string;
}

export function BoatComponentsProvider({ children, boatId, boatName }: BoatComponentsProviderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<BoatComponent | null>(null);
  const [formData, setFormData] = useState<ComponentFormData>(initialFormData);

  // Fetch boat components
  const { data: components = [], isLoading, error: queryError } = useQuery({
    queryKey: ['boat-components', boatId],
    queryFn: async () => {
      console.log('Fetching components for boat:', boatId);
      try {
        const { data, error } = await supabase
          .from('boat_components')
          .select('*')
          .eq('boat_id', boatId)
          .order('component_name');

        if (error) {
          console.error('Database error fetching components:', error);
          throw error;
        }
        
        console.log('Successfully fetched components:', data?.length || 0);
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
      } catch (error) {
        console.error('Error in components query:', error);
        throw error;
      }
    },
    enabled: !!boatId
  });

  // Create/Update component mutation
  const saveComponentMutation = useMutation({
    mutationFn: async (data: ComponentFormData) => {
      console.log('Saving component:', data);
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
      console.error('Error saving component:', error);
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
      console.log('Deleting component:', componentId);
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
    onError: (error) => {
      console.error('Error deleting component:', error);
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue lors de la suppression du composant.',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    console.log('Resetting form');
    setFormData(initialFormData);
  };

  const handleEdit = (component: BoatComponent) => {
    console.log('Editing component:', component.id);
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

  const contextValue: BoatComponentsContextType = {
    boatId,
    boatName,
    components,
    isLoading,
    queryError,
    isDialogOpen,
    setIsDialogOpen,
    editingComponent,
    setEditingComponent,
    formData,
    setFormData,
    resetForm,
    handleEdit,
    saveComponentMutation,
    deleteComponentMutation
  };

  return (
    <BoatComponentsContext.Provider value={contextValue}>
      {children}
    </BoatComponentsContext.Provider>
  );
}