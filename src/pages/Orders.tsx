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
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Order } from '@/types';

export default function Orders() {
  console.log('Orders page rendering...');
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
    queryKey: ['orders', user?.role, user?.baseId],
    queryFn: async () => {
      if (!user?.baseId) return [];
      
      console.log('Fetching orders for user:', { role: user.role, baseId: user.baseId });
      
      // Requête optimisée - pas de JOIN pour éviter la lenteur
      let query = supabase.from('orders').select(`
        id,
        supplier_id,
        base_id,
        order_number,
        status,
        total_amount,
        order_date,
        delivery_date,
        created_at,
        is_purchase_request,
        boat_id,
        urgency_level,
        requested_by,
        approved_by,
        approved_at,
        documents
      `);

      // Filtrage côté serveur selon le rôle
      if (user.role !== 'direction') {
        query = query.eq('base_id', user.baseId);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(100); // Réduire la limite

      if (error) throw error;

      console.log('Orders fetched:', data?.length || 0);

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
        items: [], // Chargement à la demande
        documents: Array.isArray(order.documents) ? order.documents : [],
        createdAt: order.created_at || new Date().toISOString(),
        // Purchase request fields
        isPurchaseRequest: Boolean(order.is_purchase_request),
        boatId: order.boat_id || '',
        urgencyLevel: order.urgency_level || 'normal',
        requestedBy: order.requested_by || '',
        approvedBy: order.approved_by || '',
        approvedAt: order.approved_at || '',
        photos: [],
        trackingUrl: '',
        rejectionReason: '',
        requestNotes: ''
      })) as Order[];
    },
    enabled: !!user,
    staleTime: 60000, // Cache plus long
    gcTime: 300000,
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
    <ErrorBoundary>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Commandes</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
              Gestion des commandes et approvisionnements
            </p>
          </div>
          {canManageOrders && (
            <div className="flex flex-col xs:flex-row gap-2 w-full xs:w-auto">
              <Button
                onClick={() => setIsPurchaseRequestDialogOpen(true)}
                variant="outline"
                className="gap-2 text-xs sm:text-sm"
                size="sm"
              >
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Demande d'achat</span>
                <span className="xs:hidden">Demande</span>
              </Button>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="gap-2 text-xs sm:text-sm"
                size="sm"
              >
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Nouvelle commande</span>
                <span className="xs:hidden">Nouveau</span>
              </Button>
            </div>
          )}
        </div>

        <ErrorBoundary>
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-3 sm:p-4 lg:p-6 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="relative flex-1 max-w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
                  <Input
                    placeholder="Rechercher une commande..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:pl-10 text-sm"
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
        </ErrorBoundary>

        <ErrorBoundary>
          <OrderDialog
            isOpen={isDialogOpen}
            onClose={handleDialogClose}
            order={editingOrder}
          />
        </ErrorBoundary>

        <ErrorBoundary>
          <PurchaseRequestDialog
            isOpen={isPurchaseRequestDialogOpen}
            onClose={handlePurchaseRequestDialogClose}
            order={editingOrder}
          />
        </ErrorBoundary>

        <ErrorBoundary>
          <OrderDetailsDialog
            order={detailsOrder}
            isOpen={isDetailsDialogOpen}
            onClose={handleDetailsDialogClose}
          />
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}