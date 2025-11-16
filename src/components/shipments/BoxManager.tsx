import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Lock, Scan, Minus, Trash2 } from 'lucide-react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ShipmentScanner } from './ShipmentScanner';

interface BoxManagerProps {
  preparationId: string;
  canAddBoxes: boolean;
  onUpdate: () => void;
}

export function BoxManager({ preparationId, canAddBoxes, onUpdate }: BoxManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newBoxIdentifier, setNewBoxIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeBox, setActiveBox] = useState<string | null>(null);

  // Récupérer les cartons
  const { data: boxes = [], refetch: refetchBoxes } = useOfflineData<any>({
    table: 'shipment_boxes',
    dependencies: [preparationId]
  });

  // Récupérer les articles dans les cartons
  const { data: boxItems = [], refetch: refetchBoxItems } = useOfflineData<any>({
    table: 'shipment_box_items',
    dependencies: [preparationId]
  });

  // Filtrer les cartons pour cette préparation
  const preparationBoxes = boxes.filter((box: any) => box.preparation_id === preparationId);

  const handleCreateBox = async () => {
    if (!newBoxIdentifier.trim()) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir un identifiant pour le carton.',
        variant: 'destructive'
      });
      return;
    }

    // Vérifier si l'identifiant existe déjà
    const existingBox = preparationBoxes.find(
      (box: any) => box.box_identifier.toLowerCase() === newBoxIdentifier.trim().toLowerCase()
    );
    
    if (existingBox) {
      toast({
        title: 'Erreur',
        description: 'Un carton avec cet identifiant existe déjà.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('shipment_boxes')
        .insert({
          preparation_id: preparationId,
          box_identifier: newBoxIdentifier.trim(),
          status: 'open'
        });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Carton créé avec succès.'
      });

      setNewBoxIdentifier('');
      refetchBoxes();
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la création du carton:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le carton.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseBox = async (boxId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('shipment_boxes')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString()
        })
        .eq('id', boxId);

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Carton fermé avec succès.'
      });

      setActiveBox(null);
      refetchBoxes();
      onUpdate();
    } catch (error: any) {
      console.error('Erreur lors de la fermeture du carton:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de fermer le carton.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemScanned = () => {
    refetchBoxItems();
    onUpdate();
  };

  const handleUpdateQuantity = async (itemId: string, currentQuantity: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const quantityDiff = newQuantity - currentQuantity;
    
    setLoading(true);
    try {
      // Récupérer l'article pour connaître son stock_item_id
      const { data: boxItem } = await supabase
        .from('shipment_box_items')
        .select('*, stock_item_id')
        .eq('id', itemId)
        .single();
      
      if (!boxItem) throw new Error('Article non trouvé');
      
      // Récupérer le stock actuel
      const { data: stockItem } = await supabase
        .from('stock_items')
        .select('quantity')
        .eq('id', boxItem.stock_item_id)
        .single();
      
      if (!stockItem) throw new Error('Article en stock non trouvé');
      
      // Vérifier le stock disponible si on augmente la quantité
      if (quantityDiff > 0 && stockItem.quantity < quantityDiff) {
        toast({
          title: 'Stock insuffisant',
          description: `Stock disponible: ${stockItem.quantity}`,
          variant: 'destructive'
        });
        return;
      }
      
      // Mettre à jour la quantité dans le carton
      const { error: updateError } = await supabase
        .from('shipment_box_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // Mettre à jour le stock (décrémenter si augmentation, incrémenter si diminution)
      const newStockQuantity = stockItem.quantity - quantityDiff;
      const { error: stockError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: newStockQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', boxItem.stock_item_id);
      
      if (stockError) throw stockError;
      
      // Créer un mouvement de stock
      await supabase.from('stock_movements').insert({
        sku: boxItem.item_reference || boxItem.stock_item_id,
        movement_type: 'outbound_distribution',
        qty: -quantityDiff,
        actor: user?.id,
        base_id: user?.baseId,
        notes: `Ajustement carton - ${quantityDiff > 0 ? '+' : ''}${quantityDiff}`
      });
      
      toast({
        title: 'Quantité mise à jour',
        description: `Nouvelle quantité: ${newQuantity}`
      });
      
      refetchBoxItems();
      onUpdate();
    } catch (error: any) {
      console.error('Erreur mise à jour quantité:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la quantité',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveItem = async (itemId: string) => {
    setLoading(true);
    try {
      // Récupérer l'article
      const { data: boxItem } = await supabase
        .from('shipment_box_items')
        .select('*')
        .eq('id', itemId)
        .single();
      
      if (!boxItem) throw new Error('Article non trouvé');
      
      // Récupérer le stock actuel
      const { data: stockItem } = await supabase
        .from('stock_items')
        .select('quantity')
        .eq('id', boxItem.stock_item_id)
        .single();
      
      if (!stockItem) throw new Error('Article en stock non trouvé');
      
      // Restaurer le stock
      const { error: stockError } = await supabase
        .from('stock_items')
        .update({ 
          quantity: stockItem.quantity + boxItem.quantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', boxItem.stock_item_id);
      
      if (stockError) throw stockError;
      
      // Créer un mouvement de stock
      await supabase.from('stock_movements').insert({
        sku: boxItem.item_reference || boxItem.stock_item_id,
        movement_type: 'inbound_purchase',
        qty: boxItem.quantity,
        actor: user?.id,
        base_id: user?.baseId,
        notes: 'Retrait du carton'
      });
      
      // Supprimer l'article du carton
      const { error: deleteError } = await supabase
        .from('shipment_box_items')
        .delete()
        .eq('id', itemId);
      
      if (deleteError) throw deleteError;
      
      toast({
        title: 'Article retiré',
        description: 'L\'article a été retiré du carton et remis en stock'
      });
      
      refetchBoxItems();
      onUpdate();
    } catch (error: any) {
      console.error('Erreur suppression article:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer l\'article',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getBoxItems = (boxId: string) => {
    return boxItems.filter((item: any) => item.box_id === boxId);
  };

  return (
    <div className="space-y-4">
      {/* Créer un nouveau carton */}
      {canAddBoxes && (
        <Card className="p-4">
          <h3 className="font-medium mb-4">Ajouter un carton</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Identifiant du carton (ex: C001, Carton A...)"
              value={newBoxIdentifier}
              onChange={(e) => setNewBoxIdentifier(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateBox()}
            />
            <Button 
              onClick={handleCreateBox} 
              disabled={loading || !newBoxIdentifier.trim()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Créer
            </Button>
          </div>
        </Card>
      )}

      {/* Liste des cartons */}
      {preparationBoxes.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Aucun carton créé
          </h3>
          <p className="text-muted-foreground">
            Créez votre premier carton pour commencer à scanner des articles.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {preparationBoxes.map((box: any) => {
            const items = getBoxItems(box.id);
            const isActive = activeBox === box.id;
            
            return (
              <Card key={box.id} className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">Carton {box.box_identifier}</h3>
                    <Badge variant={box.status === 'closed' ? 'default' : 'secondary'}>
                      {box.status === 'closed' ? 'Fermé' : 'Ouvert'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {items.length} article{items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {box.status === 'open' && canAddBoxes && (
                    <div className="flex gap-2">
                      <Button
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveBox(isActive ? null : box.id)}
                      >
                        <Scan className="h-4 w-4 mr-2" />
                        {isActive ? 'Fermer scanner' : 'Scanner articles'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCloseBox(box.id)}
                        disabled={loading}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Fermer carton
                      </Button>
                    </div>
                  )}
                </div>

                {/* Articles dans le carton */}
                {items.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Articles scannés:</h4>
                    <div className="grid gap-2">
                      {items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium">{item.item_name}</span>
                            {item.item_reference && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({item.item_reference})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity, item.quantity - 1)}
                              disabled={loading || item.quantity <= 1}
                              className="h-8 w-8 p-0"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val) && val >= 1) {
                                  handleUpdateQuantity(item.id, item.quantity, val);
                                }
                              }}
                              disabled={loading}
                              className="h-8 w-16 text-center"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUpdateQuantity(item.id, item.quantity, item.quantity + 1)}
                              disabled={loading}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={loading}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scanner pour ce carton */}
                {isActive && box.status === 'open' && (
                  <div className="border-t pt-4">
                    <ShipmentScanner
                      boxId={box.id}
                      onItemScanned={handleItemScanned}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}