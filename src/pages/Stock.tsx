import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StockTable } from '@/components/stock/StockTable';
import { StockDialog } from '@/components/stock/StockDialog';
import { StockFilters } from '@/components/stock/StockFilters';
import { StockImportDialog } from '@/components/stock/StockImportDialog';
import { StockDuplicateDialog } from '@/components/stock/StockDuplicateDialog';
import { StockScanner } from '@/components/stock/StockScanner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MobileTable } from '@/components/ui/mobile-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { StockItem } from '@/types';

export default function Stock() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBase, setSelectedBase] = useState('all');
  const [showLowStock, setShowLowStock] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [duplicatingItem, setDuplicatingItem] = useState<StockItem | null>(null);

  const { data: stockItems = [], isLoading } = useQuery({
    queryKey: ['stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_items')
        .select(`
          *,
          bases(name, location)
        `)
        .order('name');

      if (error) throw error;

      // Transform database fields to match StockItem interface
      return data.map(item => ({
        id: item.id,
        name: item.name,
        reference: item.reference || '',
        category: item.category || '',
        quantity: item.quantity || 0,
        minThreshold: item.min_threshold || 0,
        unit: item.unit || '',
        location: item.location || '',
        baseId: item.base_id || '',
        baseName: item.bases?.name || '',
        lastUpdated: item.last_updated || new Date().toISOString()
      })) as StockItem[];
    }
  });

  // Get bases for filter
  const { data: bases = [] } = useQuery({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    }
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
      item.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesBase = selectedBase === 'all' || item.baseId === selectedBase;
    const matchesLowStock = !showLowStock || item.quantity <= item.minThreshold;
    
    return matchesSearch && matchesCategory && matchesBase && matchesLowStock;
  });

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
      const { error } = await supabase
        .from('stock_items')
        .update({ 
          quantity: newQuantity,
          last_updated: new Date().toISOString()
        })
        .eq('id', itemId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['stock'] });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la quantité:', error);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey: ['stock'] });
  };

  const handleDuplicateDialogClose = () => {
    setIsDuplicateDialogOpen(false);
    setDuplicatingItem(null);
  };

  const canManageStock = user?.role === 'direction' || user?.role === 'chef_base';

  // Colonnes pour la vue mobile
  const mobileColumns = [
    {
      key: 'name',
      label: 'Article',
      render: (value: string, item: StockItem) => (
        <div className="flex items-center gap-2">
          {item.quantity <= item.minThreshold && (
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          )}
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      key: 'reference',
      label: 'Référence',
      render: (value: string) => value || '-'
    },
    {
      key: 'quantity',
      label: 'Quantité',
      render: (value: number, item: StockItem) => (
        <span className={`font-medium ${item.quantity <= item.minThreshold ? 'text-orange-600' : ''}`}>
          {value} {item.unit || ''}
        </span>
      )
    },
    {
      key: 'category',
      label: 'Catégorie',
      render: (value: string) => value || '-'
    },
    {
      key: 'location',
      label: 'Emplacement',
      render: (value: string) => value || '-'
    }
  ];

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
              size={isMobile ? "sm" : "default"}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Importer Excel</span>
              <span className="xs:hidden">Import</span>
            </Button>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-marine-600 hover:bg-marine-700 text-sm"
              size={isMobile ? "sm" : "default"}
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

      <Tabs defaultValue="inventory" className="space-y-4">
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

            <div className="p-3 sm:p-0">
              {isMobile ? (
                <MobileTable
                  data={filteredItems}
                  columns={mobileColumns}
                  onRowClick={canManageStock ? handleEdit : undefined}
                  keyField="id"
                />
              ) : (
                <StockTable
                  items={filteredItems}
                  isLoading={isLoading}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onUpdateQuantity={handleUpdateQuantity}
                  canManage={canManageStock}
                />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scanner" className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <StockScanner stockItems={filteredItems} />
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
    </div>
  );
}