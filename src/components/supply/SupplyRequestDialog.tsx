import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { StockItemAutocomplete } from '@/components/stock/StockItemAutocomplete';
import { PhotoCapture } from './PhotoCapture';
import { useNavigate } from 'react-router-dom';

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
  const [selectedStockItem, setSelectedStockItem] = useState<any>(null);
  const [searchValue, setSearchValue] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const navigate = useNavigate();

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

  // Fetch stock items for autocomplete
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-for-supply', user?.baseId],
    queryFn: async () => {
      let query = supabase
        .from('stock_items')
        .select('id, name, reference, quantity, category, location')
        .order('name');

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
      const requestData = {
        item_name: data.item_name,
        item_reference: data.item_reference || null,
        description: data.description || null,
        quantity_needed: data.quantity_needed,
        urgency_level: data.urgency_level,
        boat_id: data.boat_id === 'none' ? null : data.boat_id,
        photo_url: data.photo_url || null,
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
      setPhotoUrl(null);
      setSearchValue('');
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

  const handleCreateNewStock = () => {
    navigate('/stock?create=1');
  };

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSelectedStockItem(null);
      setPhotoUrl(null);
      setSearchValue('');
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
                  <StockItemAutocomplete
                    stockItems={stockItems}
                    value={searchValue}
                    onChange={setSearchValue}
                    onSelect={handleStockItemSelect}
                    placeholder="Rechercher dans le stock..."
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

            {/* Photo Capture */}
            <div className="space-y-2">
              <Label>Photo (optionnel)</Label>
              <PhotoCapture
                photoUrl={photoUrl}
                onPhotoChange={(url) => {
                  setPhotoUrl(url);
                  form.setValue('photo_url', url || '');
                }}
              />
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

    </>
  );
}