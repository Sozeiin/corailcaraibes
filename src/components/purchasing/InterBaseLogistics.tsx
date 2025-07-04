import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Truck, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertCircle,
  BarChart3,
  Plus,
  Route
} from 'lucide-react';

export function InterBaseLogistics() {
  const [activeTab, setActiveTab] = useState('transfers');

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['inter-base-transfers'],
    queryFn: async () => {
      // Simulate inter-base transfer data
      // In real implementation, this would come from a dedicated table
      return [
        {
          id: '1',
          transferNumber: 'TRF-001',
          fromBase: 'Base Fort-de-France',
          toBase: 'Base Le Marin',
          status: 'in_transit',
          items: [
            { name: 'Moteur Yamaha 15CV', quantity: 2 },
            { name: 'Gilets de sauvetage', quantity: 10 }
          ],
          departureDate: '2024-01-15',
          estimatedArrival: '2024-01-16',
          transportType: 'truck'
        },
        {
          id: '2',
          transferNumber: 'TRF-002',
          fromBase: 'Base Le Marin',
          toBase: 'Base Sainte-Anne',
          status: 'completed',
          items: [
            { name: 'Équipement de sécurité', quantity: 15 }
          ],
          departureDate: '2024-01-14',
          estimatedArrival: '2024-01-14',
          transportType: 'van'
        }
      ];
    }
  });

  const { data: bases = [] } = useQuery({
    queryKey: ['bases-logistics'],
    queryFn: async () => {
      const { data } = await supabase.from('bases').select('*').order('name');
      return data || [];
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'in_transit': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'pending': 'En attente',
      'in_transit': 'En transit',
      'completed': 'Terminé',
      'cancelled': 'Annulé'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      'pending': Clock,
      'in_transit': Truck,
      'completed': CheckCircle,
      'cancelled': AlertCircle
    };
    const IconComponent = icons[status] || Clock;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Logistique Inter-Bases</h2>
          <p className="text-muted-foreground">
            Gestion des transferts de matériel entre les bases
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Route className="h-4 w-4 mr-2" />
            Planifier Route
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Transfert
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transfers">Transferts</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="fleet">Flotte</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="transfers" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Transferts Actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {transfers.filter(t => t.status === 'in_transit').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  En Attente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {transfers.filter(t => t.status === 'pending').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Terminés Aujourd'hui
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {transfers.filter(t => t.status === 'completed').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Efficacité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94%</div>
              </CardContent>
            </Card>
          </div>

          {/* Transfers List */}
          <Card>
            <CardHeader>
              <CardTitle>Transferts Récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : transfers.map((transfer) => (
                  <div key={transfer.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{transfer.transferNumber}</h3>
                          <Badge className={getStatusColor(transfer.status)}>
                            {getStatusIcon(transfer.status)}
                            <span className="ml-1">{getStatusLabel(transfer.status)}</span>
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{transfer.fromBase} → {transfer.toBase}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>
                              Départ: {new Date(transfer.departureDate).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          <strong>Articles:</strong> {transfer.items.map(item => 
                            `${item.name} (${item.quantity})`
                          ).join(', ')}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <Button variant="outline" size="sm">
                          Suivre
                        </Button>
                        <Button variant="outline" size="sm">
                          Détails
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimisation des Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Routes Optimisées</h3>
                  <div className="space-y-2">
                    {bases.slice(0, 3).map((base, index) => (
                      <div key={base.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{base.name}</div>
                          <div className="text-sm text-muted-foreground">{base.location}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Statistiques</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Distance totale</span>
                      <span className="font-medium">245 km</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Temps estimé</span>
                      <span className="font-medium">3h 30min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Coût carburant</span>
                      <span className="font-medium">45€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Économies réalisées</span>
                      <span className="font-medium text-green-600">-15%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestion de la Flotte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-medium">Camion - FDF-001</h3>
                      <p className="text-sm text-muted-foreground">Disponible</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Capacité:</span>
                      <span>5 tonnes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kilométrage:</span>
                      <span>45,320 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prochain entretien:</span>
                      <span>Dans 2 semaines</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-medium">Utilitaire - LM-002</h3>
                      <p className="text-sm text-muted-foreground">En mission</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Capacité:</span>
                      <span>1.5 tonnes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kilométrage:</span>
                      <span>28,750 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Prochain entretien:</span>
                      <span>Dans 1 mois</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Truck className="h-8 w-8 text-orange-600" />
                    <div>
                      <h3 className="font-medium">Fourgon - SA-003</h3>
                      <p className="text-sm text-muted-foreground">Maintenance</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Capacité:</span>
                      <span>2 tonnes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Kilométrage:</span>
                      <span>67,890 km</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retour prévu:</span>
                      <span>Demain</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Logistique
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Tableaux de bord analytiques pour l'optimisation logistique en cours de développement...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}