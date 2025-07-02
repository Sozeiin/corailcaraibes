import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';
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
  boatModel: string;
  manufacturer: string;
  tasks: {
    name: string;
    interval: number;
    unit: string;
  }[];
}

export function MaintenanceManualDialog({ isOpen, onClose }: MaintenanceManualDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ManualFormData>({
    defaultValues: {
      boatModel: '',
      manufacturer: '',
      tasks: [{ name: '', interval: 1, unit: 'mois' }]
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks'
  });

  const units = ['heures', 'jours', 'semaines', 'mois', 'années'];
  const manufacturers = ['Lagoon', 'Fountaine Pajot', 'Bali', 'Catana', 'Outremer', 'Autre'];

  const onSubmit = async (data: ManualFormData) => {
    setIsSubmitting(true);
    
    try {
      // Pour l'instant, simulation de sauvegarde
      // En production, cela sauvegarderait dans une table maintenance_manuals
      console.log('Saving manual:', data);
      
      toast({
        title: "Manuel ajouté",
        description: "Le manuel de maintenance a été créé avec succès."
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
                  onClick={() => append({ name: '', interval: 1, unit: 'mois' })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter une tâche
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg">
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