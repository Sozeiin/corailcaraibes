import React, { useState } from 'react';
import { useOfflineData } from '@/lib/hooks/useOfflineData';
import { Plus, Search, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StockTable } from '@/components/stock/StockTable';
import { StockDialog } from '@/components/stock/StockDialog';
import { StockFilters } from '@/components/stock/StockFilters';
import { StockImportDialog } from '@/components/stock/StockImportDialog';
import { StockDuplicateDialog } from '@/components/stock/StockDuplicateDialog';
import { StockScanner } from '@/components/stock/StockScanner';
import { StockItemDetailsDialog } from '@/components/stock/StockItemDetailsDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StockItem } from '@/types';
import { MobileTable, ResponsiveBadge } from '@/components/ui/mobile-table';
import { useIsMobile } from '@/hooks/use-mobile';

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

  const baseId = user?.role !== 'direction' ? user?.baseId : undefined;

  const {
    data: rawStockItems = [],
    loading: isLoading,
    update: updateItem,
    remove: removeItem,
    refetch: refetchStock
  } = useOfflineData<any>({ table: 'stock_items', baseId, dependencies: [user?.role, user?.baseId] });

  const stockItems: StockItem[] = rawStockItems.map((item: any) => ({
    id: item.id,
    name: item.name,
    reference: item.reference || '',
    category: item.category || '',
    quantity: item.quantity || 0,
    minThreshold: item.min_threshold || 0,
    unit: item.unit || '',
    location: item.location || '',
    baseId: item.base_id || '',
    baseName: '',
    lastUpdated: item.last_updated || new Date().toISOString(),
    lastPurchaseDate: null,
    lastPurchaseCost: null,
    lastSupplierId: null
  }));

  // Get bases for filter
  const { data: bases = [] } = useOfflineData<any>({ table: 'bases' });

  // Get unique categories for filter
  const categories = Array.from(new Set(stockItems.filter(item => item.category).map(item => item.category)));

  // Calculate low stock items
  const lowStockItems = stockItems.filter(item => item.quantity <= item.minThreshold);

  // Filter stock items based on search, category, base, and low stock
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    try {
      await updateItem(itemId, {
        quantity: newQuantity,
        last_updated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la quantité:', error);
    }
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
    if (deleteItem) {
      setIsDeleting(true);
      try {
        await removeItem(deleteItem.id);
        toast({
          title: "Article supprimé",
          description: "L'article a été supprimé avec succès.",
        });
        setIsDeleteDialogOpen(false);
        setDeleteItem(null);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer l'article.",
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const canManageStock = user?.role === 'direction' || user?.role === 'chef_base';

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

      {lowStockItems.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>{lowStockItems.length}</strong> article{lowStockItems.length > 1 ? 's' : ''} en rupture ou stock faible.
            <Button
              variant="link"
              className="h-auto p-0 ml-2 text-orange-600 underline"
              onClick={() => setShowLowStock(true)}
            >
              Voir les articles
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="inventory" className="space-y-4" key="stock-tabs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Inventaire
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Scanner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
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
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scanner" className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <StockScanner stockItems={filteredItems} onRefreshStock={refetchStock} />
          </div>
        </TabsContent>
      </Tabs>

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
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}