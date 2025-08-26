import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Package, User, Plus } from 'lucide-react';
import { type ComponentPurchaseHistory } from '@/types/component';
import { ComponentPurchaseDialog } from './components/ComponentPurchaseDialog';

interface ComponentPurchaseHistoryProps {
  componentId?: string;
  subComponentId?: string;
  componentName: string;
}

export function ComponentPurchaseHistory({ componentId, subComponentId, componentName }: ComponentPurchaseHistoryProps) {
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  
  // Fetch purchase history
  const { data: purchaseHistory, isLoading } = useQuery({
    queryKey: ['component-purchase-history', componentId, subComponentId],
    queryFn: async () => {
      let query = supabase
        .from('component_purchase_history')
        .select(`
          *,
          supplier:suppliers(name),
          stock_item:stock_items(name, reference)
        `);

      if (componentId) {
        query = query.eq('component_id', componentId);
      } else if (subComponentId) {
        query = query.eq('sub_component_id', subComponentId);
      }

      const { data, error } = await query.order('purchase_date', { ascending: false });

      if (error) throw error;
      return data as ComponentPurchaseHistory[];
    }
  });

  if (isLoading) {
    return <div className="p-4 text-center">Chargement de l'historique d'achat...</div>;
  }

  if (!purchaseHistory || purchaseHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Historique d'achat - {componentName}
          </div>
          {componentId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsPurchaseDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un achat
            </Button>
          )}
        </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Aucun historique d'achat disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCost = purchaseHistory.reduce(
    (sum, item) => sum + (item.total_cost ?? item.quantity * item.unit_cost),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Historique d'achat - {componentName}
          </div>
          {componentId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsPurchaseDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un achat
            </Button>
          )}
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div>Total: {totalCost.toFixed(2)} €</div>
          <div>{purchaseHistory.length} achat(s)</div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {purchaseHistory.map((purchase) => (
            <Card key={purchase.id} className="border-l-4 border-l-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-medium">
                        {purchase.stock_item?.name || 'Article non spécifié'}
                      </h5>
                      {purchase.stock_item?.reference && (
                        <Badge variant="outline">{purchase.stock_item.reference}</Badge>
                      )}
                      {purchase.invoice_reference && (
                        <Badge variant="secondary">Facture: {purchase.invoice_reference}</Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Achat: {new Date(purchase.purchase_date).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span>Qté: {purchase.quantity}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign className="h-4 w-4" />
                        <span>Prix unitaire: {purchase.unit_cost.toFixed(2)} €</span>
                      </div>
                      
                      <div className="flex items-center gap-2 font-medium">
                        <DollarSign className="h-4 w-4" />
                        <span>
                          Total: {(purchase.total_cost ?? purchase.quantity * purchase.unit_cost).toFixed(2)} €
                        </span>
                      </div>
                    </div>

                    {purchase.supplier && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Fournisseur: {purchase.supplier.name}</span>
                      </div>
                    )}

                    {purchase.installation_date && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Installation:</span> {new Date(purchase.installation_date).toLocaleDateString()}
                      </div>
                    )}

                    {purchase.warranty_months > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Garantie:</span> {purchase.warranty_months} mois
                      </div>
                    )}

                    {purchase.notes && (
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Notes:</span> {purchase.notes}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
      
      {/* Purchase Dialog */}
      {componentId && (
        <ComponentPurchaseDialog
          isOpen={isPurchaseDialogOpen}
          onClose={() => setIsPurchaseDialogOpen(false)}
          componentId={componentId}
        />
      )}
    </Card>
  );
}