import React, { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, History, Wrench, Package, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { InterventionDialog } from '@/components/maintenance/InterventionDialog';
import { ComponentPurchaseDialog } from './ComponentPurchaseDialog';
import type { BoatComponent } from '@/types';

interface ComponentDetailsViewProps {
  component: BoatComponent;
  onClose: () => void;
}

export function ComponentDetailsView({ component, onClose }: ComponentDetailsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{component.componentName}</h2>
          <p className="text-muted-foreground">{component.componentType}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Détails</TabsTrigger>
          <TabsTrigger value="subcomponents">Sous-composants</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="purchases">Achats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <ComponentDetailsTab component={component} />
        </TabsContent>
        
        <TabsContent value="subcomponents" className="space-y-4">
          <SubComponentsTab componentId={component.id} />
        </TabsContent>
        
        <TabsContent value="maintenance" className="space-y-4">
          <MaintenanceHistoryTab component={component} />
        </TabsContent>
        
        <TabsContent value="purchases" className="space-y-4">
          <PurchaseHistoryTab componentId={component.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ComponentDetailsTab({ component }: { component: BoatComponent }) {
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState<Date | undefined>(
    component.nextMaintenanceDate ? new Date(component.nextMaintenanceDate) : undefined
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Informations générales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fabricant</label>
              <p className="font-medium">{component.manufacturer || 'Non spécifié'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Modèle</label>
              <p className="font-medium">{component.model || 'Non spécifié'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">N° de série</label>
              <p className="font-medium">{component.serialNumber || 'Non spécifié'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Statut</label>
              <Badge variant="secondary">{component.status}</Badge>
            </div>
          </div>
          
          {component.notes && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notes</label>
              <p className="mt-1 p-3 bg-muted rounded-md text-sm">{component.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date d'installation</label>
              <p className="font-medium">
                {component.installationDate 
                  ? format(new Date(component.installationDate), 'dd/MM/yyyy', { locale: fr })
                  : 'Non spécifiée'
                }
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Dernière maintenance</label>
              <p className="font-medium">
                {component.lastMaintenanceDate 
                  ? format(new Date(component.lastMaintenanceDate), 'dd/MM/yyyy', { locale: fr })
                  : 'Aucune'
                }
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Prochaine maintenance</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !nextMaintenanceDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextMaintenanceDate ? (
                      format(nextMaintenanceDate, "dd/MM/yyyy", { locale: fr })
                    ) : (
                      <span>Planifier</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={nextMaintenanceDate}
                    onSelect={setNextMaintenanceDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Intervalle de maintenance</label>
              <p className="font-medium">{component.maintenanceIntervalDays} jours</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SubComponentsTab({ componentId }: { componentId: string }) {
  const { data: subComponents = [], isLoading } = useQuery({
    queryKey: ['sub-components', componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_sub_components')
        .select('*')
        .eq('parent_component_id', componentId)
        .order('sub_component_name');

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <LoadingSpinner text="Chargement des sous-composants..." />;
  }

  if (subComponents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun sous-composant</h3>
          <p className="text-muted-foreground mb-4">
            Ce composant n'a pas encore de sous-composants configurés.
          </p>
          <Button onClick={() => {
            // TODO: Implement sub-component dialog
            console.log('Add sub-component for:', componentId);
          }}>
            Ajouter un sous-composant
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {subComponents.map((subComponent) => (
        <Card key={subComponent.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">{subComponent.sub_component_name}</h4>
                <p className="text-sm text-muted-foreground">{subComponent.sub_component_type}</p>
              </div>
              <Badge variant="secondary">{subComponent.status}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {subComponent.manufacturer && (
                <div>
                  <span className="font-medium">Fabricant:</span> {subComponent.manufacturer}
                </div>
              )}
              {subComponent.model && (
                <div>
                  <span className="font-medium">Modèle:</span> {subComponent.model}
                </div>
              )}
              {subComponent.serial_number && (
                <div>
                  <span className="font-medium">N° série:</span> {subComponent.serial_number}
                </div>
              )}
              <div>
                <span className="font-medium">Maintenance:</span> tous les {subComponent.maintenance_interval_days} jours
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MaintenanceHistoryTab({ component }: { component: BoatComponent }) {
  const [isInterventionDialogOpen, setIsInterventionDialogOpen] = useState(false);
  
  const { data: maintenanceHistory = [], isLoading } = useQuery({
    queryKey: ['maintenance-history', component.id],
    queryFn: async () => {
      // Improved query - use the new component_id column for direct linking
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          profiles(name)
        `)
        .or(`component_id.eq.${component.id},boat_id.eq.${component.boatId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <LoadingSpinner text="Chargement de l'historique..." />;
  }

  if (maintenanceHistory.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun historique</h3>
          <p className="text-muted-foreground mb-4">
            Aucune intervention n'a encore été enregistrée pour ce composant.
          </p>
          <Button onClick={() => setIsInterventionDialogOpen(true)}>
            Créer une intervention
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {maintenanceHistory.map((intervention) => (
          <Card key={intervention.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{intervention.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(intervention.created_at), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
                <Badge variant="secondary">{intervention.status}</Badge>
              </div>
              {intervention.description && (
                <p className="text-sm text-muted-foreground">{intervention.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <InterventionDialog
        isOpen={isInterventionDialogOpen}
        onClose={() => setIsInterventionDialogOpen(false)}
        intervention={{
          id: '',
          boatId: component.boatId || '',
          technicianId: '',
          title: `Maintenance ${component.componentName}`,
          description: `Intervention de maintenance pour le composant ${component.componentName}`,
          status: 'scheduled',
          scheduledDate: new Date().toISOString(),
          tasks: [],
          baseId: '',
          createdAt: new Date().toISOString(),
          intervention_type: 'maintenance'
        }}
      />
    </>
  );
}

function PurchaseHistoryTab({ componentId }: { componentId: string }) {
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const { data: purchaseHistory = [], isLoading } = useQuery({
    queryKey: ['purchase-history', componentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('component_purchase_history')
        .select(`
          *,
          supplier:suppliers(name),
          stock_item:stock_items(name, reference)
        `)
        .eq('component_id', componentId)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <LoadingSpinner text="Chargement de l'historique d'achat..." />;
  }

  if (purchaseHistory.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Aucun achat</h3>
          <p className="text-muted-foreground mb-4">
            Aucun achat n'a encore été enregistré pour ce composant.
          </p>
          <Button onClick={() => setIsPurchaseDialogOpen(true)}>
            Enregistrer un achat
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {purchaseHistory.map((purchase) => (
          <Card key={purchase.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">
                    {purchase.stock_item?.name || 'Article non spécifié'}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {purchase.supplier?.name} - {format(new Date(purchase.purchase_date), 'dd/MM/yyyy', { locale: fr })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{purchase.total_cost} €</p>
                  <p className="text-sm text-muted-foreground">
                    {purchase.quantity} × {purchase.unit_cost} €
                  </p>
                </div>
              </div>
              {purchase.warranty_months > 0 && (
                <div className="text-sm">
                  <Badge variant="outline">
                    Garantie: {purchase.warranty_months} mois
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ComponentPurchaseDialog
        isOpen={isPurchaseDialogOpen}
        onClose={() => setIsPurchaseDialogOpen(false)}
        componentId={componentId}
      />
    </>
  );
}