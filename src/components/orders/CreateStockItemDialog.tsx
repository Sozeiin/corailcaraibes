import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { executeWithSchemaReload } from '@/lib/supabase/schemaReload';

interface CreateStockItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  onItemCreated: (name: string, reference: string) => void;
}

interface StockItemFormData {
  name: string;
  reference: string;
  brand: string;
  supplierReference: string;
  category: string;
  unit: string;
  location: string;
  minThreshold: number;
}

export function CreateStockItemDialog({ 
  isOpen, 
  onClose, 
  productName,
  onItemCreated 
}: CreateStockItemDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StockItemFormData>({
    defaultValues: {
      name: productName,
      reference: '',
      brand: '',
      supplierReference: '',
      category: '',
      unit: 'pièce',
      location: '',
      minThreshold: 1
    },
  });

  const onSubmit = async (data: StockItemFormData) => {
    setIsSubmitting(true);
    
    try {
      const stockItemData = {
        name: data.name,
        reference: data.reference || null,
        brand: data.brand || null,
        supplier_reference: data.supplierReference || null,
        category: data.category || null,
        quantity: 0, // Initial stock is 0, will be updated when order is delivered
        min_threshold: data.minThreshold,
        unit: data.unit,
        location: data.location || null,
        base_id: user?.baseId || null
      };

      const { data: newItem, error } = await executeWithSchemaReload(supabase, () =>
        supabase
          .from('stock_items')
          .insert(stockItemData)
          .select()
          .single()
      );

      if (error) throw error;

      toast({
        title: "Article créé",
        description: "Le nouvel article a été ajouté au stock."
      });

      onItemCreated(newItem.name, newItem.reference || '');
      handleClose();
    } catch (error) {
      console.error('Error creating stock item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer l'article.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset({
      name: productName,
      reference: '',
      brand: '',
      supplierReference: '',
      category: '',
      unit: 'pièce',
      location: '',
      minThreshold: 1
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouvel article</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Le nom est requis" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom de l'article *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nom du produit" {...field} />
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
                    <Input 
                      placeholder="Référence unique (optionnel, auto-générée si vide)" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque</FormLabel>
                    <FormControl>
                      <Input placeholder="Marque du produit" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="supplierReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Référence fournisseur</FormLabel>
                    <FormControl>
                      <Input placeholder="Code fournisseur" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Moteur, Électronique..." {...field} />
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
                    <FormLabel>Unité</FormLabel>
                    <FormControl>
                      <Input placeholder="pièce, kg, litre..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emplacement</FormLabel>
                    <FormControl>
                      <Input placeholder="Zone de stockage" {...field} />
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isSubmitting ? 'Création...' : 'Créer l\'article'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}