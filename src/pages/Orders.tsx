import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrderTable } from '@/components/orders/OrderTable';
import { OrderDialog } from '@/components/orders/OrderDialog';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { BulkPurchaseDialog } from '@/components/orders/BulkPurchaseDialog';
import { BulkPurchaseTable } from '@/components/orders/BulkPurchaseTable';
import { Order } from '@/types';

export default function Orders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          suppliers(name),
          bases(name, location),
          order_items(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database fields to match Order interface
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
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price
        })),
        documents: order.documents || [],
        createdAt: order.created_at || new Date().toISOString(),
        // Bulk purchase fields
        isBulkPurchase: order.is_bulk_purchase || false,
        bulkPurchaseType: order.bulk_purchase_type,
        expectedDeliveryDate: order.expected_delivery_date,
        distributionStatus: order.distribution_status || 'pending',
        notes: order.notes
      })) as Order[];
    }
  });

  // Get unique statuses for filter
  const statuses = ['pending', 'confirmed', 'delivered', 'cancelled'];

  // Filter orders based on search and status
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingOrder(null);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleBulkDialogClose = () => {
    setIsBulkDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleDistribute = (order: Order) => {
    // TODO: Implement distribution management
    console.log('Distribute order:', order);
  };

  const canManageOrders = user?.role === 'direction' || user?.role === 'chef_base';

  // Separate regular orders from bulk orders
  const regularOrders = filteredOrders.filter(order => !order.isBulkPurchase);
  const bulkOrders = filteredOrders.filter(order => order.isBulkPurchase);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
          <p className="text-gray-600 mt-2">
            Gestion des commandes et approvisionnements
          </p>
        </div>
      </div>

      <Tabs defaultValue="regular" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="regular" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Commandes Standard</span>
          </TabsTrigger>
          <TabsTrigger value="bulk" className="flex items-center space-x-2">
            <Truck className="h-4 w-4" />
            <span>Achats Groupés</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="regular" className="space-y-6">
          <div className="flex items-center justify-end">
            {canManageOrders && (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle commande
              </Button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher une commande..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <OrderFilters
                statuses={statuses}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
              />
            </div>

            <OrderTable
              orders={regularOrders}
              isLoading={isLoading}
              onEdit={handleEdit}
              canManage={canManageOrders}
            />
          </div>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <div className="flex items-center justify-end">
            {canManageOrders && (
              <Button
                onClick={() => setIsBulkDialogOpen(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nouvel achat groupé
              </Button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-6 border-b">
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher un achat groupé..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <OrderFilters
                statuses={statuses}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
              />
            </div>

            <BulkPurchaseTable
              orders={orders}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDistribute={handleDistribute}
              canManage={canManageOrders}
            />
          </div>
        </TabsContent>
      </Tabs>

      <OrderDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        order={editingOrder}
      />

      <BulkPurchaseDialog
        isOpen={isBulkDialogOpen}
        onClose={handleBulkDialogClose}
        order={editingOrder}
      />
    </div>
  );
}