import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Truck, Calendar } from 'lucide-react';

interface DetectedShipment {
  id: string;
  reference: string;
  name: string;
  source_base: {
    name: string;
    location: string;
  };
  total_boxes: number;
  total_items: number;
  status: string;
  created_at: string;
  tracking_number?: string;
  carrier?: string;
}

interface ShipmentReceptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: DetectedShipment | null;
  scannedItem: {
    reference: string;
    name: string;
  } | null;
  onConfirmReception: () => void;
  onCancelReception: () => void;
}

export function ShipmentReceptionDialog({
  open,
  onOpenChange,
  shipment,
  scannedItem,
  onConfirmReception,
  onCancelReception,
}: ShipmentReceptionDialogProps) {
  if (!shipment || !scannedItem) return null;

  const statusColors: Record<string, string> = {
    shipped: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    in_progress: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    completed: 'bg-green-500/10 text-green-700 border-green-500/20',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Expédition détectée !
          </DialogTitle>
          <DialogDescription>
            L'article scanné fait partie d'une expédition en attente de réception.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info expédition */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-lg">{shipment.name}</p>
                <p className="text-sm text-muted-foreground">Ref: {shipment.reference}</p>
              </div>
              <Badge className={statusColors[shipment.status] || ''}>
                {shipment.status === 'shipped' ? 'En livraison' : shipment.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Provenance</p>
                  <p className="text-muted-foreground">{shipment.source_base?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Contenu</p>
                  <p className="text-muted-foreground">
                    {shipment.total_boxes} carton{shipment.total_boxes > 1 ? 's' : ''} • {shipment.total_items} article{shipment.total_items > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {shipment.carrier && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Transporteur</p>
                    <p className="text-muted-foreground">{shipment.carrier}</p>
                  </div>
                </div>
              )}

              {shipment.tracking_number && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Suivi</p>
                    <p className="text-muted-foreground text-xs">{shipment.tracking_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Article scanné */}
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Article scanné :</p>
            <div>
              <p className="font-semibold">{scannedItem.name}</p>
              <p className="text-sm text-muted-foreground">Ref: {scannedItem.reference}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              💡 Que souhaitez-vous faire ?
            </p>
            <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1 ml-4 list-disc">
              <li><strong>Recevoir l'expédition</strong> : L'article sera ajouté au stock et la réception sera enregistrée</li>
              <li><strong>Continuer en mode stock</strong> : Traiter l'article normalement sans lien avec l'expédition</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancelReception}>
            Continuer en mode stock
          </Button>
          <Button onClick={onConfirmReception} className="gap-2">
            <Package className="h-4 w-4" />
            Recevoir l'expédition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
