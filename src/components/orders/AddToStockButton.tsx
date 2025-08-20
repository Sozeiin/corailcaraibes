import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Package, Plus } from 'lucide-react';
import { Order } from '@/types';

interface AddToStockButtonProps {
  order: Order;
  onStockAdded?: () => void;
}

export function AddToStockButton({ order, onStockAdded }: AddToStockButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSelectAll = () => {
    if (selectedItems.length === order.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(order.items.map(item => item.id));
    }
  };

  const handleItemToggle = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleAddToStock = async () => {
    if (selectedItems.length === 0) {
      toast({
        title: "Aucun article sélectionné",
        description: "Veuillez sélectionner au moins un article à ajouter au stock.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('add_order_items_to_stock', {
        order_id_param: order.id,
        selected_items: selectedItems
      });

      if (error) throw error;

      const result = data as { added_items: any[], errors: any[], success: boolean };
      
      if (result.success && result.added_items.length > 0) {
        toast({
          title: "✅ Articles ajoutés au stock",
          description: `${result.added_items.length} article(s) ont été ajoutés au stock avec leur historique d'achat.`,
        });
        
        setIsOpen(false);
        setSelectedItems([]);
        onStockAdded?.();
      }

      if (result.errors && result.errors.length > 0) {
        toast({
          title: "⚠️ Erreurs lors de l'ajout",
          description: `${result.errors.length} erreur(s) sont survenues lors de l'ajout de certains articles.`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Erreur lors de l\'ajout au stock:', error);
      toast({
        title: "❌ Erreur",
        description: "Impossible d'ajouter les articles au stock.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ne montrer le bouton que pour les commandes livrées et non déjà ajoutées au stock
  if (order.status !== 'delivered' || (order as any).stockAdded) {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Package className="w-4 h-4" />
        Ajouter au stock
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Ajouter au stock - {order.orderNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Sélectionnez les articles à ajouter au stock :
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedItems.length === order.items.length ? 'Tout désélectionner' : 'Tout sélectionner'}
              </Button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={item.id}
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => handleItemToggle(item.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.productName}</span>
                      {item.reference && (
                        <Badge variant="outline" className="text-xs">
                          {item.reference}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>Quantité: {item.quantity}</span>
                      <span>Prix unitaire: {item.unitPrice.toFixed(2)} €</span>
                      <span>Total: {item.totalPrice.toFixed(2)} €</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {selectedItems.length} article(s) sélectionné(s)
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleAddToStock}
                  disabled={isLoading || selectedItems.length === 0}
                  className="gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Ajouter au stock
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}