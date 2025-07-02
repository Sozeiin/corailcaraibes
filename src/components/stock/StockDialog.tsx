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
import { StockItem, Base } from '@/types';

interface StockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item?: StockItem | null;
}

interface StockFormData {
  name: string;
  reference: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  location: string;
  baseId: string;
}

export function StockDialog({ isOpen, onClose, item }: StockDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StockFormData>({
    defaultValues: {
      name: '',
      reference: '',
      category: '',
      quantity: 0,
      minThreshold: 0,
      unit: '',
      location: '',
      baseId: '',
    },
  });

  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('*')
        .order('name');

      if (error) throw error;
      
      return data.map(base => ({
        id: base.id,
        name: base.name,
        location: base.location,
        phone: base.phone || '',
        email: base.email || '',
        manager: base.manager || '',
        createdAt: base.created_at || new Date().toISOString()
      })) as Base[];
    },
    enabled: isOpen
  });

  const categories = [
    'Maintenance',
    'Carburant',
    'Équipement',
    'Alimentation',
    'Nettoyage',
    'Sécurité',
    'Électronique',
    'Voilerie',
    'Moteur',
    'Pièces détachées',
    'Autre'
  ];

  const units = [
    'pièce',
    'kg',
    'litre',
    'mètre',
    'paquet',
    'boîte',
    'rouleau',
    'bidon',
    'sac',
    'tube'
  ];

  useEffect(() => {
    if (item) {
      form.reset({
        name: item.name,
        reference: item.reference,
        category: item.category,
        quantity: item.quantity,
        minThreshold: item.minThreshold,
        unit: item.unit,
        location: item.location,
        baseId: item.baseId,
      });
    } else {
      form.reset({
        name: '',
        reference: '',
        category: '',
        quantity: 0,
        minThreshold: 0,
        unit: '',
        location: '',
        baseId: user?.role === 'direction' ? '' : (user?.baseId || ''),
      });
    }
  }, [item, form, user]);

  const onSubmit = async (data: StockFormData) => {
    setIsSubmitting(true);
    
    try {
      const stockData = {
        name: data.name,
        reference: data.reference || null,
        category: data.category || null,
        quantity: data.quantity,
        min_threshold: data.minThreshold,
        unit: data.unit || null,
        location: data.location || null,
        base_id: data.baseId || null,
        last_updated: new Date().toISOString()
      };

      if (item) {
        // Update existing item
        const { error } = await supabase
          .from('stock_items')
          .update(stockData)
          .eq('id', item.id);

        if (error) throw error;

        toast({
          title: "Article modifié",
          description: "L'article a été mis à jour avec succès."
        });
      } else {
        // Create new item
        const { error } = await supabase
          .from('stock_items')
          .insert(stockData);

        if (error) throw error;

        toast({
          title: "Article créé",
          description: "Le nouvel article a été ajouté au stock."
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving stock item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'article.",
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

  const availableBases = user?.role === 'direction' 
    ? bases 
    : bases.filter(base => base.id === user?.baseId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Modifier l\'article' : 'Nouvel article'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                rules={{ required: "Le nom est requis" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'article *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'article" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence</FormLabel>
                    <FormControl>
                      <Input placeholder="REF-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
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
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une unité" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                rules={{ required: "La quantité est requise", min: 0 }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité actuelle *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
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
                name="minThreshold"
                rules={{ required: "Le seuil minimum est requis", min: 0 }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seuil minimum *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Emplacement</FormLabel>
                  <FormControl>
                    <Input placeholder="Entrepôt A, Étagère 3, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {availableBases.length > 0 && (
              <FormField
                control={form.control}
                name="baseId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une base" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableBases.filter(base => base.id && base.id.trim() !== '').map((base) => (
                          <SelectItem key={base.id} value={base.id}>
                            {base.name} - {base.location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                {isSubmitting ? 'Sauvegarde...' : (item ? 'Modifier' : 'Créer')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}