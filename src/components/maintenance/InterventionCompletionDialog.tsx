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
      console.log('Form data being submitted:', data);

      // Update intervention status to completed
      const { error: interventionError } = await supabase
        .from('interventions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          notes: data.notes
        })
        .eq('id', intervention.id);

      if (interventionError) {
        console.error('Intervention update error:', interventionError);
        throw interventionError;
      }

      // Update engine components with new hours and oil change status
      for (const [componentId, updateData] of Object.entries(data.engineUpdates)) {
        const component = engineComponents.find(e => e.id === componentId);
        if (!component) continue;

        const updatePayload: any = {
          current_engine_hours: updateData.current_engine_hours
        };

        // If oil change was performed, update the last oil change hours
        if (updateData.is_oil_change) {
          updatePayload.last_oil_change_hours = updateData.current_engine_hours;
        }

        const { error: componentError } = await supabase
          .from('boat_components')
          .update(updatePayload)
          .eq('id', componentId);

        if (componentError) {
          console.error('Error updating component:', componentError);
          throw componentError;
        }
      }

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['boats'] });
      queryClient.invalidateQueries({ queryKey: ['boat-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['boat-components'] });
      
      toast.success("Intervention terminée avec succès");
      onClose();
    } catch (error) {
      console.error('Error completing intervention:', error);
      toast.error("Erreur lors de la finalisation de l'intervention");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Terminer l'intervention</DialogTitle>
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