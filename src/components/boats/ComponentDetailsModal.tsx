import React, { useState } from 'react';
import { X, Calendar, Wrench, Info, Settings, Package, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { BoatComponent } from '@/types';
import { SubComponentManager } from './SubComponentManager';
import { ComponentStockLinkManager } from './ComponentStockLinkManager';
import { ComponentPurchaseHistory } from './ComponentPurchaseHistory';

interface ComponentDetailsModalProps {
  component: BoatComponent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (component: BoatComponent) => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'operational':
      return 'default';
    case 'maintenance_needed':
      return 'secondary';
    case 'out_of_service':
      return 'destructive';
    case 'scheduled_maintenance':
      return 'outline';
    default:
      return 'secondary';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'operational':
      return 'Opérationnel';
    case 'maintenance_needed':
      return 'Maintenance requise';
    case 'out_of_service':
      return 'Hors service';
    case 'scheduled_maintenance':
      return 'Maintenance planifiée';
    default:
      return status;
  }
};

export function ComponentDetailsModal({ 
  component, 
  isOpen, 
  onClose, 
  onEdit 
}: ComponentDetailsModalProps) {
  if (!component) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wrench className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-xl">{component.componentName}</DialogTitle>
                <p className="text-sm text-muted-foreground">{component.componentType}</p>
              </div>
              <Badge variant={getStatusBadgeVariant(component.status)}>
                {getStatusLabel(component.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(component)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Détails
              </TabsTrigger>
              <TabsTrigger value="subcomponents" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Sous-composants
              </TabsTrigger>
              <TabsTrigger value="stock" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Stock
              </TabsTrigger>
              <TabsTrigger value="purchases" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Achats
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Informations générales
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {component.manufacturer && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Fabricant:</span>
                        <p className="font-medium">{component.manufacturer}</p>
                      </div>
                    )}
                    {component.model && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Modèle:</span>
                        <p className="font-medium">{component.model}</p>
                      </div>
                    )}
                    {component.serialNumber && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">N° de série:</span>
                        <p className="font-mono text-sm">{component.serialNumber}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Intervalle de maintenance:</span>
                      <p className="font-medium">{component.maintenanceIntervalDays} jours</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Maintenance Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Maintenance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {component.installationDate && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Date d'installation:</span>
                        <p className="font-medium">
                          {format(new Date(component.installationDate), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    )}
                    {component.lastMaintenanceDate && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Dernière maintenance:</span>
                        <p className="font-medium">
                          {format(new Date(component.lastMaintenanceDate), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    )}
                    {component.nextMaintenanceDate && (
                      <div>
                        <span className="text-sm font-medium text-muted-foreground">Prochaine maintenance:</span>
                        <p className="font-medium">
                          {format(new Date(component.nextMaintenanceDate), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              {component.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{component.notes}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="subcomponents">
              <SubComponentManager
                parentComponentId={component.id}
                parentComponentName={component.componentName}
              />
            </TabsContent>

            <TabsContent value="stock">
              <ComponentStockLinkManager
                componentId={component.id}
                componentName={component.componentName}
              />
            </TabsContent>

            <TabsContent value="purchases">
              <ComponentPurchaseHistory
                componentId={component.id}
                componentName={component.componentName}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}