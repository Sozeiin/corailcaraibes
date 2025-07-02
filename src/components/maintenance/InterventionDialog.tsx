import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Intervention, Boat, Base } from '@/types';

interface InterventionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  intervention?: Intervention | null;
}

interface InterventionFormData {
  title: string;
  description: string;
  boatId: string;
  technicianId: string;
  status: string;
  scheduledDate: string;
  baseId: string;
}

export function InterventionDialog({ isOpen, onClose, intervention }: InterventionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InterventionFormData>({
    defaultValues: {
      title: '',
      description: '',
      boatId: '',
      technicianId: '',
      status: 'scheduled',
      scheduledDate: '',
      baseId: '',
    },
  });

  const { data: boats = [] } = useQuery({
    queryKey: ['boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technicien')
        .order('name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  useEffect(() => {
    if (intervention) {
      form.reset({
        title: intervention.title,
        description: intervention.description,
        boatId: intervention.boatId,
        technicianId: intervention.technicianId,
        status: intervention.status,
        scheduledDate: intervention.scheduledDate.split('T')[0],
        baseId: intervention.baseId,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        boatId: '',
        technicianId: '',
        status: 'scheduled',
        scheduledDate: new Date().toISOString().split('T')[0],
        baseId: user?.baseId || '',
      });
    }
  }, [intervention, form, user]);

  const onSubmit = async (data: InterventionFormData) => {
    setIsSubmitting(true);
    
    try {
      const interventionData = {
        title: data.title,
        description: data.description || null,
        boat_id: data.boatId || null,
        technician_id: data.technicianId || null,
        status: data.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
        scheduled_date: data.scheduledDate,
        base_id: data.baseId || null,
      };

      if (intervention) {
        const { error } = await supabase
          .from('interventions')
          .update(interventionData)
          .eq('id', intervention.id);

        if (error) throw error;

        toast({
          title: "Intervention modifiée",
          description: "L'intervention a été mise à jour avec succès."
        });
      } else {
        const { error } = await supabase
          .from('interventions')
          .insert(interventionData);

        if (error) throw error;

        toast({
          title: "Intervention créée",
          description: "La nouvelle intervention a été programmée."
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving intervention:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'intervention.",
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {intervention ? 'Modifier l\'intervention' : 'Nouvelle intervention'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              rules={{ required: "Le titre est requis" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre de l'intervention *</FormLabel>
                  <FormControl>
                    <Input placeholder="Révision moteur..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Détails de l'intervention..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="boatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bateau</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un bateau" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {boats.filter(boat => boat.id && boat.id.trim() !== '').map((boat) => (
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

              <FormField
                control={form.control}
                name="technicianId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Technicien</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Assigner un technicien" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {technicians.filter(tech => tech.id && tech.id.trim() !== '').map((tech) => (
                          <SelectItem key={tech.id} value={tech.id}>
                            {tech.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">Programmée</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="completed">Terminée</SelectItem>
                        <SelectItem value="cancelled">Annulée</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scheduledDate"
                rules={{ required: "La date est requise" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date programmée *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {isSubmitting ? 'Sauvegarde...' : (intervention ? 'Modifier' : 'Créer')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}