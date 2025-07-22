import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { StockItemAutocomplete } from '../stock/StockItemAutocomplete';
import { 
  Plus, 
  Package, 
  Trash2,
  Edit,
  QrCode
} from 'lucide-react';

interface ShipmentItemsManagerProps {
  shipment: any;
  isOpen: boolean;
  onClose: () => void;
}

export function ShipmentItemsManager({ shipment, isOpen, onClose }: ShipmentItemsManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [packageNumber, setPackageNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Récupérer les articles du stock de la base
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items-logistics', user?.baseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('base_id', user?.baseId)
        .gt('quantity', 0) // Seulement les articles en stock
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Récupérer les articles de l'expédition
  const { data: shipmentItems = [] } = useQuery({
    queryKey: ['shipment-items', shipment?.id],
    queryFn: async () => {
      if (!shipment?.id) return [];
      
      const { data, error } = await supabase
        .from('logistics_shipment_items')
        .select(`
          *,
          stock_item:stock_items(*)
        `)
        .eq('shipment_id', shipment.id)
        .order('created_at');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!shipment?.id
  });

  const addItemToShipment = async () => {
    if (!selectedStockItem || quantity <= 0) return;

    try {
      setIsAddingItem(true);

      // Vérifier si on a assez de stock
      if (selectedStockItem.quantity < quantity) {
        toast({
          title: 'Stock insuffisant',
          description: `Seulement ${selectedStockItem.quantity} unités disponibles`,
          variant: 'destructive'
        });
        return;
      }

      // Ajouter l'article à l'expédition
      const { error: insertError } = await supabase
        .from('logistics_shipment_items')
        .insert({
          shipment_id: shipment.id,
          stock_item_id: selectedStockItem.id,
          product_name: selectedStockItem.name,
          product_reference: selectedStockItem.reference,
          quantity_shipped: quantity,
          package_number: packageNumber || null
        });

      if (insertError) throw insertError;

      // Décrémenter le stock
      const { error: updateError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: selectedStockItem.quantity - quantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', selectedStockItem.id);

      if (updateError) throw updateError;

      // Mettre à jour le nombre total de colis dans l'expédition
      const totalPackages = shipmentItems.length + 1;
      const { error: shipmentError } = await supabase
        .from('logistics_shipments')
        .update({ total_packages: totalPackages })
        .eq('id', shipment.id);

      if (shipmentError) throw shipmentError;

      toast({
        title: 'Article ajouté',
        description: `${quantity} x ${selectedStockItem.name} ajouté à l'expédition`
      });

      // Réinitialiser le formulaire
      setSelectedStockItem(null);
      setQuantity(1);
      setPackageNumber('');
      setSearchQuery('');

      // Actualiser les données
      queryClient.invalidateQueries({ queryKey: ['shipment-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-items-logistics'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });

    } catch (error) {
      console.error('Erreur ajout article:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'article à l\'expédition',
        variant: 'destructive'
      });
    } finally {
      setIsAddingItem(false);
    }
  };

  const removeItemFromShipment = async (item: any) => {
    try {
      // Remettre en stock
      const { error: stockError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: item.stock_item.quantity + item.quantity_shipped,
          last_updated: new Date().toISOString()
        })
        .eq('id', item.stock_item_id);

      if (stockError) throw stockError;

      // Supprimer de l'expédition
      const { error: deleteError } = await supabase
        .from('logistics_shipment_items')
        .delete()
        .eq('id', item.id);

      if (deleteError) throw deleteError;

      toast({
        title: 'Article retiré',
        description: `${item.quantity_shipped} x ${item.product_name} retiré de l'expédition`
      });

      // Actualiser les données
      queryClient.invalidateQueries({ queryKey: ['shipment-items'] });
      queryClient.invalidateQueries({ queryKey: ['stock-items-logistics'] });
      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });

    } catch (error) {
      console.error('Erreur suppression article:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer l\'article',
        variant: 'destructive'
      });
    }
  };

  const canModifyShipment = shipment?.status === 'preparing';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Gestion des articles - {shipment?.shipment_number}
          </DialogTitle>
          <DialogDescription>
            Ajouter ou retirer des articles de l'expédition vers {shipment?.base_destination?.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Ajouter un article */}
          {canModifyShipment && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ajouter un article</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Rechercher un article</Label>
                  <StockItemAutocomplete
                    stockItems={stockItems}
                    value={searchQuery}
                    onChange={setSearchQuery}
                    onSelect={(item) => {
                      setSelectedStockItem(item);
                      setSearchQuery(item.name);
                    }}
                    placeholder="Rechercher un article dans le stock..."
                  />
                </div>

                {selectedStockItem && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">{selectedStockItem.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Réf: {selectedStockItem.reference} • Stock: {selectedStockItem.quantity}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {selectedStockItem.category}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity">Quantité à expédier</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          max={selectedStockItem.quantity}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="packageNumber">N° de colis (optionnel)</Label>
                        <Input
                          id="packageNumber"
                          placeholder="Ex: COLIS-001"
                          value={packageNumber}
                          onChange={(e) => setPackageNumber(e.target.value)}
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={addItemToShipment}
                      disabled={isAddingItem || quantity <= 0 || quantity > selectedStockItem.quantity}
                      className="w-full mt-4"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {isAddingItem ? 'Ajout...' : 'Ajouter à l\'expédition'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Liste des articles dans l'expédition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Articles dans l'expédition
                <Badge variant="secondary">{shipmentItems.length} articles</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {shipmentItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun article dans cette expédition</p>
                  {canModifyShipment && (
                    <p className="text-sm">Ajoutez des articles depuis le stock</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {shipmentItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <h4 className="font-medium">{item.product_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              Réf: {item.product_reference} • Quantité: {item.quantity_shipped}
                              {item.package_number && ` • Colis: ${item.package_number}`}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {canModifyShipment && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeItemFromShipment(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations sur l'expédition */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations expédition</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Destination</p>
                  <p className="text-muted-foreground">{shipment?.base_destination?.name}</p>
                </div>
                <div>
                  <p className="font-medium">Statut</p>
                  <Badge variant={shipment?.status === 'preparing' ? 'secondary' : 'default'}>
                    {shipment?.status === 'preparing' ? 'En préparation' : 
                     shipment?.status === 'ready' ? 'Prêt' : 
                     shipment?.status === 'shipped' ? 'Expédié' : shipment?.status}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium">Total colis</p>
                  <p className="text-muted-foreground">{shipment?.total_packages || 0}</p>
                </div>
                <div>
                  <p className="font-medium">Transporteur</p>
                  <p className="text-muted-foreground">{shipment?.carrier || 'Non défini'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}