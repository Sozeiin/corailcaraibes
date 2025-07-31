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
import { InterventionPartsManager, InterventionPart } from './InterventionPartsManager';
import { useNotifications } from '@/hooks/useNotifications';

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
  const { createNotification } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interventionParts, setInterventionParts] = useState<InterventionPart[]>([]);

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

  const { data: boats = [], isLoading: boatsLoading } = useQuery({
    queryKey: ['boats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boats')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const { data: technicians = [], isLoading: techniciansLoading } = useQuery({
    queryKey: ['technicians', user?.role, user?.baseId],
    queryFn: async () => {
      if (!user) {
        return [];
      }

      let query = supabase
        .from('profiles')
        .select('*')
        .eq('role', 'technicien')
        .order('name');

      // Filtrage selon le rôle de l'utilisateur
      if (user.role === 'chef_base') {
        // Chef de base : seulement les techniciens de sa base
        query = query.eq('base_id', user.baseId);
      }
      // Direction : tous les techniciens (pas de filtre)
      // Technicien : tous les techniciens pour information

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching technicians:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user
  });

  // Fetch existing intervention parts if editing
  const { data: existingParts = [] } = useQuery({
    queryKey: ['intervention-parts', intervention?.id],
    queryFn: async () => {
      if (!intervention?.id) return [];
      
      const { data, error } = await supabase
        .from('intervention_parts')
        .select(`
          *,
          stock_items(name, quantity, unit)
        `)
        .eq('intervention_id', intervention.id);

      if (error) throw error;

      return data.map(part => ({
        id: part.id,
        stockItemId: part.stock_item_id,
        partName: part.part_name,
        quantity: part.quantity,
        unitCost: part.unit_cost,
        totalCost: part.total_cost,
        notes: part.notes,
        availableQuantity: part.stock_items?.quantity
      }));
    },
    enabled: !!intervention?.id
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
      setInterventionParts(existingParts);
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
      setInterventionParts([]);
    }
  }, [intervention, form, user]);

  // Separate effect for handling existing parts to avoid infinite loop
  useEffect(() => {
    if (intervention && existingParts.length > 0) {
      setInterventionParts(existingParts);
    }
  }, [intervention, existingParts]);

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
        completed_date: data.status === 'completed' ? new Date().toISOString().split('T')[0] : null,
        base_id: data.baseId || null,
      };

      let interventionId: string;

      if (intervention && intervention.id && intervention.id.trim() !== '') {
        // Update existing intervention
        const { error } = await supabase
          .from('interventions')
          .update(interventionData)
          .eq('id', intervention.id);

        if (error) throw error;
        interventionId = intervention.id;

        // Delete existing parts
        await supabase
          .from('intervention_parts')
          .delete()
          .eq('intervention_id', intervention.id);
      } else {
        // Create new intervention
        const { data: newIntervention, error } = await supabase
          .from('interventions')
          .insert(interventionData)
          .select()
          .single();

        if (error) throw error;
        interventionId = newIntervention.id;
      }

      // Insert intervention parts
      if (interventionParts.length > 0) {
        const partsData = interventionParts.map(part => ({
          intervention_id: interventionId,
          stock_item_id: part.stockItemId || null,
          part_name: part.partName,
          quantity: part.quantity,
          unit_cost: part.unitCost,
          total_cost: part.totalCost,
          notes: part.notes || null
        }));

        const { error: partsError } = await supabase
          .from('intervention_parts')
          .insert(partsData);

        if (partsError) throw partsError;
      }

      // Envoyer une notification au technicien si assigné
      if (data.technicianId && (!intervention || intervention.technicianId !== data.technicianId)) {
        try {
          const selectedBoat = boats.find(b => b.id === data.boatId);
          const boatName = selectedBoat ? `${selectedBoat.name} - ${selectedBoat.model}` : 'Bateau non spécifié';
          
          createNotification({
            user_id: data.technicianId,
            type: 'intervention_assigned',
            title: 'Nouvelle intervention assignée',
            message: `Une intervention "${data.title}" vous a été assignée pour le ${boatName}. Date prévue: ${new Date(data.scheduledDate).toLocaleDateString('fr-FR')}`,
            data: {
              intervention_id: interventionId,
              boat_id: data.boatId,
              scheduled_date: data.scheduledDate,
              title: data.title
            }
          });
        } catch (notificationError) {
          console.error('Erreur lors de l\'envoi de la notification:', notificationError);
          // Ne pas faire échouer l'intervention pour une erreur de notification
        }
      }

      toast({
        title: intervention ? "Intervention modifiée" : "Intervention créée",
        description: intervention 
          ? "L'intervention a été mise à jour avec succès."
          : "La nouvelle intervention a été programmée."
      });

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
    setInterventionParts([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-auto">
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

            <InterventionPartsManager
              parts={interventionParts}
              onPartsChange={setInterventionParts}
              disabled={isSubmitting}
            />

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