import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ShoppingCart,
  Plus,
  Package,
  FileText,
  Calendar,
  Building,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CampaignOrdersTabProps {
  campaignId: string;
}

export const CampaignOrdersTab: React.FC<CampaignOrdersTabProps> = ({ campaignId }) => {
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: selectedQuotes } = useQuery({
    queryKey: ['selected-quotes', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_quotes')
        .select(`
          *,
          campaign_items!inner(
            campaign_id,
            product_name,
            total_quantity
          ),
          suppliers(*)
        `)
        .eq('campaign_items.campaign_id', campaignId)
        .eq('status', 'selected');

      if (error) throw error;
      return data;
    },
  });

  const { data: generatedOrders, isLoading } = useQuery({
    queryKey: ['campaign-orders', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          suppliers(name),
          order_items(*)
        `)
        .eq('bulk_purchase_type', 'campaign')
        .ilike('notes', `%campaign:${campaignId}%`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const generateOrdersMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuotes || selectedQuotes.length === 0) {
        throw new Error('Aucun devis sélectionné');
      }

      // Group selected quotes by supplier
      const quotesBySupplier = selectedQuotes.reduce((acc, quote) => {
        const supplierId = quote.supplier_id;
        if (!acc[supplierId]) {
          acc[supplierId] = {
            supplier: quote.suppliers,
            quotes: []
          };
        }
        acc[supplierId].quotes.push(quote);
        return acc;
      }, {} as Record<string, any>);

      // Generate orders for each supplier
      for (const [supplierId, { supplier, quotes }] of Object.entries(quotesBySupplier)) {
        // Calculate total amount
        const totalAmount = quotes.reduce((sum: number, quote: any) => 
          sum + (quote.unit_price * quote.campaign_items.total_quantity), 0
        );

        // Generate order number
        const orderNumber = `GRP-${Date.now()}-${supplierId.substring(0, 8)}`;

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            supplier_id: supplierId,
            base_id: null, // Campaign orders are not tied to a specific base
            status: 'pending',
            total_amount: totalAmount,
            order_date: new Date().toISOString().split('T')[0],
            is_bulk_purchase: true,
            bulk_purchase_type: 'campaign',
            notes: `Commande générée automatiquement pour la campagne ${campaignId}. Articles consolidés.`
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        for (const quote of quotes) {
          await supabase
            .from('order_items')
            .insert({
              order_id: order.id,
              product_name: quote.campaign_items.product_name,
              quantity: quote.campaign_items.total_quantity,
              unit_price: quote.unit_price,
              total_price: quote.unit_price * quote.campaign_items.total_quantity
            });
        }

        // Update quote status to indicate it's been ordered
        await supabase
          .from('supplier_quotes')
          .update({ status: 'ordered' })
          .in('id', quotes.map((q: any) => q.id));
      }
    },
    onSuccess: () => {
      toast({
        title: "Commandes générées",
        description: "Les commandes ont été générées avec succès pour tous les fournisseurs sélectionnés.",
      });
      queryClient.invalidateQueries({ queryKey: ['campaign-orders', campaignId] });
      queryClient.invalidateQueries({ queryKey: ['selected-quotes', campaignId] });
      setShowGenerateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de générer les commandes.",
        variant: "destructive",
      });
    },
  });

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'confirmed': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getOrderStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'confirmed': return 'Confirmée';
      case 'delivered': return 'Livrée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Commandes Générées</h3>
          <p className="text-sm text-muted-foreground">
            Commandes automatiquement générées à partir des devis sélectionnés
          </p>
        </div>
        {selectedQuotes && selectedQuotes.length > 0 && (
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Générer les commandes
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Générer les commandes</DialogTitle>
                <DialogDescription>
                  Voulez-vous générer automatiquement les commandes à partir des {selectedQuotes.length} devis sélectionnés ?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Résumé</h4>
                  <p className="text-sm text-blue-700">
                    {selectedQuotes.length} articles sélectionnés de {new Set(selectedQuotes.map(q => q.supplier_id)).size} fournisseurs différents
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Valeur totale: {selectedQuotes.reduce((sum, quote) => 
                      sum + (quote.unit_price * quote.campaign_items.total_quantity), 0
                    ).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowGenerateDialog(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={() => generateOrdersMutation.mutate()}
                    disabled={generateOrdersMutation.isPending}
                  >
                    {generateOrdersMutation.isPending ? 'Génération...' : 'Générer'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis sélectionnés</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {selectedQuotes?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Prêts pour commande
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commandes générées</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {generatedOrders?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Commandes créées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(generatedOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0)
                .toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </div>
            <p className="text-xs text-muted-foreground">
              Montant commandé
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      {generatedOrders && generatedOrders.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Commandes de la Campagne</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Commande</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Articles</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.order_number}
                    </TableCell>
                    <TableCell>
                      {order.suppliers?.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 mr-1" />
                        {order.order_items?.length || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {Number(order.total_amount).toLocaleString('fr-FR', {
                        style: 'currency',
                        currency: 'EUR'
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(order.order_date), 'dd MMM yyyy', { locale: fr })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getOrderStatusColor(order.status)}>
                        {getOrderStatusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucune commande générée</h3>
              <p className="text-muted-foreground mb-4">
                {selectedQuotes && selectedQuotes.length > 0 
                  ? "Générez automatiquement les commandes à partir des devis sélectionnés."
                  : "Sélectionnez d'abord des devis dans l'onglet Analyse pour pouvoir générer des commandes."
                }
              </p>
              {selectedQuotes && selectedQuotes.length > 0 && (
                <Button onClick={() => setShowGenerateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Générer les commandes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};