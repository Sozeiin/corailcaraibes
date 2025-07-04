import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MaintenanceManualDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ManualFormData {
  boatId: string;
  boatModel: string;
  manufacturer: string;
  tasks: {
    name: string;
    interval: number;
    unit: string;
    description?: string;
  }[];
}

export function MaintenanceManualDialog({ isOpen, onClose }: MaintenanceManualDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ManualFormData>({
    defaultValues: {
      boatId: '',
      boatModel: '',
      manufacturer: '',
      tasks: [{ name: '', interval: 1, unit: 'mois', description: '' }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks'
  });

  // Fetch boats for selection
  const { data: boats = [] } = useQuery({
    queryKey: ['boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('id, name, model')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const units = ['heures', 'jours', 'semaines', 'mois', 'années'];
  const manufacturers = ['Lagoon', 'Fountaine Pajot', 'Bali', 'Catana', 'Outremer', 'Autre'];

  const onSubmit = async (data: ManualFormData) => {
    setIsSubmitting(true);
    
    try {
      // Créer le manuel de maintenance
      const { data: manual, error: manualError } = await supabase
        .from('maintenance_manuals')
        .insert({
          boat_id: data.boatId || null,
          boat_model: data.boatModel,
          manufacturer: data.manufacturer,
          created_by: user?.id,
          is_active: true
        })
        .select()
        .single();

      if (manualError) throw manualError;

      // Créer les tâches de maintenance
      const tasksData = data.tasks.map(task => ({
        manual_id: manual.id,
        task_name: task.name,
        interval_value: task.interval,
        interval_unit: task.unit,
        description: task.description || null
      }));

      const { error: tasksError } = await supabase
        .from('maintenance_manual_tasks')
        .insert(tasksData);

      if (tasksError) throw tasksError;
      
      toast({
        title: "Manuel créé",
        description: data.boatId 
          ? "Le manuel de maintenance a été créé et les maintenances ont été automatiquement planifiées pour le bateau."
          : "Le manuel de maintenance générique a été créé avec succès."
      });

      onClose();
    } catch (error) {
      console.error('Error saving manual:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le manuel.",
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau manuel de maintenance</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="boatId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bateau concerné</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un bateau (optionnel)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="">Manuel générique (tous les bateaux)</SelectItem>
                      {boats.map((boat) => (
                        <SelectItem key={boat.id} value={boat.id}>
                          {boat.name} - {boat.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="boatModel"
                rules={{ required: "Le modèle est requis" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle de bateau *</FormLabel>
                    <FormControl>
                      <Input placeholder="Catamaran 42" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manufacturer"
                rules={{ required: "Le constructeur est requis" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Constructeur *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un constructeur" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {manufacturers.map((manufacturer) => (
                          <SelectItem key={manufacturer} value={manufacturer}>
                            {manufacturer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Tâches de maintenance</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: '', interval: 1, unit: 'mois', description: '' })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter une tâche
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 gap-4 p-4 border rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name={`tasks.${index}.name`}
                      rules={{ required: "Le nom de la tâche est requis" }}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Nom de la tâche *</FormLabel>
                          <FormControl>
                            <Input placeholder="Vérification moteur..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`tasks.${index}.interval`}
                      rules={{ required: "L'intervalle est requis", min: 1 }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intervalle *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`tasks.${index}.unit`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unité</FormLabel>
                          <div className="flex items-center gap-2">
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {units.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`tasks.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optionnelle)</FormLabel>
                        <FormControl>
                          <Input placeholder="Détails sur la procédure de maintenance..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

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
                disabled={isSubmitting}
                className="bg-marine-600 hover:bg-marine-700"
              >
                {isSubmitting ? 'Sauvegarde...' : 'Créer le manuel'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}