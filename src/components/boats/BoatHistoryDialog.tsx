import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Ship, 
  History, 
  Wrench, 
  Calendar, 
  Users, 
  Package,
  Euro,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Boat, Intervention, BoatRental, InterventionPart } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BoatComponentsManager } from './BoatComponentsManager';

interface BoatHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  boat: Boat | null;
}

export function BoatHistoryDialog({ isOpen, onClose, boat }: BoatHistoryDialogProps) {
  if (!boat) return null;

  // Fetch maintenance history
  const { data: interventions = [] } = useQuery({
    queryKey: ['boat-interventions', boat.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          profiles(name)
        `)
        .eq('boat_id', boat.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(intervention => ({
        id: intervention.id,
        boatId: intervention.boat_id || '',
        technicianId: intervention.technician_id || '',
        title: intervention.title,
        description: intervention.description || '',
        status: intervention.status || 'scheduled',
        scheduledDate: intervention.scheduled_date || '',
        completedDate: intervention.completed_date || '',
        tasks: [],
        baseId: intervention.base_id || '',
        createdAt: intervention.created_at || new Date().toISOString(),
        technicianName: (intervention.profiles as any)?.name || 'Non assigné'
      }));
    },
    enabled: isOpen && !!boat.id
  });

  // Fetch rental history
  const { data: rentals = [] } = useQuery({
    queryKey: ['boat-rentals', boat.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boat_rentals')
        .select('*')
        .eq('boat_id', boat.id)
        .order('start_date', { ascending: false });

      if (error) throw error;

      return data.map(rental => ({
        id: rental.id,
        boatId: rental.boat_id,
        customerName: rental.customer_name,
        customerEmail: rental.customer_email,
        customerPhone: rental.customer_phone,
        startDate: rental.start_date,
        endDate: rental.end_date,
        totalAmount: rental.total_amount,
        status: rental.status,
        notes: rental.notes,
        baseId: rental.base_id,
        createdAt: rental.created_at,
        updatedAt: rental.updated_at
      }));
    },
    enabled: isOpen && !!boat.id
  });

  // Fetch parts used
  const { data: partsUsed = [] } = useQuery({
    queryKey: ['boat-parts', boat.id],
    queryFn: async () => {
      // D'abord récupérer les interventions du bateau
      const { data: boatInterventions, error: interventionsError } = await supabase
        .from('interventions')
        .select('id')
        .eq('boat_id', boat.id);

      if (interventionsError) throw interventionsError;
      
      if (!boatInterventions || boatInterventions.length === 0) {
        return [];
      }

      const interventionIds = boatInterventions.map(i => i.id);

      const { data, error } = await supabase
        .from('intervention_parts')
        .select(`
          *,
          interventions(title, scheduled_date)
        `)
        .in('intervention_id', interventionIds)
        .order('used_at', { ascending: false });

      if (error) throw error;

      return data.map(part => ({
        id: part.id,
        interventionId: part.intervention_id,
        stockItemId: part.stock_item_id,
        partName: part.part_name,
        quantity: part.quantity,
        unitCost: part.unit_cost,
        totalCost: part.total_cost,
        notes: part.notes,
        usedAt: part.used_at,
        interventionTitle: part.interventions?.title || 'Intervention inconnue'
      }));
    },
    enabled: isOpen && !!boat.id
  });

  const getStatusBadge = (status: string, type: 'intervention' | 'rental') => {
    const configs = {
      intervention: {
        scheduled: { label: 'Programmée', variant: 'secondary' as const },
        in_progress: { label: 'En cours', variant: 'default' as const },
        completed: { label: 'Terminée', variant: 'default' as const },
        cancelled: { label: 'Annulée', variant: 'destructive' as const }
      },
      rental: {
        confirmed: { label: 'Confirmée', variant: 'secondary' as const },
        completed: { label: 'Terminée', variant: 'default' as const },
        cancelled: { label: 'Annulée', variant: 'destructive' as const }
      }
    };
    
    const config = configs[type][status as keyof typeof configs[typeof type]] || 
                  { label: status, variant: 'secondary' as const };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalMaintenanceCosts = partsUsed.reduce((total, part) => total + part.totalCost, 0);
  const totalRentalRevenue = rentals.reduce((total, rental) => total + rental.totalAmount, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Historique - {boat.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              Général
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="rentals" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="parts" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Pièces
            </TabsTrigger>
            <TabsTrigger value="components" className="flex items-center gap-1">
              <Wrench className="h-4 w-4" />
              Composants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Interventions total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{interventions.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Locations total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rentals.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Coût pièces total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalMaintenanceCosts.toFixed(2)} €</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informations du bateau</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Modèle:</span> {boat.model}
                  </div>
                  <div>
                    <span className="font-medium">Année:</span> {boat.year}
                  </div>
                  <div>
                    <span className="font-medium">N° de série:</span> {boat.serialNumber}
                  </div>
                  <div>
                    <span className="font-medium">Statut:</span> {boat.status}
                  </div>
                  {boat.nextMaintenance && (
                    <div className="col-span-2">
                      <span className="font-medium">Prochaine maintenance:</span> {' '}
                      {format(new Date(boat.nextMaintenance), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <div className="space-y-4">
              {interventions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune intervention enregistrée</p>
                  </CardContent>
                </Card>
              ) : (
                interventions.map((intervention) => (
                  <Card key={intervention.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{intervention.title}</CardTitle>
                        {getStatusBadge(intervention.status, 'intervention')}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {intervention.description && (
                        <p className="text-gray-600">{intervention.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>
                            Programmée: {format(new Date(intervention.scheduledDate), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                        {intervention.completedDate && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span>
                              Terminée: {format(new Date(intervention.completedDate), 'dd/MM/yyyy', { locale: fr })}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Technicien:</span> {intervention.technicianName}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="rentals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Revenus total des locations: {totalRentalRevenue.toFixed(2)} €
                </CardTitle>
              </CardHeader>
            </Card>
            
            <div className="space-y-4">
              {rentals.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune location enregistrée</p>
                  </CardContent>
                </Card>
              ) : (
                rentals.map((rental) => (
                  <Card key={rental.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{rental.customerName}</CardTitle>
                        {getStatusBadge(rental.status, 'rental')}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Début:</span> {' '}
                          {format(new Date(rental.startDate), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                        <div>
                          <span className="font-medium">Fin:</span> {' '}
                          {format(new Date(rental.endDate), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                        <div>
                          <span className="font-medium">Montant:</span> {rental.totalAmount.toFixed(2)} €
                        </div>
                        {rental.customerEmail && (
                          <div>
                            <span className="font-medium">Email:</span> {rental.customerEmail}
                          </div>
                        )}
                        {rental.customerPhone && (
                          <div>
                            <span className="font-medium">Téléphone:</span> {rental.customerPhone}
                          </div>
                        )}
                      </div>
                      {rental.notes && (
                        <div className="mt-2">
                          <span className="font-medium">Notes:</span> {rental.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="parts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5" />
                  Coût total des pièces: {totalMaintenanceCosts.toFixed(2)} €
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="space-y-4">
              {partsUsed.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune pièce utilisée enregistrée</p>
                  </CardContent>
                </Card>
              ) : (
                partsUsed.map((part) => (
                  <Card key={part.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{part.partName}</CardTitle>
                        <Badge variant="outline">{part.totalCost.toFixed(2)} €</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{part.interventionTitle}</p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Quantité:</span> {part.quantity}
                        </div>
                        <div>
                          <span className="font-medium">Prix unitaire:</span> {part.unitCost.toFixed(2)} €
                        </div>
                        <div>
                          <span className="font-medium">Utilisée le:</span> {' '}
                          {format(new Date(part.usedAt), 'dd/MM/yyyy', { locale: fr })}
                        </div>
                      </div>
                      {part.notes && (
                        <div className="mt-2">
                          <span className="font-medium">Notes:</span> {part.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="components">
            <BoatComponentsManager boatId={boat.id} boatName={boat.name} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}