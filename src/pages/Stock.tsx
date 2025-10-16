import React, { useState, useEffect } from 'react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { Plus, Search, FileSpreadsheet, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StockTable } from '@/components/stock/StockTable';
import { StockDialog } from '@/components/stock/StockDialog';
import { StockFilters } from '@/components/stock/StockFilters';
import { StockImportDialog } from '@/components/stock/StockImportDialog';
import { StockDuplicateDialog } from '@/components/stock/StockDuplicateDialog';

import { StockItemDetailsDialog } from '@/components/stock/StockItemDetailsDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useDeleteStockItem, useUpdateStockQuantity } from '@/hooks/useStockMutations';
import { useRealtimeStockUpdates } from '@/hooks/useRealtimeUpdates';
import { downloadStockTemplate } from '@/utils/stockTemplate';

import { StockItem } from '@/types';
import { MobileTable, ResponsiveBadge } from '@/components/ui/mobile-table';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Stock() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBase, setSelectedBase] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [duplicatingItem, setDuplicatingItem] = useState<StockItem | null>(null);
  const [detailsItem, setDetailsItem] = useState<StockItem | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<StockItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();

  // Seuls les techniciens ont accès limité à leur base
  const baseId = user?.role === 'technicien' ? user?.baseId : undefined;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === '1') {
      setEditingItem(null);
      setIsDialogOpen(true);
      navigate('/stock', { replace: true });
    }
  }, [location.search, navigate]);

  // Get bases for filter first
  const { data: bases = [] } = useOfflineData<any>({ table: 'bases' });

  const {
    data: rawStockItems = [],
    loading: isLoading,
    update: updateItem,
    refetch: refetchStock
  } = useOfflineData<any>({ table: 'stock_items', baseId, dependencies: [user?.role, user?.baseId] });

  // Set default base filter for chefs de base (one time only)
  useEffect(() => {
    if (user && bases.length > 0 && selectedBase === 'all' && user.role === 'chef_base' && user.baseId) {
      setSelectedBase(user.baseId);
    }
  }, [user, bases]); // Removed selectedBase from deps to avoid loop

  // Use mutations and realtime updates
  const deleteStockMutation = useDeleteStockItem();
  const updateQuantityMutation = useUpdateStockQuantity();
  useRealtimeStockUpdates();

  const stockItems: StockItem[] = rawStockItems.map((item: any) => {
    // Trouver le nom de la base correspondante
    const base = bases.find(b => b.id === item.base_id);
    const baseName = base?.name || '';
    
    return {
      id: item.id,
      name: item.name,
      reference: item.reference || '',
      barcode: item.barcode || '',
      brand: item.brand || '',
      supplierReference: item.supplier_reference || '',
      category: item.category || '',
      quantity: item.quantity || 0,
      minThreshold: item.min_threshold || 0,
      unit: item.unit || '',
      location: item.location || '',
      baseId: item.base_id || '',
      baseName,
      photoUrl: item.photo_url || '',
      lastUpdated: item.last_updated || new Date().toISOString(),
      lastPurchaseDate: null,
      lastPurchaseCost: null,
      lastSupplierId: null
    };
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(stockItems.filter(item => item.category).map(item => item.category)));

  // Calculate low stock items
  const lowStockItems = stockItems.filter(item => item.quantity <= item.minThreshold);

  // Filter stock items based on search, category, base, and low stock
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplierReference?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesBase = selectedBase === 'all' || item.baseId === selectedBase;
    const matchesLowStock = !showLowStock || item.quantity <= item.minThreshold;
    
    return matchesSearch && matchesCategory && matchesBase && matchesLowStock;
  });

  const getStockStatus = (item: StockItem) => {
    if (item.quantity === 0) {
      return { label: 'Rupture', variant: 'destructive' as const, icon: '✗' };
    } else if (item.quantity <= item.minThreshold) {
      return { label: 'Stock faible', variant: 'secondary' as const, icon: '⚠' };
    } else {
      return { label: 'En stock', variant: 'default' as const, icon: '✓' };
    }
  };

  const mobileColumns = [
    { key: 'name', label: 'Article' },
    { key: 'reference', label: 'Réf' },
    { key: 'quantity', label: 'Qté' },
    {
      key: 'status',
      label: 'Statut',
      render: (_: any, item: StockItem) => {
        const status = getStockStatus(item);
        return <ResponsiveBadge variant={status.variant}>{status.icon}</ResponsiveBadge>;
      }
    }
  ];

  const handleEdit = (item: StockItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDuplicate = (item: StockItem) => {
    setDuplicatingItem(item);
    setIsDuplicateDialogOpen(true);
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    refetchStock();
  };

  const handleDuplicateDialogClose = () => {
    setIsDuplicateDialogOpen(false);
    setDuplicatingItem(null);
  };

  const handleViewDetails = (item: StockItem) => {
    setDetailsItem(item);
    setIsDetailsDialogOpen(true);
  };

  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    setDetailsItem(null);
  };

  const handleDelete = (item: StockItem) => {
    setDeleteItem(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    
    // Use the mutation instead of direct removal
    deleteStockMutation.mutate(deleteItem.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        setDeleteItem(null);
      }
    });
  };

  const canManageStock = ['direction', 'chef_base', 'administratif'].includes(user?.role || '');

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Gestion du Stock</h1>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Suivi des articles et approvisionnements
          </p>
        </div>
        {canManageStock && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={downloadStockTemplate}
              className="border-marine-200 text-marine-700 hover:bg-marine-50 text-sm"
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Modèle Excel</span>
              <span className="xs:hidden">Modèle</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(true)}
              className="border-marine-200 text-marine-700 hover:bg-marine-50 text-sm"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Importer Excel</span>
              <span className="xs:hidden">Import</span>
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-marine-600 hover:bg-marine-700 text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Ajouter un article</span>
              <span className="xs:hidden">Ajouter</span>
            </Button>
          </div>
        )}
      </div>


      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-3 sm:p-6 border-b">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher un article..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <StockFilters
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            bases={bases}
            selectedBase={selectedBase}
            onBaseChange={setSelectedBase}
            showLowStock={showLowStock}
            onLowStockChange={setShowLowStock}
            userRole={user?.role}
            userBaseId={user?.baseId}
          />
        </div>

        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-marine-600"></div>
            </div>
          ) : isMobile ? (
            <MobileTable
              data={filteredItems}
              columns={mobileColumns}
              onRowClick={handleViewDetails}
            />
          ) : (
            <StockTable
              items={filteredItems}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onUpdateQuantity={handleUpdateQuantity}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              canManage={canManageStock}
              userBaseId={user?.baseId}
            />
          )}
        </div>
      </div>

      <StockDialog
        isOpen={isDialogOpen}
        onClose={handleDialogClose}
        item={editingItem}
      />

      <StockImportDialog
        isOpen={isImportDialogOpen}
        onClose={() => setIsImportDialogOpen(false)}
      />

      <StockDuplicateDialog
        isOpen={isDuplicateDialogOpen}
        onClose={handleDuplicateDialogClose}
        item={duplicatingItem}
      />

      <StockItemDetailsDialog
        item={detailsItem}
        isOpen={isDetailsDialogOpen}
        onClose={handleDetailsDialogClose}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer l'article <strong>{deleteItem?.name}</strong> ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteStockMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteStockMutation.isPending ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}