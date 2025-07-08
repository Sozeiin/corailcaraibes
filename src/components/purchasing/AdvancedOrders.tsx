import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Calendar,
  Package2,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { OrderDialog } from '@/components/orders/OrderDialog';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Order } from '@/types';

export function AdvancedOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBase, setSelectedBase] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'bulk'>('standard');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['advanced-orders', viewMode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          suppliers(name, category),
          bases(name, location),
          order_items(*)
        `)
        .eq('is_bulk_purchase', viewMode === 'bulk')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(order => ({
        id: order.id,
        supplierId: order.supplier_id || '',
        baseId: order.base_id || '',
        orderNumber: order.order_number,
        status: order.status || 'pending',
        totalAmount: order.total_amount || 0,
        orderDate: order.order_date || new Date().toISOString(),
        deliveryDate: order.delivery_date || '',
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          productName: item.product_name,
          reference: item.reference || '',
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        })),
        documents: order.documents || [],
        createdAt: order.created_at || new Date().toISOString(),
        supplier: order.suppliers,
        base: order.bases
      })) as (Order & { supplier: any; base: any })[];
    }
  });

  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data } = await supabase.from('bases').select('*').order('name');
      return data || [];
    }
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesBase = selectedBase === 'all' || order.baseId === selectedBase;
    
    return matchesSearch && matchesStatus && matchesBase;
  });

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      delivered: 'Livrée',
      cancelled: 'Annulée'
    };
    return labels[status as keyof typeof labels] || status;
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) return;
    
    try {
      await supabase.from('orders').delete().eq('id', orderId);
      queryClient.invalidateQueries({ queryKey: ['advanced-orders'] });
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingOrder(null);
    queryClient.invalidateQueries({ queryKey: ['advanced-orders'] });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">Gestion Avancée des Commandes</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Vue complète et outils avancés pour la gestion des commandes
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Importer</span>
            <span className="xs:hidden">Import</span>
          </Button>
          <Button variant="outline" size="sm" className="text-xs sm:text-sm">
            <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Exporter</span>
            <span className="xs:hidden">Export</span>
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} size="sm" className="text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden xs:inline">Nouvelle Commande</span>
            <span className="xs:hidden">Nouvelle</span>
          </Button>
        </div>
      </div>

      {/* Order Type Tabs */}
      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'standard' | 'bulk')}>
        <TabsList>
          <TabsTrigger value="standard">Commandes Standard</TabsTrigger>
          <TabsTrigger value="bulk">Achats Groupés</TabsTrigger>
        </TabsList>

        <TabsContent value={viewMode} className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Filter className="h-4 w-4 sm:h-5 sm:w-5" />
                Filtres et Recherche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher commandes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="confirmed">Confirmée</option>
                  <option value="delivered">Livrée</option>
                  <option value="cancelled">Annulée</option>
                </select>

                <select
                  value={selectedBase}
                  onChange={(e) => setSelectedBase(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">Toutes les bases</option>
                  {bases.map(base => (
                    <option key={base.id} value={base.id}>
                      {base.name}
                    </option>
                  ))}
                </select>

                <Button variant="outline" size="sm" onClick={() => {
                  toast({
                    title: 'Période sélectionnée',
                    description: 'Sélecteur de période ouvert.'
                  });
                }} className="text-xs sm:text-sm">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Période
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <div className="grid gap-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Package2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Aucune commande trouvée</h3>
                  <p className="text-muted-foreground">
                    Ajustez vos filtres ou créez une nouvelle commande
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredOrders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{order.orderNumber}</h3>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                          {viewMode === 'bulk' && (
                            <Badge variant="outline">Achat Groupé</Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Fournisseur:</span>
                            <p className="font-medium">{order.supplier?.name || 'Non spécifié'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Base:</span>
                            <p className="font-medium">{order.base?.name || 'Non spécifiée'}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <p className="font-medium">
                              {new Date(order.orderDate).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <span className="text-muted-foreground">Articles: </span>
                            <span className="font-medium">{order.items.length}</span>
                          </div>
                          <div className="text-lg font-bold">
                            {formatCurrency(order.totalAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(order)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <OrderDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        order={editingOrder}
      />
    </div>
  );
}