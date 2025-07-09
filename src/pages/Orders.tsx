import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ShoppingCart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderCards } from '@/components/orders/OrderCards';
import { OrderDialog } from '@/components/orders/OrderDialog';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';
import { PurchaseRequestDialog } from '@/components/orders/PurchaseRequestDialog';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { Order } from '@/types';

export default function Orders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPurchaseRequestDialogOpen, setIsPurchaseRequestDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          suppliers(name),
          bases(name, location),
          boats(name, model),
          order_items(*),
          requested_by_profile:profiles!requested_by(name),
          approved_by_profile:profiles!approved_by(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform database fields to match Order interface
      return data.map(order => ({
        id: order.id,
        supplierId: order.supplier_id || '',
        baseId: order.base_id || '',
        orderNumber: order.order_number || '',
        status: order.status || 'pending',
        totalAmount: Number(order.total_amount) || 0,
        orderDate: order.order_date || new Date().toISOString().split('T')[0],
        deliveryDate: order.delivery_date || '',
        items: (order.order_items || []).map((item: any) => ({
          id: item.id || '',
          productName: item.product_name || '',
          reference: item.reference || '',
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unit_price) || 0,
          totalPrice: Number(item.total_price) || (Number(item.quantity || 0) * Number(item.unit_price || 0))
        })),
        documents: Array.isArray(order.documents) ? order.documents : [],
        createdAt: order.created_at || new Date().toISOString(),
        // Purchase request fields
        isPurchaseRequest: Boolean(order.is_purchase_request),
        boatId: order.boat_id || '',
        urgencyLevel: order.urgency_level || 'normal',
        requestedBy: order.requested_by || '',
        approvedBy: order.approved_by || '',
        approvedAt: order.approved_at || '',
        photos: Array.isArray(order.photos) ? order.photos : [],
        trackingUrl: order.tracking_url || '',
        rejectionReason: order.rejection_reason || '',
        requestNotes: order.request_notes || ''
      })) as Order[];
    }
  });

  // Get unique statuses for filter
  const statuses = [
    'pending', 'confirmed', 'delivered', 'cancelled', 
    'pending_approval', 'supplier_requested', 'shipping_mainland', 'shipping_antilles'
  ];

  // Filter orders based on search, status, and type
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
    const matchesType = selectedType === 'all' || 
      (selectedType === 'requests' && order.isPurchaseRequest) ||
      (selectedType === 'orders' && !order.isPurchaseRequest);
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    if (order.isPurchaseRequest) {
      setIsPurchaseRequestDialogOpen(true);
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleViewDetails = (order: Order) => {
    setDetailsOrder(order);
    setIsDetailsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingOrder(null);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handlePurchaseRequestDialogClose = () => {
    setIsPurchaseRequestDialogOpen(false);
    setEditingOrder(null);
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setDetailsOrder(null);
  };

  const canManageOrders = user?.role === 'direction' || user?.role === 'chef_base';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
          <p className="text-gray-600 mt-2">
            Gestion des commandes et approvisionnements
          </p>
        </div>
        {canManageOrders && (
          <div className="flex gap-2">
            <Button
              onClick={() => setIsPurchaseRequestDialogOpen(true)}
              variant="outline"
              className="gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              Demande d'achat
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouvelle commande
            </Button>
          </div>
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
            selectedType={selectedType}
            onTypeChange={setSelectedType}
          />
        </div>

        <OrderCards
          orders={filteredOrders}
          isLoading={isLoading}
          onEdit={handleEdit}
          onViewDetails={handleViewDetails}
          canManage={canManageOrders}
        />
      </div>

      <OrderDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        order={editingOrder}
      />

      <PurchaseRequestDialog
        isOpen={isPurchaseRequestDialogOpen}
        onClose={handlePurchaseRequestDialogClose}
        order={editingOrder}
      />

      <OrderDetailsDialog
        order={detailsOrder}
        isOpen={isDetailsDialogOpen}
        onClose={handleDetailsDialogClose}
      />
    </div>
  );
}