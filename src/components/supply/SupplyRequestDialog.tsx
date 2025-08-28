import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Camera, Plus, Search, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StockItemAutocomplete } from '@/components/stock/StockItemAutocomplete';
import { CreateStockItemDialog } from '@/components/orders/CreateStockItemDialog';

interface FormData {
  boat_id: string;
  item_name: string;
  item_reference: string;
  description: string;
  quantity_needed: number;
  urgency_level: 'low' | 'normal' | 'high' | 'urgent';
  photo_url: string;
}

interface SupplyRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplyRequestDialog({ isOpen, onClose, onSuccess }: SupplyRequestDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStockItem, setSelectedStockItem] = useState<any>(null);
  const [isCreateStockDialogOpen, setIsCreateStockDialogOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const form = useForm<FormData>({
    defaultValues: {
      boat_id: 'none',
      item_name: '',
      item_reference: '',
      description: '',
      quantity_needed: 1,
      urgency_level: 'normal',
      photo_url: '',
    },
  });

  // Fetch boats for selection
  const { data: boats = [] } = useQuery({
    queryKey: ['boats-for-supply'],
    queryFn: async () => {
      let query = supabase.from('boats').select('id, name').order('name');
      
      if (user?.role !== 'direction') {
        query = query.eq('base_id', user?.baseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Create supply request mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      let photoUrl = data.photo_url;

      // Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `supply-requests/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('stock-photos')
          .upload(filePath, photoFile);

        if (uploadError) {
          console.error('Error uploading photo:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('stock-photos')
            .getPublicUrl(filePath);
          photoUrl = publicUrl;
        }
      }

      const requestData = {
        item_name: data.item_name,
        item_reference: data.item_reference || null,
        description: data.description || null,
        quantity_needed: data.quantity_needed,
        urgency_level: data.urgency_level,
        boat_id: data.boat_id === 'none' ? null : data.boat_id,
        photo_url: photoUrl || null,
        base_id: user?.baseId,
        requested_by: user?.id,
      };

      const { data: result, error } = await supabase
        .from('supply_requests')
        .insert(requestData)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Demande créée",
        description: "Votre demande d'approvisionnement a été créée avec succès.",
      });
      onSuccess();
      form.reset();
      setSelectedStockItem(null);
      setPhotoFile(null);
      setPhotoPreview(null);
    },
    onError: (error) => {
      console.error('Error creating supply request:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création de la demande.",
        variant: "destructive",
      });
    },
  });

  const handleStockItemSelect = (item: any) => {
    setSelectedStockItem(item);
    if (item) {
      form.setValue('item_name', item.name);
      form.setValue('item_reference', item.reference || '');
      form.setValue('description', `Article existant en stock - ${item.name}`);
    }
  };

  const handlePhotoCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateNewStock = () => {
    setIsCreateStockDialogOpen(true);
  };

  const handleStockCreated = (newItem: any) => {
    setSelectedStockItem(newItem);
    form.setValue('item_name', newItem.name);
    form.setValue('item_reference', newItem.reference || '');
    setIsCreateStockDialogOpen(false);
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSelectedStockItem(null);
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }, [isOpen, form]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle demande d'approvisionnement</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Stock Item Search */}
            <div className="space-y-2">
              <Label>Rechercher un article existant</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Rechercher dans le stock..."
                    onClick={() => {
                      // For now, just show a message that this feature needs implementation
                      toast({
                        title: "Recherche de stock",
                        description: "Cette fonctionnalité sera bientôt disponible.",
                      });
                    }}
                  />
                </div>
                <Button type="button" variant="outline" onClick={handleCreateNewStock}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer
                </Button>
              </div>
              {selectedStockItem && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedStockItem.name}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStockItem(null);
                      form.setValue('item_name', '');
                      form.setValue('item_reference', '');
                      form.setValue('description', '');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item_name">Nom de l'article *</Label>
                <Input
                  id="item_name"
                  {...form.register('item_name', { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item_reference">Référence</Label>
                <Input
                  id="item_reference"
                  {...form.register('item_reference')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...form.register('description')}
                rows={3}
                placeholder="Décrivez l'article ou précisez son utilisation..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity_needed">Quantité nécessaire *</Label>
                <Input
                  id="quantity_needed"
                  type="number"
                  min="1"
                  {...form.register('quantity_needed', { required: true, min: 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgency_level">Niveau d'urgence</Label>
                <Select
                  value={form.watch('urgency_level')}
                  onValueChange={(value: any) => form.setValue('urgency_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Faible</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Élevé</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Boat Selection */}
            <div className="space-y-2">
              <Label htmlFor="boat_id">Bateau concerné (optionnel)</Label>
              <Select
                value={form.watch('boat_id')}
                onValueChange={(value) => form.setValue('boat_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bateau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun bateau spécifique</SelectItem>
                  {boats.map((boat) => (
                    <SelectItem key={boat.id} value={boat.id}>
                      {boat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Photo (optionnel)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                  id="photo-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('photo-input')?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Prendre une photo
                </Button>
              </div>
              {photoPreview && (
                <div className="relative w-32 h-32">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded border"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Création...' : 'Créer la demande'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* CreateStockItemDialog would go here - simplified for now */}
    </>
  );
}