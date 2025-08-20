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
import { StockPhotoUpload } from './StockPhotoUpload';

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
  photoUrl: string;
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
      photoUrl: '',
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
        reference: item.reference || '',
        category: item.category || '',
        quantity: item.quantity,
        minThreshold: item.minThreshold,
        unit: item.unit || 'pièce',
        location: item.location || '',
        baseId: item.baseId,
        photoUrl: item.photoUrl || '',
      });
    } else {
      const defaultBaseId = user?.role === 'direction' ? '' : user?.baseId || '';
      form.reset({
        name: '',
        reference: '',
        category: '',
        quantity: 0,
        minThreshold: 0,
        unit: 'pièce',
        location: '',
        baseId: defaultBaseId,
        photoUrl: '',
      });
    }
  }, [item, form, user]);

  const onSubmit = async (data: StockFormData) => {
    try {
      setIsSubmitting(true);
      
      console.log('Submitting stock item with photo URL:', data.photoUrl);
      
      const stockData = {
        name: data.name,
        reference: data.reference || null,
        category: data.category,
        quantity: data.quantity,
        min_threshold: data.minThreshold,
        unit: data.unit,
        location: data.location || null,
        base_id: data.baseId,
        photo_url: data.photoUrl || null,
        last_updated: new Date().toISOString(),
      };

      console.log('Stock data to save:', stockData);

      let result;
      if (item) {
        result = await supabase
          .from('stock_items')
          .update(stockData)
          .eq('id', item.id)
          .select();
      } else {
        result = await supabase
          .from('stock_items')
          .insert([stockData])
          .select();
      }

      const { error } = result;

      console.log('Save result:', { data: result.data, error });

      if (error) throw error;

      toast({
        title: item ? 'Article modifié' : 'Article ajouté',
        description: item 
          ? 'L\'article a été modifié avec succès.' 
          : 'L\'article a été ajouté avec succès.',
      });

      onClose();
    } catch (error) {
      console.error('Error saving stock item:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: item 
          ? 'Erreur lors de la modification de l\'article.'
          : 'Erreur lors de l\'ajout de l\'article.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showBaseSelection = user?.role === 'direction' || (user?.role === 'chef_base' && bases.length > 1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {item ? 'Modifier l\'article' : 'Ajouter un article'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nom de l'article *</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie *</FormLabel>
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité *</FormLabel>
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

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unité *</FormLabel>
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

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emplacement</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showBaseSelection && (
                <FormField
                  control={form.control}
                  name="baseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Base *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une base" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {bases.map((base) => (
                            <SelectItem key={base.id} value={base.id}>
                              {base.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Photo de l'article</label>
                  <div className="mt-2">
                    <StockPhotoUpload
                      photoUrl={form.watch('photoUrl')}
                      onPhotoChange={(url) => form.setValue('photoUrl', url || '')}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="hidden md:flex items-center justify-center">
                  {form.watch('photoUrl') && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">Aperçu</p>
                      <img 
                        src={form.watch('photoUrl')} 
                        alt="Aperçu" 
                        className="max-w-32 max-h-32 object-cover rounded-lg border shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enregistrement..." : item ? "Modifier" : "Ajouter"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}