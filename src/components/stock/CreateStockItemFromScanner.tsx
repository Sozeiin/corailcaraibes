import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Base } from '@/types';
import { withBrandColumnFallback } from '@/lib/supabaseFallbacks';
import { StockPhotoUpload } from './StockPhotoUpload';

interface CreateStockItemFromScannerProps {
  isOpen: boolean;
  onClose: () => void;
  scannedCode: string;
  onItemCreated: () => void;
}

interface StockFormData {
  name: string;
  reference: string;
  brand: string;
  supplierReference: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unit: string;
  location: string;
  baseId: string;
  photoUrl: string;
}

export function CreateStockItemFromScanner({ 
  isOpen, 
  onClose, 
  scannedCode,
  onItemCreated 
}: CreateStockItemFromScannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StockFormData>({
    defaultValues: {
      name: '',
      reference: scannedCode,
      brand: '',
      supplierReference: '',
      category: '',
      quantity: 0,
      minThreshold: 1,
      unit: 'pièce',
      location: '',
      baseId: user?.baseId || '',
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
    if (isOpen) {
      form.reset({
        name: '',
        reference: scannedCode,
        brand: '',
        supplierReference: '',
        category: '',
        quantity: 0,
        minThreshold: 1,
        unit: 'pièce',
        location: '',
        baseId: user?.role === 'direction' ? '' : (user?.baseId || ''),
        photoUrl: '',
      });
    }
  }, [isOpen, scannedCode, form, user]);

  const onSubmit = async (data: StockFormData) => {
    setIsSubmitting(true);
    
    try {
      const stockData = {
        name: data.name,
        reference: data.reference || null,
        brand: data.brand || null,
        supplier_reference: data.supplierReference || null,
        category: data.category || null,
        quantity: data.quantity,
        min_threshold: data.minThreshold,
        unit: data.unit || null,
        location: data.location || null,
        base_id: data.baseId || null,
        photo_url: data.photoUrl || null,
        last_updated: new Date().toISOString()
      };

      const response = await withBrandColumnFallback(
        async () =>
          await supabase
            .from('stock_items')
            .insert(stockData)
            .select()
            .single(),
        async () => {
          const { brand: _brand, ...fallbackStockData } = stockData;
          return await supabase
            .from('stock_items')
            .insert(fallbackStockData)
            .select()
            .single();
        }
      );

      const { error } = response.result;

      if (error) throw error;

      if (response.usedFallback) {
        toast({
          title: "Marque non enregistrée",
          description:
            "La colonne 'Marque' n'est pas disponible sur la base de données. L'article a été enregistré sans cette information.",
        });
      }

      toast({
        title: "Article créé",
        description: "Le nouvel article a été ajouté au stock."
      });

      onItemCreated();
      onClose();
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
          <DialogTitle>Créer un nouvel article</DialogTitle>
          <DialogDescription>
            Code scanné : <span className="font-mono bg-muted px-2 py-1 rounded">{scannedCode}</span>
          </DialogDescription>
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
                      <Input 
                        placeholder="Référence du produit" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormLabel>Quantité initiale *</FormLabel>
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

            <div className="space-y-4">
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
                {isSubmitting ? 'Création...' : 'Créer l\'article'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}