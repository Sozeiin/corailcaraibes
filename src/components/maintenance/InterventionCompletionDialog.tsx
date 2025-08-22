import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Gauge, Wrench, FileText } from 'lucide-react';

interface InterventionCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  intervention: {
    id: string;
    title: string;
    boat_id: string | null;
    technician_id: string | null;
    intervention_type?: string;
    boats?: {
      name: string;
      model: string;
      current_engine_hours: number;
    } | null;
  };
}

interface CompletionFormData {
  engine_hours_start: number;
  engine_hours_end: number;
  is_oil_change: boolean;
  notes: string;
}

export function InterventionCompletionDialog({ 
  isOpen, 
  onClose, 
  intervention 
}: InterventionCompletionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CompletionFormData>({
    defaultValues: {
      engine_hours_start: 0,
      engine_hours_end: 0,
      is_oil_change: false,
      notes: '',
    },
  });

  // Initialize form with current boat engine hours
  useEffect(() => {
    if (intervention.boats?.current_engine_hours && isOpen) {
      form.reset({
        engine_hours_start: intervention.boats.current_engine_hours,
        engine_hours_end: intervention.boats.current_engine_hours,
        is_oil_change: false,
        notes: '',
      });
    }
  }, [intervention, form, isOpen]);

  const watchStart = form.watch('engine_hours_start');
  const watchEnd = form.watch('engine_hours_end');
  const hoursDifference = watchEnd - watchStart;

  const onSubmit = async (data: CompletionFormData) => {
    setIsSubmitting(true);
    
    try {
      // Validation
      if (data.engine_hours_end < data.engine_hours_start) {
        toast({
          title: "Erreur de validation",
          description: "Les heures de fin doivent être supérieures aux heures de début.",
          variant: "destructive"
        });
        return;
      }

      // Update intervention with completion data
      const { error: interventionError } = await supabase
        .from('interventions')
        .update({
          status: 'completed',
          completed_date: new Date().toISOString().split('T')[0],
          engine_hours_start: data.engine_hours_start,
          engine_hours_end: data.engine_hours_end,
          is_oil_change: data.is_oil_change,
          notes: data.notes || null
        })
        .eq('id', intervention.id);

      if (interventionError) throw interventionError;

      // The trigger update_boat_engine_hours will automatically update the boat's engine hours
      // and reset oil change hours if is_oil_change is true

      toast({
        title: "Intervention terminée",
        description: `L'intervention a été marquée comme terminée. ${data.is_oil_change ? 'Vidange effectuée.' : ''}`,
      });

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['technician-interventions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-interventions'] });
      queryClient.invalidateQueries({ queryKey: ['boats'] });
      queryClient.invalidateQueries({ queryKey: ['boat-dashboard'] });

      onClose();
    } catch (error) {
      console.error('Error completing intervention:', error);
      toast({
        title: "Erreur",
        description: "Impossible de terminer l'intervention.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-marine-600" />
            Terminer l'intervention
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-1">{intervention.title}</h4>
          {intervention.boats && (
            <p className="text-xs text-gray-600">
              {intervention.boats.name} - {intervention.boats.model}
            </p>
          )}
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {/* Engine Hours Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-marine-600" />
                <h4 className="font-medium text-sm">Heures moteur</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="engine_hours_start"
                  rules={{ 
                    required: "Les heures de début sont requises",
                    min: { value: 0, message: "Les heures doivent être positives" }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Heures début</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.1"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="engine_hours_end"
                  rules={{ 
                    required: "Les heures de fin sont requises",
                    min: { value: 0, message: "Les heures doivent être positives" }
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Heures fin</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          step="0.1"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hours difference display */}
              {hoursDifference > 0 && (
                <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                  Durée d'intervention: {hoursDifference.toFixed(1)} heures
                </div>
              )}

              {hoursDifference < 0 && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ Les heures de fin doivent être supérieures aux heures de début
                </div>
              )}
            </div>

            <Separator />

            {/* Oil Change Section */}
            <div className="space-y-3">
              <FormField
                control={form.control}
                name="is_oil_change"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-medium">
                        Vidange effectuée
                      </FormLabel>
                      <p className="text-xs text-gray-600">
                        Cocher si une vidange a été réalisée pendant cette intervention
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Notes Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-marine-600" />
                <h4 className="font-medium text-sm">Notes d'intervention</h4>
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Détails de l'intervention réalisée, problèmes rencontrés, pièces changées..."
                        rows={4}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || hoursDifference < 0}
                className="bg-marine-600 hover:bg-marine-700"
              >
                {isSubmitting ? 'Finalisation...' : 'Terminer l\'intervention'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}