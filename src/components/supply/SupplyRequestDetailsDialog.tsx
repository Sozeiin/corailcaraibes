import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Clock, CheckCircle, XCircle, Truck, Eye, Calendar, User, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SupplyRequest } from '@/pages/SupplyRequests';

interface SupplyRequestDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  request: SupplyRequest | null;
}

export function SupplyRequestDetailsDialog({ isOpen, onClose, request }: SupplyRequestDetailsDialogProps) {
  if (!request) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'ordered': return 'default';
      case 'shipped': return 'outline';
      case 'received': return 'outline';
      case 'completed': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'ordered': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'received': return <Package className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'text-green-600';
      case 'normal': return 'text-blue-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente de validation';
      case 'approved': return 'Approuvé';
      case 'ordered': return 'Commandé';
      case 'shipped': return 'Expédié';
      case 'received': return 'Reçu';
      case 'completed': return 'Terminé';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'low': return 'Faible';
      case 'normal': return 'Normal';
      case 'high': return 'Élevé';
      case 'urgent': return 'Urgent';
      default: return urgency;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Détails de la demande {request.request_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Priority */}
          <div className="flex items-center justify-between">
            <Badge variant={getStatusBadgeVariant(request.status)} className="flex items-center gap-1">
              {getStatusIcon(request.status)}
              {getStatusLabel(request.status)}
            </Badge>
            <div className="flex items-center gap-1">
              <span className={getUrgencyColor(request.urgency_level)}>●</span>
              <span className="text-sm font-medium">{getUrgencyLabel(request.urgency_level)}</span>
            </div>
          </div>

          <Separator />

          {/* Item Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Informations de l'article
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nom</label>
                  <p className="font-medium">{request.item_name}</p>
                </div>
                {request.item_reference && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Référence</label>
                    <p className="font-medium">{request.item_reference}</p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantité nécessaire</label>
                <p className="font-medium">{request.quantity_needed}</p>
              </div>

              {request.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm">{request.description}</p>
                </div>
              )}

              {request.boat_id && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bateau concerné</label>
                  <p className="font-medium">ID: {request.boat_id}</p>
                </div>
              )}

              {request.photo_url && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Photo</label>
                  <img
                    src={request.photo_url}
                    alt="Photo de l'article"
                    className="w-32 h-32 object-cover rounded border mt-2"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Request Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Informations de la demande
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Demandé par</label>
                  <p className="font-medium">{request.requester?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de création</label>
                  <p className="font-medium">
                    {format(new Date(request.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </p>
                </div>
              </div>

              {request.validated_at && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date de validation</label>
                    <p className="font-medium">
                      {format(new Date(request.validated_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Purchase Information */}
          {(request.purchase_price || request.supplier_name) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Informations d'achat
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {request.purchase_price && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Prix d'achat</label>
                      <p className="font-medium">
                        {request.purchase_price.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </p>
                    </div>
                  )}
                  {request.supplier_name && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fournisseur</label>
                      <p className="font-medium">{request.supplier_name}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Shipping Information */}
          {(request.tracking_number || request.carrier) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Informations de livraison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {request.tracking_number && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Numéro de suivi</label>
                      <p className="font-medium">{request.tracking_number}</p>
                    </div>
                  )}
                  {request.carrier && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Transporteur</label>
                      <p className="font-medium">{request.carrier}</p>
                    </div>
                  )}
                </div>
                {request.shipped_at && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date d'expédition</label>
                    <p className="font-medium">
                      {format(new Date(request.shipped_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rejection Information */}
          {request.status === 'rejected' && request.rejection_reason && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Raison du rejet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{request.rejection_reason}</p>
              </CardContent>
            </Card>
          )}

          {/* Completion Information */}
          {request.status === 'completed' && request.completed_at && (
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Demande terminée
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Terminée le {format(new Date(request.completed_at), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                </p>
                {request.stock_item_id && (
                  <p className="text-sm text-muted-foreground mt-2">
                    L'article a été automatiquement ajouté au stock.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}