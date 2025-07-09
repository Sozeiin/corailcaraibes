import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Euro, Package, Building2, Truck, FileText, ImageIcon } from 'lucide-react';
import { Order } from '@/types';

interface OrderDetailsDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800', 
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  pending_approval: 'bg-orange-100 text-orange-800',
  supplier_requested: 'bg-purple-100 text-purple-800',
  shipping_mainland: 'bg-cyan-100 text-cyan-800',
  shipping_antilles: 'bg-indigo-100 text-indigo-800'
};

const statusLabels = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  delivered: 'Livrée', 
  cancelled: 'Annulée',
  pending_approval: 'En attente d\'approbation',
  supplier_requested: 'Demande effectuée auprès du fournisseur',
  shipping_mainland: 'Commande en cours de livraison - Métropole',
  shipping_antilles: 'Commande en cours d\'envoi - Antilles'
};

export function OrderDetailsDialog({ order, isOpen, onClose }: OrderDetailsDialogProps) {
  if (!order) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold mb-2">
                Commande {order.orderNumber}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Créée le {new Date(order.orderDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <Badge className={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Euro className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Montant total</span>
                </div>
                <div className="text-xl font-bold">
                  {formatCurrency(order.totalAmount)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Articles</span>
                </div>
                <div className="text-xl font-bold">
                  {order.items.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Quantité totale</span>
                </div>
                <div className="text-xl font-bold">
                  {totalQuantity}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Commande</span>
                </div>
                <div className="text-sm font-medium">
                  {new Date(order.orderDate).toLocaleDateString('fr-FR')}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Date de livraison */}
          {order.deliveryDate && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Livrée le</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.deliveryDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Liste des articles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Articles commandés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div 
                    key={item.id || index} 
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium">{item.productName}</h4>
                      {item.reference && (
                        <p className="text-sm text-muted-foreground">
                          Réf: {item.reference}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Qté:</span>
                          <span className="font-medium ml-1">{item.quantity}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Prix unitaire:</span>
                          <span className="font-medium ml-1">{formatCurrency(item.unitPrice)}</span>
                        </div>
                        <div className="text-sm font-semibold min-w-20">
                          {formatCurrency(item.totalPrice)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-xl font-bold">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          {order.photos && order.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {order.photos.map((photo, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded border"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f3f4f6"/><text x="50" y="50" text-anchor="middle" dy=".3em" fill="%236b7280">Image non disponible</text></svg>';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {order.documents && order.documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}