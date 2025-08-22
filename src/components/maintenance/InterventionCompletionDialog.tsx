import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import type { EngineComponent } from '@/utils/engineMaintenanceUtils';

interface InterventionCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: {
    id: string;
    title: string;
    boat_id: string | null;
    technician_id: string | null;
    intervention_type?: string;
    boat?: {
      id: string;
      name: string;
      model: string;
      current_engine_hours: number;
      current_engine_hours_starboard?: number;
      current_engine_hours_port?: number;
    } | null;
  };
}

interface CompletionFormData {
  notes: string;
  engineUpdates: {
    [componentId: string]: {
      current_engine_hours: number;
      is_oil_change: boolean;
    };
  };
}

export const InterventionCompletionDialog: React.FC<InterventionCompletionDialogProps> = ({
  isOpen,
  onClose,
  intervention
}) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [engineComponents, setEngineComponents] = useState<EngineComponent[]>([]);
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CompletionFormData>();

  // Fetch engine components when dialog opens
  useEffect(() => {
    if (intervention?.boat_id && isOpen) {
      fetchEngineComponents();
      setValue('notes', '');
      setValue('engineUpdates', {});
    }
  }, [intervention, isOpen, setValue]);

  const fetchEngineComponents = async () => {
    if (!intervention?.boat_id) return;

    const { data, error } = await supabase
      .from('boat_components')
      .select('id, component_name, component_type, current_engine_hours, last_oil_change_hours')
      .eq('boat_id', intervention.boat_id)
      .ilike('component_type', '%moteur%');

    if (error) {
      console.error('Error fetching engine components:', error);
      toast.error('Erreur lors du chargement des moteurs');
      return;
    }

    setEngineComponents(data || []);
    
    // Initialize form with current engine hours
    const initialUpdates: any = {};
    data?.forEach(engine => {
      initialUpdates[engine.id] = {
        current_engine_hours: engine.current_engine_hours || 0,
        is_oil_change: false
      };
    });
    setValue('engineUpdates', initialUpdates);
  };

  const engineUpdates = watch('engineUpdates') || {};

  const onSubmit = async (data: CompletionFormData) => {
    if (!intervention) return;
    
    setIsSubmitting(true);
    try {
      console.log('🔧 Starting intervention completion with data:', data);
      console.log('🔧 Engine components found:', engineComponents);

      // Validate that we have engine updates
      if (!data.engineUpdates || Object.keys(data.engineUpdates).length === 0) {
        throw new Error('Aucune mise à jour des heures moteur fournie');
      }

      // Validate engine hours
      for (const [componentId, updateData] of Object.entries(data.engineUpdates)) {
        console.log(`🔧 Validating component ${componentId}:`, updateData);
        if (updateData.current_engine_hours < 0) {
          throw new Error(`Les heures moteur ne peuvent pas être négatives`);
        }
        if (updateData.current_engine_hours === 0) {
          console.warn(`⚠️ Heures moteur à 0 pour le composant ${componentId}`);
        }
      }

      // First update engine components to ensure data consistency
      const componentUpdates = [];
      for (const [componentId, updateData] of Object.entries(data.engineUpdates)) {
        const component = engineComponents.find(e => e.id === componentId);
        if (!component) {
          console.warn(`⚠️ Component ${componentId} not found in engineComponents`);
          continue;
        }

        const updatePayload: any = {
          current_engine_hours: parseInt(updateData.current_engine_hours.toString()),
          updated_at: new Date().toISOString()
        };

        // If oil change was performed, update the last oil change hours
        if (updateData.is_oil_change) {
          updatePayload.last_oil_change_hours = parseInt(updateData.current_engine_hours.toString());
          console.log(`🛢️ Oil change recorded for component ${componentId} at ${updateData.current_engine_hours}h`);
        }

        console.log(`🔧 Updating component ${componentId} with payload:`, updatePayload);

        const { data: updatedComponent, error: componentError } = await supabase
          .from('boat_components')
          .update(updatePayload)
          .eq('id', componentId)
          .select('*');

        if (componentError) {
          console.error('❌ Error updating component:', componentError);
          throw new Error(`Erreur lors de la mise à jour du composant ${component.component_name}: ${componentError.message}`);
        }

        if (!updatedComponent || updatedComponent.length === 0) {
          console.error('❌ No component updated, possibly blocked by RLS policy');
          throw new Error(`Impossible de mettre à jour le composant ${component.component_name}. Vérifiez vos permissions.`);
        }

        console.log(`✅ Component ${componentId} updated successfully:`, updatedComponent[0]);
        componentUpdates.push(updatedComponent[0]);
      }

      // Now update intervention status to completed
      console.log('🔧 Updating intervention status to completed');
      const { error: interventionError } = await supabase
        .from('interventions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: data.notes || null
        })
        .eq('id', intervention.id);

      if (interventionError) {
        console.error('❌ Intervention update error:', interventionError);
        throw new Error(`Erreur lors de la finalisation de l'intervention: ${interventionError.message}`);
      }

      console.log('✅ Intervention marked as completed');

      // Invalidate all related queries to force refresh
      console.log('🔄 Invalidating query caches...');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['interventions'] }),
        queryClient.invalidateQueries({ queryKey: ['boats'] }),
        queryClient.invalidateQueries({ queryKey: ['boat-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['boat-components'] }),
        queryClient.invalidateQueries({ queryKey: ['boat-engines'] }),
        queryClient.removeQueries({ queryKey: ['boat-engines', intervention.boat_id] })
      ]);

      // Show success message
      toast.success(`✅ Intervention finalisée avec succès. ${componentUpdates.length} moteur(s) mis à jour.`);

      console.log('✅ Intervention completion successful, closing dialog');
      onClose();
      
      // Force a fresh data reload after a short delay
      setTimeout(() => {
        console.log('🔄 Forcing fresh data reload...');
        queryClient.refetchQueries({ queryKey: ['boat-engines'] });
        queryClient.refetchQueries({ queryKey: ['boats'] });
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Error completing intervention:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la finalisation de l'intervention");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="intervention-completion-description">
        <DialogHeader>
          <DialogTitle>Terminer l'intervention</DialogTitle>
          <p id="intervention-completion-description" className="text-sm text-muted-foreground">
            Mettre à jour les heures moteur et marquer l'intervention comme terminée
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            {engineComponents.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Moteurs du bateau</h3>
                
                {engineComponents.map((engine) => {
                  const currentHours = engineUpdates[engine.id]?.current_engine_hours || engine.current_engine_hours;
                  const isOilChange = engineUpdates[engine.id]?.is_oil_change || false;
                  
                  return (
                    <div key={engine.id} className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium">{engine.component_name}</h4>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`engine_hours_${engine.id}`}>
                          Heures moteur actuelles
                        </Label>
                        <Input
                          id={`engine_hours_${engine.id}`}
                          type="number"
                          value={currentHours}
                          onChange={(e) => {
                            const newHours = parseInt(e.target.value) || 0;
                            setValue(`engineUpdates.${engine.id}.current_engine_hours`, newHours);
                          }}
                          min={engine.current_engine_hours}
                        />
                        <p className="text-sm text-muted-foreground">
                          Heures précédentes: {engine.current_engine_hours}h
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Dernière vidange: {engine.last_oil_change_hours}h 
                          ({engine.current_engine_hours - engine.last_oil_change_hours}h depuis)
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`oil_change_${engine.id}`}
                          checked={isOilChange}
                          onCheckedChange={(checked) => {
                            setValue(`engineUpdates.${engine.id}.is_oil_change`, checked);
                          }}
                        />
                        <Label htmlFor={`oil_change_${engine.id}`}>
                          Vidange effectuée sur ce moteur
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Aucun moteur trouvé pour ce bateau.</p>
                <p className="text-sm">Assurez-vous que les composants moteur sont configurés.</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes d'intervention</Label>
              <Textarea
                id="notes"
                placeholder="Ajouter des notes sur l'intervention..."
                {...register('notes')}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Finalisation...' : 'Terminer l\'intervention'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};