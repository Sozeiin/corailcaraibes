import React, { useState } from 'react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { Plus, Search, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrderTableEnhanced } from '@/components/orders/OrderTableEnhanced';
import { OrderDialog } from '@/components/orders/OrderDialog';
import { OrderDetailsDialog } from '@/components/orders/OrderDetailsDialog';
import { PurchaseRequestDialog } from '@/components/orders/PurchaseRequestDialog';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { WorkflowGuide } from '@/components/orders/WorkflowGuide';
import { StockSyncTestWidget } from '@/components/orders/StockSyncTestWidget';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Order } from '@/types';
import { MobileTable, ResponsiveBadge } from '@/components/ui/mobile-table';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency } from '@/lib/utils';
import { getWorkflowStatusList, getStatusColor, getStatusLabel } from '@/lib/workflowUtils';
import { supabase } from '@/integrations/supabase/client';

export default function Orders() {
  console.log('Orders page rendering...');
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPurchaseRequestDialogOpen, setIsPurchaseRequestDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;

  const {
    data: rawOrders = [],
    loading: isLoading,
    remove: removeOrderRecord,
    refetch: refetchOrders
  } = useOfflineData<any>({ table: 'orders', baseId, dependencies: [user?.role, user?.baseId] });

  const { data: rawOrderItems = [], remove: removeOrderItem, refetch: refetchOrderItems } = useOfflineData<any>({ table: 'order_items', baseId });

  const orders: Order[] = rawOrders.map((order: any) => {
    const items = rawOrderItems
      .filter((item: any) => item.order_id === order.id)
      .map((item: any) => ({
        id: item.id,
        productName: item.product_name,
        reference: item.reference || '',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price
      }));

    const calculatedTotal = items.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);

    return {
      id: order.id,
      supplierId: order.supplier_id || '',
      baseId: order.base_id || '',
      orderNumber: order.order_number || '',
      status: order.status || 'pending',
      totalAmount: Number(order.total_amount) || calculatedTotal,
      orderDate: order.order_date || new Date().toISOString().split('T')[0],
      deliveryDate: order.delivery_date || '',
      items,
      documents: Array.isArray(order.documents) ? order.documents : [],
      createdAt: order.created_at || new Date().toISOString(),
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
    } as Order;
  });

  // Get workflow statuses for filter
  const statuses = getWorkflowStatusList();

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

  const mobileColumns = [
    { key: 'orderNumber', label: 'Commande' },
    {
      key: 'orderDate',
      label: 'Date',
      render: (value: string) => new Date(value).toLocaleDateString('fr-FR')
    },
    {
      key: 'status',
      label: 'Statut',
      render: (_: any, order: Order) => {
        return <ResponsiveBadge variant="default">{getStatusLabel(order.status)}</ResponsiveBadge>;
      }
    },
    {
      key: 'totalAmount',
      label: 'Montant',
      render: (value: number) => formatCurrency(value)
    }
  ];

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
    refetchOrders();
    refetchOrderItems();
  };

  const handlePurchaseRequestDialogClose = () => {
    setIsPurchaseRequestDialogOpen(false);
    setEditingOrder(null);
    refetchOrders();
    refetchOrderItems();
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setDetailsOrder(null);
  };

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = (order: Order) => {
    setDeleteOrder(order);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteOrder) {
      console.log('🗑️ Starting deletion process for order:', deleteOrder.id, deleteOrder.orderNumber);
      console.log('🔍 User role:', user?.role, 'User base:', user?.baseId);
      console.log('🔍 Can manage orders:', canManageOrders);
      
      setIsDeleting(true);
      try {
        // Test direct Supabase deletion first for debugging
        console.log('🧪 Testing direct order deletion...');
        const { error: directDeleteTest } = await supabase
          .from('orders')
          .select('id')
          .eq('id', deleteOrder.id)
          .single();
        
        console.log('📊 Order exists check result:', directDeleteTest);
        
        // 1. Supprimer les workflow steps
        console.log('🔄 Deleting workflow steps...');
        const { error: workflowError, data: workflowData } = await supabase
          .from('purchase_workflow_steps')
          .delete()
          .eq('order_id', deleteOrder.id);
        
        console.log('📋 Workflow steps deletion result:', { error: workflowError, data: workflowData });

        // 2. Supprimer les notifications liées
        console.log('🔔 Deleting notifications...');
        const { error: notifError, data: notifData } = await supabase
          .from('workflow_notifications')
          .delete()
          .eq('order_id', deleteOrder.id);
        
        console.log('📩 Notifications deletion result:', { error: notifError, data: notifData });

        // 3. Supprimer les alertes liées
        console.log('⚠️ Deleting alerts...');
        const { error: alertError, data: alertData } = await supabase
          .from('workflow_alerts')
          .delete()
          .eq('order_id', deleteOrder.id);
        
        console.log('🚨 Alerts deletion result:', { error: alertError, data: alertData });

        // 4. Supprimer les bulk purchase distributions
        console.log('📦 Deleting bulk purchase distributions...');
        const { error: bulkError, data: bulkData } = await supabase
          .from('bulk_purchase_distributions')
          .delete()
          .eq('order_id', deleteOrder.id);
        
        console.log('🛒 Bulk distributions deletion result:', { error: bulkError, data: bulkData });

        // 5. Supprimer les items de commande via hook
        console.log('🧾 Deleting order items...');
        const items = rawOrderItems.filter((i: any) => i.order_id === deleteOrder.id);
        console.log('📝 Found order items:', items.length);
        for (const item of items) {
          console.log('🗑️ Deleting item:', item.id);
          await removeOrderItem(item.id);
        }

        // 6. Enfin supprimer la commande via hook
        console.log('📋 Deleting main order...');
        await removeOrderRecord(deleteOrder.id);
        
        console.log('✅ Order deletion completed successfully');
        toast({
          title: "Commande supprimée",
          description: "La commande a été supprimée avec succès.",
        });
        setIsDeleteDialogOpen(false);
        setDeleteOrder(null);
        refetchOrders();
        refetchOrderItems();
      } catch (error) {
        console.error('❌ Erreur lors de la suppression:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la commande: " + (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <WorkflowGuide />
          </div>
          <div>
            <StockSyncTestWidget />
          </div>
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

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : isMobile ? (
              <MobileTable
                data={filteredOrders}
                columns={mobileColumns}
                onRowClick={handleViewDetails}
              />
            ) : (
              <OrderTableEnhanced
                orders={filteredOrders}
                isLoading={isLoading}
                onEdit={handleEdit}
                onViewDetails={handleViewDetails}
                onDelete={handleDelete}
                canManage={canManageOrders}
                onOrderUpdate={() => {
                  refetchOrders();
                  refetchOrderItems();
                }}
                showCompactView={false}
              />
            )}
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

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer la commande <strong>{deleteOrder?.orderNumber}</strong> ? 
                Cette action est irréversible et supprimera également tous les articles associés.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ErrorBoundary>
  );
}