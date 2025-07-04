import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  Plus, 
  Users, 
  TrendingUp,
  Calendar,
  Truck,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export function BulkPurchasing() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: bulkOrders = [], isLoading } = useQuery({
    queryKey: ['bulk-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          suppliers(name),
          order_items(*),
          bulk_purchase_distributions(*)
        `)
        .eq('is_bulk_purchase', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['bulk-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bulk_purchase_templates')
        .select(`
          *,
          bulk_purchase_template_items(*),
          suppliers(name)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const getDistributionStatus = (order: any) => {
    if (!order.bulk_purchase_distributions?.length) return 'Pas de distribution';
    
    const totalDistributions = order.bulk_purchase_distributions.length;
    const completedDistributions = order.bulk_purchase_distributions.filter(
      (d: any) => d.status === 'distributed'
    ).length;
    
    if (completedDistributions === 0) return 'En attente';
    if (completedDistributions === totalDistributions) return 'Terminé';
    return 'Partiel';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'En attente': 'bg-yellow-100 text-yellow-800',
      'Partiel': 'bg-blue-100 text-blue-800',
      'Terminé': 'bg-green-100 text-green-800',
      'Pas de distribution': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Achats Groupés</h2>
          <p className="text-muted-foreground">
            Gestion des achats en volume et distribution inter-bases
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Template
          </Button>
          <Button>
            <Package className="h-4 w-4 mr-2" />
            Nouvel Achat Groupé
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="active">Achats Actifs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Achats Groupés Actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{bulkOrders.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  En Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bulkOrders.filter(o => getDistributionStatus(o) === 'Partiel').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Templates Actifs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{templates.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Économies Réalisées
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15%</div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bulk Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Achats Groupés Récents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                ) : bulkOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{order.order_number}</div>
                      <div className="text-sm text-muted-foreground">
                        {order.suppliers?.name || 'Fournisseur non spécifié'}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(getDistributionStatus(order))}>
                        {getDistributionStatus(order)}
                      </Badge>
                      <div className="text-right">
                        <div className="font-medium">{order.total_amount?.toFixed(2) || 0}€</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Achats Groupés Actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bulkOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{order.order_number}</h3>
                          <Badge variant="outline">Achat Groupé</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Fournisseur:</span>
                            <p className="font-medium">{order.suppliers?.name || 'Non spécifié'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Statut:</span>
                            <Badge className={getStatusColor(getDistributionStatus(order))}>
                              {getDistributionStatus(order)}
                            </Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Montant:</span>
                            <p className="font-medium">{order.total_amount?.toFixed(2) || 0}€</p>
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="outline" size="sm">
                        Gérer Distribution
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Templates d'Achats Groupés</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{template.name}</h3>
                          <Badge variant="outline">{template.frequency}</Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {template.description}
                        </p>
                        
                        <div className="text-sm">
                          <span className="text-muted-foreground">Articles: </span>
                          <span className="font-medium">
                            {template.bulk_purchase_template_items?.length || 0}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Modifier
                        </Button>
                        <Button size="sm">
                          Créer Commande
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribution Inter-Bases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Interface de gestion de distribution en cours de développement...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}